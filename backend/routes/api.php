<?php

use App\Http\Controllers\Api\Admin\CategoryController as AdminCategoryController;
use App\Http\Controllers\Api\Admin\InvitationController as AdminInvitationController;
use App\Http\Controllers\Api\Admin\LabelController as AdminLabelController;
use App\Http\Controllers\Api\Admin\SectionController as AdminSectionController;
use App\Http\Controllers\Api\Admin\UserController as AdminUserController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CurriculumController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\InvitationAcceptController;
use App\Http\Controllers\Api\PasswordController;
use App\Http\Controllers\Api\PdfController;
use App\Http\Controllers\Api\ReviewController;
use App\Http\Controllers\Api\SubmissionController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/dev-login', [AuthController::class, 'devLogin']);
Route::post('/auth/forgot-password', [PasswordController::class, 'forgot']);
Route::post('/auth/reset-password', [PasswordController::class, 'reset']);
Route::post('/invitations/accept', [InvitationAcceptController::class, 'accept']);

Route::middleware(['auth:sanctum', 'active'])->group(function (): void {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::put('/auth/me', [AuthController::class, 'updateProfile']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    Route::get('/categories', [CurriculumController::class, 'categories']);
    Route::get('/categories/{category}/sections', [CurriculumController::class, 'sections']);
    Route::get('/sections/{section}', [CurriculumController::class, 'show']);
    Route::post('/sections/{section}/hints/{hintOrder}/open', [CurriculumController::class, 'openHint'])
        ->whereNumber('hintOrder');

    Route::post('/sections/{section}/judge-runs', [SubmissionController::class, 'runJudge'])
        ->middleware('role:user');
    Route::post('/sections/{section}/submissions', [SubmissionController::class, 'submit'])
        ->middleware('role:user');
    Route::get('/submissions/{submission}', [SubmissionController::class, 'show']);
    Route::get('/me/submissions', [SubmissionController::class, 'mySubmissions'])
        ->middleware('role:user');

    Route::get('/me/dashboard', [DashboardController::class, 'me'])
        ->middleware('role:user');
    Route::get('/admin/dashboard', [DashboardController::class, 'admin'])
        ->middleware('role:admin');
    Route::get('/reviewer/dashboard', [DashboardController::class, 'reviewer'])
        ->middleware('role:reviewer,admin');

    Route::get('/reviews/pending-users', [ReviewController::class, 'pendingUsers'])
        ->middleware('role:reviewer,admin');
    Route::get('/reviews/pending', [ReviewController::class, 'pending'])
        ->middleware('role:reviewer,admin');
    Route::post('/submissions/{submission}/reviews', [ReviewController::class, 'store'])
        ->middleware('role:reviewer,admin');

    Route::get('/pdfs/{sectionPdf}', [PdfController::class, 'show'])
        ->name('api.pdfs.show');
    Route::get('/pdfs/{sectionPdf}/content', [PdfController::class, 'content'])
        ->name('api.pdfs.content');

    Route::get('/labels', [AdminLabelController::class, 'index'])
        ->middleware('role:reviewer,admin');

    Route::prefix('/admin')->middleware('role:admin')->group(function (): void {
        Route::get('/invitations', [AdminInvitationController::class, 'index']);
        Route::post('/invitations', [AdminInvitationController::class, 'store']);

        Route::post('/categories/reorder', [AdminCategoryController::class, 'reorder']);
        Route::apiResource('/categories', AdminCategoryController::class)
            ->names('admin.categories');

        Route::post('/sections/reorder', [AdminSectionController::class, 'reorder']);
        Route::apiResource('/sections', AdminSectionController::class)
            ->names('admin.sections');

        Route::apiResource('/users', AdminUserController::class)
            ->only(['index', 'show', 'update'])
            ->names('admin.users');
        Route::post('/users/{user}/labels', [AdminUserController::class, 'syncLabels']);

        Route::apiResource('/labels', AdminLabelController::class)
            ->names('admin.labels');
        Route::post('/labels/{label}/assign', [AdminLabelController::class, 'assign']);
    });
});
