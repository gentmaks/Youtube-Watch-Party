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

The project uses a React 18 and TypeScript single-page app built with Vite. In production, Vercel serves the frontend at `gentshare.vercel.app`, proxies `/api/*` calls to the Express service on Render, and the browser opens its WebSocket directly to that service. Express owns the HTTP API and the `ws` WebSocket endpoint on one persistent HTTP listener.

Room state is authoritative in the server process. Playback position is stored with a server timestamp while playing, so late joiners get the current position rather than a stale value. The first connected participant is host; playback and queue changes are host-controlled, while chat and adding videos are available to everyone in the room.

The current deployment shape is a single server instance with in-memory rooms. Active rooms survive participant disconnects, but a process restart or redeploy clears them. Keep the Render service at one instance: horizontal scaling requires shared persistent room state and a cross-instance event bus, which this version does not configure.

## Stack

- React 18, TypeScript, React Router 7, Vite
- Express 5, Node.js, `ws`, YouTube IFrame Player API
- Material UI icons
- Node's built-in test runner
- Vercel (static frontend and API rewrites)
- Render Web Service (persistent HTTP API and WebSockets)

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
| `VITE_WS_URL` | Production frontend | WebSocket URL for the Render service, e.g. `wss://afterplay-h8tc.onrender.com/ws`. Vite embeds it at build time. |

The local Vite development server proxies API and WebSocket traffic to `localhost:5000`. Production API requests are forwarded by the Vercel rewrite in `vercel.json`; the frontend's `VITE_WS_URL` connects to Render.

## Checks

```bash
npm test
npm run typecheck
npm run build
```

The server integration test covers URL validation, room creation, host assignment, playback synchronization, host-only controls, chat, queue updates, presence, and late joining.

## Deploy

The repository includes `render.yaml` for the Render backend and `vercel.json` for the Vercel frontend. Deploy the Render Blueprint as one free Web Service; it builds the app and runs Express, and exposes `/api/health` as its health check. Keep it at one instance because rooms are held in memory.

The Vercel project `gentshare` is connected to this GitHub repository. Its `VITE_WS_URL` project variable points production and preview builds at Render. The `vercel.json` configuration sends `/api/*` to Render and routes client-side pages to the Vite entry point. Render accepts public WebSocket connections on web services; see [Render WebSockets](https://render.com/docs/websocket) and [Render Web Services](https://render.com/docs/web-services).

**Production app:** [https://gentshare.vercel.app](https://gentshare.vercel.app) (Vercel frontend). **Backend:** [https://afterplay-h8tc.onrender.com](https://afterplay-h8tc.onrender.com). The free Render service may spin down when idle, and this in-memory version loses rooms during restarts or deploys.

## Repository

[github.com/gentmaks/Youtube-Watch-Party](https://github.com/gentmaks/Youtube-Watch-Party)
