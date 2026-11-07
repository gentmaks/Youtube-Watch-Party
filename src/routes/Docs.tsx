import React from "react";
import PlayCircleOutlineRoundedIcon from "@mui/icons-material/PlayCircleOutlineRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CodeRoundedIcon from "@mui/icons-material/CodeRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import TerminalRoundedIcon from "@mui/icons-material/TerminalRounded";
import SyncAltRoundedIcon from "@mui/icons-material/SyncAltRounded";
import "./Docs.css";

const Docs: React.FC = () => (
  <main className="docs-page">
    <header className="docs-nav wrap">
      <a className="brand" href="/" aria-label="SyncStage home"><span className="brand-mark"><PlayCircleOutlineRoundedIcon /></span><span>SyncStage</span></a>
      <a className="docs-back" href="/"><ArrowBackRoundedIcon /> Back to SyncStage</a>
    </header>
    <section className="docs-hero wrap">
      <span className="section-kicker"><CodeRoundedIcon /> DEVELOPER GUIDE</span>
      <h1>Build a watch night<br /><em>from anywhere.</em></h1>
      <p>Create a hosted room from your terminal, then share one link. SyncStage keeps the coordination light so your group can focus on the video.</p>
      <div className="docs-command"><TerminalRoundedIcon /><code>npx syncstage --video https://youtu.be/VIDEO_ID --open</code><a href="https://www.npmjs.com/package/syncstage">npm ↗</a></div>
    </section>
    <div className="docs-layout wrap">
      <nav className="docs-toc" aria-label="On this page"><strong>ON THIS PAGE</strong><a href="#quickstart">Quick start</a><a href="#room-modes">Room modes</a><a href="#settings">CLI settings</a><a href="#architecture">Architecture</a></nav>
      <div className="docs-content">
        <section id="quickstart"><span className="docs-number">01</span><h2>Start from your terminal</h2><p>Requires Node.js 22 or newer. The CLI creates a room on the hosted SyncStage service and prints a shareable URL.</p><pre><code>{`npx syncstage --video "https://www.youtube.com/watch?v=VIDEO_ID"\nnpx syncstage --video "https://youtu.be/VIDEO_ID" --name "Sunday films" --open`}</code></pre><p>Use <code>--json</code> in scripts to print the room ID, name, and URL as JSON. Run <code>npx syncstage --help</code> for the full option list.</p></section>
        <section id="room-modes"><span className="docs-number">02</span><h2>One room, two roles</h2><div className="docs-mode-grid"><article><GroupsRoundedIcon /><h3>Host</h3><p>The first person to join controls play, pause, seek, and which queued video plays next. Playback state is authoritative on the server.</p></article><article><SyncAltRoundedIcon /><h3>Guest</h3><p>Guests join by invitation link, choose a display name, chat, react, and add videos to the shared queue.</p></article></div><p>Rooms need no account. Anyone with the link can join; share it only with people you want in the room.</p></section>
        <section id="settings"><span className="docs-number">03</span><h2>CLI options</h2><div className="docs-table"><div><code>--video &lt;url&gt;</code><span>Required YouTube video link.</span></div><div><code>--name &lt;name&gt;</code><span>Optional room name.</span></div><div><code>--open</code><span>Open the new room in your default browser.</span></div><div><code>--json</code><span>Print structured output for automation.</span></div><div><code>--server &lt;url&gt;</code><span>Override the hosted SyncStage origin. Defaults to gentshare.vercel.app.</span></div><div><code>--help</code><span>Show usage and options.</span></div></div></section>
        <section id="architecture"><span className="docs-number">04</span><h2>How the pieces fit</h2><p>The Vercel frontend forwards room API requests to an Express service on Render. The browser connects to that service over WebSocket for playback, presence, chat, and queue updates.</p><pre><code>{`Terminal CLI ──HTTPS──▶ SyncStage API\nBrowser ─────HTTPS────▶ Vercel frontend + API proxy\nBrowser ─────WSS──────▶ Render room server`}</code></pre><p>Room state lives in the single Render process. A restart clears active rooms; horizontal scaling needs shared persistence and a cross-instance event bus.</p></section>
        <section className="docs-cta"><div><h2>Ready for the room?</h2><p>Paste a video link and bring your people in.</p></div><a className="primary-button" href="/">Create a room <ArrowBackRoundedIcon /></a></section>
      </div>
    </div>
    <footer className="docs-footer wrap"><a className="brand" href="/"><span className="brand-mark"><PlayCircleOutlineRoundedIcon /></span><span>SyncStage</span></a><span>Good nights are better together.</span></footer>
  </main>
);

export default Docs;
