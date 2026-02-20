<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SectionPdf;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PdfController extends Controller
{
    public function show(Request $request, SectionPdf $sectionPdf): JsonResponse
    {
        $sectionPdf->loadMissing('section.category');
        $this->ensureCanView($request, $sectionPdf);

        $expiresAt = now()->addMinutes(10);

        $url = route('api.pdfs.content', ['sectionPdf' => $sectionPdf->id]);

        return response()->json([
            'url' => $url,
            'expires_at' => $expiresAt,
        ]);
    }

    public function content(Request $request, SectionPdf $sectionPdf): StreamedResponse
    {
        $sectionPdf->loadMissing('section.category');
        $this->ensureCanView($request, $sectionPdf);

        try {
            return Storage::disk('s3')->response(
                $sectionPdf->file_key,
                $sectionPdf->file_name,
                [
                    'Content-Type' => $sectionPdf->mime_type ?: 'application/pdf',
                    'Cache-Control' => 'private, max-age=300',
                ],
                'inline',
            );
        } catch (\Throwable) {
            abort(404);
        }
    }

    private function ensureCanView(Request $request, SectionPdf $sectionPdf): void
    {
        $user = $request->user();
        if (! $user) {
            abort(401);
        }

        if (
            $user->role === User::ROLE_USER
            && (! $sectionPdf->section->is_visible || ! $sectionPdf->section->category->is_visible)
        ) {
            abort(404);
        }
    }
}
