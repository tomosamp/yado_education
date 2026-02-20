import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { EmptyState } from '@/components/common/empty-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  apiOpenHint,
  apiPdfUrl,
  apiRunJudge,
  apiSection,
  apiSubmit,
} from '@/lib/api'
import { understandingTexts } from '@/lib/understanding'
import { cn } from '@/lib/utils'
import type { JudgeRunResult } from '@/types'

const statusLabelMap: Record<string, string> = {
  review_pending: 'レビュー待ち',
  revision_required: 'やり直し',
  passed: '合格',
}

function withPdfViewerOptions(url: string): string {
  const options = 'toolbar=0&navpanes=0&scrollbar=0&statusbar=0&messages=0'
  return `${url}${url.includes('#') ? '&' : '#'}${options}`
}

export function SectionPage() {
  const { sectionId } = useParams()
  const queryClient = useQueryClient()

  const [language, setLanguage] = useState<'php' | 'javascript' | 'python'>('php')
  const [code, setCode] = useState('')
  const [judgeRun, setJudgeRun] = useState<JudgeRunResult | null>(null)
  const [understanding, setUnderstanding] = useState(5)
  const [comment, setComment] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [extraText, setExtraText] = useState('')
  const [pdfViewerUrls, setPdfViewerUrls] = useState<Array<{ id: number; url: string }>>([])
  const [isPdfLoading, setIsPdfLoading] = useState(false)

  const sectionQuery = useQuery({
    queryKey: ['section', sectionId],
    queryFn: async () => {
      if (!sectionId) {
        return null
      }

      return apiSection(Number(sectionId))
    },
    enabled: Boolean(sectionId),
  })

  const section = sectionQuery.data?.section
  const sectionPdfs = useMemo(() => section?.pdfs ?? [], [section?.pdfs])
  const sectionHints = useMemo(() => section?.hints ?? [], [section?.hints])
  const understandingProgress = ((understanding - 1) / 9) * 100
  const understandingMarks = useMemo(() => Array.from({ length: 10 }, (_, index) => index + 1), [])

  useEffect(() => {
    let cancelled = false

    const loadPdfUrls = async () => {
      if (sectionPdfs.length === 0) {
        setPdfViewerUrls([])
        setIsPdfLoading(false)
        return
      }

      setIsPdfLoading(true)

      const resolved = await Promise.all(
        sectionPdfs.map(async (pdf) => {
          try {
            const url = await apiPdfUrl(pdf.download_url)
            return {
              id: pdf.id,
              url,
            }
          } catch {
            return null
          }
        }),
      )

      if (cancelled) {
        return
      }

      const succeeded = resolved.filter(
        (item): item is { id: number; url: string } => item !== null,
      )

      setPdfViewerUrls(succeeded)
      setIsPdfLoading(false)

      if (succeeded.length !== sectionPdfs.length) {
        toast.error('一部の教材PDFの取得に失敗しました。')
      }
    }

    void loadPdfUrls()

    return () => {
      cancelled = true
    }
  }, [sectionPdfs])

  const availableLanguages = useMemo(
    () => section?.judge_config?.allowed_languages ?? ['php', 'javascript', 'python'],
    [section?.judge_config?.allowed_languages],
  )

  const runJudgeMutation = useMutation({
    mutationFn: async () => {
      if (!section) {
        throw new Error('section missing')
      }

      return apiRunJudge(section.id, { language, code })
    },
    onSuccess: (result) => {
      setJudgeRun(result)
      if (result.passed) {
        toast.success('判定OKです。提出できます。')
      } else {
        toast.error('判定NGです。テストケースを確認してください。')
      }
    },
    onError: () => {
      toast.error('判定実行に失敗しました。')
    },
  })

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!section) {
        throw new Error('section missing')
      }

      const payload: Record<string, unknown> = {
        understanding,
        comment,
      }

      if (section.type === 'autojudge') {
        payload.judge_run_id = judgeRun?.id
      }

      if (section.type === 'webapp') {
        payload.github_url = githubUrl
        if (section.extra_text_enabled) {
          payload.extra_text = extraText
        }
      }

      return apiSubmit(section.id, payload)
    },
    onSuccess: async () => {
      toast.success('提出しました。')
      await queryClient.invalidateQueries({ queryKey: ['section', sectionId] })
    },
    onError: () => {
      toast.error('提出に失敗しました。入力内容を確認してください。')
    },
  })

  const openHintMutation = useMutation({
    mutationFn: async (hintOrder: number) => {
      if (!section) {
        throw new Error('section missing')
      }

      return apiOpenHint(section.id, hintOrder)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['section', sectionId] })
    },
    onError: () => {
      toast.error('ヒント開示に失敗しました。')
    },
  })

  if (!section) {
    return <p className="text-sm text-slate-600">読み込み中...</p>
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-slate-900">{section.title}</h1>
        <p className="text-sm text-slate-600">{section.description}</p>
        {sectionQuery.data?.latest_submission?.status ? (
          <Badge className="bg-emerald-100 text-emerald-700">
            現在の状態: {statusLabelMap[sectionQuery.data.latest_submission.status]}
          </Badge>
        ) : null}
      </header>

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">教材</h2>
        {sectionPdfs.length === 0 ? (
          <EmptyState title="教材未登録" description="このレッスンには教材が登録されていません。" />
        ) : isPdfLoading ? (
          <p className="text-sm text-slate-600">教材を読み込み中...</p>
        ) : pdfViewerUrls.length === 0 ? (
          <p className="text-sm text-rose-600">教材の表示に失敗しました。</p>
        ) : (
          <div className="space-y-4">
            {pdfViewerUrls.map((pdf) => (
              <iframe
                key={pdf.id}
                title={`section-pdf-${pdf.id}`}
                src={withPdfViewerOptions(pdf.url)}
                className="h-[70vh] w-full rounded border border-slate-200 bg-slate-100"
              />
            ))}
          </div>
        )}
      </Card>

      {sectionHints.length > 0 ? (
        <Card className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">ヒント</h2>
          <div className="space-y-3">
            {sectionHints.map((hint) => (
              <div key={hint.hint_order} className="rounded border border-slate-200 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800">ヒント {hint.hint_order}</p>
                  {hint.can_open ? (
                    <Button
                      size="sm"
                      onClick={() => {
                        openHintMutation.mutate(hint.hint_order)
                      }}
                    >
                      開示
                    </Button>
                  ) : null}
                </div>
                <p className="mt-2 text-sm text-slate-700">
                  {hint.is_opened ? hint.content ?? '' : '未開示'}
                </p>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {section.type === 'autojudge' ? (
        <Card className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">自動判定</h2>
          <Select
            value={language}
            onChange={(event) => {
              setLanguage(event.target.value as 'php' | 'javascript' | 'python')
            }}
          >
            {availableLanguages.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
          <Textarea
            className="min-h-52 font-mono"
            value={code}
            onChange={(event) => {
              setCode(event.target.value)
            }}
            placeholder="ここにコードを入力"
          />
          <Button
            onClick={() => {
              runJudgeMutation.mutate()
            }}
            disabled={!code || runJudgeMutation.isPending}
          >
            実行して判定
          </Button>
          {judgeRun ? (
            <div className="rounded-md bg-slate-950 p-4 text-slate-100">
              <p className="text-sm">status: {judgeRun.status}</p>
              <p className="text-sm">passed: {String(judgeRun.passed)}</p>
              <pre className="mt-2 overflow-auto text-xs">{JSON.stringify(judgeRun.results, null, 2)}</pre>
            </div>
          ) : null}
        </Card>
      ) : (
        <Card className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Webアプリ提出</h2>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">GitHub URL</label>
            <Input
              value={githubUrl}
              onChange={(event) => {
                setGithubUrl(event.target.value)
              }}
              placeholder="https://github.com/..."
            />
          </div>
          {section.extra_text_enabled ? (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {section.extra_text_label ?? '追加テキスト'}
              </label>
              <Textarea
                value={extraText}
                onChange={(event) => {
                  setExtraText(event.target.value)
                }}
              />
            </div>
          ) : null}
        </Card>
      )}

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">提出</h2>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">理解度 (1-10)</label>
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={understanding}
              onChange={(event) => {
                setUnderstanding(Number(event.target.value))
              }}
              className="h-3 w-full cursor-pointer appearance-none rounded-full outline-none transition [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-slate-900 [&::-moz-range-thumb]:shadow-md [&::-moz-range-track]:h-3 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-transparent [&::-webkit-slider-runnable-track]:h-3 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-thumb]:-mt-1 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-slate-900 [&::-webkit-slider-thumb]:shadow-md"
              style={{
                background: `linear-gradient(to right, #0f172a 0%, #0f172a ${understandingProgress}%, #e2e8f0 ${understandingProgress}%, #e2e8f0 100%)`,
              }}
            />
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-slate-600">1</span>
              <span className="inline-flex min-w-10 items-center justify-center rounded-full bg-slate-900 px-3 py-1 text-sm font-bold text-white">
                {understanding}
              </span>
              <span className="text-xs text-slate-600">10</span>
            </div>
            <div className="mt-2 grid grid-cols-10 gap-1">
              {understandingMarks.map((mark) => (
                <button
                  key={mark}
                  type="button"
                  className={cn(
                    'rounded-md px-1 py-1 text-[11px] font-medium transition-colors',
                    mark === understanding
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                  )}
                  onClick={() => {
                    setUnderstanding(mark)
                  }}
                >
                  {mark}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-slate-700">{understandingTexts[understanding]}</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">コメント</label>
            <Textarea
              value={comment}
              onChange={(event) => {
                setComment(event.target.value)
              }}
              placeholder="任意コメント"
            />
          </div>
        </div>

        <Button
          onClick={() => {
            submitMutation.mutate()
          }}
          disabled={submitMutation.isPending || (section.type === 'autojudge' && !judgeRun?.passed)}
        >
          提出する
        </Button>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-slate-900">レビュー履歴</h2>
        {sectionQuery.data?.review_history.length ? (
          <ul className="mt-3 space-y-3">
            {sectionQuery.data.review_history.map((review) => (
              <li key={review.id} className="rounded border border-slate-200 p-3">
                <p className="text-sm font-semibold text-slate-800">
                  {review.decision === 'approved' ? '合格' : '差戻し'} by {review.reviewer?.name}
                </p>
                <p className="mt-1 text-sm text-slate-700">{review.comment}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-slate-600">レビュー履歴はありません。</p>
        )}
      </Card>
    </div>
  )
}
