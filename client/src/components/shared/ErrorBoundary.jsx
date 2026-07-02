import { Component } from 'react'
import { AlertOctagon, RotateCw } from 'lucide-react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    // Surfaced to the console for diagnosis; a future session can wire this to a logging service.
    console.error('[ErrorBoundary]', error, info)
  }

  componentDidUpdate(prevProps) {
    // Auto-recover when the route changes (resetKey), so a crash on one page
    // doesn't keep the fallback stuck after the user navigates away.
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false })
    }
  }

  handleReset = () => {
    this.setState({ hasError: false })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white rounded-2xl border border-gray-100 shadow-sm min-h-[40vh]">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 bg-red-50">
            <AlertOctagon size={26} strokeWidth={1.6} className="text-red-500" />
          </div>
          <h3 className="font-heading font-bold text-lg mb-2 text-gray-900">حدث خطأ غير متوقع</h3>
          <p className="text-sm max-w-sm text-gray-500">
            واجهت الصفحة مشكلة أثناء العرض. حاول مرة أخرى — بياناتك وحسابك بأمان.
          </p>
          <button
            onClick={this.handleReset}
            className="mt-5 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-violet-600 hover:bg-violet-700 transition-colors"
          >
            <RotateCw size={14} /> إعادة المحاولة
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
