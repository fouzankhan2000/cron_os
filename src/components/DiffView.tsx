// eslint-disable-next-line @typescript-eslint/no-explicit-any
function flattenObject(obj: Record<string, any>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {}
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (obj[key] !== null && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
      Object.assign(result, flattenObject(obj[key], fullKey))
    } else {
      result[fullKey] = JSON.stringify(obj[key])
    }
  }
  return result
}

export default function DiffView({
  oldConfig,
  newConfig,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  oldConfig: Record<string, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  newConfig: Record<string, any>
}) {
  const oldFlat = flattenObject(oldConfig)
  const newFlat = flattenObject(newConfig)
  const allKeys = Array.from(new Set([...Object.keys(oldFlat), ...Object.keys(newFlat)]))

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
        <h4 className="text-sm font-medium text-gray-700">Changes</h4>
      </div>
      <div className="divide-y divide-gray-100">
        {allKeys.map((key) => {
          const oldVal = oldFlat[key]
          const newVal = newFlat[key]
          if (oldVal === newVal) return null

          return (
            <div key={key} className="px-4 py-2">
              <span className="text-xs font-mono text-gray-500">{key}</span>
              <div className="mt-1 space-y-0.5">
                {oldVal !== undefined && (
                  <div className="text-sm text-gray-400 line-through">{oldVal}</div>
                )}
                {newVal !== undefined && (
                  <div className="text-sm text-green-700 bg-green-50 rounded px-1.5 py-0.5 inline-block">{newVal}</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
