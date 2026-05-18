# Design System Specification: AppealMD UI Standard

## 1. Overview and Creative North Star
**Creative North Star: Clinical Precision, Built for Trust**

This design system describes the UI as implemented in the product today. It is a focused, clinical, and motion-led experience that avoids generic SaaS layouts. The interface feels composed and deliberate, with layered surfaces, disciplined whitespace, and a signature atmospheric interaction. The UI must read as professional, confident, and efficient.

---

## 2. Color and Surface Tokens (Project-Specific Placeholders)
Colors are project-specific and must be defined per project. Do not copy values between projects. Use tokens only.

- **Primary accent:** `--color-clinical-blue` (project-specific)
- **Brand surface:** `--color-brand-navy` (project-specific)
- **Dark base surface:** `--color-dark-surface` (project-specific)
- **Light contrast surface:** `--color-light-contrast` (project-specific)
- **Secondary text:** `--color-secondary-text` (project-specific)
- **Dark surface text:** `--color-dark-text` (project-specific)

Token usage rules:
- Prefer tonal layering through surface tokens rather than hard dividers.
- Borders are low-contrast ghost borders on dark surfaces.
- The primary CTA uses a project-defined gradient between the brand surface and the primary accent.

---

## 3. Typography
Typography is consistent across landing, waitlist, and app screens.

- **Display and headlines:** Manrope
    - Hero headline: `clamp(2.2rem, 7vw, 3.5rem)` with tight tracking.
    - Section headers: `clamp(1.9rem, 4vw, 2.25rem)` with strong weight.
- **Body:** Work Sans
    - Body text uses relaxed line height and readable sizing (`text-base` to `text-lg`).
- **Labels and microcopy:** Inter
    - Uppercase labels use wide tracking.

---

## 4. Layout and Section Placement
Landing page section order is fixed and should remain consistent:

1. **Glass Navbar** (fixed)
2. **Hero** (full viewport height, centered headline)
3. **Payer Marquee** (social proof strip)
4. **How It Works** (two-column layout)
5. **Waitlist CTA** (centered form)

Waitlist page:
- Glass navbar at the top.
- Single centered card with headline, supporting copy, and compact waitlist form.

App page:
- Glass navbar at the top.
- Centered column containing the page intro, denial form, error state, and letter preview.

---

## 5. Interaction and Motion
Motion is controlled, deliberate, and consistent. Use the easing and timing below.

### Global easings
- Primary easing: `cubicBezier(0.16, 1, 0.3, 1)`
- Hero letter easing: `cubicBezier(0.34, 1.56, 0.64, 1)`

### Hero letter drop
- Each character animates from `y: -30` and `opacity: 0` to `y: 0` and `opacity: 1`.
- Duration: `0.6s`
- Stagger: `0.03s` per character.

### Atmospheric plus field (brand signature)
- Plus signs are tiled on a grid with `CELL_SIZE = 92` and sizes 12, 18, or 24.
- Cursor repel distance: `140px` with max offset of ~`25px` away from cursor.
- Click pulse radius: `150px`.
- Pulse animation per sign: opacity and scale dip (`1 -> 0 -> 1` and `1 -> 0.35 -> 1`).
- Pulse duration: `0.45s`, with delay scaled by distance to the click.
- Hover/idle motion duration: `0.28s`.
- Click state clears after ~`520ms`.

### Vertical reveal
- Used for section blocks on scroll.
- Initial: `opacity: 0.85`, `y: 18`.
- Animate to: `opacity: 1`, `y: 0`.
- Duration: `0.6s`, once per section, viewport amount `0.3`.

### Step cards (How It Works)
- Each step card animates in on scroll.
- Initial: `opacity: 0`, `y: 40`.
- Animate to: `opacity: 1`, `y: 0`.
- Duration: `0.7s`, delay per card `index * 0.15`.

### App page intro and form
- Intro block: `opacity: 0`, `y: 20` -> `opacity: 1`, `y: 0`, duration `0.6s`.
- Form block: `opacity: 0`, `y: 30` -> `opacity: 1`, `y: 0`, duration `0.7s`, delay `0.1s`.
- Error banner uses AnimatePresence with `y: 10` in/out, duration `0.35s`.

### Luminous preview hover
- Preview card scales to `1.03` on hover.
- Dark overlay fades to transparent on hover (group hover).

### Marquee
- Horizontal left-scroll loop with a 34s duration; 28s on small screens.
- Pauses on hover.

---

## 6. Component Standards

### Glass Navbar
- Fixed at top, full width, rounded pill container.
- Backdrop blur: 24px.
- Low-contrast border (ghost border) and semi-transparent surface.
- Left: logo lockup, right: secondary action and primary CTA.

### Buttons
- **Primary CTA**
    - Full pill shape, gradient fill between brand and accent tokens.
    - Hover: translate up by 2px and increase glow.
- **Secondary CTA**
    - Transparent background with ghost border.
    - Hover: soft surface tint.

### Cards and surfaces
- Rounded corners are large (2xl to 3xl).
- Surfaces are layered using low-opacity brand surfaces.
- Borders are ghost borders using low-contrast white alpha.
- Avoid hard dividers; use spacing.

### Forms
- Inputs are dark surface with ghost border.
- Focus: border shifts to accent token and adds a soft 3px ring.
- Waitlist checkbox uses a custom square with a plus sign when checked.

### Letter preview
- Default state shows a dashed empty-state panel.
- Generated state shows an editable textarea with a light paper surface and dark text token.
- Download button appears only when a letter is present.
- Loading state renders a skeleton pulse list.

---

## 7. Page-Specific Structure

### Landing Page
- **Hero**: full-height, centered stack, plus field background, subtle radial glow overlay, and a faint wordmark watermark behind the headline.
- **Marquee**: payer list with plus sign separators.
- **How It Works**: left column contains section label, header, and three animated step cards. Right column is a preview card with hover lift and overlay fade.
- **Waitlist CTA**: centered headline, supporting copy, and waitlist form.

### Waitlist Page
- Single centered card with label, headline, supporting text, and compact waitlist form.

### App Page
- Intro copy centered above the form.
- Denial form includes a privacy note panel, large textarea, and optional inputs in a two-column grid on larger screens.
- Error panel appears between form and preview when needed.
- Letter preview section follows the form and can show empty, loading, or editable states.

---

## 8. Do and Do Not

Do:
- Use the plus sign as a repeating motif.
- Keep copy short, clinical, and direct.
- Use tonal layering and spacing to separate content.
- Keep motion smooth and consistent with the primary easing.

Do not:
- Introduce hard, high-contrast borders.
- Use inconsistent easing curves or abrupt motion.
- Add stock medical imagery; use product UI only.
