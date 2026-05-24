'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useJobs } from '@/hooks/useJobs'
import TypeBadge from '@/components/TypeBadge'

export default function Sidebar() {
  const pathname = usePathname()
  const { jobs, loading } = useJobs()

  const activeJobId = pathname.match(/^\/jobs\/([^/]+)/)?.[1]

  return (
    <aside className="w-[280px] h-screen flex flex-col bg-white border-r border-gray-200 flex-shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-semibold text-gray-900 text-lg">CronOS</span>
          {!loading && (
            <span className="ml-auto text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
              {jobs.length}
            </span>
          )}
        </div>
        <Link
          href="/jobs/new"
          className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New job
        </Link>
      </div>

      {/* Job list */}
      <div className="flex-1 overflow-y-auto sidebar-scroll p-2">
        {loading ? (
          <div className="space-y-2 p-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-3/4 mb-1" />
                <div className="h-3 bg-gray-50 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No jobs yet</p>
        ) : (
          <div className="space-y-0.5">
            {jobs.map((job) => (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className={`block px-3 py-2.5 rounded-lg transition-colors ${
                  activeJobId === job.id
                    ? 'bg-purple-50 border-l-2 border-purple-600'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <TypeBadge type={job.type} size="sm" />
                  <span className="text-sm font-medium text-gray-900 truncate">{job.name}</span>
                </div>
                <p className="text-xs text-gray-500 pl-0.5">{job.schedule_human}</p>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-100">
        <Link
          href="/settings"
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Settings
        </Link>
      </div>
    </aside>
  )
}
