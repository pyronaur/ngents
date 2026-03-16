---
name: ios-glass-buttons
description: Guidance for iOS SwiftUI Liquid Glass buttons, including hit target sizing, hit-testing, and icon rendering. Use when tap areas feel too small, when icon-only or glass buttons are hard to tap, when icons disappear or lack contrast, or when diagnosing touch targets for custom controls and grouped buttons.
---

# iOS Glass Buttons

## Overview
Use this skill to diagnose and fix small or inconsistent hit targets in SwiftUI, especially when using Liquid Glass or icon-only buttons, and to keep icon rendering visible and legible.

## Workflow: Fix a Hitbox
1. Inspect the current button layout and confirm the tappable area.
2. Set an explicit hit target size on the button label.
3. Define the hit-testing shape to match the intended tap area.
4. Apply Liquid Glass after sizing and hit-testing changes.
5. Verify the hitbox visually and with Accessibility Inspector.

## Core Guidelines
- Always size the hit target explicitly with `frame` or `padding` on the button label.
- Use `contentShape(Rectangle())` (or `Capsule()` when pill-shaped) to define the tap region, not just the visible icon.
- Apply `.glassEffect(...)` or `.buttonStyle(.glass)` after layout so glass does not shrink the hit area.
- Keep hit targets consistent within a group (same width/height, same content shape).
- Use `.allowsHitTesting(false)` for decorative overlays so they do not steal taps.
- Prefer `Button` with a label that fills the tap target over tap gestures on small icons.

## Liquid Glass Icon Rendering
- Treat icon visibility as a first-class requirement: set explicit `font` size/weight and `foregroundStyle` on the icon.
- Avoid `.tint(.clear)` unless you provide your own icon overlay; a clear tint will hide the system glyph.
- If you must overlay a custom symbol, keep it on top of the glass (`.overlay`) and add `.allowsHitTesting(false)` so the button stays tappable.
- Use `symbolRenderingMode(.hierarchical)` or `.monochrome` for consistent contrast on glass backgrounds.
- Keep icon opacity >= 0.8 unless there is a strong contrast reason; glass already softens contrast.
- Verify with both Light/Dark and varied map imagery; the icon must remain visible on complex backgrounds.

## Liquid Glass Button Patterns
- Use `.buttonStyle(.glass)` with `.buttonBorderShape(...)` for native glass behavior and hit testing.
- For custom glass surfaces, create the hit area first, then add glass:
  - `label.frame(...).contentShape(...).glassEffect(...)`
- When grouping glass controls, put glass on the container and keep each button hit area inside it.

## Grouped Icon Button Pattern (Vertical)
Use this when you need narrow width but full-height tap areas:
- Set per-row hit targets, e.g. `frame(width: 36, height: 44)`.
- Use `contentShape(Rectangle())` on the label to expand beyond the icon.
- Use a container glass shape (capsule/pill) that matches the overall column.

## Verification Checklist
- Tap anywhere inside the intended area, not just the icon.
- Use Accessibility Inspector to check the element frame size.
- Temporarily add `background(Color.red.opacity(0.1))` to the label to visualize hit area, then remove.

## Common Mistakes and Fixes
- Mistake: Only the icon has a frame, so the hitbox equals the glyph.
  - Fix: Apply `frame` to the label container, not just the image.
- Mistake: Glass applied before sizing.
  - Fix: Size and set `contentShape` first, then apply glass.
- Mistake: Overlay views intercept taps.
  - Fix: Add `.allowsHitTesting(false)` to decorative overlays.
- Mistake: Using `onTapGesture` on a small icon.
  - Fix: Use `Button` with a full-size label and content shape.
- Mistake: Grouped buttons have inconsistent hit areas.
  - Fix: Use uniform frames and consistent content shapes per row.
- Mistake: Icon disappears after applying glass or tint.
  - Fix: Remove `.tint(.clear)` or add an explicit icon overlay with a visible `foregroundStyle`.
