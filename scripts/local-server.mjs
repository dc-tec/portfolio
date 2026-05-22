#!/usr/bin/env node
import { spawn } from "node:child_process";
import fs from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import net from "node:net";
import path from "node:path";

const root = process.cwd();
const stateDir = path.join(root, ".astro");
const statePath = path.join(stateDir, "local-server.json");
const logPath = path.join(stateDir, "local-server.log");
const astroBin = path.join(
  root,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "astro.cmd" : "astro"
);

const command = process.argv[2] ?? "status";
const options = parseOptions(process.argv.slice(3));

function log(message) {
  process.stdout.write(`${message}\n`);
}

function logError(message) {
  process.stderr.write(`${message}\n`);
}

function parseOptions(args) {
  const parsed = {
    host: "127.0.0.1",
    mode: "dev",
    port: 4321,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--preview") {
      parsed.mode = "preview";
    } else if (arg === "--dev") {
      parsed.mode = "dev";
    } else if (arg === "--host") {
      parsed.host = args[index + 1] ?? parsed.host;
      index += 1;
    } else if (arg === "--port") {
      parsed.port = Number(args[index + 1] ?? parsed.port);
      index += 1;
    }
  }

  return parsed;
}

async function readState() {
  try {
    return JSON.parse(await readFile(statePath, "utf8"));
  } catch {
    return null;
  }
}

async function writeState(state) {
  await mkdir(stateDir, { recursive: true });
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`);
}

async function clearState() {
  await rm(statePath, { force: true });
}

function isRunning(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function killServer(pid, signal) {
  try {
    process.kill(process.platform === "win32" ? pid : -pid, signal);
  } catch {
    process.kill(pid, signal);
  }
}

function isPortOpen(host, port) {
  return new Promise(resolve => {
    const socket = net.createConnection({ host, port });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
    socket.setTimeout(500, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function waitForPort(host, port, timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isPortOpen(host, port)) return true;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  return false;
}

async function start() {
  const existingState = await readState();
  if (existingState && isRunning(existingState.pid)) {
    log(`Local server already running at ${existingState.url}`);
    log(`PID ${existingState.pid}; log: ${existingState.logPath}`);
    return;
  }

  if (existingState) {
    await clearState();
  }

  if (!fs.existsSync(astroBin)) {
    throw new Error(
      "Astro is not installed. Run `corepack pnpm install` first."
    );
  }

  if (await isPortOpen(options.host, options.port)) {
    throw new Error(
      `Port ${options.port} is already in use. Stop that process or start with --port <port>.`
    );
  }

  await mkdir(stateDir, { recursive: true });
  const logFd = fs.openSync(logPath, "a");
  const child = spawn(
    astroBin,
    [options.mode, "--host", options.host, "--port", String(options.port)],
    {
      cwd: root,
      detached: true,
      env: process.env,
      stdio: ["ignore", logFd, logFd],
    }
  );
  child.unref();

  const url = `http://${options.host}:${options.port}/`;
  await writeState({
    logPath,
    mode: options.mode,
    pid: child.pid,
    startedAt: new Date().toISOString(),
    url,
  });

  const ready = await waitForPort(options.host, options.port);
  fs.closeSync(logFd);

  if (!ready) {
    throw new Error(`Server did not become ready. Check ${logPath}`);
  }

  log(`Started ${options.mode} server at ${url}`);
  log(`PID ${child.pid}; log: ${logPath}`);
}

async function stop() {
  const state = await readState();
  if (!state) {
    log("No managed local server is running.");
    return;
  }

  if (!isRunning(state.pid)) {
    await clearState();
    log("Removed stale local server state.");
    return;
  }

  killServer(state.pid, "SIGTERM");

  const deadline = Date.now() + 5000;
  while (Date.now() < deadline && isRunning(state.pid)) {
    await new Promise(resolve => setTimeout(resolve, 250));
  }

  if (isRunning(state.pid)) {
    killServer(state.pid, "SIGKILL");
  }

  await clearState();
  log(`Stopped local server at ${state.url}`);
}

async function status() {
  const state = await readState();
  if (state && isRunning(state.pid)) {
    log(`Local server running at ${state.url}`);
    log(`Mode ${state.mode}; PID ${state.pid}; log: ${state.logPath}`);
    return;
  }

  if (state) {
    await clearState();
    log("No local server is running; removed stale state.");
    return;
  }

  log("No managed local server is running.");
}

async function main() {
  if (command === "start") {
    await start();
  } else if (command === "stop") {
    await stop();
  } else if (command === "restart") {
    await stop();
    await start();
  } else if (command === "status") {
    await status();
  } else {
    throw new Error(
      "Usage: node scripts/local-server.mjs <start|stop|restart|status> [--preview] [--host 127.0.0.1] [--port 4321]"
    );
  }
}

main().catch(error => {
  logError(error.message);
  process.exit(1);
});
