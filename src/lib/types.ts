export type JobType = 'ai' | 'http' | 'code' | 'social' | 'storyteller'
export type RunStatus = 'running' | 'success' | 'failed'

export interface TelegramConfig {
  enabled: boolean
  bot_token?: string
  chat_id?: string
  post_links?: boolean        // social/storyteller
  notify_on?: string[]        // ai/http/code: ['success','failed']
}

export interface CronJob {
  id: string
  name: string
  description: string
  type: JobType
  schedule: string
  schedule_human: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: Record<string, any>
  enabled: boolean
  github_workflow_path?: string
  created_at: string
  last_run_at?: string
}

export interface CronRun {
  id: string
  job_id: string
  started_at: string
  completed_at?: string
  status: RunStatus
  output?: string
  error?: string
}

export interface PlatformPlaybook {
  id: string
  job_id: string
  platform: string
  rules: {
    dos: string[]
    donts: string[]
    best_length: string
    best_times: string
    shadowban_risks: string[]
    algorithm_notes: string
    niche_specific: string
  }
  researched_at: string
}

export interface Product {
  name: string
  description: string
  url: string
}
