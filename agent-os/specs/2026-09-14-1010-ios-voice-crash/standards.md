# Standards That Apply

| Standard | Why it applies here |
|---|---|
| `global/critical-rules` | Voice is the product's primary input. This is a bug fix on a shipped feature — repair the permission path, don't redesign the Voice Agent. |
| `global/tech-stack` | The native shells are platform config, not app code. The standard still names Expo/TWA as "mobile" and needs the Capacitor line — see the note below. |
| `global/testing` | The only part of this work a test runner can reach is the hook guard in `useNativeSpeech.ts`. Everything else is manual on a device. |
| `frontend/mobile-ui` | The denial state renders inside the Voice Agent sheet: 44px targets, no edge-touching text, one voice entry point per viewport. |
| `frontend/design-tokens` | The error line uses `text-destructive`, and any "Open Settings" action uses an existing `ui/button` variant. No new colour. |
| `frontend/components` | A denial state is a state of `VoiceAgentPanel`, not a new component and not a second primitive in `shared/`. |
| `frontend/data-fetching` | Not engaged — permission state is device state, not server state. Do not put it in React Query. |

## The rules that actually constrain this work

- **Never break existing functionality** (`global/critical-rules` #1). The web and PWA voice
  paths (`useWebSpeech`, `useVoiceStream`) are healthy today. A change to
  `useSpeechRecognition.ts` that alters impl selection risks all three platforms to fix one.
- **Default focus is UI, UX and bug fixing** (#5). The Info.plist and manifest edits are
  platform config; the denial state is UX. Neither justifies touching backend or API shapes.
- **Don't change API shapes** (#4). Nothing here goes near the wire. `understandTranscript`
  is called with the same payload before and after.
- **One voice entry point per viewport** (`frontend/mobile-ui`). Whatever the denial state
  says, it belongs inside the sheet the mic already opens. Do not add a settings banner to
  Home or a second mic affordance.
- **Touch targets >= 44px** (`frontend/mobile-ui`). If a denial state grows an "Open Settings"
  button, it is a real button, not a tappable line of text.
- **Tokens, never literals** (`frontend/design-tokens`). The existing error line is
  `text-sm text-destructive`; extend that, do not introduce a warning yellow.
- **Unit tests co-locate** (`global/testing`). A guard test goes in
  `frontend/src/hooks/useNativeSpeech.test.ts`, not in a `__tests__/` folder.
- **`npm run lint` is `tsc --noEmit`**, run from inside `frontend/`. There is no root tsconfig.

## Two standards this task shows to be out of date

1. `global/tech-stack` says *"Mobile: Expo React Native app in `mobile/`; TWA wrapper in
   `twa/`"*. Root `CLAUDE.md` says `frontend/` ships as the native shell via Capacitor and
   `mobile/` is dormant. The native shell that crashes is the one the standard doesn't
   mention. Worth a `/agent-os:discover-standards` pass after this lands — but not in this
   PR, and not by this task.
2. There is **no standard for native platform config**. `frontend/android/` is committed,
   `frontend/ios/` is not, and nothing written down says which is right. That gap is exactly
   what PR #293 has to close, and it is why this fix currently has no home.
