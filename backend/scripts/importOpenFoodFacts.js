/**
 * Import Israeli products and top international brands from Open Food Facts CSV dump.
 *
 * Usage:
 *   node scripts/importOpenFoodFacts.js [path-to-csv.gz]
 *
 * If no path given, downloads the dump from:
 *   https://static.openfoodfacts.org/data/en.openfoodfacts.org.products.csv.gz
 *
 * Streams the ~0.9GB gzipped file (never loads 9GB into memory).
 * Filters for: Israeli products (countries_tags contains 'israel' or barcode starts with '729')
 *              + top international brands.
 * Upserts into foods table with ON CONFLICT (off_id).
 *
 * Requires DATABASE_URL in backend/.env.
 */

import dotenv from 'dotenv';
import { createReadStream, existsSync } from 'fs';
import { createWriteStream } from 'fs';
import { createGunzip } from 'zlib';
import { createInterface } from 'readline';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { getPool } from '../src/db/index.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const BATCH_SIZE = 100;

const LIQUID_KEYWORDS = ['beverage', 'drink', 'juice', 'water', 'soda', 'milk', 'tea', 'coffee'];

/** Top international brand tags (lowercase, as they appear in OFF brands_tags). */
const TOP_BRANDS = new Set([
  'coca-cola', 'pepsi', 'pepsico', 'nestle', 'nestlé', 'danone',
  'mars', 'unilever', 'mondelez', 'kellogg', "kellogg's", 'general-mills',
  'heinz', 'kraft', 'ferrero', 'lindt', 'barilla', 'haribo',
  'dr-pepper', 'fanta', 'sprite', '7up', 'schweppes', 'lipton',
  'oreo', 'nutella', 'red-bull', 'monster', 'starbucks',
  'ben-and-jerry', "ben-&-jerry's", 'haagen-dazs', 'häagen-dazs',
  'lay', "lay's", 'doritos', 'pringles', 'cheetos',
  'snickers', 'twix', 'kitkat', 'kit-kat', 'bounty', 'milka',
  'activia', 'evian', 'perrier', 'san-pellegrino',
  'philadelphia', 'president', 'président',
  'knorr', 'maggi', 'uncle-ben', "uncle-ben's",
  'quaker', 'tropicana', 'minute-maid',
  'nescafe', 'nescafé', 'lavazza', 'illy',
  // Israeli brands
  'tnuva', 'strauss', 'osem', 'elite', 'telma', 'tara',
  'shufersal', 'of-tov', 'yotvata', 'pri-hagalil',
]);

/**
 * Check if a row matches our import criteria:
 * 1. Israeli product (countries_tags contains 'israel' or barcode starts with '729')
 * 2. Top international brand
 */
function matchesFilter(code, countriesTags, brandsTags) {
  // Israeli product check
  if (code && code.startsWith('729')) return true;
  if (countriesTags) {
    const lower = countriesTags.toLowerCase();
    if (lower.includes('israel') || lower.includes('en:il')) return true;
  }
  // Top brand check
  if (brandsTags) {
    const brands = brandsTags.toLowerCase().split(',');
    for (const brand of brands) {
      const trimmed = brand.trim();
      if (TOP_BRANDS.has(trimmed)) return true;
      // Check if any top brand is a substring
      for (const topBrand of TOP_BRANDS) {
        if (trimmed.includes(topBrand)) return true;
      }
    }
  }
  return false;
}

function isLiquid(categoriesTags) {
  if (!categoriesTags) return false;
  const lower = categoriesTags.toLowerCase();
  return LIQUID_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Parse a single CSV line handling quoted fields.
 * OFF CSV uses tab (\t) as delimiter.
 */
function parseTsvLine(line) {
  return line.split('\t').map((field) => {
    // Remove surrounding quotes if present
    if (field.startsWith('"') && field.endsWith('"')) {
      return field.slice(1, -1).replace(/""/g, '"');
    }
    return field;
  });
}

async function downloadDump(destPath) {
  const url = 'https://static.openfoodfacts.org/data/en.openfoodfacts.org.products.csv.gz';
  console.log('Downloading OFF CSV dump from:', url);
  console.log('This is ~0.9GB and may take several minutes...');

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);

  const fileStream = createWriteStream(destPath);
  await pipeline(Readable.fromWeb(res.body), fileStream);
  console.log('Download complete:', destPath);
}

async function run() {
  let csvGzPath = process.argv[2];

  if (!csvGzPath) {
    // Default path
    csvGzPath = join(__dirname, '../../off-products.csv.gz');
    if (!existsSync(csvGzPath)) {
      await downloadDump(csvGzPath);
    } else {
      console.log('Using existing dump:', csvGzPath);
    }
  }

  if (!existsSync(csvGzPath)) {
    console.error('File not found:', csvGzPath);
    process.exit(1);
  }

  const pool = getPool();
  const client = await pool.connect();

  // Column index map — built from header line
  let colIndex = null;
  let batch = [];
  let total = 0;
  let skipped = 0;
  let lineNum = 0;

  const gunzip = createGunzip();
  const input = createReadStream(csvGzPath).pipe(gunzip);
  const rl = createInterface({ input, crlfDelay: Infinity });

  for await (const line of rl) {
    lineNum++;

    if (lineNum === 1) {
      // Parse header to get column indices
      const headers = parseTsvLine(line);
      colIndex = {};
      for (let i = 0; i < headers.length; i++) {
        colIndex[headers[i]] = i;
      }
      // Verify required columns exist
      const required = ['code', 'product_name', 'energy-kcal_100g', 'countries_tags'];
      for (const col of required) {
        if (colIndex[col] === undefined) {
          console.error(`Missing required column: ${col}. Available:`, headers.slice(0, 20).join(', '));
          process.exit(1);
        }
      }
      console.log('CSV header parsed. Columns:', headers.length);
      continue;
    }

    const fields = parseTsvLine(line);
    const get = (col) => fields[colIndex[col]] || '';

    const code = get('code').trim();
    const countriesTags = get('countries_tags');
    const brandsTags = get('brands_tags') || get('brands');

    if (!matchesFilter(code, countriesTags, brandsTags)) {
      skipped++;
      if (skipped % 100000 === 0) {
        console.log(`Scanned ${lineNum.toLocaleString()} lines, ${skipped.toLocaleString()} skipped, ${total} matched so far...`);
      }
      continue;
    }

    const productName = get('product_name').trim();
    if (!productName) { skipped++; continue; }

    const calories = Number(get('energy-kcal_100g')) || 0;
    const protein = Number(get('proteins_100g')) || 0;
    const carbs = Number(get('carbohydrates_100g')) || 0;
    const fat = Number(get('fat_100g')) || 0;

    // Skip products with no nutrition data at all
    if (calories === 0 && protein === 0 && carbs === 0 && fat === 0) {
      skipped++;
      continue;
    }

    const productNameHe = get('product_name_he') || null;
    const productNameEn = get('product_name_en') || null;
    const displayName = productNameEn || productName;
    const categoriesTags = get('categories_tags');
    const imageUrl = get('image_url') || null;

    batch.push({
      name: displayName,
      name_he: productNameHe,
      calories: Math.round(calories),
      protein: Math.round(protein * 10) / 10,
      carbs: Math.round(carbs * 10) / 10,
      fat: Math.round(fat * 10) / 10,
      is_liquid: isLiquid(categoriesTags),
      barcode: code || null,
      off_id: code || null,
      image_url: imageUrl,
    });

    if (batch.length >= BATCH_SIZE) {
      await insertBatch(client, batch);
      total += batch.length;
      batch = [];
      if (total % 5000 === 0) {
        console.log(`Inserted ${total.toLocaleString()} products (scanned ${lineNum.toLocaleString()} lines)...`);
      }
    }
  }

  // Flush remaining
  if (batch.length > 0) {
    await insertBatch(client, batch);
    total += batch.length;
  }

  client.release();
  await pool.end();
  console.log(`\nDone. Imported ${total.toLocaleString()} products. Skipped ${skipped.toLocaleString()} rows.`);
}

async function insertBatch(client, batch) {
  const COLS = 12;
  const values = batch.flatMap((r) => [
    r.name, r.name_he, r.calories, r.protein, r.carbs, r.fat,
    r.is_liquid, r.barcode, r.off_id, r.image_url,
    'open_food_facts', 'cooked',
  ]);
  const placeholders = batch
    .map((_, i) => {
      const o = i * COLS;
      return `($${o+1}, $${o+2}, $${o+3}, $${o+4}, $${o+5}, $${o+6}, $${o+7}, $${o+8}, $${o+9}, $${o+10}, $${o+11}, $${o+12})`;
    })
    .join(', ');

  await client.query(
    `INSERT INTO foods (name, name_he, calories, protein, carbs, fat, is_liquid, barcode, off_id, image_url, source, preparation)
     VALUES ${placeholders}
     ON CONFLICT (off_id) WHERE off_id IS NOT NULL DO UPDATE SET
       name = EXCLUDED.name,
       name_he = EXCLUDED.name_he,
       calories = EXCLUDED.calories,
       protein = EXCLUDED.protein,
       carbs = EXCLUDED.carbs,
       fat = EXCLUDED.fat,
       is_liquid = EXCLUDED.is_liquid,
       image_url = EXCLUDED.image_url`,
    values
  );
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
