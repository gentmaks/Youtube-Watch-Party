const test = require('node:test');
const assert = require('node:assert/strict');
const WebSocket = require('ws');
const { createServer, getYouTubeId } = require('../src/server');

function nextMessage(socket, type, timeout = 2500) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off('message', handle);
      reject(new Error(`Timed out waiting for ${type}`));
    }, timeout);
    const handle = (raw) => {
      const data = JSON.parse(raw.toString());
      if (data.type !== type) return;
      clearTimeout(timer);
      socket.off('message', handle);
      resolve(data);
    };
    socket.on('message', handle);
  });
}

test('validates YouTube URLs for watch, short, embed, and Shorts links', () => {
  assert.equal(getYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=20'), 'dQw4w9WgXcQ');
  assert.equal(getYouTubeId('https://youtu.be/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.equal(getYouTubeId('https://youtube.com/embed/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.equal(getYouTubeId('https://youtube.com/shorts/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.equal(getYouTubeId('https://example.com/watch?v=dQw4w9WgXcQ'), null);
  assert.equal(getYouTubeId('not a URL'), null);
});

test('creates rooms and synchronizes playback, presence, chat, queue, and late joiners', async (t) => {
  const { server, wss } = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    for (const client of wss.clients) client.terminate();
    await new Promise((resolve) => wss.close(resolve));
    await new Promise((resolve) => server.close(resolve));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const invalid = await fetch(`${base}/api/sessions`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ youtubeUrl: 'https://example.com/' }) });
  assert.equal(invalid.status, 400);
  const response = await fetch(`${base}/api/sessions`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ youtubeUrl: 'https://youtu.be/dQw4w9WgXcQ', name: 'Friday films' }) });
  assert.equal(response.status, 201);
  const { sessionId } = await response.json();

  const first = new WebSocket(`ws://127.0.0.1:${server.address().port}/ws`);
  const second = new WebSocket(`ws://127.0.0.1:${server.address().port}/ws`);
  await Promise.all([first, second].map((ws) => new Promise((resolve) => ws.once('open', resolve))));
  first.send(JSON.stringify({ type: 'JOIN', sessionId, name: 'Sam' }));
  const welcome = await nextMessage(first, 'WELCOME');
  const hostId = welcome.clientId;
  assert.equal(welcome.room.name, 'Friday films');

  second.send(JSON.stringify({ type: 'JOIN', sessionId, name: 'Mia' }));
  const guestWelcome = await nextMessage(second, 'WELCOME');
  assert.equal(guestWelcome.room.participants.length, 2);

  const playbackUpdate = nextMessage(second, 'PLAYBACK');
  first.send(JSON.stringify({ type: 'PLAY', position: 42 }));
  const playback = await playbackUpdate;
  assert.equal(playback.action, 'PLAY');
  assert.equal(playback.room.isPlaying, true);
  assert.ok(playback.room.position >= 42);

  const seekReceived = nextMessage(second, 'PLAYBACK');
  first.send(JSON.stringify({ type: 'SEEK', position: 86 }));
  const seek = await seekReceived;
  assert.equal(seek.action, 'SEEK');
  assert.equal(seek.room.isPlaying, true);
  assert.ok(seek.room.position >= 86);

  const guestDenied = nextMessage(second, 'ERROR');
  second.send(JSON.stringify({ type: 'PAUSE', position: 1 }));
  assert.match((await guestDenied).error, /host/);

  const chatReceived = nextMessage(first, 'CHAT');
  second.send(JSON.stringify({ type: 'CHAT', text: 'This is lovely!' }));
  assert.equal((await chatReceived).room.messages[0].text, 'This is lovely!');

  const queueReceived = nextMessage(first, 'QUEUE');
  second.send(JSON.stringify({ type: 'ADD_TO_QUEUE', youtubeUrl: 'https://www.youtube.com/watch?v=9bZkp7q19f0' }));
  const queued = await queueReceived;
  assert.equal(queued.room.queue.length, 1);
  assert.equal(queued.room.queue[0].videoId, '9bZkp7q19f0');

  const pauseReceived = nextMessage(second, 'PLAYBACK');
  first.send(JSON.stringify({ type: 'PAUSE', position: 93 }));
  const paused = await pauseReceived;
  assert.equal(paused.action, 'PAUSE');
  assert.equal(paused.room.isPlaying, false);
  assert.equal(paused.room.position, 93);

  const resumed = nextMessage(second, 'PLAYBACK');
  first.send(JSON.stringify({ type: 'PLAY', position: 93 }));
  assert.equal((await resumed).room.isPlaying, true);

  const late = new WebSocket(`ws://127.0.0.1:${server.address().port}/ws`);
  await new Promise((resolve) => late.once('open', resolve));
  late.send(JSON.stringify({ type: 'JOIN', sessionId, name: 'Alex' }));
  const lateWelcome = await nextMessage(late, 'WELCOME');
  assert.equal(lateWelcome.room.participants.length, 3);
  assert.equal(lateWelcome.room.isPlaying, true);
  assert.ok(lateWelcome.room.position >= 93);
  assert.equal(lateWelcome.room.messages[0].text, 'This is lovely!');
  assert.equal(lateWelcome.room.queue.length, 1);
  assert.equal(lateWelcome.room.hostId, hostId);

  first.close(); second.close(); late.close();
});
