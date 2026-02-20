<?php

namespace App\Services\Judge;

use App\Models\JudgeRun;
use RuntimeException;
use Symfony\Component\Process\Exception\ProcessTimedOutException;
use Symfony\Component\Process\Process;

class JudgeRunnerService
{
    public function run(JudgeRun $judgeRun): array
    {
        $config = $judgeRun->section->judgeConfig?->config;

        if (! is_array($config)) {
            throw new RuntimeException('判定設定が見つかりません。');
        }

        $allowed = $config['allowed_languages'] ?? [];

        if (! in_array($judgeRun->language, $allowed, true)) {
            throw new RuntimeException('この言語はこのレッスンで利用できません。');
        }

        $cases = $config['cases'] ?? [];
        if (! is_array($cases) || empty($cases)) {
            throw new RuntimeException('テストケースが設定されていません。');
        }

        $timeLimit = (int) ($config['time_limit_sec'] ?? config('judge.time_limit_sec', 5));
        $memoryLimit = (int) ($config['memory_limit_mb'] ?? config('judge.memory_limit_mb', 256));

        $results = [];
        $stdoutChunks = [];
        $stderrChunks = [];
        $hasTimeout = false;
        $allPassed = true;

        foreach ($cases as $index => $case) {
            $stdin = (string) ($case['stdin'] ?? '');
            $expected = (string) ($case['expected_stdout'] ?? '');

            $run = $this->runCase($judgeRun->language, $judgeRun->code, $stdin, $timeLimit, $memoryLimit);

            $normalizedActual = $this->normalizeOutput($run['stdout']);
            $normalizedExpected = $this->normalizeOutput($expected);

            $passed = ! $run['timed_out']
                && $run['exit_code'] === 0
                && $normalizedActual === $normalizedExpected;

            $allPassed = $allPassed && $passed;
            $hasTimeout = $hasTimeout || $run['timed_out'];
            $stdoutChunks[] = $run['stdout'];
            $stderrChunks[] = $run['stderr'];

            $results[] = [
                'index' => $index + 1,
                'stdin' => $stdin,
                'expected_stdout' => $expected,
                'stdout' => $run['stdout'],
                'stderr' => $run['stderr'],
                'exit_code' => $run['exit_code'],
                'timed_out' => $run['timed_out'],
                'passed' => $passed,
            ];
        }

        $status = $allPassed
            ? JudgeRun::STATUS_PASSED
            : ($hasTimeout ? JudgeRun::STATUS_TIMEOUT : JudgeRun::STATUS_FAILED);

        return [
            'status' => $status,
            'passed' => $allPassed,
            'results' => $results,
            'stdout' => implode("\n", array_filter($stdoutChunks)),
            'stderr' => implode("\n", array_filter($stderrChunks)),
        ];
    }

    /**
     * @return array{stdout:string,stderr:string,exit_code:int,timed_out:bool}
     */
    private function runCase(string $language, string $code, string $stdin, int $timeLimit, int $memoryLimit): array
    {
        $extension = match ($language) {
            'php' => 'php',
            'javascript' => 'js',
            'python' => 'py',
            default => throw new RuntimeException('未対応言語です。'),
        };

        $runner = match ($language) {
            'php' => 'php /tmp/Main.php < /tmp/input.txt',
            'javascript' => 'node /tmp/Main.js < /tmp/input.txt',
            'python' => 'python3 /tmp/Main.py < /tmp/input.txt',
            default => throw new RuntimeException('未対応言語です。'),
        };

        $bootstrap = sprintf(
            "printf '%%s' \"\$CODE_B64\" | base64 -d > /tmp/Main.%s && printf '%%s' \"\$INPUT_B64\" | base64 -d > /tmp/input.txt && %s",
            $extension,
            $runner,
        );

        $command = [
            'docker',
            'run',
            '--rm',
            '--network',
            'none',
            '--memory',
            sprintf('%dm', $memoryLimit),
            '--cpus',
            (string) config('judge.cpu', '0.5'),
            '--pids-limit',
            '64',
            '--read-only',
            '--tmpfs',
            '/tmp:rw,nosuid,nodev,size=16m',
            '--env',
            'PYTHONDONTWRITEBYTECODE=1',
            '--env',
            'CODE_B64='.base64_encode($code),
            '--env',
            'INPUT_B64='.base64_encode($stdin),
            config('judge.image', 'yado-judge-runner:latest'),
            'sh',
            '-lc',
            $bootstrap,
        ];

        $process = new Process($command);
        $process->setTimeout($timeLimit + 1);

        try {
            $process->run();
            $result = [
                'stdout' => $process->getOutput(),
                'stderr' => $process->getErrorOutput(),
                'exit_code' => $process->getExitCode() ?? 1,
                'timed_out' => false,
            ];
        } catch (ProcessTimedOutException) {
            $result = [
                'stdout' => $process->getOutput(),
                'stderr' => $process->getErrorOutput()."\nExecution timed out.",
                'exit_code' => 124,
                'timed_out' => true,
            ];
        }

        return $result;
    }

    private function normalizeOutput(string $value): string
    {
        return str_replace(["\r\n", "\r"], "\n", $value);
    }
}
