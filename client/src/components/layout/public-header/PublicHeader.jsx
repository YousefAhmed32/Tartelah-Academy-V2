import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import useHeaderMorph from './useHeaderMorph.js'
import PublicHeaderShell from './PublicHeaderShell.jsx'
import PublicBrand from './PublicBrand.jsx'
import PublicDesktopNav from './PublicDesktopNav.jsx'
import PublicHeaderActions from './PublicHeaderActions.jsx'
import MobileNavTrigger from './MobileNavTrigger.jsx'
import MobileNavDrawer from './MobileNavDrawer.jsx'

// Adaptive chrome, not route-detection: every public hero (Home, Programs,
// Courses, Teachers, Pricing, Articles, About) is authored dark at the top
// specifically so the transparent hero-state shell with light/gold text
// stays legible (see ContactHero's own gradient comment). The one gap is
// article detail pages, which can open directly on a light background.
// Rather than special-casing routes, the shell carries its own bounded
// dark-to-transparent scrim at all times — legible everywhere, fragile
// nowhere.
//
// Composition is three explicit zones (brand / nav-core / actions), not a
// bare `justify-between` row: the nav core is a true `flex-1` centered
// zone, so it's optically balanced between brand and actions regardless of
// how wide either one is, and it compresses on its own as width tightens
// rather than the whole row renegotiating.
export default function PublicHeader() {
  const location = useLocation()
  const { progress, retreat } = useHeaderMorph()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const hamburgerRef = useRef(null)

  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])

  return (
    <>
      <PublicHeaderShell progress={progress} retreat={retreat}>
        <PublicBrand progress={progress} />
        <PublicDesktopNav />
        <div className="flex flex-none items-center gap-2.5">
          <PublicHeaderActions progress={progress} />
          <MobileNavTrigger triggerRef={hamburgerRef} open={drawerOpen} onOpen={() => setDrawerOpen(true)} />
        </div>
      </PublicHeaderShell>

      <MobileNavDrawer
        id="public-mobile-drawer"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        returnFocusRef={hamburgerRef}
      />
    </>
  )
}
