# Plan — The AI Coach button floats on top of real controls

Status: **not started**. This pass is documentation only; no application code changed.

## What the review found

The finding in `shape.md` is real and the CSS quoted in it is current. Three corrections
carry into the plan.

**1. It is not an iOS bug.** `frontend/index.html:7` is
`width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no` — there is no
`viewport-fit=cover` anywhere in the repo. So `env(safe-area-inset-bottom)` resolves to `0`
in the iOS WKWebView, in Chrome, and everywhere else, and the geometry in a 390px desktop
browser viewport is **identical** to the geometry in the simulator. The iOS sweep is where it
was spotted, not where it lives. It reproduces in `npm run dev` at 390×844 with no device.

**2. It is not a Pro-only annoyance.** `hasAiAccess` is `isPro || aiCallsRemaining > 0`
(`frontend/src/hooks/useSubscription.ts:10`), and `backend/src/models/user.ts:60-66` gives
every free account `FREE_TIER_LIMIT = 10` calls a month. The FAB is therefore on screen for
every Pro user *and* every free user who has not burned the month's quota — including every
brand-new account on its first session. It is off only for exhausted free users, and on
`/insights`, where the render is guarded by `pathname !== '/insights'`.

**3. "Reserve the space" (shape option 1) cannot pass the acceptance criteria on its own.**
`main`'s `pb-32` is padding in the document, not a viewport-fixed strip. It fixes only the
end-of-scroll resting position. The FAB is `position: fixed`, so at every other scroll offset
the page keeps sliding underneath it and covers whatever is passing through the band. Bottom
padding cannot reach that.

### The measurement

At a 390px-wide viewport, `env(safe-area-inset-bottom) = 0`, distances given as height above
the viewport bottom:

| Element | Where it is |
|---|---|
| Content column (`main` `px-4` + `mx-auto max-w-[700px]`) | x `16 … 374` |
| AI FAB (`right-4`, `h-12 w-12`, `bottom calc(env+9.75rem)`) | x `326 … 374`, y `156 … 204` |
| Bottom bar (`mx-3.5 mb-3.5 h-16`) | x `14 … 376`, y `14 … 78` |
| Centre mic (`top-[-22px]`, `60px`) | centred, y `40 … 100` |
| Bar's gradient scrim (`h-32`) | y `0 … 128` |
| Reserved strip (`main` `pb-32`) | y `0 … 128` |

Two numbers explain the whole bug:

- **Horizontally**, the FAB covers the rightmost **48px of a 358px content column** — 13% of
  the width, at every scroll offset, on every screen where it renders.
- **Vertically**, it sits at `156 … 204`, which is **28px above the top of the bar's scrim and
  28px above the strip the layout reserves**. It is too high to be chrome and too low to be
  content, so it is the only element in the app that floats over live content with no scrim
  behind it and nothing reserving its space.

The bottom bar overlaps content mid-scroll too — but it is full-width, opaque, scrim-backed
and understood as chrome, so nobody reads it as a bug. A lone 48px circle in the middle of a
card does not get that reading.

### What actually collides

The FAB owns the right 48px of the content column, so **every control whose right edge is
within 48px of that column's right edge is under it whenever the page scrolls it through the
band**. That is not three screens; it is a class of control, and the app right-aligns its row
actions by convention:

| Screen | Control in the band | What is covered |
|---|---|---|
| Home | `QuickTile` right column — "Log workout" and "Log weight" (`Home.tsx:250-265`, `grid-cols-2`, tiles x `200 … 374`) | Right 48px of a 174px tile — the reported case, and it is whichever of the two tiles is at that height |
| Home | `WeightProgress` (`Home.tsx:268-271`, right cell of the trackers grid) | The whole card is one `role="button"`; its right 48px is dead |
| Home | Recent-activity rows (`Home.tsx:288-308`) | The trailing date + chevron, right edge of a full-width button |
| Food | **"Copy day"** (`Energy.tsx:457-464`) — rightmost of the Journal header pair, right edge flush at x `374`, ~99px wide | ~48px, about half the button including its right half. Worst case in the app |
| Food | `FoodCard` delete (`FoodCard.tsx:49-60`, `h-11 w-11` at card `p-3` → x `318 … 362`) | 36 of 44px of a **destructive** control |
| Food | `MealJournalCard`'s "Add" button (`MealJournalCard.tsx:103-110`, right cell of `grid-cols-[1fr_auto]`) | Right edge of the manual-add target |
| Workouts | `WorkoutCard` delete (`WorkoutCard.tsx:92-103`, `h-11 w-11` at card `p-4` → x `314 … 358`) | 32 of 44px of a **destructive** control |
| Workouts | `AddAnotherCard` (`AddAnotherCard.tsx`, `w-full`) | The label is centred so it looks fine, but the right 48px of the tap target is dead |
| Workouts | `EmptyState` card (`Body.tsx:262-268`) | The reported case. The FAB lands **inside the card**, but the CTA is centred (`EmptyState.tsx:44-57`) so nothing interactive is covered — cosmetic only, and `shape.md`'s "next to" is the accurate word |
| Goals | `GoalCard` edit + delete (`GoalCard.tsx:85-100`, right-aligned pair) | The delete button, same as the other cards |
| Goals | `AddAnotherCard` | Same dead right edge |
| Profile (Settings) | Every right-aligned `Switch` — `NotificationsSection.tsx:76, 88, 135`, and the `justify-between` rows in `CycleSection`, `SubscriptionSection`, `ProfileSection` | ~28px of each 44px switch. Longest scrolling page in the app, so this repeats a dozen times |
| Water | Column 4 of the glass grid (`Water.tsx:65-92`, `grid-cols-4` inside a `p-6` card → right column reaches x `350`) | ~24px of a 56px-tall tile. "Add glass" and the minus button are centred, so they are clear |
| Insights | — | **Not affected.** The FAB does not render there (`Base44Layout.tsx:329`) |

Sharpest version: on Food, Workouts and Goals the FAB parks on top of the **delete** button of
whichever card is at that height. It is not a data-loss risk — the FAB is `z-40` and wins the
tap, so the user gets the AI panel — but aiming at delete opens AI Coach, and the row cannot
be deleted without scrolling first.

### The two controls know nothing about each other

- The mic lives in `BottomNavigation.tsx:52-59`, positioned relative to the bar.
- The AI button lives in `Base44Layout.tsx:329-338`, positioned relative to the viewport.
- The bar's right edge is `mx-3.5` (14px); the FAB's is `right-4` (16px). Two chrome elements
  on one edge, 2px apart, on unrelated constants.
- The mic carries `shadow-fab` (primary glow), the FAB `shadow-card-lg`.
- `main`'s `pb-32` = 128px matches the scrim's `h-32` exactly — the reservation was sized for
  the bar, and nobody re-sized it when the FAB arrived above it.
- On desktop the two *are* a system: mic at `lg:bottom-6`, AI at `lg:bottom-[5.25rem]`,
  stacked with a 12px gap. Only the mobile pair is unmanaged.

## The recommendation — shape option 2, as a docked companion, not a fifth tab

Option 1 (reserve space) fails mid-scroll, as measured above. Option 3 (auto-hide) also fails
the criterion "does not overlap any interactive element", because the button has to come back,
and it comes back on top of whatever is there; it trades a layout bug for a discoverability
one, and hiding the only entry point to a paid feature is the wrong direction. Option 2 is the
only one that removes the overlap structurally, because it moves the button into the strip the
layout already reserves and the scrim already covers.

**But not as a fifth navigation tab.** `BOTTOM_NAV` is deliberately four items
(`Base44Layout.tsx:58-71`, and Task 4 of the 2026-08-15 single-role-nav spec, which removed
role branching from the bar on purpose). A fifth entry would also mean `BottomNavigation`'s
`Math.ceil(items.length / 2)` split goes 3-left / 2-right, and — worse — `hasAiAccess` is
conditional, so the bar would gain and lose a tab as a user's quota ran out, shifting the four
fixed tabs under their thumb. That is exactly the branching the nav spec deleted.

So: keep four tabs, and make the bottom bar own the AI affordance as a **docked companion to
the mic** — same fixed container, same safe-area inset, same reserved strip, position derived
from the bar's height rather than a literal in another file.

## Task 1 — Spec documentation

- [x] `shape.md` — the report from the iOS click sweep (pre-existing)
- [x] `standards.md` — the standards that bind this and the rules carried into it
- [x] `plan.md` — this file
- [ ] Fold the three corrections above back into `shape.md`, or leave them here and link

## Task 2 — Give the bottom bar both floating controls

- [ ] Move the AI Coach button out of `frontend/src/components/layout/Base44Layout.tsx:329-338`
      and into `frontend/src/components/layout/BottomNavigation.tsx`, inside the existing
      `<nav className="fixed bottom-0 … pb-safe">`. The nav is already `pointer-events-none`
      with `pointer-events-auto` on the bar, so the new control opts in the same way.
- [ ] Extend `BottomNavigationProps` with the two things the layout still owns:
      `showAiCoach: boolean` and `onAiCoachPress: () => void`. `Base44Layout` keeps
      `hasAiAccess`, `pathname !== '/insights'`, `aiChatOpen` and `<AiChatPanel>` — the bar
      renders an affordance, it does not learn about subscriptions.
- [ ] Position it from the bar's own geometry, not from the viewport: the bar is `mb-3.5 h-16`
      (top edge 78px up) and the scrim is `h-32` (128px). Default placement is the band between
      them — right-aligned to the **bar's** right edge so it shares `mx-3.5`, not `right-4`.
- [ ] Name the bar's heights as constants in `BottomNavigation.tsx` and derive the scrim, the
      dock offset and the value Task 3 needs from them. One place to change, not four.
- [ ] Keep it a `Button size="icon"` from `@/components/ui/button`. Keep
      `aria-label="Open AI Coach"`. Do not go below 44px if it shrinks from `h-12`.
- [ ] Settle the elevation deliberately: the mic is `shadow-fab`, the AI button
      `shadow-card-lg`. Two controls in one system get one decision, from the shadow scale.
- [ ] `lg:hidden` comes free from the nav wrapper — check the AI button does not leak onto
      desktop, where the existing stacked pair already handles it (Task 4).

## Task 3 — Reconcile the reserved strip with the chrome

- [ ] `main`'s `pb-32` in `Base44Layout.tsx:301` is 128px and the scrim is 128px. Once the AI
      button is docked, raise both together from the constants in Task 2 so the reserved strip
      covers the tallest thing in the chrome, and the end-of-scroll resting state has nothing
      stranded underneath.
- [ ] `main`'s reservation does not add `env(safe-area-inset-bottom)` while the nav does. It is
      harmless today because the inset is 0, but it will strand content by the height of the
      home indicator the moment the `viewport-fit=cover` task lands. Fix it here, in the same
      expression.
- [ ] Delete the page-local `pb-28` on `frontend/src/pages/Water.tsx:38` — a page working
      around the shell's reservation. `frontend/components` says pages compose, they don't
      style. Confirm Water still clears the bar after the shell value moves.
- [ ] Grep for other page-local bottom padding doing the same job before assuming Water is the
      only one.

## Task 4 — Leave the desktop pair alone

- [ ] The desktop voice FAB (`Base44Layout.tsx:319-326`, `hidden … lg:flex`, `lg:bottom-6`) and
      the AI button's `lg:bottom-[5.25rem]` already stack correctly with a 12px gap. That
      pairing is not broken and is not in scope — carry both offsets across unchanged.
- [ ] Check the 768–1023px window explicitly: the bottom bar is still visible (`lg:hidden`)
      while `md:right-6` is already in effect, so the AI button is 10px inboard of the bar's
      `mx-3.5` edge there. Aligning to the bar's edge in Task 2 should retire `md:right-6` for
      this control.

## Task 5 — Tests

- [ ] `frontend/src/components/layout/Base44Layout.test.tsx:19` mocks
      `useSubscription: () => ({ hasAiAccess: false })`, so nothing in the suite has ever
      rendered the FAB. Add the `hasAiAccess: true` case and assert the button is present,
      opens the panel, and is absent on `/insights`.
- [ ] Add the pass-through to `BottomNavigation.test.tsx`: `showAiCoach` renders the control,
      `onAiCoachPress` fires, `showAiCoach: false` renders nothing, and the four tabs and the
      centre mic are unchanged in both states.
- [ ] Add an E2E regression in `frontend/e2e/` at a 390×844 viewport that walks Home, Food,
      Workouts, Goals, Water and Profile and asserts the AI button's bounding box does not
      intersect any element matching `button, a, [role="button"], input` — top of scroll and
      bottom of scroll. Static offsets are what caused this; only a geometric assertion catches
      the next one.

## Verification

- [ ] `cd frontend && npx tsc --noEmit`
- [ ] `cd frontend && npm run test -- --run` (from `frontend/`; the root script drops `--run`)
- [ ] `cd frontend && npm run test:e2e`
- [ ] Manual pass at **390px and 402px** in a desktop browser — the reproduction does not need
      a device — on Home, Food, Workouts, Goals, Water, Profile, at the top of scroll, mid
      scroll and the bottom of scroll
- [ ] Both `hasAiAccess` states: a Pro account, a free account with quota, and a free account
      at 0 remaining
- [ ] `/insights` still renders no AI button
- [ ] Light and dark, since the scrim is a `from-background` gradient and the dock sits in it
- [ ] Desktop ≥1024px: mic and AI button still stacked, bottom bar still hidden
- [ ] iOS simulator to close the original report

## Deliberately not in scope

- **`viewport-fit=cover`.** It belongs to the sibling iOS-sweep task. This plan writes the
  inset into the expressions correctly so it starts working the day that lands, and changes
  nothing about the current 0.
- **A fifth navigation tab.** Rejected above; `BOTTOM_NAV` stays at four.
- **Auto-hide on scroll.** Rejected as a fix. It could still be added later as polish on top of
  a docked button, but it must not be the fix.
- **Re-siting the mic.** The centre mic is correct and `frontend/mobile-ui` documents why it is
  the one voice entry point on mobile. It gains a neighbour, not a new position.
- **Anything in `mobile/`.** The Expo app is dormant.

## Open question for the owner

Docking the AI button beside the mic makes the AI Coach visibly permanent chrome for free users
too — `hasAiAccess` is true for anyone under 10 calls a month. That is arguably the right call
commercially, but it is a product decision, not a layout one, and it should be made on purpose
rather than inherited from where the button happens to land.
