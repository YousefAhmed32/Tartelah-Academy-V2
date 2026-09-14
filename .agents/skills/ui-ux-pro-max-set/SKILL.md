---
name: ui-ux-pro-max-set
description: "Comprehensive UI/UX Pro Max design intelligence suite for Tartelah Online. Covers web, mobile, RTL Arabic typography, Framer Motion interactions, color palettes, spacing tokens, and component accessibility. Use whenever designing, reviewing, or styling any interface component."
---

# UI/UX Pro Max Design Intelligence Suite (Tartelah Academy)

This skill integrates the complete **UI/UX Pro Max** design intelligence system directly into Tartelah Online, ensuring all screens, widgets, and micro-interactions adhere to modern design standards, high-contrast accessible typography, RTL layout rules, and smooth Framer Motion physics.

## Core Capabilities & Datasets
- **79 Design Styles**: Clean modern SaaS, Glassmorphism, Brutalism, Minimalist, Dashboard Elite, Card-based, etc.
- **192 Product Palettes & Color Theory**: Primary `#7c6aaa`, deep plum, emerald accents, dark contrast text (`#1f1147` / `#2d234d`).
- **74 Font Pairings**: Arabic typography (Tajawal, Cairo, Amiri) paired with clean geometric Latin fonts (Inter, Plus Jakarta Sans).
- **119 UX Guidelines**: Form validation, error summaries, accessible touch targets (min 44px), instant visual feedback, auto-focus, keyboard navigation.
- **RTL & Bidirectional (BiDi) Mastery**: Native logical CSS properties (`ms-`, `me-`, `start-`, `end-`), correct icon mirroring, localized date/time.
- **Motion Design & Micro-Interactions**: Framer Motion entrance choreography, layout animations, drag-and-drop lists (`Reorder.Group`), spring physics (`stiffness: 300, damping: 25`).

## Non-Negotiable Craft Standards (Benchmarked vs Claude Code & Codex)
1. **Pre-Render Box-Model Calculation**:
   - Never combine explicit `h-*` with conflicting `py-*` (prevents text clipping bugs in native `<select>` and inputs).
   - Ensure native `<select>` elements use `appearance-none` with custom SVG chevron positioned on the physical end (`left-3` in RTL).
2. **Accessibility & Contrast**:
   - Never use low-contrast text on light backgrounds (maintain at least 4.5:1 contrast ratio).
   - Use Western Latin numerals (`0-9`) across all dashboards, tables, and modal metrics.
3. **Mobile-First Responsiveness**:
   - Stress test views at 360px width.
   - Weekday button pickers must wrap (`grid-cols-4 sm:grid-cols-7`), never squish 7 buttons in one row on mobile.
   - Touch targets must be $\ge 44\text{px}$.
4. **Data-Control Fusion**:
   - Quick-select pills and custom numeric inputs must be visually and functionally connected, not placed as disconnected orphan elements.
5. **Zero AI Gimmickry in Enterprise SaaS**:
   - Strictly ban `<Sparkles />` or AI star icons on administrative forms, buttons, and tables.
   - Strictly ban glowing blur blobs (`blur-3xl`) and multi-stop gradient text in admin dashboards.
6. **No Mock/Dummy Fallbacks**:
   - All interactive controls must link to real backend APIs with optimistic cache updates and error recovery.
