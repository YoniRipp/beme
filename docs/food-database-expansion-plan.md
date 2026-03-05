# Food Database Expansion Plan

## Current State

### What's in the DB today
- **USDA Foundation Foods** (~500 whole foods): chicken breast, rice, banana, eggs, etc.
- Import script: `backend/scripts/importFoundationFoods.js` reads `FoodData_Central_foundation_food_json_2025-12-18.json`
- Lightweight dev seed: `backend/scripts/seedPopularFoods.js` (~142 popular foods)
- All nutrition stored **per 100g** (or 100ml for liquids)
- Schema: `foods` table with `name, calories, protein, carbs, fat, is_liquid, serving_sizes_ml, preparation`

### Current lookup chain
```
User input → DB search (LIKE on name) → miss → Gemini AI lookup → miss → zero-nutrition fallback
```

### Problems
1. **USDA Foundation Foods is tiny** — only covers unprocessed whole foods
2. **No branded/packaged foods** — no Tnuva, Osem, Coca-Cola, protein bars
3. **No barcode scanning** — users must type or speak food names
4. **Gemini fallback is slow** (~1-3s per lookup) and can be inaccurate
5. **No Israeli local products** — critical since app launches in Israel
6. **DB doesn't grow systematically** — Gemini-created entries are ad-hoc

---

## How Fitness Apps Handle Food Databases

| App | Approach | DB Size | Key Insight |
|-----|----------|---------|-------------|
| **MyFitnessPal** | Own DB + user submissions + barcode | 14M+ | Massive user-contributed data is their moat |
| **Cronometer** | USDA + NCCDB + Nutritionix API | ~100K curated | Quality over quantity; dietitian-verified |
| **Lose It** | Own DB + barcode + AI photo | 50M+ | AI-assisted entry reduces friction |
| **FatSecret** | Own DB + public API + barcode | 2.3M+ | Offers free API for other apps |
| **Yazio** | Own DB + Open Food Facts + barcode | Large | Leverages open-source food data |
| **Samsung Health** | Open Food Facts + local partnerships | Medium | Regional focus with OFF for coverage |

**Common pattern:** Core DB (USDA) + external API (branded) + barcode scanning + user submissions. Nobody relies solely on their own DB for branded foods.

---

## Proposed Solution: 4-Tier Food Lookup Chain

```
User input (voice/text/barcode)
        ↓
1. Local DB (fast, ~5ms)
   └── USDA Foundation + cached lookups + Gemini-created entries
        ↓ miss
2. Open Food Facts API (medium, ~200-500ms)
   └── 4M+ products, Israeli products (729* barcodes), free, open-source
   └── Auto-cache result into local foods table
        ↓ miss
3. Gemini AI lookup (slow, ~1-3s)
   └── Handles Hebrew, slang, prepared dishes, anything
   └── Auto-cache result into local foods table
        ↓ fail
4. Zero-nutrition fallback
   └── User can edit later; never blocked
```

### Why Open Food Facts (OFF)?

- **Free & open source** — no API key required, no rate limits for reasonable use
- **Israeli coverage** — ~50K+ Israeli products at il.openfoodfacts.org
- **Barcode support** — search by EAN-13 (Israeli prefix 729)
- **Nutrition data** — per 100g with full macros
- **Multilingual** — product names in Hebrew + English
- **Community-maintained** — growing daily
- **No vendor lock-in** — data is under Open Database License

### Israel-Specific Benefits
- Israeli barcode prefix: **729** (GS1 Israel)
- Products from Tnuva, Osem, Strauss, Elite, Tara, Shufersal brand, etc.
- Hebrew product names searchable
- Users can contribute missing Israeli products back to OFF

---

## Implementation Plan

### Phase 1: Open Food Facts API Client (Backend)

**New file: `backend/src/services/openFoodFacts.ts`**

```typescript
// Open Food Facts API client
// Base URL: https://world.openfoodfacts.org/api/v2

interface OFFProduct {
  code: string;              // barcode
  product_name: string;
  product_name_he?: string;  // Hebrew name
  nutriments: {
    'energy-kcal_100g'?: number;
    proteins_100g?: number;
    carbohydrates_100g?: number;
    fat_100g?: number;
  };
  categories_tags?: string[];
  image_url?: string;
}

// Search by name
async function searchByName(query: string, limit?: number): Promise<OFFProduct[]>
// GET https://world.openfoodfacts.org/cgi/search.pl?search_terms={query}&json=1&page_size={limit}

// Lookup by barcode
async function getByBarcode(barcode: string): Promise<OFFProduct | null>
// GET https://world.openfoodfacts.org/api/v2/product/{barcode}

// Convert OFF product to our foods table format
function offProductToFood(product: OFFProduct): FoodRow
```

**API Details:**
- No API key needed
- Rate limit: ~100 requests/minute (respectful usage)
- User-Agent header required: `BeMe/1.0 (contact@beme.app)`
- Returns JSON with nutrition per 100g
- Supports search by name in any language including Hebrew
- Barcode lookup is instant (direct key lookup)

### Phase 2: Enhanced Food Lookup Chain

**Modify: `backend/src/services/voice.ts` — `buildAddFood()` handler**

Current flow:
```
DB search → Gemini lookup → fallback
```

New flow:
```
DB search → Open Food Facts search → Gemini lookup → fallback
```

**Modify: `backend/src/models/foodSearch.ts`**

Add `searchWithFallback()` that chains:
1. `search()` — existing local DB
2. `searchOpenFoodFacts()` — OFF API, auto-cache hits
3. Return combined results

**Modify: `backend/src/controllers/foodSearch.ts`**

Update `search` endpoint to use the enhanced chain:
- Local DB results first (instant)
- If fewer than `limit` results, supplement from OFF
- Cache OFF results in Redis for 1 hour AND persist to foods table

### Phase 3: Barcode Scanning

**New endpoint: `GET /api/food/barcode/:code`**

```typescript
// 1. Check local DB for barcode (new column: barcode text)
// 2. If miss → Open Food Facts barcode API
// 3. Cache result locally
// Response: same shape as food search results
```

**Database changes:**
```sql
ALTER TABLE foods ADD COLUMN barcode text;
CREATE INDEX idx_foods_barcode ON foods (barcode) WHERE barcode IS NOT NULL;
ALTER TABLE foods ADD COLUMN source text DEFAULT 'usda';
-- source values: 'usda', 'open_food_facts', 'gemini', 'user'
```

**New column `source`** tracks where each food came from:
- `usda` — USDA Foundation Foods import
- `open_food_facts` — cached from OFF API
- `gemini` — AI-generated lookup
- `user` — user-submitted (future)

**Frontend: barcode scanner component**

Using browser `BarcodeDetector` API (Chrome/Edge) or `quagga2` npm package as fallback:
```typescript
// New component: frontend/src/components/BarcodeScanner.tsx
// - Opens device camera
// - Detects EAN-13 barcodes in real-time
// - Calls GET /api/food/barcode/:code
// - Returns food data or "not found" with option to add manually
```

Integration points:
- Energy page: "Scan barcode" button next to food search
- Voice: future — "scan this" intent

### Phase 4: Auto-Caching Strategy

Every food found via OFF or Gemini gets inserted into the local `foods` table:

```typescript
async function cacheFromOFF(product: OFFProduct): Promise<FoodRow> {
  // Check if barcode already exists in foods table
  // If not, insert with source = 'open_food_facts'
  // Return the cached row
}
```

**Benefits:**
- DB grows organically as users search
- Repeated lookups are instant (local DB hit)
- Israeli products get cached as Israeli users search for them
- Over time, the local DB covers the most common foods for your user base

### Phase 5: Configuration

**New env vars:**
```
OFF_ENABLED=true                    # Enable Open Food Facts integration (default: true)
OFF_USER_AGENT=BeMe/1.0            # Required by OFF API
OFF_CACHE_TTL_SEC=86400             # Redis cache TTL for OFF results (default: 24h)
```

---

## File Changes Summary

### New Files
| File | Purpose |
|------|---------|
| `backend/src/services/openFoodFacts.ts` | OFF API client (search + barcode) |
| `backend/src/controllers/barcode.ts` | Barcode lookup endpoint |
| `frontend/src/components/BarcodeScanner.tsx` | Camera barcode scanner |

### Modified Files
| File | Changes |
|------|---------|
| `backend/src/models/foodSearch.ts` | Add `searchWithFallback()`, barcode lookup |
| `backend/src/services/voice.ts` | Insert OFF in lookup chain (buildAddFood) |
| `backend/src/controllers/foodSearch.ts` | Use enhanced search chain |
| `backend/src/routes/` | Add barcode route |
| `backend/src/db/schema.ts` | Add barcode + source columns |
| `backend/migrations/` | New migration for barcode + source columns |
| `frontend/src/pages/Energy.tsx` | Add barcode scanner button |
| `frontend/src/core/api/` | Add barcode API call |

### Database Changes
```sql
-- New migration
ALTER TABLE foods ADD COLUMN barcode text;
ALTER TABLE foods ADD COLUMN source text DEFAULT 'usda';
CREATE INDEX idx_foods_barcode ON foods (barcode) WHERE barcode IS NOT NULL;
CREATE INDEX idx_foods_source ON foods (source);
```

---

## Data Flow Diagrams

### Name-based search (voice or typed)
```
"שניצל" (Hebrew voice)
    ↓
Gemini voice parser → intent: add_food, food: "Schnitzel"
    ↓
1. Local DB: search "schnitzel" → found? use it
    ↓ miss
2. OFF API: search "schnitzel" → found? cache + use it
    ↓ miss
3. Gemini lookup: "Schnitzel" → generate nutrition, cache + use it
    ↓
food_entry created with scaled nutrition
```

### Barcode scan (Israeli product)
```
Camera → detects barcode 7290000066318 (Tnuva Cottage 5%)
    ↓
GET /api/food/barcode/7290000066318
    ↓
1. Local DB: barcode lookup → found? return it
    ↓ miss
2. OFF API: GET /api/v2/product/7290000066318 → found?
   → cache in foods table with barcode + source='open_food_facts'
   → return nutrition
    ↓ miss
3. Return 404 with option to add manually
```

### International product
```
Camera → detects barcode 5449000000996 (Coca-Cola)
    ↓
GET /api/food/barcode/5449000000996
    ↓
1. Local DB → miss
2. OFF API → found (Coca-Cola, is_liquid: true, 42 kcal/100ml)
   → cache locally
   → return with serving_sizes_ml
```

---

## Implementation Order

1. **OFF API client** — `openFoodFacts.ts` with search + barcode + caching
2. **DB migration** — add barcode + source columns
3. **Enhanced food search** — chain local → OFF → Gemini
4. **Barcode endpoint** — `GET /api/food/barcode/:code`
5. **Voice integration** — insert OFF in buildAddFood chain
6. **Frontend barcode scanner** — camera component + UI
7. **Testing** — unit tests for OFF client, integration tests for lookup chain

---

## Open Food Facts API Reference

### Search by name
```
GET https://world.openfoodfacts.org/cgi/search.pl?search_terms=cottage+cheese&json=1&page_size=10&fields=code,product_name,product_name_he,nutriments,categories_tags,image_url
```

### Search by barcode
```
GET https://world.openfoodfacts.org/api/v2/product/7290000066318?fields=code,product_name,product_name_he,nutriments,categories_tags,image_url
```

### Israeli-specific search
```
GET https://world.openfoodfacts.org/cgi/search.pl?search_terms=tnuva&json=1&tagtype_0=countries&tag_contains_0=contains&tag_0=israel
```

### Key nutriment fields
```json
{
  "energy-kcal_100g": 98,
  "proteins_100g": 11,
  "carbohydrates_100g": 3.5,
  "fat_100g": 5,
  "fiber_100g": 0,
  "sodium_100g": 0.4,
  "sugars_100g": 3.5
}
```

---

## Future Enhancements (not in this phase)

- **User food submissions** — let users add/correct foods, building a community DB
- **Photo-based food recognition** — Gemini multimodal to identify food from photos
- **Meal history suggestions** — "you usually eat this at breakfast"
- **Popular foods pre-cache** — batch import top 10K OFF products for Israel
- **Nutritional label scanning** — OCR on Hebrew nutrition labels
- **Recipe nutrition calculator** — break down recipes into ingredients
