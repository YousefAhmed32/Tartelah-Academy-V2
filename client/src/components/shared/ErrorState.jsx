import { AlertTriangle, RotateCw } from 'lucide-react'

export default function ErrorState({
  title = 'تعذّر تحميل البيانات',
  description = 'حدث خطأ أثناء الاتصال بالخادم. يرجى المحاولة مرة أخرى.',
  onRetry,
  isRetrying = false,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white rounded-2xl border border-gray-100 shadow-sm">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 bg-red-50">
        <AlertTriangle size={26} strokeWidth={1.6} className="text-red-500" />
      </div>
      <h3 className="font-heading font-bold text-lg mb-2 text-gray-900">{title}</h3>
      <p className="text-sm max-w-sm text-gray-500">{description}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          disabled={isRetrying}
          className="mt-5 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-violet-600 hover:bg-violet-700 transition-colors disabled:opacity-60"
        >
          <RotateCw size={14} className={isRetrying ? 'animate-spin' : ''} />
          {isRetrying ? 'جارٍ إعادة المحاولة...' : 'إعادة المحاولة'}
        </button>
      )}
    </div>
  )
}
