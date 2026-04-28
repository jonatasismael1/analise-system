---
name: Clinical Precision
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#3e4947'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#6e7977'
  outline-variant: '#bdc9c6'
  surface-tint: '#006a63'
  primary: '#005c55'
  on-primary: '#ffffff'
  primary-container: '#0f766e'
  on-primary-container: '#a3faef'
  inverse-primary: '#80d5cb'
  secondary: '#515f74'
  on-secondary: '#ffffff'
  secondary-container: '#d5e3fd'
  on-secondary-container: '#57657b'
  tertiary: '#005c54'
  on-tertiary: '#ffffff'
  tertiary-container: '#00776d'
  on-tertiary-container: '#91fdef'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#9cf2e8'
  primary-fixed-dim: '#80d5cb'
  on-primary-fixed: '#00201d'
  on-primary-fixed-variant: '#00504a'
  secondary-fixed: '#d5e3fd'
  secondary-fixed-dim: '#b9c7e0'
  on-secondary-fixed: '#0d1c2f'
  on-secondary-fixed-variant: '#3a485c'
  tertiary-fixed: '#89f5e7'
  tertiary-fixed-dim: '#6bd8cb'
  on-tertiary-fixed: '#00201d'
  on-tertiary-fixed-variant: '#005049'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  h1:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  h2:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  h3:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: '1.5'
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
  button:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 20px
  container-max: 1440px
---

## Brand & Style
The design system is anchored in the concept of **Clinical Precision**. It is designed for high-stakes healthcare environments where clarity, speed of cognition, and trust are paramount. The aesthetic rejects the playful trends of consumer tech in favor of a sophisticated, "Modern Corporate" approach that balances medical authority with contemporary software usability.

The visual narrative focuses on high-density information management delivered through a low-friction interface. By utilizing significant whitespace, a disciplined color application, and sharp execution of layout, the system evokes a sense of calm efficiency. It targets clinical administrators and healthcare providers who require a tool that feels like a professional medical instrument rather than a generic office suite.

## Colors
The palette is dominated by the primary **Verde-Teal**, a color that bridges the gap between traditional medical greens and modern tech teals, signifying both health and innovation. 

- **Primary (#0f766e):** Used for key actions, active states, and brand reinforcement.
- **Secondary (#334155):** A deep slate used for typography and structural elements to provide a grounded, professional contrast.
- **Surface Neutrals:** A range of cool grays (Slate 50-200) are used to define boundaries without the harshness of pure black or the flatness of pure white.
- **Functional Accents:** Status colors are slightly desaturated to remain legible within the professional palette while providing clear "At-a-Glance" diagnostic feedback.

## Typography
This design system utilizes **Inter** exclusively to ensure a systematic, utilitarian, and highly readable experience across all screen densities. The typographic scale is optimized for data-heavy views.

- **Headlines:** Use a tighter letter-spacing and heavier weights to establish a strong hierarchy.
- **Body Text:** Set at 14px for the standard UI to maximize information density while maintaining legibility. 
- **Labels:** Small caps are utilized for table headers and section labels to differentiate "metadata" from "user data."
- **Data Display:** Numerical values in tables should use tabular icons (lining figures) where possible to ensure columns of figures align perfectly for easier scanning.

## Layout & Spacing
The system follows an **8px linear grid** to maintain strict alignment and rhythmic consistency. 

- **Grid Model:** A 12-column fluid grid is used for main dashboard layouts, transitioning to fixed-width sidebars (240px - 280px).
- **Whitespace:** Generous external margins (24px - 32px) help prevent the UI from feeling claustrophobic, while internal component spacing remains tight (8px - 16px) to keep related medical data grouped logically.
- **Density:** Provide "Standard" and "Compact" spacing modes for data-heavy tables, allowing users to toggle based on their specific hardware or preference.

## Elevation & Depth
The design system employs **Tonal Layering** supplemented by **Low-Contrast Outlines**. Depth is used sparingly to indicate interactivity and stack order, rather than for decoration.

- **Level 0 (Base):** The canvas color (#f8fafc).
- **Level 1 (Cards/Surface):** White background with a 1px border (#e2e8f0). No shadow. This is the primary container for most content.
- **Level 2 (Active/Hover):** Very soft, ambient shadow (0px 4px 12px rgba(15, 118, 110, 0.05)).
- **Level 3 (Modals/Dropdowns):** Sharp 1px border with a medium-diffused shadow (0px 10px 25px rgba(51, 65, 85, 0.12)).

This approach ensures the interface feels "flat" and modern, avoiding the bulkiness of heavy shadows.

## Shapes
The shape language is **Soft and Precise**. A 4px base radius (roundedness: 1) is applied to most components. 

- **Buttons & Inputs:** 4px radius ensures they feel intentional and distinct.
- **Cards:** 8px radius (rounded-lg) provides a gentle container for large blocks of information.
- **Tabs:** Top-rounded only (4px) to anchor them to their content panels.
- **Status Pills:** Fully rounded (pill-shaped) to distinguish them from interactive buttons.

This subtle rounding prevents the "childish" look of high-radius components while avoiding the aggressive sharpness of 0px corners.

## Components

### Action Buttons
Buttons are the primary drivers of clinic efficiency. 
- **Primary:** Solid #0f766e with white text. High prominence, 40px height for standard actions.
- **Secondary:** Ghost style with #0f766e border and text. Used for less critical actions.
- **States:** Hover states should involve a slight darken (10%); active states a slight scale-down (98%) to provide tactile feedback.

### Refined Tables
Tables are the engine of the design system.
- **Header:** Light gray background (#f1f5f9) with uppercase 12px bold labels.
- **Rows:** 1px bottom border only (#f1f5f9). No alternating zebra stripes; use hover highlighting in a very pale teal (#f0fdfa) instead.
- **Cells:** Vertical padding of 12px (standard) or 8px (compact).

### Clean Cards
Cards act as discrete modules of information.
- **Styling:** White background, 1px border (#e2e8f0), no shadow unless hovered.
- **Header:** Include a subtle 1px bottom divider to separate the card title from its body content.

### Tabs
- **Style:** "Underline" style for main navigation tabs; "Segmented" (button-like) for filtering data views.
- **Interaction:** Active tabs use a 2px bottom border in #0f766e and a medium font weight to signal the current view.

### Input Fields
- **Design:** 1px border (#cbd5e1) with a 4px radius. 
- **Focus:** 1px border transitions to #0f766e with a subtle 2px teal outer glow. 
- **Labeling:** Always use persistent top-aligned labels; never rely on placeholder text for critical medical inputs.