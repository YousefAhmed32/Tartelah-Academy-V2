import Spinner from '../ui/Spinner.jsx'

export default function LoadingPage({ dark = false }) {
  return (
    <div className={`min-h-screen flex items-center justify-center ${dark ? 'bg-brand-dark' : 'bg-brand-light'}`}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-logo border-[1.5px] border-brand-goldBorder overflow-hidden flex items-center justify-center bg-[rgba(20,5,46,0.5)]">
          <img src="/logo-png.png" alt="ترتيلة" className="w-full h-full object-contain p-2" />
        </div>
        <Spinner size="lg" color="border-brand-gold" />
      </div>
    </div>
  )
}
