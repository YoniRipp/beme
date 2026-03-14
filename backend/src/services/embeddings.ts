/**
 * Embeddings service — generates vector embeddings via Gemini for semantic search.
 * Stores embeddings in the user_embeddings table (pgvector).
 */
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/index.js';
import { getPool } from '../db/pool.js';
import { logger } from '../lib/logger.js';

const EMBEDDING_MODEL = 'text-embedding-004';
const EMBEDDING_DIM = 768;

function getEmbeddingClient() {
  if (!config.geminiApiKey) throw new Error('GEMINI_API_KEY not configured');
  return new GoogleGenerativeAI(config.geminiApiKey).getGenerativeModel({ model: EMBEDDING_MODEL });
}

/** Generate a single embedding vector for a text string. */
export async function embed(text: string) {
  const model = getEmbeddingClient();
  const result = await model.embedContent(text);
  return result.embedding.values;
}

/**
 * Build a plain-text description of a data record for embedding.
 * @param {'workout'|'food_entry'} type
 * @param {object} record
 */
export function buildEmbeddingText(type: string, record: Record<string, unknown> | object) {
  const rec = record as Record<string, unknown>;
  switch (type) {
    case 'workout':
      return [
        `Workout: ${rec.title}`,
        `type: ${rec.type}`,
        `duration: ${rec.durationMinutes} minutes`,
        `on ${rec.date}`,
        rec.notes ?? '',
        Array.isArray(rec.exercises)
          ? (rec.exercises as Array<Record<string, unknown>>).map((e: Record<string, unknown>) => `${e.name} ${e.sets}x${e.reps}${e.weight ? ` @${e.weight}kg` : ''}`).join(', ')
          : '',
      ].filter(Boolean).join('. ');

    case 'food_entry':
      return [
        `Food: ${rec.name}`,
        `${rec.calories} kcal`,
        `protein ${rec.protein}g`,
        `carbs ${rec.carbs}g`,
        `fat ${rec.fats}g`,
        `on ${rec.date}`,
      ].filter(Boolean).join(', ');

    default:
      return JSON.stringify(rec);
  }
}

/**
 * Upsert an embedding for a data record.
 * @param {string} userId
 * @param {'workout'|'food_entry'} recordType
 * @param {string} recordId
 * @param {string} text - Plain-text representation for embedding
 */
export async function upsertEmbedding(userId: string, recordType: string, recordId: string, text: string) {
  if (!config.geminiApiKey) return; // gracefully skip when not configured
  const pool = getPool();
  try {
    const vector = await embed(text);
    const vectorLiteral = `[${vector.join(',')}]`;
    await pool.query(
      `INSERT INTO user_embeddings (user_id, record_type, record_id, content_text, embedding)
       VALUES ($1, $2, $3, $4, $5::vector)
       ON CONFLICT (record_id, record_type)
       DO UPDATE SET content_text = EXCLUDED.content_text, embedding = EXCLUDED.embedding, updated_at = now()`,
      [userId, recordType, recordId, text, vectorLiteral]
    );
  } catch (err) {
    // Non-fatal: log and continue. Embedding is a background enrichment.
    logger.warn({ err, recordType, recordId }, 'Failed to upsert embedding');
  }
}

/**
 * Delete embedding for a record (call when record is deleted).
 * @param {string} recordId
 * @param {'workout'|'food_entry'} recordType
 */
export async function deleteEmbedding(recordId: string, recordType: string) {
  const pool = getPool();
  try {
    await pool.query('DELETE FROM user_embeddings WHERE record_id = $1 AND record_type = $2', [recordId, recordType]);
  } catch (err) {
    logger.warn({ err, recordType, recordId }, 'Failed to delete embedding');
  }
}

/**
 * Semantic search: embed the query and find the top-k most similar records for a user.
 * @param {string} userId
 * @param {string} query - Natural language search query
 * @param {{ types?: string[], limit?: number }} options
 * @returns {Promise<Array<{ recordType: string, recordId: string, contentText: string, similarity: number }>>}
 */
export async function semanticSearch(userId: string, query: string, { types = [] as string[], limit = 10 }: { types?: string[]; limit?: number } = {}) {
  const pool = getPool();
  const queryVector = await embed(query);
  const vectorLiteral = `[${queryVector.join(',')}]`;

  const conditions = ['user_id = $1'];
  const params: unknown[] = [userId, vectorLiteral, limit];
  let paramIdx = 4;

  if (types.length > 0) {
    conditions.push(`record_type = ANY($${paramIdx})`);
    params.push(types);
    paramIdx++;
  }

  const where = conditions.join(' AND ');
  const result = await pool.query(
    `SELECT record_type, record_id, content_text,
            1 - (embedding <=> $2::vector) AS similarity
     FROM user_embeddings
     WHERE ${where}
     ORDER BY embedding <=> $2::vector
     LIMIT $3`,
    params
  );

  return result.rows.map((row: Record<string, unknown>) => ({
    recordType: row.record_type,
    recordId: row.record_id,
    contentText: row.content_text,
    similarity: Math.round(Number(row.similarity) * 1000) / 1000,
  }));
}
