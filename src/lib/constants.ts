import { JobType, RunStatus } from './types'

export const JOB_TYPE_STYLES: Record<JobType, { bg: string; text: string; border: string; label: string }> = {
  ai:          { bg: '#EEEDFE', text: '#3C3489', border: '#AFA9EC', label: 'AI' },
  http:        { bg: '#E1F5EE', text: '#085041', border: '#5DCAA5', label: 'HTTP' },
  code:        { bg: '#F1EFE8', text: '#444441', border: '#B4B2A9', label: 'Code' },
  social:      { bg: '#FAEEDA', text: '#633806', border: '#EF9F27', label: 'Social' },
  storyteller: { bg: '#FAECE7', text: '#712B13', border: '#F0997B', label: 'Storyteller' },
}

export const RUN_STATUS_COLORS: Record<RunStatus, string> = {
  running: '#EAB308',
  success: '#22C55E',
  failed:  '#EF4444',
}

export const WIZARD_STEPS = ['Describe', 'Clarify', 'Telegram', 'Review']

export const EXAMPLE_CHIPS = [
  'Send me a daily AI summary of top Hacker News posts',
  'Check if my website is up every 5 minutes and alert me',
  'Post a Twitter thread about indie hacking every morning',
  'Run a JavaScript health check on my API every hour',
  'Share my founder journey on LinkedIn every weekday',
  'Monitor a competitor website and notify me of changes',
]
