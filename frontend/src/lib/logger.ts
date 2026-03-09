/**
 * Client-side logger. Buffers log entries and ships them to POST /api/client-logs.
 * Also installs global error and unhandledrejection handlers.
 */
import { getApiBase, getToken } from '@/core/api/client';

type LogLevel = 'error' | 'warn' | 'info';

interface LogEntry {
  level: LogLevel;
  message: string;
  stack?: string;
  url?: string;
  userAgent?: string;
  timestamp?: string;
  extra?: Record<string, unknown>;
}

const buffer: LogEntry[] = [];
const FLUSH_INTERVAL_MS = 5000;
const MAX_BUFFER = 10;
let flushTimer: ReturnType<typeof setInterval> | null = null;

function createEntry(level: LogLevel, message: string, extra?: Record<string, unknown>): LogEntry {
  return {
    level,
    message: String(message).slice(0, 500),
    stack: extra?.stack ? String(extra.stack).slice(0, 2000) : undefined,
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 200) : undefined,
    timestamp: new Date().toISOString(),
    extra,
  };
}

async function flush() {
  if (buffer.length === 0) return;
  const entries = buffer.splice(0, buffer.length);
  try {
    const token = getToken();
    if (!token) return; // not logged in — skip
    await fetch(`${getApiBase()}/api/client-logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
      body: JSON.stringify(entries),
    });
  } catch {
    // Silently drop — don't let logging break the app
  }
}

function enqueue(entry: LogEntry) {
  buffer.push(entry);
  if (buffer.length >= MAX_BUFFER) {
    flush();
  }
}

function startFlushTimer() {
  if (flushTimer) return;
  flushTimer = setInterval(flush, FLUSH_INTERVAL_MS);
}

export const clientLogger = {
  error(message: string, extra?: Record<string, unknown>) {
    if (import.meta.env.DEV) console.error('[logger]', message, extra);
    enqueue(createEntry('error', message, extra));
  },
  warn(message: string, extra?: Record<string, unknown>) {
    if (import.meta.env.DEV) console.warn('[logger]', message, extra);
    enqueue(createEntry('warn', message, extra));
  },
  info(message: string, extra?: Record<string, unknown>) {
    if (import.meta.env.DEV) console.info('[logger]', message, extra);
    enqueue(createEntry('info', message, extra));
  },
  /** Force-flush buffered logs (e.g. before page unload). */
  flush,
};

// ── Global error handlers ───────────────────────────────────────────

if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    clientLogger.error(event.message || 'Uncaught error', {
      stack: event.error?.stack,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    clientLogger.error(reason?.message || 'Unhandled promise rejection', {
      stack: reason?.stack,
    });
  });

  // Flush on page unload
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flush();
    }
  });

  startFlushTimer();
}
