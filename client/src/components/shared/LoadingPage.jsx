import Spinner from '../ui/Spinner.jsx'

export default function LoadingPage({ dark = false }) {
  return (
    <div className={`min-h-screen flex items-center justify-center ${dark ? 'bg-brand-dark' : 'bg-brand-light'}`}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-logo border-[1.5px] border-brand-goldBorder flex items-center justify-center bg-[rgba(20,5,46,0.5)]">
          <LogoIcon />
        </div>
        <Spinner size="lg" color="border-brand-gold" />
      </div>
    </div>
  )
}

function LogoIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 32 32" fill="none">
      <circle cx="24.5" cy="6" r="2.4" stroke="#E8C76A" strokeWidth="1.4"/>
      <path d="M16 6.5c2.6 0 4.2 2 4.2 4.2H11.8C11.8 8.5 13.4 6.5 16 6.5Z" stroke="#E8C76A" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M16 8.7v2.2" stroke="#E8C76A" strokeWidth="1.4"/>
      <path d="M8 27V15.5c0-1 .6-1.9 1.5-2.3L16 10l6.5 3.2c.9.4 1.5 1.3 1.5 2.3V27" stroke="#E8C76A" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M13.2 27v-4.4c0-1.5 1.2-2.7 2.8-2.7s2.8 1.2 2.8 2.7V27" stroke="#E8C76A" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M5.5 27h21" stroke="#E8C76A" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  )
}
