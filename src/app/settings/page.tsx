'use client'

export default function SettingsPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Settings</h1>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">About CronOS</h2>
        <p className="text-sm text-gray-600 mb-4">
          AI-powered cron job management dashboard. Configure jobs, connect
          Telegram notifications, and let AI handle the scheduling.
        </p>

        <div className="border-t border-gray-100 pt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Configuration</h3>
          <p className="text-sm text-gray-500">
            Telegram notifications and other settings are configured per-job
            during job creation.
          </p>
        </div>
      </div>
    </div>
  )
}
