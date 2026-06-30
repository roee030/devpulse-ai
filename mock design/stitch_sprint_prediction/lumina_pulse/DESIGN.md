# Design System Specification: Editorial Tech Excellence

## 1. Overview & Creative North Star: "The Luminous Layer"
This design system moves away from the rigid, boxed-in layouts of the previous decade, embracing a "Luminous Layer" philosophy. The North Star is the concept of **Optical Depth**—where the UI feels less like a flat screen and more like a physical stack of semi-transparent, high-tech lenses. 

By leveraging intentional asymmetry, high-contrast typography scales, and a "Glassmorphism-first" approach, we create a high-end tech aesthetic that feels both approachable and hyper-modern. We break the "template" look by treating the white space not as a void, but as a breathable atmosphere that allows sophisticated typography to anchor the experience.

---

## 2. Colors & Surface Philosophy
The palette centers on a high-energy `primary` (#0058be) balanced by deep `secondary` violets and an expansive range of "Surface" tokens.

### The "No-Line" Rule
**Explicit Instruction:** Do not use 1px solid borders to define sections. Layout boundaries must be established through tonal shifts. For example, a `surface_container_low` section should sit directly on a `surface` background. The change in hex value provides a sophisticated, "borderless" transition that feels premium and integrated.

### Surface Hierarchy & Nesting
Treat the UI as a series of stacked sheets. Use the `surface_container` tiers to define depth:
- **Base Layer:** `surface` (#f7f9fb)
- **Secondary Sectioning:** `surface_container_low` (#f2f4f6)
- **Floating Interactive Elements:** `surface_container_lowest` (#ffffff)
- **Elevated Modals/Overlays:** `surface_bright` with 80% opacity and a 20px backdrop-blur.

### The "Glass & Gradient" Rule
Standard flat colors lack "soul." Main CTAs and Hero backgrounds should utilize subtle linear gradients:
- **Signature Gradient:** From `primary` (#0058be) to `primary_container` (#2170e4) at a 135-degree angle.
- **Glass Effect:** For floating navigation or cards, use `surface_container_lowest` at 70% opacity with a `backdrop-filter: blur(12px)`.

---

## 3. Typography: The Editorial Anchor
The system pairs the technical precision of **Inter** with the approachable, geometric elegance of **Manrope**.

*   **Display & Headlines (Manrope):** Use `display-lg` (3.5rem) and `headline-lg` (2rem) to create an authoritative, editorial feel. These should be set with tighter letter-spacing (-0.02em) to feel "custom-fitted."
*   **Body & Labels (Inter):** `body-lg` (1rem) provides maximum legibility. Use `label-md` (0.75rem) in All Caps with +0.05em tracking for auxiliary data to create a high-tech "metadata" aesthetic.
*   **Hierarchy Note:** Use dramatic scale shifts. A large `display-md` headline next to a small `body-sm` description creates the high-contrast tension found in premium digital lookbooks.

---

## 4. Elevation & Depth: Tonal Layering
We reject heavy, dark drop shadows in favor of light and atmosphere.

*   **The Layering Principle:** Achieve "lift" by nesting. Place a `surface_container_lowest` card inside a `surface_container_high` section. The natural contrast creates a soft "pop" without a single pixel of CSS shadow.
*   **Ambient Shadows:** If a shadow is required for a floating state, use a large spread (32px+) with a very low opacity (4%-6%). Use a tinted shadow: `rgba(0, 88, 190, 0.06)` (a primary-tinted shadow) to mimic real-world light refraction.
*   **The "Ghost Border" Fallback:** If a container needs further definition, use the `outline_variant` token at 15% opacity. **Never use 100% opaque borders.**
*   **Glassmorphism Depth:** When using glass containers, ensure a "shimmer" effect by adding a 1px top-inner-stroke using `on_surface_variant` at 10% opacity. This simulates the edge of a glass pane.

---

## 5. Components

### Buttons
- **Primary:** Gradient fill (`primary` to `primary_container`), `full` roundedness, white text. No shadow on rest; subtle `surface_tint` glow on hover.
- **Secondary:** Transparent background with a `Ghost Border` (outline-variant @ 20%).
- **Tertiary:** Pure text using `primary` color, with a 2px underline appearing only on hover.

### Cards & Lists
- **Rule:** Forbid divider lines.
- **Separation:** Use `spacing-6` (2rem) or `spacing-8` (2.75rem) to separate content chunks.
- **Visual Style:** Use `surface_container_lowest` with `xl` (1.5rem) corner radius. Apply a subtle `backdrop-blur` if the card is positioned over a gradient background.

### Input Fields
- **Default State:** `surface_container_high` background, `none` border, `md` (0.75rem) corner radius.
- **Active State:** 1px "Ghost Border" using `primary`. The background shifts to `surface_container_lowest`.

### Chips
- **Selection Chips:** Use `secondary_fixed` background with `on_secondary_fixed` text for a soft violet "high-end tech" highlight.

---

## 6. Do's and Don'ts

### Do:
- **Use Asymmetry:** Align a headline to the left and body text to a slightly offset right-column to create an editorial layout.
- **Embrace White Space:** Use the `24` (8.5rem) spacing token for top-level section padding to ensure the "Luminous" feel.
- **Layer Color:** Let secondary violet glows (`secondary_container`) sit behind primary blue elements to create depth.

### Don't:
- **No Heavy Borders:** Never use a solid #000000 or high-contrast border. It breaks the glass illusion.
- **No Flat Grays:** Use the `surface` tokens which are slightly blue-tinted (#f7f9fb) to maintain the "high-end tech" temperature.
- **No Default Shadows:** Avoid the standard `box-shadow: 0 2px 4px rgba(0,0,0,0.1)`. It feels dated and "out-of-the-box." Use the Ambient Shadow approach instead.