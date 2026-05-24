export default function ProgressBar({ currentStep, steps }: { currentStep: number; steps: string[] }) {
  return (
    <div className="flex items-center w-full max-w-2xl mx-auto mb-8">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors ${
                i < currentStep
                  ? 'bg-purple-600 border-purple-600 text-white'
                  : i === currentStep
                  ? 'border-purple-600 text-purple-600 bg-white'
                  : 'border-gray-300 text-gray-400 bg-white'
              }`}
            >
              {i < currentStep ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            <span className={`text-xs mt-1.5 ${i <= currentStep ? 'text-purple-600 font-medium' : 'text-gray-400'}`}>
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`flex-1 h-0.5 mx-2 mt-[-1rem] ${
                i < currentStep ? 'bg-purple-600' : 'bg-gray-200'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  )
}
