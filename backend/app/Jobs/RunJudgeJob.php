<?php

namespace App\Jobs;

use App\Models\JudgeRun;
use App\Services\Judge\JudgeRunnerService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Foundation\Queue\Queueable;
use Throwable;

class RunJudgeJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public int $judgeRunId,
    ) {
        $this->onQueue('judge');
    }

    /**
     * Execute the job.
     */
    public function handle(JudgeRunnerService $judgeRunner): void
    {
        $judgeRun = JudgeRun::query()
            ->with(['section.judgeConfig'])
            ->findOrFail($this->judgeRunId);

        try {
            $result = $judgeRunner->run($judgeRun);

            $judgeRun->update([
                'status' => $result['status'],
                'passed' => $result['passed'],
                'results' => $result['results'],
                'stdout' => $result['stdout'],
                'stderr' => $result['stderr'],
                'executed_at' => now(),
            ]);
        } catch (Throwable $e) {
            $judgeRun->update([
                'status' => JudgeRun::STATUS_ERROR,
                'passed' => false,
                'stderr' => $e->getMessage(),
                'executed_at' => now(),
            ]);
        }
    }
}
