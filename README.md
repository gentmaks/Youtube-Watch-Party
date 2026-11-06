# Afterplay

Afterplay makes a YouTube watch night feel shared, even when everyone is somewhere else. Create a room from a YouTube link, invite friends with one URL, and watch together with synchronized playback, chat, and a collaborative queue. No account is required.

## Features

- Create named rooms from standard YouTube, `youtu.be`, Shorts, live, and embed links.
- Share rooms with a copyable invitation link and join with a guest name.
- Keep play, pause, and seek in sync with the host as the playback authority.
- Send chat messages and lightweight reactions in real time.
- See who's online, who is hosting, and what is queued next.
- Rejoin after transient socket disconnects; the server sends the current authoritative room snapshot.
- Responsive landing and watch-room layouts with accessible controls and connection feedback.

## Architecture

The project uses a React 18 and TypeScript single-page app built with Vite, served as static assets by an Express server. The Express server owns the HTTP API and a `ws` WebSocket endpoint on the same HTTP listener. This keeps API and socket traffic on one origin and works behind a standard HTTPS reverse proxy.

Room state is authoritative in the server process. Playback position is stored with a server timestamp while playing, so late joiners get the current position rather than a stale value. The first connected participant is host; playback and queue changes are host-controlled, while chat and adding videos are available to everyone in the room.

The current deployment shape is a single server instance with in-memory rooms. Active rooms survive participant disconnects, but a process restart or redeploy clears them. Keep the Render service at one instance: horizontal scaling requires shared persistent room state and a cross-instance event bus, which this version does not configure.

## Stack

- React 18, TypeScript, React Router 7, Vite
- Express 5, Node.js, `ws`, YouTube IFrame Player API
- Material UI icons
- Node's built-in test runner
- Render Web Service (HTTP and WebSockets served together)

## Run locally

Requirements: Node.js 22 and npm.

```bash
npm ci
npm run build
npm start
```

Open `http://localhost:5000`. If port 5000 is in use, set another port:

```bash
PORT=5057 npm start
```

The server serves the production React build from `build/`. Re-run `npm run build` after frontend changes. No database or secret environment variable is required for local use.

For frontend development with hot reload, use two terminals. Start the server with `npm start` on port 5000, then run `npm run dev` and open the Vite URL printed in the terminal. Vite proxies API and WebSocket traffic to the local server.

## Configuration

| Variable | Required | Description |
| --- | --- | --- |
| `PORT` | No | HTTP and WebSocket listener; defaults to `5000` locally. Set by Render in production. |
| `NODE_ENV` | No | Set to `production` by the Render Blueprint. |

The browser selects `ws://` locally and `wss://` on HTTPS, using the current page's origin.

## Checks

```bash
npm test
npm run typecheck
npm run build
```

The server integration test covers URL validation, room creation, host assignment, playback synchronization, host-only controls, chat, queue updates, presence, and late joining.

## Deploy on Render

The repository includes `render.yaml` for a single free Render Web Service. Connect the GitHub repository to Render and create a Blueprint instance from the dashboard. Render builds the React app and runs Express; HTTP and WebSocket upgrades use the same public origin. The service exposes `/api/health` for its health check.

Render accepts public WebSocket connections on web services and routes them through the same listener; use `wss://` for public clients. See [Render WebSockets](https://render.com/docs/websocket) and [Render Web Services](https://render.com/docs/web-services).

**Production URL:** [https://afterplay-h8tc.onrender.com](https://afterplay-h8tc.onrender.com). The free service may spin down when idle, and this in-memory version loses rooms during restarts or deploys.

## Repository

[github.com/gentmaks/Youtube-Watch-Party](https://github.com/gentmaks/Youtube-Watch-Party)
