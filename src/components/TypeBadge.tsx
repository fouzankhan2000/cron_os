import { JobType } from '@/lib/types'
import { JOB_TYPE_STYLES } from '@/lib/constants'

export default function TypeBadge({ type, size = 'sm' }: { type: JobType; size?: 'sm' | 'md' }) {
  const style = JOB_TYPE_STYLES[type]
  const sizeClasses = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1'

  return (
    <span
      className={`inline-flex items-center font-medium rounded-md border ${sizeClasses}`}
      style={{ backgroundColor: style.bg, color: style.text, borderColor: style.border }}
    >
      {style.label}
    </span>
  )
}
