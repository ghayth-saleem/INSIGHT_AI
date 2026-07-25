---
name: Obsidian Intelligence
colors:
  surface: '#13131b'
  surface-dim: '#13131b'
  surface-bright: '#393842'
  surface-container-lowest: '#0d0d16'
  surface-container-low: '#1b1b24'
  surface-container: '#1f1f28'
  surface-container-high: '#292932'
  surface-container-highest: '#34343e'
  on-surface: '#e4e1ee'
  on-surface-variant: '#d8c3ad'
  inverse-surface: '#e4e1ee'
  inverse-on-surface: '#302f39'
  outline: '#a08e7a'
  outline-variant: '#534434'
  surface-tint: '#ffb95f'
  primary: '#ffc174'
  on-primary: '#472a00'
  primary-container: '#f59e0b'
  on-primary-container: '#613b00'
  inverse-primary: '#855300'
  secondary: '#c8c5cf'
  on-secondary: '#303038'
  secondary-container: '#494851'
  on-secondary-container: '#b9b7c1'
  tertiary: '#8fd5ff'
  on-tertiary: '#00344a'
  tertiary-container: '#1abdff'
  on-tertiary-container: '#004966'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffddb8'
  primary-fixed-dim: '#ffb95f'
  on-primary-fixed: '#2a1700'
  on-primary-fixed-variant: '#653e00'
  secondary-fixed: '#e4e1ec'
  secondary-fixed-dim: '#c8c5cf'
  on-secondary-fixed: '#1b1b22'
  on-secondary-fixed-variant: '#47464e'
  tertiary-fixed: '#c5e7ff'
  tertiary-fixed-dim: '#7fd0ff'
  on-tertiary-fixed: '#001e2d'
  on-tertiary-fixed-variant: '#004c6a'
  background: '#13131b'
  on-background: '#e4e1ee'
  surface-variant: '#34343e'
  surface-card: '#0d0d14'
  sidebar-bg: '#09090f'
  anomaly-cyan: '#06b6d4'
  engagement-violet: '#8b5cf6'
  trend-emerald: '#10b981'
  sentiment-rose: '#f43f5e'
  border-subtle: rgba(255, 255, 255, 0.06)
  inner-glow-amber: rgba(245, 158, 11, 0.1)
typography:
  headline-xl:
    fontFamily: Syne
    fontSize: 40px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: 0.02em
  headline-lg:
    fontFamily: Syne
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: 0.02em
  headline-md:
    fontFamily: Syne
    fontSize: 20px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: 0.01em
  data-display:
    fontFamily: Space Mono
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: -0.02em
  data-label:
    fontFamily: Space Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: 0.05em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: 0em
  mono-ui:
    fontFamily: Space Mono
    fontSize: 11px
    fontWeight: '400'
    lineHeight: '1.2'
    letterSpacing: 0em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  sidebar-collapsed: 64px
  sidebar-expanded: 240px
  gutter: 24px
  container-padding: 32px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 24px
---

## Brand & Style

This design system embodies a high-performance, technical aesthetic tailored for elite data analysts and engineers. It is defined by an **Ultra-Dark Minimalism**—an "Obsidian" style that prioritizes content and data clarity over decorative elements. The brand personality is precise, authoritative, and sophisticated, drawing heavy inspiration from developer-centric tools like Linear and Vercel.

The visual narrative is built on extreme dark surfaces, crisp 1px borders, and a stark contrast between monochromatic backgrounds and vibrant, functional accent colors. Every element is designed to feel like a high-end instrument: silent, powerful, and devoid of unnecessary ornamentation.

## Colors

The palette is anchored in an "Ultra-Dark" spectrum to reduce eye strain during deep work. The primary background uses the deepest obsidian, while surface tiers are created through slight shifts in hex values rather than traditional elevation shadows.

Functional color is used sparingly but with high intent. The **Amber** primary accent is reserved for global actions and critical focus states. Module-specific accents—**Cyan, Violet, Emerald, and Rose**—are used exclusively to categorize data types (Anomaly, Engagement, Trends, and Sentiment), ensuring users can orient themselves instantly within the dashboard. No gradients are permitted; color must be applied in flat, solid fills or crisp strokes.

## Typography

The typography strategy uses a "High-Contrast Pairing" to distinguish between narrative branding and technical utility. 

1.  **Syne:** Used for all major headlines. It must be bold and uppercase to create a structural, architectural feel for the page titles.
2.  **Space Mono:** The "workhorse" for all data-driven content. Every number, KPI, label, and metadata string must use Space Mono. This ensures tabular alignment and reinforces the "terminal" aesthetic.
3.  **Inter:** Used for descriptive text and UI labels where readability is paramount. 

Maintain strict adherence to uppercase styling for labels to emphasize the technical nature of the dashboard.

## Layout & Spacing

The layout follows a **Fixed-Sidebar Fluid-Content** model. The sidebar remains collapsed by default to maximize the analytical canvas, expanding only on user intent. 

The dashboard relies on a 12-column grid for desktop views with a "Stacking" philosophy. Elements are grouped into modules with consistent 24px gutters. Spacing is strictly mathematical, using an 8px base unit. 

**Breakpoints:**
- **Desktop (1440px+):** Full 12-column grid, 32px margins.
- **Laptop (1024px):** 8-column grid, 24px margins.
- **Mobile (Below 768px):** Single-column stack, sidebar transforms into a bottom-anchored navigation bar.

## Elevation & Depth

This design system rejects traditional drop shadows in favor of **Tonal Layering and Inner Glows**. 

- **Surface Levels:** Depth is communicated by color steps: `#07070f` (Level 0 - Background) -> `#09090f` (Level 1 - Sidebar) -> `#0d0d14` (Level 2 - Cards/Modules).
- **Subtle Borders:** All interactive or distinct containers must use a `1px` solid border with the value `rgba(255, 255, 255, 0.06)`. This creates a "sharp" wireframe feel.
- **Inner Glows:** On hover, buttons and cards should not rise; instead, they receive a subtle `inset 0 0 12px` glow using the primary Amber or the relevant module accent color at 10% opacity.

## Shapes

The shape language is "Soft-Mechanical." We avoid sharp 0px corners to prevent the UI from feeling aggressive, but we strictly avoid "cartoonish" high-radius curves. 

All cards and main UI containers use a `4px` (0.25rem) radius. Smaller components like input fields or tags use a `2px` radius. This maintains a disciplined, professional appearance that feels structured and precise.

## Components

- **Cards:** Use `#0d0d14` background with a `1px` border. No shadows. Titles should be in `headline-md` (Syne).
- **Buttons:** 
    - *Primary:* Amber background, black text (Space Mono), 2px radius. 
    - *Ghost:* Transparent background, 1px border `rgba(255, 255, 255, 0.1)`, Amber text.
- **Inputs:** Darker background than the card (`#07070f`), 1px border. Focus state changes border to Amber with a subtle inner glow.
- **Data Tables:** No vertical borders. Horizontal borders use the standard `1px` subtle white. Header text in `data-label` (Space Mono) with 50% opacity.
- **KPI Modules:** Large display numbers in `data-display`. The "trend" indicator (up/down) uses the specific module color (e.g., Emerald for positive trends) without background fills.
- **Status Chips:** Small, rectangular tags with 2px radius. No icons or emojis. Uses `mono-ui` typography.
- **Sidebar:** Collapsed width of 64px. Icons only. Active state indicated by a 2px vertical Amber line on the left edge.