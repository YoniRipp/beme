import { beforeEach, describe, expect, it, vi } from 'vitest';

const createInvitation = vi.fn();
const findById = vi.fn();
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
  findInvitationByCode: vi.fn(),
  findInvitationByIdForEmail: vi.fn(),
  acceptInvitation: vi.fn(),
  removeClient: vi.fn(),
  getClientCount: vi.fn(),
  listInvitationsByTrainer: vi.fn(),
  findTrainerByClientId: vi.fn(),
  findPendingInvitationsByEmail: vi.fn(),
}));

vi.mock('../models/user.js', () => ({
  findById,
  grantTrainerSubscription: vi.fn(),
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
});
