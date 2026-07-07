const STEPS = [
  {
    num: '01',
    title: 'اختر المسار المناسب',
    desc: 'لمستواك وأهدافك',
    icon: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M7.8 7.8l2.1 2.1M14.1 14.1l2.1 2.1M16.2 7.8l-2.1 2.1M9.9 14.1l-2.1 2.1" stroke="#E8C76A" strokeWidth="1.6" strokeLinecap="round" />,
  },
  {
    num: '02',
    title: 'تعلم وتطور',
    desc: 'تعلم على يد نخبة من المعلمين',
    icon: <path d="M12 6.5c-1.7-1.1-3.8-1.6-6.5-1.6v12.6c2.7 0 4.8.5 6.5 1.6 1.7-1.1 3.8-1.6 6.5-1.6V4.9c-2.7 0-4.8.5-6.5 1.6ZM12 6.5v12.6" stroke="#E8C76A" strokeWidth="1.5" strokeLinejoin="round" />,
  },
  {
    num: '03',
    title: 'تدرب وتفاعل',
    desc: 'أنشطة وتدريبات تفاعلية ممتعة',
    icon: <path d="M9 3v3M15 3v3M5.5 8h13M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1ZM9 13l1.7 1.7L14 11" stroke="#E8C76A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />,
  },
  {
    num: '04',
    title: 'حقق هدفك',
    desc: 'أتقن المستويات واحصل على شهادتك',
    icon: <path d="M8 4h8v4a4 4 0 0 1-8 0V4ZM16 5.2h2.2A2.2 2.2 0 0 1 16 9.3M8 5.2H5.8A2.2 2.2 0 0 0 8 9.3M9 19h6M12 12v7" stroke="#E8C76A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />,
  },
]

export default function HeroJourneyStrip() {
  return (
    <div className="hero-journey" aria-label="رحلتك التعليمية في 4 خطوات">
      <div className="hero-journey__head">
        <span className="hero-journey__eyebrow">رحلتك التعليمية</span>
        <span className="hero-journey__title">في 4 خطوات</span>
      </div>

      <div className="hero-journey__steps">
        {STEPS.map((step, i) => (
          <div key={step.num} className="hero-journey__step">
            {i > 0 && <span className="hero-journey__divider" aria-hidden="true" />}
            <span className="hero-journey__num" aria-hidden="true">{step.num}</span>
            <span className="hero-journey__icon" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">{step.icon}</svg>
            </span>
            <div className="hero-journey__text">
              <div className="hero-journey__step-title">{step.title}</div>
              <div className="hero-journey__step-desc">{step.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
