<?php

return [
    'image' => env('JUDGE_IMAGE', 'yado-judge-runner:latest'),
    'cpu' => env('JUDGE_CPU', '0.5'),
    'time_limit_sec' => (int) env('JUDGE_TIME_LIMIT_SEC', 5),
    'memory_limit_mb' => (int) env('JUDGE_MEMORY_LIMIT_MB', 256),
];
