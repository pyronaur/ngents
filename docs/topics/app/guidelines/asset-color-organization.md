---
title: Asset Color Organization
short: Structure app-owned colors in `.xcassets` and expose them through nested Swift namespaces.
summary: Cross-project convention for organizing app-owned color assets and SwiftUI accessors.
read_when:
  - Creating or refactoring app-owned SwiftUI color assets.
---

# Asset Color Organization

Use this convention for app-owned colors in macOS and iOS apps.

## Rule

Keep system semantic colors in code. Put app-owned colors in `.xcassets`.

Keep these direct in SwiftUI/AppKit code:

- `.primary`, `.secondary`, `.tertiary`
- `.accentColor`
- materials such as `.thinMaterial`
- platform semantic colors such as `NSColor.controlBackgroundColor` and `NSColor.separatorColor`

Use asset colors for app-owned values:

- brand colors
- feature-specific tint, stroke, fill, scrim, and shadow colors
- light/dark custom variants
- colors used inside gradients

SwiftUI gradient geometry stays in code. The gradient colors come from assets.

## Asset catalog shape

Use nested namespace groups. Do not add a generic `Colors/` namespace.

Name each level by domain, component, then role. Keep names short inside their namespace. Do not repeat parent context in child names.

```text
Assets.xcassets/
  Interface/
    Panel/
      Background.colorset
      Border.colorset

    Bevel/
      Top.colorset
      Middle.colorset

    Row/
      Selection.colorset

      TextMask/
        Opaque.colorset
        Fade.colorset
        Clear.colorset

      Control/
        Foreground.colorset
        Primary.colorset
        Destructive.colorset
        Shadow.colorset

  Status/
    Failure/
      Symbol.colorset
      Foreground.colorset
      Background.colorset
```

Avoid names like:

```text
Interface/Row/RowControlHoverForeground.colorset
Status/Failure/FailureBackground.colorset
Colors/Interface/Panel/PanelBackground.colorset
```

Use:

```text
Interface/Row/Control/Foreground.colorset
Status/Failure/Background.colorset
Interface/Panel/Background.colorset
```

## Namespace folders

Every folder that should appear in the Swift lookup path must provide a namespace.

Folder `Contents.json`:

```json
{
  "info" : {
    "author" : "xcode",
    "version" : 1
  },
  "properties" : {
    "provides-namespace" : true
  }
}
```

With namespace folders, the primitive lookup path is:

```swift
Color("Interface/Panel/Background", bundle: bundle)
```

Without namespace folders, Xcode may flatten folder names out of the lookup path.

## Color sets

Use light/dark variants in the color set when an app-owned value changes by appearance.

```json
{
  "colors" : [
    {
      "color" : {
        "color-space" : "srgb",
        "components" : {
          "alpha" : "1.000",
          "blue" : "1.000",
          "green" : "1.000",
          "red" : "1.000"
        }
      },
      "idiom" : "universal"
    },
    {
      "appearances" : [
        {
          "appearance" : "luminosity",
          "value" : "dark"
        }
      ],
      "color" : {
        "color-space" : "srgb",
        "components" : {
          "alpha" : "1.000",
          "blue" : "0.000",
          "green" : "0.000",
          "red" : "0.000"
        }
      },
      "idiom" : "universal"
    }
  ],
  "info" : {
    "author" : "xcode",
    "version" : 1
  }
}
```

## Swift accessors

Expose asset colors through a caseless enum namespace. Hide bundle selection and raw asset strings in one file.

```swift
import Foundation
import SwiftUI

enum AppColor {
#if SWIFT_PACKAGE
    private static let bundle = Bundle.module
#else
    private static let bundle = Bundle.main
#endif

    enum Interface {
        enum Panel {
            static let background = color("Interface/Panel/Background")
            static let border = color("Interface/Panel/Border")
        }

        enum Bevel {
            static let top = color("Interface/Bevel/Top")
            static let middle = color("Interface/Bevel/Middle")
        }

        enum Row {
            static let selection = color("Interface/Row/Selection")

            enum TextMask {
                static let opaque = color("Interface/Row/TextMask/Opaque")
                static let fade = color("Interface/Row/TextMask/Fade")
                static let clear = color("Interface/Row/TextMask/Clear")
            }

            enum Control {
                static let foreground = color("Interface/Row/Control/Foreground")
                static let primary = color("Interface/Row/Control/Primary")
                static let destructive = color("Interface/Row/Control/Destructive")
                static let shadow = color("Interface/Row/Control/Shadow")
            }
        }
    }

    enum Status {
        enum Failure {
            static let symbol = color("Status/Failure/Symbol")
            static let foreground = color("Status/Failure/Foreground")
            static let background = color("Status/Failure/Background")
        }
    }

    private static func color(_ name: String) -> Color {
        Color(name, bundle: bundle)
    }
}
```

Call sites use semantic roles, not asset strings:

```swift
.background(AppColor.Interface.Panel.background)
.strokeBorder(AppColor.Interface.Panel.border)
.foregroundStyle(AppColor.Status.Failure.symbol)
```

Do not pass `bundle` at call sites. Do not use raw `Color("...")` outside the accessor namespace.

## Creating a color namespace

1. Add or open `Assets.xcassets`.
2. Create namespace folders for each domain/component level.
3. Enable **Provides Namespace** for each folder that is part of the lookup path.
4. Add `.colorset` entries under the leaf namespace.
5. Name each color by its local role only.
6. Add light/dark variants in the color set when needed.
7. Add the matching nested Swift accessor.
8. Use only the accessor from views.

## Naming checklist

- Names are nouns.
- Names describe role, not color value.
- Child names do not repeat parent context.
- No nonstandard abbreviations.
- Use `lowerCamelCase` in Swift and `UpperCamelCase` in asset names.
- Use nested caseless enums for shared constants.
- Keep the namespace as deep as needed to make leaf names short.
