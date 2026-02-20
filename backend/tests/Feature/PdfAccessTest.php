<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Section;
use App\Models\SectionPdf;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PdfAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_pdf_show_returns_backend_content_url_and_streams_file(): void
    {
        Storage::fake('s3');

        $user = User::factory()->create([
            'role' => User::ROLE_USER,
            'is_active' => true,
        ]);

        $category = Category::query()->create([
            'title' => 'PDFコース',
            'description' => '説明',
            'sort_order' => 1,
            'is_visible' => true,
        ]);

        $section = Section::query()->create([
            'category_id' => $category->id,
            'title' => 'PDFレッスン',
            'description' => '説明',
            'type' => Section::TYPE_AUTOJUDGE,
            'sort_order' => 1,
            'is_visible' => true,
            'extra_text_enabled' => false,
            'extra_text_required' => false,
        ]);

        $fileKey = "sections/{$section->id}/pdfs/sample.pdf";
        Storage::disk('s3')->put($fileKey, 'dummy pdf content');

        $sectionPdf = SectionPdf::query()->create([
            'section_id' => $section->id,
            'file_key' => $fileKey,
            'file_name' => 'sample.pdf',
            'mime_type' => 'application/pdf',
            'file_size' => 17,
            'sort_order' => 1,
        ]);

        $showResponse = $this
            ->actingAs($user)
            ->getJson("/api/pdfs/{$sectionPdf->id}");

        $showResponse->assertOk();

        $url = (string) $showResponse->json('url');
        $this->assertStringContainsString("/api/pdfs/{$sectionPdf->id}/content", $url);
        $this->assertStringNotContainsString('minio', $url);

        $path = (string) parse_url($url, PHP_URL_PATH);

        $contentResponse = $this
            ->actingAs($user)
            ->get($path);

        $contentResponse->assertOk();
        $contentResponse->assertHeader('content-type', 'application/pdf');
    }
}
