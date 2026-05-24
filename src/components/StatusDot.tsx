import { RunStatus } from '@/lib/types'
import { RUN_STATUS_COLORS } from '@/lib/constants'

export default function StatusDot({ status }: { status?: RunStatus }) {
  const color = status ? RUN_STATUS_COLORS[status] : '#9CA3AF'

  return (
    <span
      className="inline-block w-2 h-2 rounded-full flex-shrink-0"
      style={{ backgroundColor: color }}
      title={status || 'no runs'}
    />
  )
}
