import { beforeEach, describe, expect, it, vi } from 'vitest';

const createInvitation = vi.fn();
const findById = vi.fn();
const findInvitationByCode = vi.fn();
const acceptTrainerInvitation = vi.fn();
const getSubscriptionGrant = vi.fn();
const grantTrainerSubscription = vi.fn();
const publishEvent = vi.fn();
const sendMail = vi.fn();

vi.mock('../config/index.js', () => ({
  config: {
    appBaseUrl: 'https://app.trackvibe.test',
    frontendOrigin: undefined,
  },
}));

vi.mock('../models/trainerClient.js', () => ({
  createInvitation,
  findClientsByTrainerId: vi.fn(),
  findInvitationByCode,
  findInvitationByIdForEmail: vi.fn(),
  acceptInvitation: acceptTrainerInvitation,
  removeClient: vi.fn(),
  getClientCount: vi.fn(),
  listInvitationsByTrainer: vi.fn(),
  findTrainerByClientId: vi.fn(),
  findPendingInvitationsByEmail: vi.fn(),
}));

vi.mock('../models/user.js', () => ({
  findById,
  getSubscriptionGrant,
  grantTrainerSubscription,
  revokeTrainerSubscription: vi.fn(),
}));

vi.mock('../events/publish.js', () => ({
  publishEvent,
}));

vi.mock('../lib/email.js', () => ({
  sendMail,
}));

const trainerService = await import('./trainer.js');

describe('trainer service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createInvitation.mockResolvedValue({
      id: 'invite-123',
      trainerId: 'trainer-1',
      email: 'client@example.com',
      status: 'pending',
      expiresAt: '2026-05-10T00:00:00.000Z',
      createdAt: '2026-05-03T00:00:00.000Z',
    });
    findById.mockResolvedValue({
      id: 'trainer-1',
      name: 'Maya Coach',
      email: 'maya@example.com',
      role: 'trainer',
    });
    findInvitationByCode.mockResolvedValue(null);
    acceptTrainerInvitation.mockResolvedValue(undefined);
    getSubscriptionGrant.mockResolvedValue({ plan: null, currentPeriodEnd: null });
    grantTrainerSubscription.mockResolvedValue(undefined);
  });

  it('creates an email invitation and sends it through the mail provider', async () => {
    const result = await trainerService.inviteByEmail('trainer-1', ' Client@Example.COM ');

    expect(result.id).toBe('invite-123');
    expect(createInvitation).toHaveBeenCalledWith('trainer-1', {
      email: 'client@example.com',
      expiresAt: expect.any(String),
    });
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'client@example.com',
      subject: 'Maya Coach invited you to TrackVibe',
      html: expect.stringContaining('https://app.trackvibe.test/settings?trainerInvite=invite-123'),
    }));
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
      html: expect.stringContaining('invite-123'),
    }));
    expect(publishEvent).toHaveBeenCalledWith(
      'trainer.InvitationCreated',
      { invitationId: 'invite-123', email: 'client@example.com' },
      'trainer-1',
    );
  });

  it('accepts a trainer invite and applies the trainer billing grant without deciding client billing ownership', async () => {
    findInvitationByCode.mockResolvedValueOnce({
      id: 'invite-123',
      trainerId: 'trainer-1',
      inviteCode: 'abc123',
      status: 'pending',
      expiresAt: '2026-05-10T00:00:00.000Z',
      createdAt: '2026-05-03T00:00:00.000Z',
    });
    getSubscriptionGrant.mockResolvedValueOnce({
      plan: 'yearly',
      currentPeriodEnd: '2027-05-01T00:00:00.000Z',
    });

    const result = await trainerService.acceptInvitation('client-1', 'abc123', 'client@example.com');

    expect(result).toEqual({ trainerId: 'trainer-1' });
    expect(acceptTrainerInvitation).toHaveBeenCalledWith('invite-123', 'client-1');
    expect(getSubscriptionGrant).toHaveBeenCalledWith('trainer-1');
    expect(grantTrainerSubscription).toHaveBeenCalledWith('client-1', {
      plan: 'yearly',
      currentPeriodEnd: '2027-05-01T00:00:00.000Z',
    });
    expect(publishEvent).toHaveBeenCalledWith(
      'trainer.ClientAdded',
      { trainerId: 'trainer-1', clientId: 'client-1' },
      'client-1',
    );
  });
});
