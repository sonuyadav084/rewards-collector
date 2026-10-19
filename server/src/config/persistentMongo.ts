import net from 'net';
import path from 'path';
import fs from 'fs';
import { spawn, ChildProcess } from 'child_process';
import { MongoClient } from 'mongodb';
import { MongoBinary } from 'mongodb-memory-server-core/lib/util/MongoBinary';
import { logger } from '../utils/logger';

let mongodProcess: ChildProcess | null = null;
let isShuttingDown = false;

/**
 * Checks if a TCP port is open and accepting connections
 */
export function checkPortAvailable(port: number, host = '127.0.0.1', timeoutMs = 800): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let status = false;

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => {
      status = true;
      socket.destroy();
    });

    socket.once('timeout', () => {
      socket.destroy();
    });

    socket.once('error', () => {
      socket.destroy();
    });

    socket.once('close', () => {
      resolve(status);
    });

    socket.connect(port, host);
  });
}

/**
 * Waits until a TCP port starts accepting connections
 */
async function waitForPort(port: number, host = '127.0.0.1', maxWaitMs = 15000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const open = await checkPortAvailable(port, host, 500);
    if (open) return true;
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

/**
 * Gracefully shuts down the persistent MongoDB instance
 */
export async function shutdownPersistentMongo(port = 27018): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`Shutting down persistent MongoDB on port ${port}...`);

  try {
    const client = new MongoClient(`mongodb://127.0.0.1:${port}/admin`, {
      serverSelectionTimeoutMS: 2000,
      connectTimeoutMS: 2000,
    });
    await client.connect();
    await client.db('admin').command({ shutdown: 1, force: true, timeoutSecs: 2 });
    await client.close();
  } catch {
    // Shutdown command terminates client connection, which is normal
  }

  if (mongodProcess && !mongodProcess.killed) {
    try {
      mongodProcess.kill('SIGINT');
    } catch {
      // Ignore
    }
  }

  mongodProcess = null;
  logger.info('Persistent MongoDB process stopped cleanly.');
}

/**
 * Ensures that a standalone, persistent MongoDB instance is running on port 27018
 * using project-local storage in `server/data/db`.
 */
export async function ensurePersistentDatabase(port = 27018, dbName = 'coupon_verification_db'): Promise<string> {
  const uri = `mongodb://127.0.0.1:${port}/${dbName}`;

  // 1. Check if an instance is already listening on port 27018
  const isAlreadyRunning = await checkPortAvailable(port);
  if (isAlreadyRunning) {
    logger.info(`Detected running MongoDB on port ${port}. Using active instance: ${uri}`);
    return uri;
  }

  // 2. Prepare permanent on-disk data directory
  const dbDir = path.resolve(process.cwd(), 'data', 'db');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    logger.info(`Created persistent database directory at: ${dbDir}`);
  } else {
    logger.info(`Using existing persistent database directory at: ${dbDir}`);
  }

  // 3. Resolve mongod binary path
  logger.info('Resolving standalone MongoDB binary...');
  const binaryPath = await MongoBinary.getPath();
  logger.info(`Launching isolated persistent MongoDB (${binaryPath}) on port ${port}...`);

  // 4. Launch mongod with WiredTiger and local dbpath
  mongodProcess = spawn(
    binaryPath,
    [
      '--dbpath',
      dbDir,
      '--port',
      port.toString(),
      '--bind_ip',
      '127.0.0.1',
    ],
    {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
    }
  );

  mongodProcess.stdout?.on('data', (data) => {
    const text = data.toString();
    if (text.includes('Waiting for connections') || text.includes('error')) {
      logger.debug(`[mongod] ${text.trim()}`);
    }
  });

  mongodProcess.stderr?.on('data', (data) => {
    logger.warn(`[mongod stderr] ${data.toString().trim()}`);
  });

  mongodProcess.on('exit', (code, signal) => {
    if (!isShuttingDown) {
      logger.warn(`Persistent mongod exited unexpectedly with code ${code}, signal ${signal}`);
    }
  });

  // 5. Wait for port to become ready
  const isReady = await waitForPort(port, '127.0.0.1', 15000);
  if (!isReady) {
    throw new Error(`Failed to start persistent MongoDB on port ${port} within timeout.`);
  }

  logger.info(`Persistent MongoDB is online and ready at ${uri} (Storage: ${dbDir})`);

  // 6. Register process lifecycle hooks for clean shutdown
  const handleExit = async () => {
    await shutdownPersistentMongo(port);
  };

  process.once('SIGINT', handleExit);
  process.once('SIGTERM', handleExit);

  return uri;
}
