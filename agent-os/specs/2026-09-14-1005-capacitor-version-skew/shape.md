# Capacitor CLI 7 scaffolds an iOS project that Capacitor 8 cannot build

Status: **not started** — filed from the iOS simulator click sweep of 2026-09-14.
Severity: **blocker for iOS**.

## The mismatch

`frontend/CAPACITOR_SETUP.md` tells you to run `npm run cap:add:ios`. Doing that on a
Mac with Xcode 26.6 and CocoaPods 1.16.2 produces a project that will not install pods
and will not compile.

The installed versions disagree by a whole major:

| Package | Installed |
|---|---|
| `@capacitor/cli` | **7.6.9** |
| `@capacitor/core` | 8.5.2 |
| `@capacitor/ios` | 8.5.2 |
| `@capacitor/android` | 8.5.2 |

`frontend/package.json` asks for `"@capacitor/cli": "^7.5.0"` alongside
`"@capacitor/core": "^8.1.0"` and `"@capacitor/ios": "^8.1.0"`, so the skew is declared,
not accidental drift.

The v7 CLI writes an iOS 14 project. Capacitor 8 requires iOS 15. Both places break:

**1. `pod install`**

```
[!] CocoaPods could not find compatible versions for pod "Capacitor":
  In Podfile:
    Capacitor (from `…/node_modules/@capacitor/ios`)
  Specs satisfying the … dependency were found, but they required a higher
  minimum deployment target.
```

`ios/App/Podfile` says `platform :ios, '14.0'`; `@capacitor/ios@8.5.2`'s podspec says
`s.ios.deployment_target = '15.0'`.

**2. `xcodebuild`, after the Podfile is corrected**

```
App/AppDelegate.swift:2:8: error: compiling for iOS 14.0, but module 'Capacitor' has a
minimum deployment target of iOS 15.0
import Capacitor
```

`App.xcodeproj/project.pbxproj` carries `IPHONEOS_DEPLOYMENT_TARGET = 14.0` in four
build configurations.

## Fix

Bring the CLI up to 8.x so the scaffolding matches the runtime, then regenerate. Manually
bumping the Podfile to `platform :ios, '15.0'` and the four `IPHONEOS_DEPLOYMENT_TARGET`
entries to `15.0` does get a successful build (verified — this is how the rest of the
sweep was run), but it is a patch on generated output that the next `cap add` will undo.

Also worth settling here: **`frontend/ios/` is not in the repository** while
`frontend/android/` is. Either commit the iOS project the way Android is committed, or
gitignore both and make the generation reproducible from a script. The current asymmetry
is why the Info.plist problem in the companion task has no home to be fixed in.

## Acceptance criteria

- [ ] `@capacitor/cli` major matches `@capacitor/core` / `ios` / `android`
- [ ] A fresh `npx cap add ios` produces a project where `pod install` succeeds
- [ ] `xcodebuild -workspace ios/App/App.xcworkspace -scheme App -sdk iphonesimulator` succeeds with no manual edits
- [ ] `CAPACITOR_SETUP.md` matches what the commands actually do
- [ ] A decision recorded on whether `frontend/ios/` is committed
