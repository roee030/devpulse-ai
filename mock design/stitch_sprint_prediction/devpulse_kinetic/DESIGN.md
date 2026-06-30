# Design System Specification: The Command Center

## 1. Overview & Creative North Star
**Creative North Star: "The Kinetic Intelligence Hub"**

This design system is engineered to move beyond the static "dashboard" trope. It is a high-performance environment designed for engineering leadership—where data isn't just displayed, but felt. We reject the "flat web" aesthetic in favor of a **Kinetic Intelligence** look: a sophisticated, multi-layered interface that feels like a physical command console. 

We break the "template" look through **intentional depth and tonal shifts**. By utilizing a high-contrast dark theme paired with surgical precision in typography, we create an experience that is authoritative, agile, and premium. The system prioritizes "Information Density with Breathability," ensuring that complex data remains legible through generous white space and sophisticated layering rather than rigid, boxed-in grids.

---

## 2. Colors & Surface Philosophy

Our palette is rooted in the deep void of engineering logic (`background: #060e20`), punctuated by high-vibrancy "Status Signals."

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders to section off the UI. 
Structure must be achieved through **Tonal Transitions**. To separate a sidebar from a main content area, shift the background from `surface` (#060e20) to `surface-container-low` (#091328). This creates a sophisticated, "etched" look rather than a boxed-in feel.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. Use the following tiers to define importance:
- **Level 0 (Base):** `surface` (#060e20) – The foundational canvas.
- **Level 1 (Sub-sections):** `surface-container-low` (#091328) – De-emphasized areas (e.g., secondary navigation).
- **Level 2 (Main Cards):** `surface-container` (#0f1930) – The primary data container.
- **Level 3 (Interactive/Active):** `surface-container-high` (#141f38) – Hover states or active modals.

### The "Glass & Gradient" Rule
To elevate main CTAs and hero data points, use **Signature Textures**:
- **CTAs:** Transition from `primary` (#a3a6ff) to `primary-dim` (#6063ee) at a 135-degree angle.
- **Glassmorphism:** For floating panels (e.g., global search), use `surface-container-highest` with a `0.8` opacity and a `20px` backdrop-blur. This allows the "glow" of underlying data to bleed through, maintaining a sense of spatial awareness.

---

## 3. Typography: The Editorial Edge

The type system blends the technical precision of `Space Grotesk` with the clean, Swiss-inspired readability of `Inter` and `Manrope`.

*   **Display & Headlines (The Authoritative Voice):** Use **Manrope**. It provides a high-end, geometric feel that looks "custom" compared to standard system fonts. 
    *   *Display-LG:* 3.5rem. Use for mission-critical metrics (e.g., "99.9% Uptime").
*   **Titles & Body (The Narrative):** Use **Inter**. It is optimized for screen legibility at small sizes.
    *   *Title-MD:* 1.125rem. Use for card headings.
*   **Labels & Data (The Technical Precision):** Use **Space Grotesk**. This is our "signature" font. Its tabular qualities make it perfect for status labels and numerical data, lending the UI a "monospaced-chic" aesthetic.

---

## 4. Elevation & Depth

### The Layering Principle
Forget drop shadows for every element. Depth is achieved by **stacking**. A `surface-container-lowest` card sitting on a `surface-container` section creates a natural "sunken" or "lifted" feel without visual clutter.

### Ambient Shadows
For floating elements (Modals/Popovers), use a **Tinted Ambient Shadow**:
- **Blur:** 40px - 60px.
- **Color:** `on-primary` (#0f00a4) at 5% opacity.
- **Result:** A soft, indigo-tinted glow that feels like light refracting off the screen, not a grey smudge.

### The "Ghost Border" Fallback
If a border is required for accessibility:
- Use `outline-variant` (#40485d) at **15% opacity**.
- It should be "felt, not seen." High-contrast borders are strictly forbidden.

---

## 5. Component Logic

### Cards: The Data Vessel
- **Background:** `surface-container`.
- **Status Border:** A 4px vertical bar on the extreme left using Status colors (`secondary` for Success, `error` for Danger).
- **Hover:** Transition background to `surface-container-high` and apply a subtle `primary` outer glow (5px blur).
- **Spacing:** Use `spacing-6` (1.3rem) for internal padding.

### Buttons: The Action Drivers
- **Primary:** Gradient from `primary` to `primary-dim`. `Roundedness-md` (0.375rem). Use `on-primary` (#0f00a4) for text for maximum contrast.
- **Tertiary:** No background, no border. Use `Space Grotesk` (label-md) in `primary` color. Hover state adds a `0.1` opacity `primary` background.

### Input Fields: The Command Line
- **Background:** `surface-container-lowest` (#000000).
- **Focus State:** No thick border. Instead, use a subtle `0.5px` stroke of `primary` and a `primary` outer glow.
- **Label:** `label-sm` (Space Grotesk) in `on-surface-variant`.

### Metric Widgets (Specialty Component)
- A specialized card for "Big Numbers."
- Use `display-md` (Manrope) for the value.
- Background uses a subtle radial gradient: `surface-container` at the center to `surface-container-low` at the edges.

---

## 6. Do’s and Don’ts

### Do
- **Use Intentional Asymmetry:** Align primary data to the left, but allow secondary metadata to float with generous right-side padding.
- **Embrace the Dark:** Use `background` (#060e20) as your primary negative space. It makes the `secondary` (Emerald) and `primary` (Indigo) "pop" with an OLED-like quality.
- **Micro-Animations:** When data loads, use a subtle "shimmer" gradient moving from `surface-container` to `surface-container-high`.

### Don’t
- **Don't Use Dividers:** Never use a horizontal line to separate list items. Use `spacing-4` (0.9rem) or a `2px` shift in background tone.
- **Don't Use Pure Grey:** Our "neutrals" are slated and navy-toned. Avoid `#333333` or `#cccccc`. Stick to the `on-surface-variant` (#a3aac4) for muted text.
- **Don't Over-round:** Limit corner radius to `md` (0.375rem) or `lg` (0.5rem). Anything higher feels too "consumer" and soft for a high-end engineering tool.