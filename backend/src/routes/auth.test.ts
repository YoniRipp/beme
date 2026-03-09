/**
 * Auth routes: tests for controller -> service delegation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// Mock the auth service — controllers delegate all logic here
const mockRegister = vi.fn();
const mockLogin = vi.fn();
const mockGetUser = vi.fn();
const mockLoginWithGoogle = vi.fn();
const mockLoginWithFacebook = vi.fn();
const mockLoginWithTwitter = vi.fn();
const mockGetTwitterRedirectUrl = vi.fn();
const mockStorePkce = vi.fn();
const mockHandleTwitterCallback = vi.fn();
const mockForgotPassword = vi.fn();
const mockResetPassword = vi.fn();
const mockExchangeCode = vi.fn();
const mockRefreshToken = vi.fn();
const mockBlockToken = vi.fn();

vi.mock('../services/auth.js', () => ({
  register: (...args: unknown[]) => mockRegister(...args),
  login: (...args: unknown[]) => mockLogin(...args),
  getUser: (...args: unknown[]) => mockGetUser(...args),
  loginWithGoogle: (...args: unknown[]) => mockLoginWithGoogle(...args),
  loginWithFacebook: (...args: unknown[]) => mockLoginWithFacebook(...args),
  loginWithTwitter: (...args: unknown[]) => mockLoginWithTwitter(...args),
  getTwitterRedirectUrl: (...args: unknown[]) => mockGetTwitterRedirectUrl(...args),
  storePkce: (...args: unknown[]) => mockStorePkce(...args),
  handleTwitterCallback: (...args: unknown[]) => mockHandleTwitterCallback(...args),
  forgotPassword: (...args: unknown[]) => mockForgotPassword(...args),
  resetPassword: (...args: unknown[]) => mockResetPassword(...args),
  exchangeCode: (...args: unknown[]) => mockExchangeCode(...args),
  refreshToken: (...args: unknown[]) => mockRefreshToken(...args),
  blockToken: (...args: unknown[]) => mockBlockToken(...args),
  generateToken: vi.fn().mockReturnValue('signed-jwt-token'),
}));

vi.mock('../config/index.js', () => ({
  config: {
    jwtSecret: 'test-jwt-secret',
    googleClientId: null,
    facebookAppId: null,
    twitterClientId: null,
    frontendOrigin: 'http://localhost:5173',
  },
}));

vi.mock('../middleware/auth.js', () => ({
  requireAuth: (req: any, res: any, next: any) => {
    req.user = { id: 'user-1', email: 'user@test.com', role: 'user' };
    next();
  },
}));

import authRouter from './auth.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { ValidationError, ConflictError, UnauthorizedError, NotFoundError } from '../errors.js';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(authRouter);
  app.use(errorHandler);
  return app;
}

describe('auth routes', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
  });

  describe('POST /api/auth/register', () => {
    it('returns 400 when email is missing', async () => {
      mockRegister.mockRejectedValueOnce(new ValidationError('email is required'));

      const res = await request(app)
        .post('/api/auth/register')
        .send({ password: 'ValidPass1', name: 'Test User' })
        .expect(400);

      expect(res.body.error.message).toBe('email is required');
    });

    it('returns 400 when password is too short', async () => {
      mockRegister.mockRejectedValueOnce(new ValidationError('password must be at least 8 characters'));

      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: 'short', name: 'Test User' })
        .expect(400);

      expect(res.body.error.message).toBe('password must be at least 8 characters');
    });

    it('returns 400 when password lacks uppercase', async () => {
      mockRegister.mockRejectedValueOnce(
        new ValidationError('password must contain at least one uppercase letter, one lowercase letter, and one digit')
      );

      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: 'lowercase1', name: 'Test User' })
        .expect(400);

      expect(res.body.error.message).toBe(
        'password must contain at least one uppercase letter, one lowercase letter, and one digit'
      );
    });

    it('returns 400 when password lacks lowercase', async () => {
      mockRegister.mockRejectedValueOnce(
        new ValidationError('password must contain at least one uppercase letter, one lowercase letter, and one digit')
      );

      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: 'UPPERCASE1', name: 'Test User' })
        .expect(400);

      expect(res.body.error.message).toBe(
        'password must contain at least one uppercase letter, one lowercase letter, and one digit'
      );
    });

    it('returns 400 when password lacks digit', async () => {
      mockRegister.mockRejectedValueOnce(
        new ValidationError('password must contain at least one uppercase letter, one lowercase letter, and one digit')
      );

      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: 'NoDigitsHere', name: 'Test User' })
        .expect(400);

      expect(res.body.error.message).toBe(
        'password must contain at least one uppercase letter, one lowercase letter, and one digit'
      );
    });

    it('returns 400 when name is missing', async () => {
      mockRegister.mockRejectedValueOnce(new ValidationError('name is required'));

      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: 'ValidPass1' })
        .expect(400);

      expect(res.body.error.message).toBe('name is required');
    });

    it('returns 201 with user and token on success', async () => {
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        createdAt: '2025-02-24T12:00:00.000Z',
        subscriptionStatus: 'free',
        subscriptionCurrentPeriodEnd: null,
      };
      mockRegister.mockResolvedValueOnce({ user, token: 'signed-jwt-token' });

      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'Test@Example.COM', password: 'ValidPass1', name: 'Test User' })
        .expect(201);

      expect(res.body.user).toMatchObject({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        createdAt: '2025-02-24T12:00:00.000Z',
      });
      expect(res.body.token).toBe('signed-jwt-token');
      expect(mockRegister).toHaveBeenCalledWith({
        email: 'Test@Example.COM',
        password: 'ValidPass1',
        name: 'Test User',
      });
    });

    it('returns 409 when email already registered', async () => {
      mockRegister.mockRejectedValueOnce(new ConflictError('Email already registered'));

      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'existing@example.com', password: 'ValidPass1', name: 'Test User' })
        .expect(409);

      expect(res.body.error.message).toBe('Email already registered');
    });
  });

  describe('POST /api/auth/login', () => {
    it('returns 400 when email is missing', async () => {
      mockLogin.mockRejectedValueOnce(new ValidationError('email and password are required'));

      const res = await request(app)
        .post('/api/auth/login')
        .send({ password: 'ValidPass1' })
        .expect(400);

      expect(res.body.error.message).toBe('email and password are required');
    });

    it('returns 400 when password is missing', async () => {
      mockLogin.mockRejectedValueOnce(new ValidationError('email and password are required'));

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com' })
        .expect(400);

      expect(res.body.error.message).toBe('email and password are required');
    });

    it('returns 401 when user not found', async () => {
      mockLogin.mockRejectedValueOnce(new UnauthorizedError('Invalid email or password'));

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'unknown@example.com', password: 'ValidPass1' })
        .expect(401);

      expect(res.body.error.message).toBe('Invalid email or password');
    });

    it('returns 401 when password does not match', async () => {
      mockLogin.mockRejectedValueOnce(new UnauthorizedError('Invalid email or password'));

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'WrongPassword' })
        .expect(401);

      expect(res.body.error.message).toBe('Invalid email or password');
    });

    it('returns 401 when account uses social sign-in (no password_hash)', async () => {
      mockLogin.mockRejectedValueOnce(
        new UnauthorizedError('This account uses social sign-in. Sign in with your provider instead.')
      );

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'AnyPassword' })
        .expect(401);

      expect(res.body.error.message).toBe(
        'This account uses social sign-in. Sign in with your provider instead.'
      );
    });

    it('returns 200 with user and token on success', async () => {
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        subscriptionStatus: 'free',
        subscriptionCurrentPeriodEnd: null,
      };
      mockLogin.mockResolvedValueOnce({ user, token: 'signed-jwt-token' });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'Test@Example.COM', password: 'ValidPass1' })
        .expect(200);

      expect(res.body.user).toMatchObject({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
      });
      expect(res.body.token).toBe('signed-jwt-token');
      expect(mockLogin).toHaveBeenCalledWith('Test@Example.COM', 'ValidPass1');
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns 200 with user when authenticated', async () => {
      const user = {
        id: 'user-1',
        email: 'user@test.com',
        name: 'Test User',
        role: 'user',
        createdAt: '2025-02-24T12:00:00.000Z',
        subscriptionStatus: 'free',
        subscriptionCurrentPeriodEnd: null,
      };
      mockGetUser.mockResolvedValueOnce(user);

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(res.body).toMatchObject({
        id: 'user-1',
        email: 'user@test.com',
        name: 'Test User',
        role: 'user',
      });
      expect(mockGetUser).toHaveBeenCalledWith('user-1');
    });

    it('returns 404 when user not found in DB', async () => {
      mockGetUser.mockRejectedValueOnce(new NotFoundError('User not found'));

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer test-token')
        .expect(404);

      expect(res.body.error.message).toBe('User not found');
    });
  });
});
