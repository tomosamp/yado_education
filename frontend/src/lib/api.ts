import { http } from '@/lib/http'
import type {
  Category,
  DashboardMetrics,
  Hint,
  Invitation,
  JudgeRunResult,
  Label,
  PendingReviewUser,
  Paginated,
  Review,
  Section,
  SectionPdf,
  Submission,
  User,
  UserLabelAssignment,
} from '@/types'

type DashboardResponse = {
  metrics: DashboardMetrics
  category_progress?: Array<Record<string, unknown>>
  activities?: Array<Record<string, unknown>>
  pending_submissions?: Submission[]
}

export async function apiLogin(payload: {
  email: string
  password: string
  remember: boolean
}) {
  const { data } = await http.post<{ user: User }>('/api/auth/login', payload)
  return data
}

export async function apiDevLogin(payload: { role: 'user' | 'reviewer' | 'admin' }) {
  const { data } = await http.post<{ user: User }>('/api/auth/dev-login', payload)
  return data
}

export async function apiMe() {
  const { data } = await http.get<{ user: User }>('/api/auth/me')
  return data.user
}

export async function apiLogout() {
  await http.post('/api/auth/logout')
}

export async function apiUpdateProfile(payload: {
  name: string
  password?: string
  password_confirmation?: string
}) {
  const { data } = await http.put<{ user: User; message: string }>('/api/auth/me', payload)
  return data
}

export async function apiAcceptInvitation(payload: {
  token: string
  email: string
  name: string
  password: string
  password_confirmation: string
}) {
  const { data } = await http.post('/api/invitations/accept', payload)
  return data
}

export async function apiCategories() {
  const { data } = await http.get<{ categories: Category[] }>('/api/categories')
  return data.categories
}

export async function apiSections(categoryId: number) {
  const { data } = await http.get<{ category: Category; sections: Section[] }>(
    `/api/categories/${categoryId}/sections`,
  )
  return data
}

export async function apiSection(sectionId: number) {
  const { data } = await http.get<{
    section: Section & {
      pdfs: SectionPdf[]
      hints: Hint[]
      judge_config: {
        allowed_languages: Array<'php' | 'javascript' | 'python'>
        cases: Array<{ stdin: string; expected_stdout: string }>
      } | null
    }
    latest_submission: Submission | null
    review_history: Review[]
  }>(`/api/sections/${sectionId}`)
  return data
}

export async function apiOpenHint(sectionId: number, hintOrder: number) {
  const { data } = await http.post<{ hints: Hint[] }>(
    `/api/sections/${sectionId}/hints/${hintOrder}/open`,
  )
  return data.hints
}

export async function apiRunJudge(
  sectionId: number,
  payload: { language: 'php' | 'javascript' | 'python'; code: string },
) {
  const { data } = await http.post<{ judge_run: JudgeRunResult }>(
    `/api/sections/${sectionId}/judge-runs`,
    payload,
  )
  return data.judge_run
}

export async function apiSubmit(sectionId: number, payload: Record<string, unknown>) {
  const { data } = await http.post<{ submission: Submission; message: string }>(
    `/api/sections/${sectionId}/submissions`,
    payload,
  )
  return data
}

export async function apiMySubmissions(page = 1) {
  const { data } = await http.get<Paginated<Submission>>(`/api/me/submissions?page=${page}`)
  return data
}

export async function apiSubmission(submissionId: number) {
  const { data } = await http.get<{ submission: Submission }>(`/api/submissions/${submissionId}`)
  return data.submission
}

export async function apiDashboardMe() {
  const { data } = await http.get<DashboardResponse>('/api/me/dashboard')
  return data
}

export async function apiDashboardAdmin() {
  const { data } = await http.get<DashboardResponse>('/api/admin/dashboard')
  return data
}

export async function apiDashboardReviewer() {
  const { data } = await http.get<DashboardResponse>('/api/reviewer/dashboard')
  return data
}

export async function apiPendingReviewUsers() {
  const { data } = await http.get<{
    users: PendingReviewUser[]
    total: number
  }>('/api/reviews/pending-users')
  return data
}

export async function apiPendingReviews(
  page = 1,
  params?: {
    user_id?: number
    section_id?: number
    per_page?: number
  },
) {
  const query = new URLSearchParams()
  query.set('page', String(page))
  if (params?.user_id) {
    query.set('user_id', String(params.user_id))
  }
  if (params?.section_id) {
    query.set('section_id', String(params.section_id))
  }
  if (params?.per_page) {
    query.set('per_page', String(params.per_page))
  }

  const { data } = await http.get<Paginated<Submission>>(`/api/reviews/pending?${query.toString()}`)
  return data
}

export async function apiReviewSubmission(
  submissionId: number,
  payload: { decision: 'approved' | 'rejected'; comment: string },
) {
  const { data } = await http.post(`/api/submissions/${submissionId}/reviews`, payload)
  return data
}

export async function apiAdminInvitations() {
  const { data } = await http.get<Paginated<Invitation>>('/api/admin/invitations')
  return data
}

export async function apiAdminInvite(payload: {
  email: string
  role: 'user' | 'reviewer' | 'admin'
  label_id?: number
  expires_in_days?: number
}) {
  const { data } = await http.post('/api/admin/invitations', payload)
  return data
}

export async function apiAdminCategories() {
  const { data } = await http.get<Paginated<Category>>('/api/admin/categories')
  return data
}

export async function apiAdminSaveCategory(payload: {
  id?: number
  title: string
  description?: string
  sort_order: number
  is_visible: boolean
}) {
  if (payload.id) {
    const { data } = await http.put(`/api/admin/categories/${payload.id}`, payload)
    return data
  }

  const { data } = await http.post('/api/admin/categories', payload)
  return data
}

export async function apiAdminReorderCategories(items: Array<{ id: number; sort_order: number }>) {
  const { data } = await http.post('/api/admin/categories/reorder', { items })
  return data
}

export async function apiAdminDeleteCategory(id: number) {
  await http.delete(`/api/admin/categories/${id}`)
}

export async function apiAdminSections() {
  const { data } = await http.get<
    Paginated<
      Section & {
        judge_config?: { config?: Section['judge_config'] } | null
      }
    >
  >('/api/admin/sections')

  return {
    ...data,
    data: data.data.map((section) => ({
      ...section,
      judge_config: section.judge_config?.config ?? null,
    })),
  }
}

export async function apiAdminSaveSection(payload: FormData, sectionId?: number) {
  const config = {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }

  if (sectionId) {
    const { data } = await http.post(`/api/admin/sections/${sectionId}?_method=PUT`, payload, config)
    return data
  }

  const { data } = await http.post('/api/admin/sections', payload, config)
  return data
}

export async function apiAdminSection(sectionId: number) {
  const { data } = await http.get<{
    section: Section & {
      pdfs: Array<{
        id: number
        file_name: string
        file_size: number
        sort_order: number
      }>
      hints: Array<{ hint_order: number; content: string }>
      judge_config?: {
        config?: {
          allowed_languages: Array<'php' | 'javascript' | 'python'>
          time_limit_sec: number
          memory_limit_mb: number
          cases: Array<{ stdin: string; expected_stdout: string }>
        }
      } | null
    }
  }>(`/api/admin/sections/${sectionId}`)

  return {
    ...data.section,
    judge_config: data.section.judge_config?.config ?? null,
  }
}

export async function apiAdminReorderSections(items: Array<{ id: number; sort_order: number }>) {
  const { data } = await http.post('/api/admin/sections/reorder', { items })
  return data
}

export async function apiAdminDeleteSection(id: number) {
  await http.delete(`/api/admin/sections/${id}`)
}

export async function apiAdminUsers(params?: {
  role?: 'user' | 'reviewer' | 'admin'
  is_active?: boolean
  label_id?: number
  keyword?: string
}) {
  const query = new URLSearchParams()
  if (params?.role) {
    query.set('role', params.role)
  }
  if (typeof params?.is_active === 'boolean') {
    query.set('is_active', params.is_active ? '1' : '0')
  }
  if (params?.label_id) {
    query.set('label_id', String(params.label_id))
  }
  if (params?.keyword) {
    query.set('keyword', params.keyword)
  }

  const { data } = await http.get<Paginated<User>>(
    `/api/admin/users${query.toString() ? `?${query.toString()}` : ''}`,
  )
  return data
}

export async function apiAdminUpdateUser(userId: number, payload: Pick<User, 'name' | 'role' | 'is_active'>) {
  const { data } = await http.put(`/api/admin/users/${userId}`, payload)
  return data
}

export async function apiAdminUser(userId: number) {
  const { data } = await http.get<{
    user: User
    progress: {
      total_sections: number
      passed: number
      review_pending: number
      revision_required: number
      not_submitted: number
      completion_rate: number
    }
  }>(`/api/admin/users/${userId}`)
  return data
}

export async function apiAdminSyncUserLabels(
  userId: number,
  labels: UserLabelAssignment[],
) {
  const { data } = await http.post(`/api/admin/users/${userId}/labels`, {
    labels: labels.map((item) => ({
      label_id: item.label_id,
      start_date: item.start_date,
      end_date: item.end_date,
    })),
  })
  return data
}

export async function apiLabels() {
  const { data } = await http.get<Paginated<Label>>('/api/labels')
  return data
}

export async function apiAdminSaveLabel(payload: {
  id?: number
  name: string
  is_permanent: boolean
  start_date?: string | null
  end_date?: string | null
}) {
  if (payload.id) {
    const { data } = await http.put(`/api/admin/labels/${payload.id}`, payload)
    return data
  }

  const { data } = await http.post('/api/admin/labels', payload)
  return data
}

export async function apiAdminDeleteLabel(id: number) {
  await http.delete(`/api/admin/labels/${id}`)
}

export async function apiAdminAssignLabel(
  labelId: number,
  users: Array<{ user_id: number; start_date?: string | null; end_date?: string | null }>,
) {
  const { data } = await http.post(`/api/admin/labels/${labelId}/assign`, { users })
  return data
}

export async function apiPdfUrl(pdfApiUrl: string) {
  const { data } = await http.get<{ url: string }>(pdfApiUrl)
  return data.url
}
