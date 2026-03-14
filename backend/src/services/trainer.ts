/**
 * Trainer service — business logic for trainer-client relationships and invitations.
 */
import crypto from 'crypto';
import { NotFoundError, ForbiddenError, ConflictError, ValidationError } from '../errors.js';
import * as trainerClientModel from '../models/trainerClient.js';
import * as userModel from '../models/user.js';
import { publishEvent } from '../events/publish.js';

const CLIENT_LIMITS: Record<string, number> = {
  trainer: 10,
  trainer_pro: 50,
};

const INVITE_EXPIRY_DAYS = 7;

export async function listClients(trainerId: string) {
  return trainerClientModel.findClientsByTrainerId(trainerId);
}

export async function inviteByEmail(trainerId: string, email: string) {
  if (!email || !email.includes('@')) {
    throw new ValidationError('Valid email is required');
  }
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const invitation = await trainerClientModel.createInvitation(trainerId, { email, expiresAt });
  await publishEvent('trainer.InvitationCreated', { invitationId: invitation.id, email }, trainerId);
  return invitation;
}

export async function generateInviteCode(trainerId: string) {
  const inviteCode = crypto.randomBytes(16).toString('hex');
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const invitation = await trainerClientModel.createInvitation(trainerId, { inviteCode, expiresAt });
  await publishEvent('trainer.InviteCodeGenerated', { invitationId: invitation.id, inviteCode }, trainerId);
  return invitation;
}

export async function acceptInvitation(clientId: string, inviteCode: string) {
  if (!inviteCode) {
    throw new ValidationError('Invite code is required');
  }
  const invitation = await trainerClientModel.findInvitationByCode(inviteCode);
  if (!invitation) {
    throw new NotFoundError('Invitation not found or expired');
  }
  // Prevent trainer from accepting their own invitation
  if (invitation.trainerId === clientId) {
    throw new ConflictError('Cannot accept your own invitation');
  }
  await trainerClientModel.acceptInvitation(invitation.id, clientId);
  // Grant pro access to the trainee if they are a free user
  await userModel.grantTrainerSubscription(clientId);
  await publishEvent('trainer.ClientAdded', { trainerId: invitation.trainerId, clientId }, clientId);
  return { trainerId: invitation.trainerId };
}

export async function removeClient(trainerId: string, clientId: string) {
  if (!clientId) {
    throw new ValidationError('Client ID is required');
  }
  const removed = await trainerClientModel.removeClient(trainerId, clientId);
  if (!removed) {
    throw new NotFoundError('Client relationship not found');
  }
  // Revoke trainer-granted pro (only if pro was granted by trainer, not self-purchased)
  await userModel.revokeTrainerSubscription(clientId);
  await publishEvent('trainer.ClientRemoved', { trainerId, clientId }, trainerId);
}

export function getClientLimit(subscriptionStatus: string): number {
  return CLIENT_LIMITS[subscriptionStatus] ?? CLIENT_LIMITS.trainer ?? 10;
}

export async function canAddClient(trainerId: string, subscriptionStatus: string): Promise<boolean> {
  const currentCount = await trainerClientModel.getClientCount(trainerId);
  const limit = getClientLimit(subscriptionStatus);
  return currentCount < limit;
}

export async function listInvitations(trainerId: string) {
  return trainerClientModel.listInvitationsByTrainer(trainerId);
}

export async function getMyTrainer(clientId: string) {
  return trainerClientModel.findTrainerByClientId(clientId);
}

export async function getPendingInvitations(email: string) {
  if (!email) {
    throw new ValidationError('Email is required');
  }
  return trainerClientModel.findPendingInvitationsByEmail(email);
}
