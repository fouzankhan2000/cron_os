import { JobType } from '@/lib/types'

function ConfigRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</dt>
      <dd className="text-sm text-gray-900">{value}</dd>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderConfig(type: JobType, config: Record<string, any>) {
  switch (type) {
    case 'ai':
      return (
        <>
          <ConfigRow label="Prompt" value={<pre className="whitespace-pre-wrap font-mono text-xs bg-gray-50 rounded p-2 mt-1">{config.prompt || '—'}</pre>} />
        </>
      )
    case 'http':
      return (
        <>
          <ConfigRow label="URL" value={<code className="text-xs font-mono">{config.url || '—'}</code>} />
          <ConfigRow label="Method" value={config.method || 'GET'} />
          {config.headers && Object.keys(config.headers).length > 0 && (
            <ConfigRow label="Headers" value={<pre className="text-xs font-mono bg-gray-50 rounded p-2 mt-1">{JSON.stringify(config.headers, null, 2)}</pre>} />
          )}
        </>
      )
    case 'code':
      return (
        <>
          <ConfigRow label="Language" value={config.language || 'javascript'} />
          <ConfigRow label="Code" value={<pre className="whitespace-pre-wrap font-mono text-xs bg-gray-50 rounded p-2 mt-1">{config.code || '—'}</pre>} />
        </>
      )
    case 'social':
      return (
        <>
          <ConfigRow label="Topic" value={config.topic || '—'} />
          <ConfigRow label="Tone" value={config.tone || '—'} />
          {config.platforms && (
            <ConfigRow label="Platforms" value={Object.keys(config.platforms).filter(p => config.platforms[p]?.enabled).join(', ') || '—'} />
          )}
        </>
      )
    case 'storyteller':
      return (
        <>
          <ConfigRow label="Founder" value={config.founder_name || '—'} />
          <ConfigRow label="Niche" value={config.niche || '—'} />
          {config.products?.length > 0 && (
            <ConfigRow label="Products" value={config.products.map((p: { name: string }) => p.name).join(', ')} />
          )}
          <ConfigRow label="Tone" value={config.tone_notes || '—'} />
          {config.platforms && (
            <ConfigRow label="Platforms" value={Object.keys(config.platforms).filter(p => config.platforms[p]?.enabled).join(', ') || '—'} />
          )}
        </>
      )
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function ConfigCard({ config, type }: { config: Record<string, any>; type: JobType }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h4 className="text-sm font-medium text-gray-700 mb-3">Configuration</h4>
      <dl className="space-y-3">
        {renderConfig(type, config)}
      </dl>
    </div>
  )
}
