require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const { WebSocketServer, WebSocket } = require('ws');
const { randomUUID } = require('crypto');

const PORT = Number(process.env.PORT) || 5000;
const MAX_CHAT_MESSAGES = 100;
const rooms = new Map();
const clients = new Map();

function getYouTubeId(input) {
  if (typeof input !== 'string' || input.length > 2048) return null;
  try {
    const parsed = new URL(input.trim());
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
    let id = null;
    if (host === 'youtu.be') id = parsed.pathname.split('/').filter(Boolean)[0];
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      if (parsed.pathname === '/watch') id = parsed.searchParams.get('v');
      else if (/^\/(embed|shorts|live)\//.test(parsed.pathname)) id = parsed.pathname.split('/')[2];
    }
    return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
  } catch (_) {
    return null;
  }
}

function currentPosition(room, now = Date.now()) {
  if (!room.playing || !room.startedAt) return room.position;
  return Math.max(0, room.position + (now - room.startedAt) / 1000);
}

function snapshot(room) {
  return {
    sessionId: room.id,
    name: room.name,
    youtubeLink: room.youtubeLink,
    videoId: room.videoId,
    position: currentPosition(room),
    isPlaying: room.playing,
    updatedAt: room.updatedAt,
    hostId: room.hostId,
    participants: [...room.participants.values()],
    messages: room.messages,
    queue: room.queue,
  };
}

function broadcast(room, payload) {
  const data = JSON.stringify(payload);
  for (const [socket, client] of clients) {
    if (client.roomId === room.id && socket.readyState === WebSocket.OPEN) socket.send(data);
  }
}

function sendRoom(room, type, extra = {}) {
  broadcast(room, { type, room: snapshot(room), ...extra });
}

function createApp() {
  const app = express();
  app.use(express.json({ limit: '16kb' }));

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.post('/api/sessions', (req, res) => {
    const videoId = getYouTubeId(req.body?.youtubeUrl);
    const name = typeof req.body?.name === 'string' ? req.body.name.trim().slice(0, 60) : '';
    if (!videoId) return res.status(400).json({ error: 'Enter a valid YouTube video link.' });
    const id = randomUUID();
    const room = {
      id,
      name: name || 'Friday night watch party',
      youtubeLink: `https://www.youtube.com/watch?v=${videoId}`,
      videoId,
      position: 0,
      playing: false,
      startedAt: null,
      updatedAt: Date.now(),
      hostId: null,
      participants: new Map(),
      messages: [],
      queue: [],
    };
    rooms.set(id, room);
    return res.status(201).json({ sessionId: id, room: snapshot(room) });
  });

  app.get('/api/sessions/:sessionId', (req, res) => {
    const room = rooms.get(req.params.sessionId);
    if (!room) return res.status(404).json({ error: 'This room could not be found.' });
    return res.json({ room: snapshot(room) });
  });

  const buildPath = path.join(__dirname, '..', 'build');
  app.use(express.static(buildPath));
  app.get(/.*/, (_req, res) => res.sendFile(path.join(buildPath, 'index.html')));
  return app;
}

function createServer() {
  const app = createApp();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });
  const heartbeat = setInterval(() => {
    for (const socket of wss.clients) {
      const client = clients.get(socket);
      if (client && !client.isAlive) {
        socket.terminate();
        continue;
      }
      if (client) client.isAlive = false;
      socket.ping();
    }
  }, 30000);
  heartbeat.unref();
  wss.on('close', () => clearInterval(heartbeat));

  wss.on('connection', (socket) => {
    const clientId = randomUUID();
    clients.set(socket, { clientId, roomId: null, name: 'Guest', isAlive: true });
    socket.on('pong', () => {
      const client = clients.get(socket);
      if (client) client.isAlive = true;
    });

    socket.on('message', (raw) => {
      let message;
      try {
        message = JSON.parse(raw.toString());
      } catch (_) {
        socket.send(JSON.stringify({ type: 'ERROR', error: 'Invalid message.' }));
        return;
      }
      const client = clients.get(socket);
      if (!client) return;

      if (message.type === 'JOIN') {
        const room = rooms.get(String(message.sessionId || ''));
        if (!room) {
          socket.send(JSON.stringify({ type: 'ERROR', error: 'This room could not be found.' }));
          return;
        }
        if (client.roomId) {
          const previous = rooms.get(client.roomId);
          if (previous) leaveRoom(socket, previous);
        }
        const name = (typeof message.name === 'string' ? message.name : 'Guest').trim().slice(0, 24) || 'Guest';
        client.roomId = room.id;
        client.name = name;
        room.participants.set(clientId, { id: clientId, name, joinedAt: Date.now() });
        if (!room.hostId) room.hostId = clientId;
        socket.send(JSON.stringify({ type: 'WELCOME', clientId, room: snapshot(room) }));
        sendRoom(room, 'PRESENCE');
        return;
      }

      if (message.type === 'LEAVE') {
        const room = clients.get(socket)?.roomId && rooms.get(clients.get(socket).roomId);
        if (room) leaveRoom(socket, room);
        socket.send(JSON.stringify({ type: 'LEFT' }));
        return;
      }

      const room = client.roomId && rooms.get(client.roomId);
      if (!room) return;
      if (['PLAY', 'PAUSE', 'SEEK'].includes(message.type)) {
        if (clientId !== room.hostId) {
          socket.send(JSON.stringify({ type: 'ERROR', error: 'Only the host can control playback.' }));
          return;
        }
        const position = Number(message.position);
        if (!Number.isFinite(position) || position < 0 || position > 86400) return;
        room.position = position;
        if (message.type === 'PLAY') room.playing = true;
        if (message.type === 'PAUSE') room.playing = false;
        room.startedAt = room.playing ? Date.now() : null;
        room.updatedAt = Date.now();
        sendRoom(room, 'PLAYBACK', { action: message.type, by: clientId });
      } else if (message.type === 'CHAT') {
        const text = typeof message.text === 'string' ? message.text.trim().slice(0, 500) : '';
        if (!text) return;
        const chatMessage = { id: randomUUID(), clientId, name: client.name, text, sentAt: Date.now() };
        room.messages = [...room.messages, chatMessage].slice(-MAX_CHAT_MESSAGES);
        sendRoom(room, 'CHAT');
      } else if (message.type === 'ADD_TO_QUEUE') {
        const videoId = getYouTubeId(message.youtubeUrl);
        if (!videoId) {
          socket.send(JSON.stringify({ type: 'ERROR', error: 'That YouTube link is not valid.' }));
          return;
        }
        room.queue = [...room.queue, { id: randomUUID(), videoId, youtubeLink: `https://www.youtube.com/watch?v=${videoId}`, addedBy: client.name }].slice(0, 50);
        sendRoom(room, 'QUEUE');
      } else if (message.type === 'PLAY_NEXT') {
        if (clientId !== room.hostId) {
          socket.send(JSON.stringify({ type: 'ERROR', error: 'Only the host can change the video.' }));
          return;
        }
        const next = room.queue.shift();
        if (!next) return;
        room.videoId = next.videoId;
        room.youtubeLink = next.youtubeLink;
        room.position = 0;
        room.playing = false;
        room.startedAt = null;
        room.updatedAt = Date.now();
        sendRoom(room, 'VIDEO_CHANGED');
      } else if (message.type === 'REMOVE_FROM_QUEUE') {
        if (clientId !== room.hostId) {
          socket.send(JSON.stringify({ type: 'ERROR', error: 'Only the host can edit the queue.' }));
          return;
        }
        room.queue = room.queue.filter((item) => item.id !== message.id);
        sendRoom(room, 'QUEUE');
      }
    });

    socket.on('close', () => {
      const client = clients.get(socket);
      if (!client) return;
      const room = client.roomId && rooms.get(client.roomId);
      if (room) leaveRoom(socket, room);
      clients.delete(socket);
    });
  });

  function leaveRoom(socket, room) {
    const client = clients.get(socket);
    if (!client) return;
    room.participants.delete(client.clientId);
    if (room.hostId === client.clientId) room.hostId = room.participants.keys().next().value || null;
    client.roomId = null;
    sendRoom(room, 'PRESENCE');
  }

  return { app, server, wss };
}

if (require.main === module) {
  const { server } = createServer();
  server.listen(PORT, '0.0.0.0', () => console.log(`Watch Party listening on ${PORT}`));
}

module.exports = { createApp, createServer, getYouTubeId, snapshot, currentPosition, rooms };
