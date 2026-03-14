/**
 * Trainer-client model — data access layer for trainer relationships and invitations.
 */
import { getPool } from '../db/pool.js';
import type { TrainerClient, TrainerInvitation, TrainerClientStatus, TrainerInvitationStatus } from '../types/domain.js';

function rowToTrainerClient(row: Record<string, unknown>): TrainerClient {
  return {
    id: row.id as string,
    trainerId: row.trainer_id as string,
    clientId: row.client_id as string,
    clientName: row.client_name as string,
    clientEmail: row.client_email as string,
    status: row.status as TrainerClientStatus,
    createdAt: String(row.created_at),
  };
}

function rowToTrainerInvitation(row: Record<string, unknown>): TrainerInvitation {
  return {
    id: row.id as string,
    trainerId: row.trainer_id as string,
    email: (row.email as string) ?? undefined,
    inviteCode: (row.invite_code as string) ?? undefined,
    status: row.status as TrainerInvitationStatus,
    expiresAt: String(row.expires_at),
    createdAt: String(row.created_at),
  };
}

export async function findClientsByTrainerId(trainerId: string): Promise<TrainerClient[]> {
  const db = getPool();
  const result = await db.query(
    `SELECT tc.id, tc.trainer_id, tc.client_id, tc.status, tc.created_at,
            u.name AS client_name, u.email AS client_email
     FROM trainer_clients tc
     JOIN users u ON u.id = tc.client_id
     WHERE tc.trainer_id = $1 AND tc.status = 'active'
     ORDER BY tc.created_at DESC`,
    [trainerId],
  );
  return result.rows.map(rowToTrainerClient);
}

export async function isClientOfTrainer(trainerId: string, clientId: string): Promise<boolean> {
  const db = getPool();
  const result = await db.query(
    `SELECT 1 FROM trainer_clients WHERE trainer_id = $1 AND client_id = $2 AND status = 'active' LIMIT 1`,
    [trainerId, clientId],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function addClient(trainerId: string, clientId: string): Promise<TrainerClient> {
  const db = getPool();
  const result = await db.query(
    `INSERT INTO trainer_clients (trainer_id, client_id, status)
     VALUES ($1, $2, 'active')
     ON CONFLICT (trainer_id, client_id) DO UPDATE SET status = 'active', updated_at = now()
     RETURNING id, trainer_id, client_id, status, created_at`,
    [trainerId, clientId],
  );
  // Fetch client name/email
  const userResult = await db.query('SELECT name, email FROM users WHERE id = $1', [clientId]);
  const row = result.rows[0];
  row.client_name = userResult.rows[0]?.name ?? '';
  row.client_email = userResult.rows[0]?.email ?? '';
  return rowToTrainerClient(row);
}

export async function removeClient(trainerId: string, clientId: string): Promise<boolean> {
  const db = getPool();
  const result = await db.query(
    `UPDATE trainer_clients SET status = 'removed', updated_at = now()
     WHERE trainer_id = $1 AND client_id = $2 AND status = 'active'
     RETURNING id`,
    [trainerId, clientId],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function getClientCount(trainerId: string): Promise<number> {
  const db = getPool();
  const result = await db.query(
    `SELECT COUNT(*)::int AS count FROM trainer_clients WHERE trainer_id = $1 AND status = 'active'`,
    [trainerId],
  );
  return result.rows[0].count;
}

export async function createInvitation(
  trainerId: string,
  opts: { email?: string; inviteCode?: string; expiresAt: string },
): Promise<TrainerInvitation> {
  const db = getPool();
  const result = await db.query(
    `INSERT INTO trainer_invitations (trainer_id, email, invite_code, expires_at)
     VALUES ($1, $2, $3, $4)
     RETURNING id, trainer_id, email, invite_code, status, expires_at, created_at`,
    [trainerId, opts.email ?? null, opts.inviteCode ?? null, opts.expiresAt],
  );
  return rowToTrainerInvitation(result.rows[0]);
}

export async function findInvitationByCode(code: string): Promise<TrainerInvitation | null> {
  const db = getPool();
  const result = await db.query(
    `SELECT id, trainer_id, email, invite_code, status, expires_at, created_at
     FROM trainer_invitations
     WHERE invite_code = $1 AND status = 'pending' AND expires_at > now()`,
    [code],
  );
  return result.rows.length > 0 ? rowToTrainerInvitation(result.rows[0]) : null;
}

export async function findPendingInvitationsByEmail(email: string): Promise<Array<TrainerInvitation & { trainerName: string }>> {
  const db = getPool();
  const result = await db.query(
    `SELECT ti.id, ti.trainer_id, ti.email, ti.invite_code, ti.status, ti.expires_at, ti.created_at,
            u.name AS trainer_name
     FROM trainer_invitations ti
     JOIN users u ON u.id = ti.trainer_id
     WHERE ti.email = $1 AND ti.status = 'pending' AND ti.expires_at > now()
     ORDER BY ti.created_at DESC`,
    [email],
  );
  return result.rows.map((row: Record<string, unknown>) => ({
    ...rowToTrainerInvitation(row),
    trainerName: row.trainer_name as string,
  }));
}

export async function acceptInvitation(invitationId: string, clientId: string): Promise<void> {
  const db = getPool();
  // Get invitation to find trainer_id
  const invResult = await db.query(
    `UPDATE trainer_invitations SET status = 'accepted'
     WHERE id = $1 AND status = 'pending'
     RETURNING trainer_id`,
    [invitationId],
  );
  if ((invResult.rowCount ?? 0) === 0) return;
  const trainerId = invResult.rows[0].trainer_id as string;
  // Add client relationship
  await db.query(
    `INSERT INTO trainer_clients (trainer_id, client_id, status)
     VALUES ($1, $2, 'active')
     ON CONFLICT (trainer_id, client_id) DO UPDATE SET status = 'active', updated_at = now()`,
    [trainerId, clientId],
  );
}

export async function findTrainerByClientId(clientId: string): Promise<{ trainerId: string; trainerName: string; trainerEmail: string } | null> {
  const db = getPool();
  const result = await db.query(
    `SELECT tc.trainer_id, u.name AS trainer_name, u.email AS trainer_email
     FROM trainer_clients tc
     JOIN users u ON u.id = tc.trainer_id
     WHERE tc.client_id = $1 AND tc.status = 'active'
     LIMIT 1`,
    [clientId],
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    trainerId: row.trainer_id as string,
    trainerName: row.trainer_name as string,
    trainerEmail: row.trainer_email as string,
  };
}

export async function findActiveClientIds(trainerId: string): Promise<string[]> {
  const db = getPool();
  const result = await db.query(
    `SELECT client_id FROM trainer_clients WHERE trainer_id = $1 AND status = 'active'`,
    [trainerId],
  );
  return result.rows.map((row: Record<string, unknown>) => row.client_id as string);
}

export async function listInvitationsByTrainer(trainerId: string): Promise<TrainerInvitation[]> {
  const db = getPool();
  const result = await db.query(
    `SELECT id, trainer_id, email, invite_code, status, expires_at, created_at
     FROM trainer_invitations
     WHERE trainer_id = $1
     ORDER BY created_at DESC`,
    [trainerId],
  );
  return result.rows.map(rowToTrainerInvitation);
}
