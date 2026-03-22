# Liquid Glass Debugging Notes

## Table of Contents
- [Toolbar & Navigation Pitfalls](#toolbar--navigation-pitfalls)
- [Hit-Testing vs. Navigation Pops](#hit-testing-vs-navigation-pops)
- [Visual State Mismatch](#visual-state-mismatch)
- [Recommended Fix Patterns](#recommended-fix-patterns)

## Toolbar & Navigation Pitfalls
- Reference implementation: `/Users/n14/Projects/iOS/landmarks-ios-liquid-glass` (native back button + toolbar items).
- **System nav bar still exists even when hidden**: `.toolbarBackground(.hidden, for: .navigationBar)` hides the background, not the bar itself. The bar can still intercept taps in the leading region.
- **Custom back buttons in toolbars** can render inconsistent glass states (square/rounded artifacts) because toolbar sizing and press states differ from normal buttons.
- **Match Apple samples**: Landmarks uses the native system back button, not a custom glass button.
- **Single-letter pills (e.g., "C")**: Caused by custom principal views or custom toolbar containers compressing the leading item. Fix by restoring standard toolbar layout: use `.navigationTitle` and `ToolbarItem` placements instead of a custom principal view.
- **Primary action color in toolbars**: If you need a branded primary action, use a semantic toolbar button primitive (e.g., `ToolbarPrimaryButton`) in `.confirmationAction`. Avoid tinting icons or adding extra glass/surface layers in the toolbar.
- **Standard toolbar layout**: Prefer `.navigationTitle` + `.toolbarTitleMenu` for menus and `ToolbarItem` placements like `.cancellationAction` / `.confirmationAction`. Avoid custom principal views or hidden toolbar backgrounds when using Liquid Glass.

## Hit-Testing vs. Navigation Pops
- Symptom: **Back button is visible and hittable but does nothing**.
- Cause: The tap never reaches your button (hidden nav bar intercepts) or the view is not in a poppable `NavigationStack`.
- Quick check: Move the bar into `.toolbar` items or fully hide the nav bar with `.toolbar(.hidden, for: .navigationBar)` and use `safeAreaInset` for a custom bar.

## Visual State Mismatch
- Symptom: Multiple visual states for the same control (square overlay, ring, inconsistent hover/press).
- Cause: Mixing **native toolbar glass** with **custom glass surfaces** on the same control.
- Fix: Use **native toolbar/back controls** and remove custom surfaces in toolbars on iOS 26.

## Recommended Fix Patterns
### Use system back button (preferred)
```swift
.navigationBarBackButtonHidden(isEditing)
// No custom leading back button in the toolbar.
```

### If using a custom top bar (avoid for nav/back)
```swift
.toolbar(.hidden, for: .navigationBar)
.safeAreaInset(edge: .top) { CustomTopBar() }
```

### If you must add a custom toolbar item
- Avoid custom backgrounds in iOS 26 toolbars.
- Use `.buttonStyle(.glass)` and let the toolbar render the container.

### Standard toolbar layout with branded primary action
```swift
.navigationTitle(isEditing ? modeTitle : screenTitle)
.toolbarTitleMenu {
    if isEditing {
        ForEach(modes) { mode in
            Button(mode.label) { selectedMode = mode }
        }
    }
}
.toolbar {
    ToolbarItem(placement: .cancellationAction) {
        Button(action: cancel) { Image(systemName: "xmark") }
    }
    ToolbarItem(placement: .confirmationAction) {
        ToolbarPrimaryButton(title: "Save", action: save)
    }
}
```
