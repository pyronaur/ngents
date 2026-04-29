---
title: Liquid Glass in AppKit-hosted SwiftUI
summary: Debugging guide for Liquid Glass and live backdrop failures in AppKit-hosted SwiftUI, especially transparent/borderless/nonactivating panel shells.
short: Debug AppKit-hosted SwiftUI Liquid Glass and live backdrop sampling.
read_when:
  - SwiftUI Liquid Glass appears only after screenshot, screen recording, window movement, or compositor refresh.
  - Liquid Glass renders as a frozen snapshot of whatever was behind it at creation time.
  - A SwiftUI glassEffect view is hosted in NSHostingView inside NSWindow or NSPanel.
  - The app uses transparent, borderless, floating, nonactivating, or accessory-style AppKit windows.
  - Need to decide between SwiftUI glassEffect, NSGlassEffectView, NSVisualEffectView.behindWindow, tint fills, or custom blur.
  - Need a repeatable investigation workflow for Liquid Glass bugs instead of trial-and-error visual tweaks.
---

# Liquid Glass in AppKit-hosted SwiftUI

## Core lesson

SwiftUI `glassEffect(_:in:)` is the right native API for SwiftUI Liquid Glass, but AppKit window composition can prevent it from live-compositing correctly.

The sharp failure case is a SwiftUI `NSHostingView` inside a transparent, borderless, floating, nonactivating `NSPanel` or similar custom shell. The SwiftUI view tree can be correct while the live app still renders gray, flat, stale, or only updates after a screenshot/compositor refresh.

A second failure mode is subtler: `NSGlassEffectView` can render a better glass-looking surface, but the backdrop is a frozen snapshot of what was underneath when the panel rendered. That is still not live glass.

When that happens, stop tweaking SwiftUI tint/fill. Use the framework-native glass API for the surface, but use the only documented AppKit live behind-window sampler as the backdrop feed: `NSVisualEffectView` with `blendingMode = .behindWindow`.

## Correct mental model

Liquid Glass is compositor-backed material, not a color, blur, or opacity trick.

There are two distinct jobs:

1. Glass surface effects: refraction/specularity/tint/foreground treatment.
2. Live backdrop sampling: continuously sampling content behind a separate AppKit window.

SwiftUI `glassEffect` and AppKit `NSGlassEffectView` handle Liquid Glass surface effects. They are not documented as behind-window live backdrop samplers for every custom transparent `NSPanel` shell.

`NSVisualEffectView.blendingMode = .behindWindow` is standard material, not Liquid Glass, but it is explicitly documented to blend/blur with the contents behind the window. In a transparent nonactivating panel where Liquid Glass freezes, it can be the required live backdrop feed under a SwiftUI/AppKit glass surface.

## Dead ends that waste time

### Tweaking tint opacity

Increasing `.tint(...)` strength or adding a translucent `.fill(...)` can make the view blue, but it turns the surface into paint. It does not fix failed live Liquid Glass composition.

Bad smell:

```swift
.background(shape.fill(Color.blue.opacity(0.2)))
```

This hides the bug by adding color; it does not create glass.

### Treating `NSGlassEffectView` as guaranteed live behind-window glass

`NSGlassEffectView` is the correct AppKit Liquid Glass content host. It can fix static glass rendering. It is not documented with a behind-window blending mode, and in transparent/borderless/nonactivating panel shells it can still freeze the backdrop sample.

If it looks like glass but behaves like a screenshot of glass, the surface problem is fixed and the live backdrop problem remains.

### Treating `NSVisualEffectView` as Liquid Glass

`NSVisualEffectView` is not Liquid Glass. It is standard AppKit material/vibrancy.

But `NSVisualEffectView.blendingMode = .behindWindow` is the documented API for live sampling content behind the window. Use it only as the live backdrop feed when the shell requires behind-window sampling. Keep Liquid Glass surface treatment above it if needed.

### Adding a glass sibling behind content

Do not put a glass view behind the content as a sibling and hope z-order works. Apple documents `NSGlassEffectView.contentView` as the content placement point. Arbitrary sibling/subview z-order relative to the glass effect is not the contract.

Correct:

```swift
glassView.contentView = hostingView
```

Incorrect:

```swift
container.addSubview(glassView)
container.addSubview(hostingView)
```

### Marking passive panes `.interactive()`

`.interactive()` is for controls that should react to pointer/touch interaction. A passive panel, shelf, sidebar-like surface, or background pane should not be interactive glass. Add interaction to actual controls, not to the whole pane.

### Trusting screenshots as proof

Screenshots, screen recording, moving windows, opening Mission Control, or other compositor-affecting actions can force a refresh. If glass appears only after capture, the live compositor path is still broken.

### Trusting a different proof harness window

A normal `NSWindow` proof harness proving Liquid Glass does not prove a transparent borderless nonactivating `NSPanel`. The window shell is part of the bug surface.

## Correct implementation patterns

### Native SwiftUI glass surface

Use this when SwiftUI owns the glass surface and live rendering works in the real shell:

```swift
content
    .padding()
    .glassEffect(
        .regular.tint(Color(nsColor: .controlAccentColor)),
        in: shape
    )
```

Guidance:

- Use `.regular` for legibility-preserving panes, sidebars, popovers, and surfaces with text.
- Use `.clear` only over visually rich content where underlying detail should remain prominent.
- Use `.tint(...)` sparingly; it is stained glass/emphasis, not paint.
- Use `.interactive()` only for interactive controls.
- Use `GlassEffectContainer` when multiple SwiftUI glass views should render/merge/morph together.

### AppKit Liquid Glass content host

Use this when an AppKit shell owns the glass surface and `NSGlassEffectView` live-renders correctly in the real shell:

```swift
let hostingView = NSHostingView(rootView: ContentView())

let glassView = NSGlassEffectView()
glassView.style = .regular
glassView.tintColor = .controlAccentColor
glassView.cornerRadius = 16
glassView.contentView = hostingView

window.contentView = glassView
```

Guidance:

- Put content in `contentView`.
- Use `.regular` for normal legibility-preserving glass.
- Use `tintColor` for system accent tint when needed.
- Use `cornerRadius` instead of a custom mask when uniform corners are acceptable.
- If the SwiftUI root previously had pane-level `glassEffect`, disable that pane glass when hosted inside `NSGlassEffectView` to avoid glass-on-glass.

### Live behind-window backdrop feed plus glass surface

Use this when SwiftUI glass or `NSGlassEffectView` renders a stale/frozen backdrop in a separate transparent AppKit shell.

```swift
let materialView = NSVisualEffectView()
materialView.blendingMode = .behindWindow
materialView.material = .hudWindow
materialView.state = .active

let hostingView = NSHostingView(rootView: ContentView())

container.addSubview(materialView)
container.addSubview(hostingView)
```

Then apply SwiftUI `glassEffect` in `ContentView` if the surface still needs Liquid Glass treatment:

```swift
content
    .padding()
    .glassEffect(.regular.tint(.blue), in: shape)
```

Guidance:

- `NSVisualEffectView.behindWindow` is the live backdrop feed, not the Liquid Glass surface.
- SwiftUI/AppKit glass above it provides the glass surface treatment.
- Avoid color planes and painted tint fills.
- Use this only after the exact production shell proves native glass freezes or does not live-sample.

### Stable SwiftUI root state

Do not replace `NSHostingView.rootView` for transient hover/drop/selection presentation state. Reinstalling the root can break identity and Liquid Glass stability.

Prefer a stable observable presentation model:

```swift
@Observable
@MainActor
final class PresentationState {
    var isTargeted = false
}

let state = PresentationState()
let hostingView = NSHostingView(rootView: ContentView(state: state))
```

Then mutate `state`, not `hostingView.rootView`.

## Diagnosis workflow

1. Confirm the exact live window shell.
   - `NSWindow` vs `NSPanel`
   - `borderless`
   - `nonactivatingPanel`
   - transparent/opaque flags
   - floating/accessory behavior
   - `NSHostingView` placement

2. Verify the SwiftUI glass code is semantically correct.
   - `glassEffect(.regular.tint(...), in: shape)` for pane glass
   - no `.interactive()` on passive surfaces
   - no color-plane background/fill pretending to be tint
   - no nested glass controls unless intentionally separate controls

3. Compare against a simple normal-window harness only as a control.
   - If normal window works but the production shell fails, the shell/compositor path is suspect.

4. Test the exact production shell.
   - Same window class, style masks, transparency, levels, activation policy, and hosting stack.

5. Treat screenshot-only success as failure.
   - If capture makes glass appear, the live compositor did not update correctly.

6. Distinguish static surface rendering from live backdrop sampling.
   - Gray/flat: glass surface is not rendering.
   - Glass-looking but frozen: surface renders, live backdrop feed is missing.

7. Escalate in order.
   - Native SwiftUI `glassEffect`.
   - AppKit `NSGlassEffectView.contentView`.
   - `NSVisualEffectView.blendingMode = .behindWindow` as live backdrop feed plus glass surface above it.

## Poorly documented gap

Apple documents `NSHostingView` as the AppKit bridge for SwiftUI view hierarchies and documents `glassEffect` as the SwiftUI Liquid Glass API. Apple documents `NSGlassEffectView` as the AppKit Liquid Glass content host.

Apple does not clearly document whether SwiftUI `glassEffect` or `NSGlassEffectView` is guaranteed to live-sample behind every custom AppKit shell, especially transparent, borderless, floating, nonactivating panels.

That gap matters. The SwiftUI code can be correct, `NSGlassEffectView` can be correct, and the backdrop can still be stale in a custom AppKit shell. The practical answer is to separate the concerns: use Liquid Glass for the surface, and use `NSVisualEffectView.behindWindow` if the window shell needs an explicit live behind-window feed.

## Drag/drop and sandbox side lesson

For drag-driven glass surfaces, keep drag detection separate from drop access.

- `NSPasteboard(name: .drag)` is useful as a detection signal for “a drag exists”.
- Do not resolve file URLs or create security-scoped bookmarks from the drag pasteboard during hover/detection.
- Use `NSDraggingInfo.draggingPasteboard` inside destination callbacks for real drop data.
- Create security-scoped bookmarks only after the actual drop grants access.

Resolving URLs too early can produce sandbox/bookmark failures that look like drag/drop UI failures.

## Where to find information

Use multiple sources; no single Apple page explains the full bridge failure.

Start with HIG:

- Materials: establishes Liquid Glass as the control/navigation material and distinguishes it from standard materials.
- Color: explains that Liquid Glass has no inherent color by default; tint is stained-glass emphasis, not paint.

Then use SwiftUI docs:

- `View.glassEffect(_:in:)`
- `Glass`
- `GlassEffectContainer`
- “Applying Liquid Glass to custom views”

Then use AppKit docs:

- `NSHostingView`
- `NSGlassEffectView`
- `NSGlassEffectView.contentView`
- `NSGlassEffectContainerView`
- `NSVisualEffectView.BlendingMode.behindWindow`

Then use WWDC:

- “Build an AppKit app with the new design” for the AppKit mental model: put custom content inside `NSGlassEffectView.contentView`.

For local research, prefer Xcode documentation search because the new APIs may be fresher there than scraped docs:

```bash
xcode-mcli setup
xcode-mcli docs search --query NSGlassEffectView --json
xcode-mcli docs search --query "glassEffect" --json
xcode-mcli docs search --query "NSVisualEffectView behindWindow" --json
```

If using terminal docs, use Sosumi for Apple pages:

```bash
bunx @nshipster/sosumi fetch /documentation/AppKit/NSGlassEffectView
bunx @nshipster/sosumi fetch /documentation/AppKit/NSVisualEffectView/BlendingMode-swift.enum/behindWindow
bunx @nshipster/sosumi fetch /documentation/SwiftUI/View/glassEffect(_:in:)
```

## References

- Apple: Applying Liquid Glass to custom views  
  https://developer.apple.com/documentation/SwiftUI/Applying-Liquid-Glass-to-custom-views
- Apple: `View.glassEffect(_:in:)`  
  https://developer.apple.com/documentation/SwiftUI/View/glassEffect(_:in:)
- Apple: `NSHostingView`  
  https://developer.apple.com/documentation/SwiftUI/NSHostingView
- Apple: `NSGlassEffectView`  
  https://developer.apple.com/documentation/AppKit/NSGlassEffectView
- Apple: `NSGlassEffectView.contentView`  
  https://developer.apple.com/documentation/AppKit/NSGlassEffectView/contentView
- Apple: `NSGlassEffectView.style`  
  https://developer.apple.com/documentation/AppKit/NSGlassEffectView/style-swift.property
- Apple: `NSGlassEffectView.tintColor`  
  https://developer.apple.com/documentation/AppKit/NSGlassEffectView/tintColor
- Apple: `NSGlassEffectView.Style.regular`  
  https://developer.apple.com/documentation/AppKit/NSGlassEffectView/Style-swift.enum/regular
- Apple: `NSGlassEffectContainerView`  
  https://developer.apple.com/documentation/AppKit/NSGlassEffectContainerView
- Apple: `NSVisualEffectView`  
  https://developer.apple.com/documentation/AppKit/NSVisualEffectView
- Apple: `NSVisualEffectView.BlendingMode.behindWindow`  
  https://developer.apple.com/documentation/AppKit/NSVisualEffectView/BlendingMode-swift.enum/behindWindow
- Apple WWDC25: Build an AppKit app with the new design  
  https://developer.apple.com/videos/play/wwdc2025/310/
- Apple: Adopting Liquid Glass  
  https://developer.apple.com/documentation/TechnologyOverviews/adopting-liquid-glass
- Apple HIG: Materials  
  https://developer.apple.com/design/human-interface-guidelines/materials
- Apple HIG: Color / Liquid Glass color  
  https://developer.apple.com/design/human-interface-guidelines/color#Liquid-Glass-color
- Apple: `NSPasteboard`  
  https://developer.apple.com/documentation/AppKit/NSPasteboard
- Apple: `NSDraggingInfo`  
  https://developer.apple.com/documentation/AppKit/NSDraggingInfo
- Apple: AppKit drag and drop  
  https://developer.apple.com/documentation/AppKit/drag-and-drop
- Apple: Accessing files from the macOS App Sandbox  
  https://developer.apple.com/documentation/security/accessing-files-from-the-macos-app-sandbox
- Apple: `NSURL.BookmarkCreationOptions.withSecurityScope`  
  https://developer.apple.com/documentation/Foundation/NSURL/BookmarkCreationOptions/withSecurityScope
- Apple: `startAccessingSecurityScopedResource()`  
  https://developer.apple.com/documentation/Foundation/NSURL/startAccessingSecurityScopedResource()
- Apple: `com.apple.security.files.user-selected.read-write`  
  https://developer.apple.com/documentation/BundleResources/Entitlements/com.apple.security.files.user-selected.read-write
