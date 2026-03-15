# Fitness App UI Research — Styling & Theme Inspiration

Research of leading fitness apps to inform TrackVibe's visual design. Covers color palettes, typography, card patterns, dashboard layouts, data visualization, and what makes each app feel polished.

---

## Per-App Analysis

### 1. MyFitnessPal

**Color Palette**
| Role | Color | Hex |
|------|-------|-----|
| Primary | Bright Blue | `#0070F3` |
| Background | White | `#FFFFFF` |
| Text | Near Black | `#1A1A1A` |
| Protein | Blue | — |
| Carbs | Green | — |
| Fat | Pink/Red | — |
| Success | Green | — |
| Warning | Red | — |

**Typography**: System fonts, flat design. Clean hierarchy with high-contrast black text on white backgrounds. Minimal decorative type.

**Card Design**: Simple flat cards with white backgrounds and subtle dividers. No shadows or borders — uses spacing and dividers for separation. Macro ring visualization with distinct colors per macro.

**Dashboard Layout**: Diary-centric home. Daily calorie summary at top (remaining = goal - food + exercise). Macro breakdown ring below. Meal sections (breakfast, lunch, dinner, snacks) with food items listed.

**Data Visualization**: Donut/ring chart for macro split. Bar charts for weekly calorie trends. Simple, functional charting — clarity over aesthetics.

**What Makes It Work**: Extreme simplicity. Zero visual noise. Every element serves calorie/macro tracking. The flat design keeps the focus on data entry and numbers.

---

### 2. Strava

**Color Palette**
| Role | Color | Hex |
|------|-------|-----|
| Primary | Strava Orange | `#FC5200` |
| Secondary | Deep Orange | `#CC4200` |
| Background | White | `#FFFFFF` |
| Text | Dark Gray | `#2D2D2D` |
| Muted Text | Medium Gray | `#6D6D6D` |
| Border | Light Gray | `#E0E0E0` |

**Typography**: Bold, active sans-serif. Headings are confident and large. Stats use tabular-nums for alignment. Weight contrast (bold headlines vs. regular body) drives hierarchy.

**Card Design**: Activity cards with generous padding. Prominent stat display (distance, time, elevation) in a horizontal row. Subtle bottom borders. Like/comment actions below. Social feed pattern.

**Dashboard Layout**: Activity feed as primary view. Weekly stats summary at top. Quick-access buttons for recording activities. Map thumbnails on activity cards.

**Data Visualization**: Route maps as hero visuals. Pace/elevation line charts. Weekly/monthly volume bar charts. Orange accent on interactive elements and CTAs.

**What Makes It Premium**: The orange brand color is used sparingly but effectively — only on CTAs and active states. This creates visual energy without overwhelming. The social feed layout keeps users engaged.

---

### 3. Nike Training Club

**Color Palette**
| Role | Color | Hex |
|------|-------|-----|
| Primary | Black | `#111111` |
| Secondary | White | `#FFFFFF` |
| Accent | Nike Volt (occasional) | `#CDFD00` |
| Background | Black/Dark | `#000000` |
| Text | White | `#FFFFFF` |

**Typography**: Futura Bold Condensed (customized). Large-scale headings — 32px+ on workout titles. All-caps for category labels. Extreme weight contrast between headings and body text. The bold condensed type feels athletic and commanding.

**Card Design**: Full-bleed imagery on workout cards. Dark overlays with white text. Minimal UI chrome — the image IS the card. Large touch targets. Generous whitespace between cards.

**Dashboard Layout**: Immersive, editorial-style layout. Hero workout at top (full-width image). Curated workout collections below. Minimal navigation — content-forward design.

**Data Visualization**: Minimal charting. Focus is on the workout experience, not analytics. Progress shown through streaks and completion badges rather than charts.

**What Makes It Premium**: The dark theme + bold type + full-bleed imagery creates a magazine/editorial feel. Generous whitespace signals confidence. The constrained color palette (black, white, occasional volt) feels intentional and high-end.

---

### 4. Fitbit

**Color Palette**
| Role | Color | Hex |
|------|-------|-----|
| Steps/Activity | Teal | `#00B0B9` |
| Cardio/Heart | Red/Coral | `#F25C54` |
| Sleep | Purple/Indigo | `#6C63FF` |
| Mindfulness | Aqua | `#4DD0E1` |
| Background | White | `#FFFFFF` |
| Dark Background | Near Black | `#1A1A2E` |

**Typography**: Clean sans-serif (Roboto/system). Large numeric displays for metrics — the numbers are the hero. Medium weight for labels, bold for values. Clear size hierarchy.

**Card Design**: Large, vibrant metric cards with color-coded headers. Expandable detail sections. Ring progress indicators prominent on each card. Rounded corners, subtle shadows. Material 3 Expressive influence (2025 redesign).

**Dashboard Layout**: "Today" tab as primary view. Stacked metric cards: steps, heart rate, sleep, Active Zone Minutes. Each card expandable for detail. Color rings at top for daily goals. Four tabs: Today, Health, Sleep, Fitness.

**Data Visualization**: Concentric progress rings (Apple Health–inspired). One ring per metric with distinct colors. Percentage in center of ring. Line charts for heart rate trends. Bar charts for sleep stages. Weekly/monthly comparison views.

**What Makes It Premium**: The color-coded ring system is instantly recognizable and satisfying. Each health domain has its own color, creating visual consistency. Large numbers make metrics scannable at a glance. The Material 3 redesign added vibrant, modern touches.

---

### 5. Strong

**Color Palette**
| Role | Color | Hex |
|------|-------|-----|
| Primary | Blue | `#2979FF` |
| Background | White | `#FFFFFF` |
| Card Background | Light Gray | `#F5F5F5` |
| Text | Dark Gray | `#333333` |
| Muted | Medium Gray | `#999999` |
| Set Complete | Green | `#4CAF50` |

**Typography**: System fonts, clean and readable. Functional — not decorative. Weight values, reps, and sets in bold. Exercise names in medium weight. Compact text to fit more data on screen.

**Card Design**: Ultra-minimal exercise cards. Each exercise: name, then rows of sets (weight × reps). Checkmark to complete each set. Previous workout values shown in gray for reference. No decorative elements — pure function.

**Dashboard Layout**: Workout list as home screen. Current workout front and center during logging. History below. Timer at top during active workout. Quick-start and routine buttons.

**Data Visualization**: Minimal. Progress charts for individual exercises (weight over time, volume over time). Simple line charts. Focus is on the logging experience, not analytics.

**What Makes It Premium**: The "UI is one step ahead of your brain" philosophy. Auto-filled previous weights. Minimal taps to log a set. The app feels fast because there's zero visual noise between you and the data. Friction-free design IS the premium feature.

---

### 6. WHOOP

**Color Palette**
| Role | Color | Hex |
|------|-------|-----|
| Background | Near Black | `#1A1A1A` |
| Card Background | Dark Gray | `#2A2A2A` |
| Text | White | `#FFFFFF` |
| Recovery Green | Green | `#00E676` |
| Recovery Yellow | Amber | `#FFD600` |
| Recovery Red | Red | `#FF1744` |
| Strain Blue | Blue | `#448AFF` |
| Sleep Purple | Purple | `#7C4DFF` |

**Typography**: Clean sans-serif on dark backgrounds. Large metric numbers (40px+) as visual anchors. Thin/light weight for labels, bold for values. High contrast white on dark.

**Card Design**: Dark cards with subtle borders or elevation. Large metric displays — strain score, recovery percentage, sleep score. Color-coded status indicators (green/yellow/red). Gradient accents on key metrics.

**Dashboard Layout**: Today's metrics as hero: Recovery %, Strain, Sleep. Each metric is a large, tappable card. Weekly trends below. Minimal navigation — the three core metrics dominate.

**Data Visualization**: Gauge-style indicators for strain (0–21 scale) and recovery (0–100%). Color gradients on gauges (green → yellow → red). Heart rate variability trend lines. Sleep stage breakdowns with color bars. Weekly strain/recovery comparison charts.

**What Makes It Premium**: The dark theme is the entire identity. It feels like a cockpit or mission control. The green/yellow/red status system is instantly intuitive. Large, bold numbers create a data-forward aesthetic. The limited color palette (dark + status colors) feels disciplined and professional.

---

### 7. Hevy

**Color Palette**
| Role | Color | Hex |
|------|-------|-----|
| Primary | Blue | `#4A90D9` |
| Background | White | `#FFFFFF` |
| Card Background | Off-White | `#F8F9FA` |
| Text | Dark | `#212529` |
| Muted | Gray | `#868E96` |
| Set Complete | Blue | `#4A90D9` |
| PR Indicator | Gold | `#FFD43B` |

**Typography**: System fonts, functional hierarchy. Bold exercise names, regular weight for set data. Compact spacing for dense data display.

**Card Design**: Clean exercise cards similar to Strong. Set rows with weight × reps. Checkmark completion. PR badges (gold) for personal records. Routine cards with exercise previews. Social feed cards for shared workouts.

**Dashboard Layout**: Active workout or routine list as home. Quick-start button prominent. History with calendar view. Exercise database searchable.

**Data Visualization**: Exercise-specific progress charts (1RM estimates, volume trends). Line charts for weight progression. Bar charts for volume per muscle group. PR timeline markers.

**What Makes It Premium**: The reusable component library ensures visual consistency. PR tracking with gold badges creates a reward system. The social sharing feature adds engagement. Smart auto-fill from previous workouts reduces friction.

---

## Cross-App Design Patterns

### Color Strategy

**Fitness apps universally use color to encode domains:**

| Domain | Common Colors | Psychology |
|--------|--------------|------------|
| Activity/Workouts | Blue, Teal, Green | Energy, movement, progress |
| Nutrition/Food | Orange, Amber, Green | Warmth, appetite, health |
| Sleep | Purple, Indigo | Calm, rest, night |
| Heart/Cardio | Red, Coral | Vitality, intensity |
| Recovery | Green → Yellow → Red | Status/traffic-light system |
| Goals/Achievement | Gold, Green | Reward, success |

**Brand accent color usage:**
- Use sparingly — only on CTAs, active states, and key metrics (Strava approach)
- Too much accent color creates visual noise; restraint signals premium quality
- 1-2 accent colors max for the brand; the rest are semantic domain colors

### Typography Hierarchy

**Standard fitness app type scale:**

| Level | Size | Weight | Use |
|-------|------|--------|-----|
| Hero Metric | 36-48px | Bold | Single large number (calories, strain score) |
| Page Title | 24-32px | Bold | Page headings |
| Section Title | 18-20px | Semibold | Card headers, section labels |
| Body | 14-16px | Regular (400-500) | Descriptions, food names |
| Label/Caption | 12-14px | Medium (500) | Units, timestamps, secondary info |
| Tabular Data | 14-16px | Medium, tabular-nums | Weights, reps, calories, macros |

**Key patterns:**
- Use weight contrast (bold vs. regular) more than size alone
- Tabular-nums for all numeric data (alignment in lists)
- System fonts preferred for performance (SF Pro, Roboto, Inter)
- All-caps sparingly — only for category labels or badges

### Card Design Anatomy

**Standard fitness card structure:**

```
┌─────────────────────────────┐
│  Icon/Color   Title    Badge│  ← Header: type icon, title, status badge
│                             │
│      42                     │  ← Hero metric: large, bold number
│    calories remaining       │  ← Metric label: small, muted
│                             │
│  ■■■■■■■■░░  80%           │  ← Progress indicator: bar, ring, or gauge
│                             │
│  Detail 1  |  Detail 2     │  ← Supporting details: secondary stats
│                             │
│  [Action Button]            │  ← Optional CTA
└─────────────────────────────┘
```

**Patterns across apps:**
- Generous padding: 16-24px (Tailwind p-4 to p-6)
- Subtle hover/tap states: background shift or border highlight
- Color accent on left border or top bar to indicate domain
- Rounded corners: 8-12px (rounded-lg to rounded-xl)
- Shadows: subtle or none; modern apps lean toward flat with borders

### Dashboard Layout Pattern

**Information hierarchy — status → trends → details:**

```
┌─────────────────────────────┐
│  Greeting / Date            │  ← Context
├─────────────────────────────┤
│  ┌───┐  ┌───┐  ┌───┐      │
│  │ ○ │  │ ○ │  │ ○ │      │  ← Status rings / quick stats
│  │72%│  │3/5│  │7.5│      │     (goals, workouts, sleep)
│  └───┘  └───┘  └───┘      │
├─────────────────────────────┤
│  Quick Actions              │
│  [Workout] [Food] [Sleep]  │  ← 1-tap entry points
├─────────────────────────────┤
│  ┌─────────────────────┐   │
│  │ Trend Chart          │   │  ← Trend: line/bar chart
│  │ ~~~~~/\~~~~          │   │     (calories, workouts over time)
│  └─────────────────────┘   │
├─────────────────────────────┤
│  Recent Activity            │
│  • Workout: Push Day        │  ← Detail list: recent entries
│  • Food: Chicken Salad      │
│  • Sleep: 7.5 hours         │
└─────────────────────────────┘
```

### Data Visualization Styles

**Progress Rings (Fitbit / Apple Health style)**
- Concentric rings for multi-metric progress
- Each ring = one goal (workouts, calories, sleep)
- Color-coded per domain
- Percentage or current value in center
- Animate on load (0% → current, 500ms ease-out)

**Trend Lines (Strava / WHOOP style)**
- 7-day or 30-day views
- Single-color line with area fill underneath
- Dot markers on data points
- Hover/tap tooltip with exact value
- Reference line for target/average

**Gauges (WHOOP style)**
- Semi-circle or full-circle gauge
- Color gradient (green → yellow → red)
- Current value as large centered number
- Used for strain, recovery, intensity scores

**Bar Charts (MyFitnessPal / Hevy style)**
- Weekly/monthly volume comparisons
- Stacked bars for macro breakdown
- Color-coded per category
- Horizontal labels below

### Micro-Interactions

**Timing standards:**
- Instant feedback: < 100ms (button press, toggle)
- Quick transitions: 150-300ms (card expand, tab switch, hover)
- Meaningful animations: 300-500ms (progress fill, chart draw, page enter)
- Never > 500ms for UI responses

**Essential micro-interactions:**
| Interaction | Animation | Duration |
|-------------|-----------|----------|
| Card entry | fadeUp (translate-y + opacity) | 300ms with stagger |
| Progress ring fill | Clockwise sweep from 0 | 500ms ease-out |
| Set completion | Checkmark scale + color change | 200ms |
| Number change | Counter roll / fade transition | 300ms |
| Loading state | Skeleton shimmer | Loop until loaded |
| Success action | Brief green flash or check icon | 300ms |
| Delete confirm | Shake or red highlight | 200ms |

### Premium Feel Checklist

What separates polished fitness apps from basic ones:

- [ ] **Generous spacing**: 16px+ padding in cards, 24px+ between sections
- [ ] **Consistent border-radius**: One radius for cards (rounded-lg), one for buttons (rounded-md)
- [ ] **High contrast text**: 4.5:1+ ratio, bold metrics, muted secondary text
- [ ] **Color restraint**: 1-2 brand colors + semantic domain colors, no rainbow
- [ ] **Tabular numbers**: All numeric data uses tabular-nums for alignment
- [ ] **Smooth transitions**: 150-300ms on all interactive state changes
- [ ] **Skeleton loaders**: Shimmer placeholders instead of spinners for content
- [ ] **Large tap targets**: 44px minimum touch target size
- [ ] **Bottom-aligned actions**: Primary buttons at bottom for thumb reach
- [ ] **Thoughtful empty states**: Illustration + message + CTA, not just "No data"
- [ ] **Dark mode that works**: Not just inverted — custom dark palette with proper contrast
- [ ] **Consistent iconography**: One icon library, consistent size and stroke width

---

## Recommendations for TrackVibe

### Color Palette Enhancements

TrackVibe's current sage/cream palette is warm and wellness-focused. Enhance it with domain-specific semantic colors:

| Domain | Current | Recommended | Reasoning |
|--------|---------|-------------|-----------|
| Body/Workouts | Blue accents | `#3B82F6` (blue-500) | Matches Fitbit/Strong energy convention |
| Energy/Food | Orange accents | `#F97316` (orange-500) | Strava-inspired warmth, appetite association |
| Sleep | Indigo accents | `#6366F1` (indigo-500) | Universal sleep = purple/indigo convention |
| Goals | Green accents | `#22C55E` (green-500) | Success/achievement across all apps |
| Brand Primary | Sage `#2D6842` | Keep | Distinctive, wellness-appropriate |
| Background | Cream `#FAFAF7` | Keep | Warm, inviting, differentiates from clinical white |

### Dashboard Improvements

Inspired by Fitbit's ring system and WHOOP's metric-first approach:

1. **Hero metrics at top**: Large progress rings for active goals (workouts, calories, sleep) — currently exists as `DashboardProgressCards`, enhance with animated ring fills
2. **Quick stat row**: Today's numbers in a compact horizontal strip (total calories, workout count, sleep hours) — currently exists in `TodaySummary`, make numbers larger and bolder
3. **Trend chart**: Add a prominent 7-day trend chart to the dashboard (calories or workouts) — inspired by Strava's weekly summary
4. **Quick actions**: Keep the 2×2 grid but add Strava-style color coding per domain

### Card Refinements

Inspired by Strong's minimalism and Fitbit's vibrant cards:

1. **Workout cards**: Add a colored left border per workout type (blue for strength, green for cardio) — inspired by Fitbit's domain coloring
2. **Food entry rows**: Larger calorie number, macro pills below — inspired by MyFitnessPal's macro-forward display
3. **Goal cards**: Animated progress rings instead of static bars — inspired by Fitbit/Apple Health rings

### Data Visualization Upgrades

Inspired by WHOOP's gauges and Fitbit's rings:

1. **Progress rings**: Animate from 0 to current on page load (500ms ease-out)
2. **Calorie trend chart**: Add area fill under the line, reference line for daily target
3. **Workout frequency chart**: Add muscle group distribution pie chart (Hevy-inspired)
4. **Sleep chart**: Color-coded bar for hours (green = 7-9h, yellow = 6-7h, red = <6h) — WHOOP-inspired status colors

### Animation Improvements

1. **Card entry**: staggered fadeUp animation (currently exists, ensure consistent 300ms timing)
2. **Skeleton loaders**: Replace spinner with shimmer skeletons for all async content
3. **Progress animations**: Rings and bars should animate on load, not appear static
4. **Number transitions**: Calorie/weight numbers should roll/fade when changing

---

## Sources

- [MyFitnessPal Design Critique — Hayleigh Moore](https://hayleighbmoore.medium.com/a-design-critique-myfitnesspal-9eec70a6e8ff)
- [Strava Brand Color Palette — Mobbin](https://mobbin.com/colors/brand/strava)
- [Nike Training Club Design System — Oscar W](http://oscar-w.com/projects/design-system)
- [Fitbit App Redesign — Google Blog](https://blog.google/products/fitbit/introducing-the-all-new-fitbit-app/)
- [Fitbit Material 3 Expressive — 9to5Google](https://9to5google.com/2025/11/09/fitbit-material-3-expressive/)
- [Strong App UX Case Study — Hwai Jun Yap](https://medium.com/@hwaijunyap/ui-ux-case-study-strong-app-redesign-fc22afbada65)
- [How We Built Hevy — Hevy](https://www.hevyapp.com/how-we-built-hevy/)
- [Best UX/UI Practices For Fitness Apps — Dataconomy](https://dataconomy.com/2025/11/11/best-ux-ui-practices-for-fitness-apps-retaining-and-re-engaging-users/)
- [Health Data Visualization Techniques — GetFocal](https://www.getfocal.co/post/10-health-data-visualization-techniques-trends-patterns-tools)
- [Fitness App Design Examples — DesignRush](https://www.designrush.com/best-designs/apps/trends/fitness-app-design-examples)
- [Workout App UI Kit — Figma Community](https://www.figma.com/community/file/1306588084283181346/workout-app-ui-kits)
