#!/usr/bin/env node
'use strict';

const { spawn } = require('node:child_process');

const DEFAULT_SERVER = 'https://gentshare.vercel.app';

function parseArgs(args) {
  const options = { server: DEFAULT_SERVER, open: false, json: false, help: false };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--open') options.open = true;
    else if (arg === '--json') options.json = true;
    else if (['--video', '--name', '--server'].includes(arg)) {
      const value = args[++i];
      if (!value || value.startsWith('--')) throw new Error(`${arg} requires a value.`);
      options[{ '--video': 'video', '--name': 'name', '--server': 'server' }[arg]] = value;
    } else throw new Error(`Unknown option: ${arg}`);
  }
  if (!options.help && !options.video) throw new Error('Provide a YouTube URL with --video.');
  try {
    const serverUrl = new URL(options.server);
    if (!['http:', 'https:'].includes(serverUrl.protocol)) throw new Error();
    options.server = serverUrl.origin;
  } catch (_) {
    throw new Error('--server must be an HTTP or HTTPS URL.');
  }
  return options;
}

async function createRoom(options, fetchImpl = fetch) {
  const response = await fetchImpl(new URL('/api/sessions', options.server), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ youtubeUrl: options.video, name: options.name || '' }),
    signal: AbortSignal.timeout(15000),
  });
  let data;
  try { data = await response.json(); } catch (_) { throw new Error(`SyncStage returned an unreadable response (${response.status}).`); }
  if (!response.ok) throw new Error(data.error || `Room creation failed (${response.status}).`);
  if (!data.sessionId) throw new Error('SyncStage response did not include a room ID.');
  return { sessionId: data.sessionId, name: data.room?.name || options.name || 'Watch party', url: new URL(`/watch/${encodeURIComponent(data.sessionId)}`, options.server).href };
}

function openUrl(url) {
  const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
  const child = spawn(command, args, { detached: true, stdio: 'ignore' });
  child.on('error', () => {});
  child.unref();
}

function usage() {
  return `SyncStage CLI — create a hosted watch room\n\nUsage:\n  npx syncstage --video <youtube-url> [options]\n\nOptions:\n  --video <url>    YouTube video URL (required)\n  --name <name>    Optional room name\n  --open            Open the room in your browser\n  --json            Print machine-readable JSON\n  --server <url>   SyncStage server (default: ${DEFAULT_SERVER})\n  -h, --help        Show this help\n`;
}

async function main(args = process.argv.slice(2), io = process, fetchImpl = fetch) {
  try {
    const options = parseArgs(args);
    if (options.help) { io.stdout.write(usage()); return 0; }
    const room = await createRoom(options, fetchImpl);
    if (options.json) io.stdout.write(`${JSON.stringify(room)}\n`);
    else io.stdout.write(`Room ready: ${room.name}\n${room.url}\n`);
    if (options.open) openUrl(room.url);
    return 0;
  } catch (error) {
    io.stderr.write(`syncstage: ${error.message}\nRun npx syncstage --help for usage.\n`);
    return 1;
  }
}

if (require.main === module) main().then((code) => { process.exitCode = code; });

module.exports = { DEFAULT_SERVER, createRoom, main, parseArgs, usage };
