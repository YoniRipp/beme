---
name: auth-patterns
description: Authentication and authorization patterns for BMe. Use when implementing JWT handling, OAuth flows, session management, or access control.
---

# Auth Patterns Skill

Authentication and authorization patterns for BMe's Express backend and React frontend.

## When to Use

- Implementing JWT authentication
- Adding OAuth providers (Google, Facebook, Twitter)
- Managing user sessions
- Implementing role-based access control
- Securing API endpoints

## JWT Authentication

### Token Generation

```typescript
// backend/src/services/auth.ts
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = '7d';
const REFRESH_EXPIRES_IN = '30d';

interface TokenPayload {
  userId: string;
  email: string;
}

export function generateTokens(user: { id: string; email: string }) {
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
  };

  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

  const refreshToken = jwt.sign(
    { userId: user.id, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: REFRESH_EXPIRES_IN }
  );

  return { accessToken, refreshToken };
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}
```

### Authentication Middleware

```typescript
// backend/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/auth.js';
import { UnauthorizedError } from '../errors/index.js';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
      };
    }
  }
}

export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('No token provided');
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyToken(token);
    req.user = {
      id: payload.userId,
      email: payload.email,
    };
    next();
  } catch (error) {
    throw new UnauthorizedError('Invalid token');
  }
}

// Optional authentication - doesn't fail if no token
export function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.slice(7);
      const payload = verifyToken(token);
      req.user = {
        id: payload.userId,
        email: payload.email,
      };
    } catch {
      // Invalid token - continue without user
    }
  }

  next();
}
```

### Token Refresh

```typescript
// backend/src/routes/auth.ts
import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as authService from '../services/auth.js';

const router = Router();

router.post('/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new UnauthorizedError('Refresh token required');
  }

  try {
    const payload = authService.verifyToken(refreshToken);
    
    if (payload.type !== 'refresh') {
      throw new UnauthorizedError('Invalid refresh token');
    }

    const user = await userService.findById(payload.userId);
    
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    const tokens = authService.generateTokens(user);
    res.json(tokens);
  } catch {
    throw new UnauthorizedError('Invalid refresh token');
  }
}));
```

## OAuth Integration

### OAuth Configuration

```typescript
// backend/src/config/oauth.ts
export const oauthConfig = {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    redirectUri: `${process.env.BACKEND_URL}/api/auth/google/callback`,
    scopes: ['openid', 'email', 'profile'],
  },
  facebook: {
    clientId: process.env.FACEBOOK_APP_ID!,
    clientSecret: process.env.FACEBOOK_APP_SECRET!,
    redirectUri: `${process.env.BACKEND_URL}/api/auth/facebook/callback`,
    scopes: ['email', 'public_profile'],
  },
};
```

### OAuth Routes

```typescript
// backend/src/routes/auth.ts
import { OAuth2Client } from 'google-auth-library';

const googleClient = new OAuth2Client(
  oauthConfig.google.clientId,
  oauthConfig.google.clientSecret,
  oauthConfig.google.redirectUri
);

// Initiate OAuth flow
router.get('/google', (req, res) => {
  const url = googleClient.generateAuthUrl({
    access_type: 'offline',
    scope: oauthConfig.google.scopes,
    state: req.query.redirect as string,
  });
  res.redirect(url);
});

// OAuth callback
router.get('/google/callback', asyncHandler(async (req, res) => {
  const { code, state } = req.query;

  const { tokens } = await googleClient.getToken(code as string);
  googleClient.setCredentials(tokens);

  const ticket = await googleClient.verifyIdToken({
    idToken: tokens.id_token!,
    audience: oauthConfig.google.clientId,
  });

  const payload = ticket.getPayload()!;
  
  // Find or create user
  let user = await userService.findByEmail(payload.email!);
  
  if (!user) {
    user = await userService.create({
      email: payload.email!,
      name: payload.name,
      picture: payload.picture,
      provider: 'google',
      providerId: payload.sub,
    });
  }

  const jwtTokens = authService.generateTokens(user);
  
  // Redirect to frontend with tokens
  const redirectUrl = new URL(state as string || process.env.FRONTEND_URL!);
  redirectUrl.searchParams.set('token', jwtTokens.accessToken);
  redirectUrl.searchParams.set('refreshToken', jwtTokens.refreshToken);
  
  res.redirect(redirectUrl.toString());
}));
```

## Role-Based Access Control

### User Roles

```typescript
// backend/src/types/auth.ts
export type UserRole = 'user' | 'pro' | 'admin';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  subscriptionStatus?: 'active' | 'canceled' | 'past_due';
}
```

### Authorization Middleware

```typescript
// backend/src/middleware/authorize.ts
import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../errors/index.js';

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError();
    }

    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError('Insufficient permissions');
    }

    next();
  };
}

export function requirePro(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    throw new UnauthorizedError();
  }

  if (req.user.subscriptionStatus !== 'active') {
    throw new ForbiddenError('Pro subscription required');
  }

  next();
}
```

### Usage

```typescript
// Require authentication
router.get('/profile', authenticate, controller.getProfile);

// Require specific role
router.get('/admin/users', authenticate, requireRole('admin'), controller.listUsers);

// Require Pro subscription
router.get('/insights/advanced', authenticate, requirePro, controller.getAdvancedInsights);
```

## Frontend Auth

### Auth Context

```typescript
// frontend/src/contexts/AuthContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => void;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      validateToken(token);
    } else {
      setState(s => ({ ...s, isLoading: false }));
    }
  }, []);

  const validateToken = async (token: string) => {
    try {
      const user = await fetchUser(token);
      setState({
        user,
        token,
        isLoading: false,
        isAuthenticated: true,
      });
    } catch {
      localStorage.removeItem('token');
      setState({
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  };

  const login = async (email: string, password: string) => {
    const { accessToken, refreshToken, user } = await api.login(email, password);
    localStorage.setItem('token', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    setState({
      user,
      token: accessToken,
      isLoading: false,
      isAuthenticated: true,
    });
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    setState({
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,
    });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout, loginWithGoogle, refreshToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

### Protected Route

```tsx
// frontend/src/components/ProtectedRoute.tsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  children: React.ReactNode;
  requirePro?: boolean;
}

export function ProtectedRoute({ children, requirePro }: Props) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requirePro && user?.subscriptionStatus !== 'active') {
    return <Navigate to="/upgrade" replace />;
  }

  return <>{children}</>;
}
```

### API Client with Auth

```typescript
// frontend/src/lib/api.ts
class ApiClient {
  private baseUrl = import.meta.env.VITE_API_URL;

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = localStorage.getItem('token');

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    if (response.status === 401) {
      // Try to refresh token
      const refreshed = await this.refreshToken();
      if (refreshed) {
        return this.request(endpoint, options);
      }
      // Redirect to login
      window.location.href = '/login';
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Request failed');
    }

    return response.json();
  }

  private async refreshToken(): Promise<boolean> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return false;

    try {
      const { accessToken, refreshToken: newRefresh } = await fetch(
        `${this.baseUrl}/auth/refresh`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        }
      ).then(r => r.json());

      localStorage.setItem('token', accessToken);
      localStorage.setItem('refreshToken', newRefresh);
      return true;
    } catch {
      return false;
    }
  }
}
```

## Security Best Practices

### Password Hashing

```typescript
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

### Security Headers

```typescript
// backend/app.ts
import helmet from 'helmet';

app.use(helmet());
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:', 'https:'],
  },
}));
```

### Rate Limiting Auth Endpoints

```typescript
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: { error: { message: 'Too many login attempts' } },
});

router.post('/login', authLimiter, controller.login);
router.post('/register', authLimiter, controller.register);
```

## Environment Variables

```bash
# JWT
JWT_SECRET=your-super-secret-key-min-32-chars
JWT_EXPIRES_IN=7d

# OAuth - Google
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx

# OAuth - Facebook
FACEBOOK_APP_ID=xxx
FACEBOOK_APP_SECRET=xxx

# URLs
BACKEND_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173
```

## Checklist

### Implementation

- [ ] JWT generation and verification
- [ ] Authentication middleware
- [ ] Token refresh mechanism
- [ ] OAuth integration (if needed)
- [ ] Role-based access control
- [ ] Frontend auth context
- [ ] Protected routes

### Security

- [ ] Passwords hashed with bcrypt (12+ rounds)
- [ ] JWT secret is strong (32+ characters)
- [ ] HTTPS in production
- [ ] Rate limiting on auth endpoints
- [ ] Security headers configured
- [ ] Tokens stored securely (httpOnly cookies or secure storage)
