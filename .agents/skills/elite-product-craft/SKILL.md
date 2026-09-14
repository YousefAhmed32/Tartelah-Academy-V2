---
name: elite-product-craft
description: "Codified elite engineering and UI/UX design intelligence synthesizing the strengths of Claude Code, ChatGPT Codex, and Gemini Coder. Implements Apple/Stripe/Linear craft standards, spatial box-model calculation, mobile-first stress testing, zero AI gimmickry, and rock-solid full-stack architectural integrity."
---

# Elite Product Craft & Engineering Intelligence

This skill codifies the top-tier mental models, design discipline, and engineering rigor observed across leading AI coding systems (**Claude Code**, **ChatGPT Codex**, and **Gemini Coder**) to ensure every line of code, form control, and layout matches the standard of **Founding CTO & Lead Product Architect**.

---

## 1. Competitive Architecture & Benchmark Analysis

| Dimension | Claude Code (Claude 3.5/3.7) | ChatGPT Codex (GPT-4o/o1) | Previous Antigravity / Gemini Coder | **Upgraded Target Standard** |
| :--- | :--- | :--- | :--- | :--- |
| **Visual Simulation & Spatial Math** | **10/10**: Mentally calculates `height - padding = inner box`, baseline offsets, and clipping before rendering. | **7.5/10**: Good layout structure, but sometimes relies on browser defaults. | **5.5/10**: Stamped `.field-light h-11` blindly, creating 12px clipped slits. | **10/10**: Zero height/padding collisions. Explicit `leading-normal` + `min-h-[44px]`. |
| **Enterprise SaaS Aesthetics** | **9.5/10**: Defaults to Stripe/Linear subtle borders (`border-slate-200/80`), refined micro-copy, 80/15/5 color formula. | **7.5/10**: Defaults to generic Tailwind forms (`bg-blue-500`, standard inputs) unless prompted. | **6.0/10**: Mixed disconnected pill buttons, raw unstyled inputs, unaligned cards. | **10/10**: Cohesive design system, unified control groups, crisp enterprise cards. |
| **Mobile-First Ergonomics** | **9.0/10**: Wraps dense rows, enforces 44px touch targets on small screens. | **8.0/10**: Good flex wrapping, but occasionally allows tight 7-column grids on 360px viewports. | **5.0/10**: Shoved 7 Arabic day buttons in one row, squishing them to 35px illegible dots. | **10/10**: Responsive column breakdown (`grid-cols-4 sm:grid-cols-7`), min 44px touch height. |
| **Edge Case & Backend Rigor** | **9.0/10**: Clean refactors and solid TypeScript typing. | **9.5/10**: Paranoid edge-case detection (timezones, null pointers, rollback states). | **8.5/10**: Strong test suites, fast query invalidations, but overlooked visual edge cases. | **9.8/10**: Deep data-layer paranoia + end-to-end visual sanity. |
| **Product Restraint (Anti-Hype)** | **9.5/10**: Minimalist, respects professional SaaS tone. | **8.5/10**: Occasionally adds decorative icons. | **5.0/10**: Injected unnecessary AI sparkle stars into serious administrative CRUD forms. | **10/10**: Strict ban on AI hype, sparkle stars, and decorative blur blobs in admin tools. |

---

## 2. Core Mental Models to Enforce

### Rule 1: The Pre-Render Box-Model Calculation (Preventing the Clipping Slit Bug)
- **The Formula**:
  $$\text{Usable Text Height} = \text{Specified Height} - (\text{Padding Top} + \text{Padding Bottom})$$
- Never combine `h-11` (44px) with `py-4` (32px padding). This leaves only 12px, destroying Arabic and Latin letter ascenders/descenders.
- For all form controls:
  - Standard Height: `h-11` (44px) or `min-h-[44px]`
  - Vertical Padding: `py-2.5` (10px top/bottom) or `py-2` (8px top/bottom)
  - Horizontal Padding: `ps-3.5 pe-10`
  - Explicit line-height: `leading-normal` or `leading-relaxed`
  - Native `<select>`: **Always** apply `appearance-none` with an explicit SVG chevron positioned at the physical end (`left-3` in RTL).

### Rule 2: Component Symmetry & Horizontal Balance
- When two form elements sit side-by-side (e.g. Teacher Card & Student Selector):
  - **Height parity**: Both containers must have the exact same bounding height (`h-11` or `h-12`).
  - **Border & radius parity**: Same `border-slate-200` and `rounded-xl`.
  - **Label baseline**: Both must have matching label bars with consistent helper/badge positions.

### Rule 3: Mobile Viewport Stress-Testing (360px - 430px)
- Never assume a desktop grid works on mobile:
  - 7 days of the week in 1 row: **BANNED on mobile**. Must wrap to `grid-cols-4 sm:grid-cols-7`.
  - Button touch targets: Must be $\ge 44\text{px} \times 44\text{px}$.
  - Modal action footers: Stack as `flex-col-reverse sm:flex-row` with primary button taking full width or priority.

### Rule 4: Data-Control Fusion (Unified Controls vs Disconnected Floating Inputs)
- Quick-preset buttons (`4 | 8 | 12 | 16 | 24`) and manual custom inputs must be visually and functionally fused:
  - Clicking a preset updates the number input and highlights the active pill.
  - Typing a number in the input automatically highlights the corresponding pill if it matches, or clearly signals "Custom".
  - Never place a disconnected, floating raw number input underneath pills without clear grouping and labels.

### Rule 5: Zero AI Gimmickry in Enterprise SaaS
- Strictly prohibited in SaaS and admin workflows:
  - `<Sparkles />` or AI star icons on administrative forms, tables, and buttons.
  - Decorative glow blobs (`blur-3xl`).
  - Multi-stop gradient text (`bg-clip-text text-transparent`).
  - Eastern Arabic-Indic numerals (`٠-٩`) in admin tables and forms (Latin `0-9` only).

---

## 3. Pre-Flight Verification Checklist Before Declaring "Done"

Before presenting any code or screen to the user, run through this 5-point gate:
1. **[ ] Visual Simulation**: Did I check the box-model? Is text baseline clipped in Arabic or English?
2. **[ ] Mobile Breakpoint**: Does this layout break, squish, or overflow at 360px width?
3. **[ ] Symmetry & Alignment**: Do neighboring fields align pixel-perfect in height, padding, and labels?
4. **[ ] Brand Compliance**: Is it 80% white / 15% soft gray / 5% brand accent? Western numerals only? Zero AI sparkles?
5. **[ ] Verification Suite**: Did client build succeed with 0 warnings/errors? Did automated backend tests pass 100%?
