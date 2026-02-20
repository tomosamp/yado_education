export type Role = 'user' | 'reviewer' | 'admin'
export type SectionType = 'autojudge' | 'webapp'

export type User = {
  id: number
  name: string
  email: string
  role: Role
  is_active: boolean
  created_at: string
  updated_at: string
  user_labels?: UserLabelAssignment[]
}

export type Category = {
  id: number
  title: string
  description: string | null
  sort_order: number
  is_visible: boolean
  sections_count?: number
}

export type Section = {
  id: number
  category_id: number
  title: string
  description: string | null
  type: SectionType
  sort_order: number
  is_visible: boolean
  status?: 'not_submitted' | 'review_pending' | 'revision_required' | 'passed'
  extra_text_enabled: boolean
  extra_text_label: string | null
  extra_text_required: boolean
  category?: Category
  pdfs?: SectionPdf[]
  hints?: Hint[]
  judge_config?: {
    allowed_languages: Array<'php' | 'javascript' | 'python'>
    time_limit_sec: number
    memory_limit_mb: number
    cases: Array<{ stdin: string; expected_stdout: string }>
  } | null
}

export type SectionPdf = {
  id: number
  file_name: string
  file_size: number
  sort_order: number
  download_url: string
}

export type Hint = {
  hint_order: number
  content: string | null
  is_opened: boolean
  can_open: boolean
}

export type JudgeRunResultCase = {
  index: number
  stdin: string
  expected_stdout: string
  stdout: string
  stderr: string
  exit_code: number
  timed_out: boolean
  passed: boolean
}

export type JudgeRunResult = {
  id: number
  section_id: number
  user_id: number
  language: 'php' | 'javascript' | 'python'
  code: string
  status: 'pending' | 'passed' | 'failed' | 'timeout' | 'error'
  passed: boolean | null
  results: JudgeRunResultCase[] | null
  stdout: string | null
  stderr: string | null
  executed_at: string | null
}

export type Review = {
  id: number
  submission_id: number
  reviewer_id: number
  decision: 'approved' | 'rejected'
  comment: string
  created_at: string
  reviewer?: User
}

export type Submission = {
  id: number
  section_id: number
  user_id: number
  status: 'review_pending' | 'revision_required' | 'passed'
  understanding: number
  comment: string | null
  submitted_at: string
  created_at: string
  section?: Section
  user?: User
  reviews?: Review[]
  autojudge_code?: {
    language: 'php' | 'javascript' | 'python'
    code: string
    judge_run_id: number | null
  }
  webapp_link?: {
    github_url: string
    extra_text: string | null
  }
}

export type DashboardMetrics = {
  total_sections?: number
  passed_sections?: number
  review_pending?: number
  revision_required?: number
  completion_rate?: number
  total_users?: number
  active_users?: number
  pending_reviews?: number
  overall_completion_rate?: number
}

export type Label = {
  id: number
  name: string
  is_permanent: boolean
  start_date: string | null
  end_date: string | null
  user_labels_count?: number
}

export type UserLabelAssignment = {
  label_id: number
  start_date: string | null
  end_date: string | null
  label?: Label
}

export type PendingReviewUser = {
  id: number
  name: string
  email: string
  pending_count: number
  latest_submitted_at: string | null
}

export type Invitation = {
  id: number
  email: string
  role: Role
  label_id?: number | null
  token: string
  expires_at: string
  accepted_at: string | null
  created_at: string
}

export type Paginated<T> = {
  current_page: number
  data: T[]
  first_page_url: string
  from: number | null
  last_page: number
  last_page_url: string
  links: Array<{ url: string | null; label: string; active: boolean }>
  next_page_url: string | null
  path: string
  per_page: number
  prev_page_url: string | null
  to: number | null
  total: number
}
