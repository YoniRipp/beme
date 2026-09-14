# Plan — Capacitor CLI/Core Version Skew

Status: **not started**. Planned 2026-09-14 against `main` at `dbd5fb1`.

Scope is `frontend/package.json`, the root lockfile, `frontend/CAPACITOR_SETUP.md`,
`.github/workflows/`, and the generated native projects. **No `src/` file is touched.**

---

## Verification of `shape.md`

Every load-bearing claim was checked against the tree and against the published packages.
**The finding is valid as written.** Nothing in it is overstated.

- [x] `frontend/package.json` really does declare the skew — `"@capacitor/cli": "^7.5.0"`
      next to `"@capacitor/android"`, `"@capacitor/core"` and `"@capacitor/ios"` at
      `"^8.1.0"` (lines 28–31).
- [x] The root `package-lock.json` resolves exactly the versions the table names:
      `@capacitor/cli` **7.6.9**, `core` / `ios` / `android` **8.5.2** (lines 2927–2986),
      and the installed tree in the hoisted root `node_modules/@capacitor/*` reports the
      same four. Every number in the shape doc's table is correct.
- [x] `@capacitor/ios@8.5.2`'s `Capacitor.podspec` sets `s.ios.deployment_target = '15.0'`,
      and `CapacitorCordova.podspec` sets `s.platform = :ios, 15.0`. The CocoaPods
      resolution failure follows directly.
- [x] **The iOS project template ships inside the CLI, not inside `@capacitor/ios`.**
      `@capacitor/cli/dist/ios/add.js` extracts
      `config.cli.assets.ios.platformTemplateArchiveAbs`, i.e.
      `@capacitor/cli/assets/ios-pods-template.tar.gz`. So the CLI major, and only the CLI
      major, decides what `cap add ios` writes. The causal story is correct.
- [x] Unpacking that archive from **7.6.9**: `App/Podfile` says `platform :ios, '14.0'`
      and `App/App.xcodeproj/project.pbxproj` carries `IPHONEOS_DEPLOYMENT_TARGET = 14.0`
      in **exactly four** places (lines 286, 337, 353, 373). The same archive from
      **8.5.2** says `15.0` in all five spots. "Four build configurations" is exact.
- [x] `@capacitor/ios@8.5.2`'s `scripts/pods_helpers.rb` `assertDeploymentTarget` only
      raises targets in the **Pods** project, and only in `post_install` — after
      resolution. It can neither prevent failure 1 nor fix the App target in failure 2.
      Both reported errors are the expected behaviour.
- [x] `frontend/android/` is tracked (53 files). `frontend/ios/` is absent from the working
      tree, tracked in zero files, and **not** matched by any `.gitignore`
      (`git check-ignore` returns nothing). The asymmetry is as described.
- [x] `frontend/CAPACITOR_SETUP.md` Step 1 does instruct `npm run cap:add:ios`, which
      `frontend/package.json` maps to `npx cap add ios`.

### Corrections and additions for `shape.md`

Four things the shape doc gets slightly wrong or leaves out. None invalidate it.

1. **Severity should not read "blocker for iOS" alone.** Android is on the identical skew.
   `frontend/android/variables.gradle` is **byte-identical** to the CLI 7.6.9
   `android-template`, while `frontend/android/capacitor.settings.gradle` includes
   `:capacitor-android` as a Gradle project pointed at
   `node_modules/@capacitor/android/capacitor` — i.e. the **v8** library is compiled inside
   a **v7**-scaffolded app. The committed `variables.gradle` overrides that library's
   expected values through `rootProject.ext`: `minSdk 23` vs 24, `compileSdk`/`targetSdk`
   35 vs 36, `cordovaAndroidVersion 10.1.1` vs 14.0.1. The library's own buildscript also
   asks for `com.android.tools.build:gradle:8.13.0`, while `frontend/android/build.gradle`
   pins AGP `8.7.2` on Gradle wrapper `8.11.1`.
   Android has not blown up only because it was scaffolded once and committed, so nothing
   regenerates it. **Whether it still assembles is unverified** — it was not built during
   the sweep. Suggested wording: *"blocker for iOS; unverified, probably-broken on
   Android."* Task 0 settles it before anything else moves.

2. **The shape doc omits the largest cost of the fix: `@capacitor/cli@8.x` requires
   Node ≥ 22** (`engines: { node: '>=22.0.0' }`, every 8.x release). `@capacitor/cli@7.6.9`
   requires only Node ≥ 20, and **CI pins Node 20 in all eight places** — six jobs in
   `.github/workflows/ci.yml`, two in `.github/workflows/pwa-checks.yml`. Because the root
   `.npmrc` does not set `engine-strict`, `npm ci` will emit `EBADENGINE` and install
   anyway, so the break surfaces later and further from the cause. This turns a one-line
   dependency bump into a runtime bump for the whole monorepo.

3. **"The skew is declared, not accidental drift" is right, and can be dated.** All four
   ranges were written in a single commit — `77adb45 feat: Add Capacitor native speech
   recognition for iOS/Android`, 2026-02-27 — with `cli` already a major behind on the day
   it was added. It is an authoring mistake, not a bump someone forgot. That matters: no
   code, build or artifact anywhere in this repo has ever depended on CLI 7 behaviour, so
   moving forward carries no compatibility debt.

4. **`CAPACITOR_SETUP.md` does not merely fail to match the commands — it actively
   re-teaches the bug.** Step 4.3 reads *"Set Deployment Target: iOS 14.0 or higher
   recommended,"* which is the exact setting that breaks the build under Capacitor 8.
   Acceptance criterion 4 should name it.

---

## Decisions

**D1 — Move the CLI forward to `^8.5.0`. Do not move core/ios/android back to 7.**
Forward is the only direction with a future: Capacitor 8 is what carries Android
`targetSdk 36` and current Xcode/iOS support, and per correction 3 nothing has ever
depended on 7. Downgrading would also mean regenerating the committed Android project
backwards.

**D2 — Capacitor 9 is out of scope.** `9.0.0-alpha.6` is published. The stated goal is
"the CLI matches the core that is installed." That is `8.5.x`. Pin the range to `^8.5.0`
to match the peer requirement `@capacitor/ios@8.5.2` already declares on core.

**D3 — Node 22 lands in the same PR, first.** Not a follow-up. Without it the bump
installs with a warning and fails at `cap` runtime.

**D4 — iOS is regenerated from the CLI 8 template; Android is `sync`ed, never `add`ed
again.** `cap add android` would delete the committed manifest permissions, icons and
splash assets. Rule 2: never remove working features.

**D5 — Commit `frontend/ios/`.** Full reasoning and the CI tradeoff in Task 4.

---

## Task 0 — Establish the Android baseline *before* touching anything

The one step that must come first. Everything after this changes Android's inputs, and
without a "before" we cannot tell a bump-induced break from a pre-existing one.

- [ ] From `frontend/android/`, run `./gradlew :app:assembleDebug` on the current tree
      (CLI 7.6.9, `@capacitor/android@8.5.2`) and record the result verbatim in this file.
- [ ] If it **fails**: Android is already broken by the same skew. Say so in `shape.md`,
      and Task 5 becomes a fix rather than a regression check.
- [ ] If it **passes**: Android is the thing most at risk from this work. Keep the exact
      command as the regression gate for Task 5.
- [ ] Either way, record the local `node --version`, `pod --version`, `xcodebuild -version`
      and Gradle/AGP versions, so the next person can reproduce.

## Task 1 — Node 22 across the monorepo

- [ ] `.github/workflows/ci.yml` — `node-version: '20'` → `'22'` in the six jobs that set
      it: `agent-context` (16), `backend` (26), `frontend` (56), `mobile` (77),
      `migrations` (106), `security-audit` (149). The seventh job, `docker`, has no
      `setup-node` step.
- [ ] `.github/workflows/pwa-checks.yml` — both occurrences (lines 18, 45).
- [ ] Four `node:20-alpine` base images move with them, or the `docker` job builds on a
      runtime nothing else uses: `backend/Dockerfile` lines 11 and 31,
      `frontend/Dockerfile` lines 8 and 29.
- [ ] Add `"engines": { "node": ">=22" }` to the root `package.json`. Do **not** add
      `engine-strict=true` to `.npmrc` in this PR — that file's comment documents a
      deliberate, fragile workaround for an npm arborist crash, and changing its semantics
      alongside a toolchain bump makes two unrelated failure modes look like one.
- [ ] Confirm nothing else assumes 20: grep `node-version`, `node:20`, `nvmrc`, `volta`
      across the repo.
- [ ] Gate: full CI green on Node 22 **with the Capacitor ranges unchanged**, as its own
      commit. If Node 22 breaks something, it must break here and not inside the bump.

## Task 2 — Correct the dependency ranges

- [ ] `frontend/package.json` — `"@capacitor/cli": "^7.5.0"` → `"^8.5.0"`. Align the other
      three from `"^8.1.0"` to `"^8.5.0"` so the four ranges read as one decision and match
      the peer requirement `@capacitor/ios@8.5.2` already states (`@capacitor/core: ^8.5.0`).
- [ ] Regenerate the **root** `package-lock.json` (workspaces, single lockfile) — `npm install`
      from the repo root, commit only the lockfile delta.
- [ ] Verify `@capacitor-community/speech-recognition@7.0.1` — its peer range is
      `@capacitor/core >=7.0.0`, so it is formally satisfied by 8.5.2 and **no version
      change is needed**. But it is a v7-era plugin, it is the plugin behind
      `frontend/src/hooks/useNativeSpeech.ts`, and voice is this product's primary input.
      Because the root `.npmrc` sets `legacy-peer-deps=true`, npm will stay silent about
      any real incompatibility. Verify it by running the native mic path on device, not by
      reading the range.
- [ ] Confirm `npx cap --version` reports 8.5.x from the repo root and from `frontend/`.

## Task 3 — Regenerate iOS from the CLI 8 template

- [ ] `cd frontend && npm run build && npx cap add ios`.
- [ ] Assert, before doing anything else, that the generated project is the 8.x template:
      `frontend/ios/App/Podfile` says `platform :ios, '15.0'` and
      `frontend/ios/App/App.xcodeproj/project.pbxproj` has four
      `IPHONEOS_DEPLOYMENT_TARGET = 15.0` entries. **Zero manual edits to either.** If a
      hand edit is needed, the bump is wrong — stop and fix the bump.
- [ ] Apply the customizations that cannot be generated, each as a named, reviewable change:
      - `frontend/ios/App/App/Info.plist` — `NSSpeechRecognitionUsageDescription` and
        `NSMicrophoneUsageDescription`, verbatim from `CAPACITOR_SETUP.md` Step 2. This is
        the state the companion sweep task had no home for.
      - Bundle identifier `com.trackvibe.app`, matching `frontend/capacitor.config.ts`.
      - App icon and launch screen assets.
- [ ] `cd frontend/ios/App && pod install` — succeeds with no Podfile edit.
- [ ] `xcodebuild -workspace frontend/ios/App/App.xcworkspace -scheme App -sdk iphonesimulator build`
      — succeeds with no project edit.

## Task 4 — Decide and record: is `frontend/ios/` committed?

**Recommendation: yes. Commit `frontend/ios/`, mirroring `frontend/android/`, with the
standard Capacitor iOS `.gitignore`.**

- [ ] Commit `frontend/ios/` with `frontend/ios/.gitignore` excluding the genuinely derived
      output: `App/Pods/`, `App/build/`, `App/output/`, `DerivedData/`,
      `App/App/public/` (the synced web bundle), `App/App/capacitor.config.json` and
      `App/App/config.xml` (written by `cap sync`), and `xcuserdata/`. Mirror the shape of
      `frontend/android/.gitignore`, which already excludes `app/src/main/assets/public`
      and the generated config files for exactly this reason.
- [ ] Commit `Podfile.lock`. It is a lockfile; the argument for it is the argument for
      `package-lock.json`.
- [ ] Record the decision and its reasoning in `shape.md` under acceptance criterion 5.

**Why commit rather than gitignore both and generate from a script**

1. **There is native state that cannot be derived from anything in the repo.** The two
   Info.plist usage strings gate the app's primary input method; `capacitor.config.ts` has
   no way to express them. Nor can it express the signing team, entitlements, the icon
   set, the launch screen, or the safe-area and status-bar work that the rest of the iOS
   sweep is queued to do. Today that state has nowhere to live — which is precisely why
   `shape.md` observes the companion Info.plist bug "has no home to be fixed in."
2. **The precedent already exists and has held.** `frontend/android/` has been committed
   since 2026-02-27, carries its `AndroidManifest.xml` permissions and its ten splash
   PNGs, and survived a repo-wide rename (`858de40`). The asymmetry is an accident of
   nobody having had a Mac, not a considered position.
3. **The generation script is the more fragile option, not the less.** To replace a
   committed project it would have to reapply plist keys, build settings, asset catalogs
   and signing config by patching generated XML and `project.pbxproj`. That patcher is
   more code than the artifact it replaces, it is unreviewable, and it breaks every time
   the Capacitor template moves — which is the very failure this task is fixing, just
   relocated into a script nobody runs until iOS is already broken.
4. **Committing makes this class of bug visible in review.** With the project in the repo,
   `IPHONEOS_DEPLOYMENT_TARGET = 14.0` is a line in a diff. Without it, the bug is only
   reproducible on a Mac by someone who thinks to run `cap add`.

**The CI tradeoff, honestly**

- **Against committing.** CI today runs **no native build at all** — `ci.yml`'s seven jobs
  are `agent-context`, `backend`, `docker`, `frontend`, `mobile`, `migrations` and
  `security-audit`, and not one reads `frontend/android/` or would read `frontend/ios/`.
  So a committed iOS project
  is unverified weight: it slows every checkout, and `frontend/.dockerignore` excludes
  neither `android` nor `ios`, so both ride into the web image's build context for no
  reason. Worst of all it can go stale silently against the CLI template — which is
  *exactly* the failure mode being fixed. Committing trades "always freshly generated" for
  "reviewable, but able to drift."
- **For committing.** Not committing means iOS fixes cannot be merged at all, and CI can
  never grow an iOS job without someone first building the generation script from point 3.
- **The mitigation that makes the trade safe** — cheap drift detection instead of a full
  native build:
  - [ ] Add a `native-drift` job to `.github/workflows/ci.yml` on `ubuntu-latest`, no Xcode:
        after `npm ci`, assert the four `@capacitor/*` resolved versions share a major;
        assert no `IPHONEOS_DEPLOYMENT_TARGET` in
        `frontend/ios/App/App.xcodeproj/project.pbxproj` is below the podspec minimum;
        assert `frontend/android/variables.gradle` is not still the previous major's
        template. Seconds of runtime; catches this exact bug.
  - [ ] Add `android` and `ios` to `frontend/.dockerignore` so the native projects never
        enter the web image context.
  - [ ] **Follow-up, not this PR:** a `macos-latest` `xcodebuild` job, gated with
        `paths: ['frontend/ios/**', 'frontend/package.json']`. macOS runners cost roughly
        ten times a Linux minute, which is why the drift lint comes first and the real
        build comes second.

## Task 5 — Re-sync Android and prove it did not regress

Its own commit, so it can be reverted alone (rule 1).

- [ ] `cd frontend && npx cap sync android` under the CLI 8. Review the generated diff line
      by line — `capacitor.build.gradle` and `capacitor.settings.gradle` both carry
      "DO NOT EDIT" headers and are rewritten by `sync`.
- [ ] Decide `frontend/android/variables.gradle` deliberately. `cap sync` does **not**
      rewrite it, so it will stay on the v7 values while the v8 library is compiled against
      it. Moving it to the CLI 8 template values raises `minSdk` 23 → 24 (dropping Android
      5.1–6.0 devices) and `compileSdk`/`targetSdk` 35 → 36. That is a product decision, not
      a mechanical one — surface the installed-base number before changing it. Ship the
      bump if Task 0 showed Android already failing; otherwise it may be its own task.
- [ ] If `variables.gradle` moves, `frontend/android/build.gradle`'s AGP `8.7.2` and the
      wrapper's Gradle `8.11.1` likely have to move with it — `@capacitor/android@8.5.2`'s
      own buildscript names AGP `8.13.0`, and AGP 8.13 needs a newer Gradle.
- [ ] Re-run the Task 0 command. Same result or better. A worse result blocks the PR.
- [ ] Note, do not fix: `frontend/android/app/src/main/java/com/bme/app/MainActivity.java`
      declares `package com.trackvibe.app;` — a leftover from the BeMe rename where the
      directory never moved. Unrelated to this task and out of scope, but a regeneration
      would orphan it, so it should be filed separately.

## Task 6 — Documentation

- [ ] `frontend/CAPACITOR_SETUP.md`, Step 4.3 — *"Set Deployment Target: iOS 14.0 or higher
      recommended"* is now wrong and would reintroduce the bug. It should state iOS 15.0 as
      the floor, and say the template already sets it.
- [ ] Same file, Prerequisites — "Xcode 15+" was never verified against Capacitor 8. State
      the version the sweep actually used (Xcode 26.6, CocoaPods 1.16.2) as the known-good
      combination rather than inventing a minimum. Note the Node 22 requirement.
- [ ] Same file, Steps 1–2 — once `frontend/ios/` is committed, "run `cap:add:ios` to create
      the ios/ folder, then hand-edit Info.plist" is no longer the workflow. Rewrite as:
      clone, `npm ci`, `npm run cap:sync`, open. Keep the `cap add ios` path in a clearly
      labelled "regenerating from scratch" appendix, with the Info.plist keys as the thing
      to reapply.
- [ ] `agent-os/standards/global/tech-stack.md` — the "Other" section names only Expo and
      TWA under mobile and never mentions Capacitor, contradicting root `CLAUDE.md`. Add
      Capacitor as the shipping native shell for `frontend/`, and record the Node floor.
- [ ] `frontend/CLAUDE.md` — its Commands section lists `cap:sync` / `cap:ios` /
      `cap:android`. Add a line on where the native projects live and that both are
      committed.

---

## Verification

- [ ] Task 0 Android baseline recorded, and Task 5 matches or beats it
- [ ] `npx cap --version` → 8.5.x
- [ ] All four `@capacitor/*` majors agree, in `frontend/package.json` and in the resolved
      root `package-lock.json`
- [ ] Fresh `npx cap add ios` → `pod install` succeeds, no Podfile edit
- [ ] `xcodebuild -workspace frontend/ios/App/App.xcworkspace -scheme App -sdk iphonesimulator`
      succeeds, no project edit
- [ ] App launches in the iPhone 17 Pro simulator and the native mic path works **on a
      physical device** — the simulator has no Speech framework, so this is the one check
      that cannot be done in the simulator the sweep used
- [ ] `backend: npx tsc --noEmit`, `npx vitest run` — clean on Node 22
- [ ] `frontend: npx tsc --noEmit`, `npx vitest run`, `npm run build` — clean on Node 22
- [ ] `npx playwright test` — clean on Node 22
- [ ] Full CI green, including the new `native-drift` job
- [ ] `frontend/CAPACITOR_SETUP.md` followed start to finish on a clean clone by someone
      who did not write it

## Deliberately not done

- **No Capacitor 9.** Alphas are published; the target is parity with the installed core.
- **`@capacitor-community/speech-recognition` is not bumped.** Its peer range already
  admits core 8. It is verified on device, not changed.
- **`engine-strict=true` is not added to `.npmrc`.** That file documents a deliberate
  workaround; tightening it during a toolchain bump would confuse two failure modes.
- **The `com/bme/app/` directory is not moved.** Pre-existing, unrelated, filed separately.
- **`minSdk` 23 → 24 is flagged, not assumed.** It drops real devices. Product call.
- **No macOS CI job in this PR.** The drift lint first; the real build as a follow-up.
