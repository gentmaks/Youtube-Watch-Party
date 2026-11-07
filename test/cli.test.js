const test = require('node:test');
const assert = require('node:assert/strict');
const { createRoom, main, parseArgs, DEFAULT_SERVER } = require('../bin/syncstage');

test('parses hosted CLI options and JSON mode', () => {
  const options = parseArgs(['--video', 'https://youtu.be/dQw4w9WgXcQ', '--name', 'Movie night', '--json']);
  assert.equal(options.server, DEFAULT_SERVER);
  assert.equal(options.name, 'Movie night');
  assert.equal(options.json, true);
});

test('requires a video URL and validates server origins', () => {
  assert.throws(() => parseArgs([]), /--video/);
  assert.throws(() => parseArgs(['--video', 'url', '--server', 'file:///tmp']), /HTTP or HTTPS/);
});

test('creates a hosted room and returns an invitation URL', async () => {
  let request;
  const room = await createRoom({ server: DEFAULT_SERVER, video: 'https://youtu.be/dQw4w9WgXcQ', name: 'Films' }, async (url, options) => {
    request = { url: String(url), options };
    return new Response(JSON.stringify({ sessionId: 'room-123', room: { name: 'Films' } }), { status: 201 });
  });
  assert.equal(request.url, `${DEFAULT_SERVER}/api/sessions`);
  assert.deepEqual(JSON.parse(request.options.body), { youtubeUrl: 'https://youtu.be/dQw4w9WgXcQ', name: 'Films' });
  assert.equal(room.url, `${DEFAULT_SERVER}/watch/room-123`);
});

test('returns readable server errors and emits JSON for automation', async () => {
  await assert.rejects(createRoom({ server: DEFAULT_SERVER, video: 'bad' }, async () => new Response(JSON.stringify({ error: 'Enter a valid YouTube video link.' }), { status: 400 })), /valid YouTube/);
  let output = '';
  const io = { stdout: { write: (value) => { output += value; } }, stderr: { write: () => {} } };
  const code = await main(['--video', 'video', '--json'], io, async () => new Response(JSON.stringify({ sessionId: 'r1', room: { name: 'Hangout' } }), { status: 201 }));
  assert.equal(code, 0);
  assert.equal(JSON.parse(output).url, `${DEFAULT_SERVER}/watch/r1`);
});
