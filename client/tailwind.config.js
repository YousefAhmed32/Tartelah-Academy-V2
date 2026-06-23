/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          // Dark backgrounds (marketing + teacher/admin dashboards)
          darkest: '#0c0419',
          dark: '#0f0226',
          dark2: '#120526',
          dark3: '#150232',
          dark4: '#160734',
          // Sidebar / medium dark
          sidebar: '#1d0a3f',
          sidebar2: '#160730',
          sidebar3: '#22103f',
          sidebar4: '#180a32',
          sidebar5: '#1c0d39',
          sidebar6: '#140628',
          // Card dark
          card: '#241342',
          card2: '#1d0e3a',
          // Light backgrounds (student dashboard, AI assistant)
          light: '#f6f4fb',
          light2: '#ece9f9',
          light3: '#F6F4FB',
          lightCard: '#fdfcff',
          // Gold
          gold: '#E8C76A',
          goldDark: '#D4AF37',
          goldText: '#2a1500',
          goldBorder: 'rgba(212,175,55,0.45)',
          goldBorder2: 'rgba(212,175,55,0.6)',
          // Purple
          purple: '#7c3aed',
          purpleDark: '#5b21b6',
          purpleDeep: '#6d28d9',
          purpleLight: '#8b5cf6',
          // Text
          textWhite: '#E7E0F5',
          textMuted: '#b3a4d0',
          textMuted2: '#a78fd6',
          textMuted3: '#cdbef0',
          textMuted4: '#b1a0d6',
          textBody: '#1f1147',
          textBody2: '#1A0447',
        },
      },
      fontFamily: {
        heading: ['Cairo', 'sans-serif'],
        body: ['Tajawal', 'sans-serif'],
        quran: ['Amiri', 'serif'],
      },
      fontSize: {
        'fluid-sm': 'clamp(13px, 1.2vw, 15px)',
        'fluid-base': 'clamp(15px, 1.4vw, 17px)',
        'fluid-lg': 'clamp(17px, 1.6vw, 20px)',
        'fluid-xl': 'clamp(20px, 2vw, 24px)',
        'fluid-2xl': 'clamp(24px, 3vw, 32px)',
        'fluid-3xl': 'clamp(32px, 4vw, 48px)',
        'fluid-hero': 'clamp(40px, 5.8vw, 82px)',
      },
      borderRadius: {
        card: '22px',
        'card-sm': '18px',
        nav: '14px',
        btn: '30px',
        'btn-lg': '38px',
        logo: '15px',
      },
      boxShadow: {
        gold: '0 14px 34px rgba(212,175,55,0.42)',
        'gold-sm': '0 10px 26px rgba(212,175,55,0.4)',
        purple: '0 12px 26px rgba(124,58,237,0.42)',
        'purple-sm': '0 10px 24px rgba(124,58,237,0.4)',
        card: '0 12px 34px rgba(31,17,71,0.06)',
        'card-dark': '0 22px 46px rgba(0,0,0,0.4)',
        lift: '0 20px 44px rgba(31,17,71,0.13)',
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #E8C76A, #D4AF37)',
        'purple-gradient': 'linear-gradient(135deg, #7c3aed, #5b21b6)',
        'sidebar-gradient': 'linear-gradient(185deg, #1d0a3f 0%, #160730 100%)',
        'sidebar-teacher': 'linear-gradient(195deg, #22103f, #180a32)',
        'sidebar-admin': 'linear-gradient(190deg, #1c0d39, #140628)',
        'page-dark': 'linear-gradient(165deg, #1d0c3a 0%, #150729 60%, #10061f 100%)',
        'page-admin': 'linear-gradient(160deg, #1a0a36 0%, #120526 55%, #0c0419 100%)',
        'page-light': 'radial-gradient(120% 80% at 15% 20%, #f3effc 0%, #e7e2f7 50%, #ddd6f2 100%)',
      },
      animation: {
        'fade-up': 'fadeUp 0.8s cubic-bezier(0.2,0.7,0.2,1) both',
        'fade-up-fast': 'fadeUp 0.5s cubic-bezier(0.2,0.7,0.2,1) both',
        'float': 'floaty 5s ease-in-out infinite',
        'float-fast': 'floaty 2.4s ease-in-out infinite',
        'glow': 'glowpulse 2s ease-in-out infinite',
        'spin-slow': 'spinslow 8s linear infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'msg-in': 'msgIn 0.4s cubic-bezier(0.2,0.7,0.2,1) both',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(26px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        floaty: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-14px)' },
        },
        glowpulse: {
          '0%, 100%': { opacity: '0.55' },
          '50%': { opacity: '1' },
        },
        spinslow: {
          to: { transform: 'rotate(360deg)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        msgIn: {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      transitionTimingFunction: {
        premium: 'cubic-bezier(0.2, 0.7, 0.2, 1)',
      },
    },
  },
  plugins: [],
}
