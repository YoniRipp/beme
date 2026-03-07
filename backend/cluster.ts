/**
 * Cluster mode entry point. Forks workers to utilize multiple CPU cores.
 * Run with: npm run start:cluster
 *
 * Workers are automatically restarted on crash. Configure concurrency via
 * WEB_CONCURRENCY env var (default: min(availableParallelism, 4)).
 *
 * For container deployments, prefer horizontal scaling (multiple containers)
 * over cluster mode. Use PgBouncer for connection pooling across processes.
 */
import cluster from 'node:cluster';
import os from 'node:os';
import { logger } from './src/lib/logger.js';

const MAX_DEFAULT_WORKERS = 4;
const numWorkers = Math.min(
  parseInt(process.env.WEB_CONCURRENCY ?? '', 10) || os.availableParallelism?.() || os.cpus().length,
  MAX_DEFAULT_WORKERS
);

if (cluster.isPrimary) {
  logger.info({ workers: numWorkers, pid: process.pid }, 'Primary process starting workers');

  for (let i = 0; i < numWorkers; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    logger.warn({ workerId: worker.id, pid: worker.process.pid, code, signal }, 'Worker exited — restarting');
    cluster.fork();
  });
} else {
  // Worker: import and run the main entry point
  await import('./index.js');
}
