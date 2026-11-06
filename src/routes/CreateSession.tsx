import React, { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import PlayCircleOutlineRoundedIcon from "@mui/icons-material/PlayCircleOutlineRounded";
import QueueMusicRoundedIcon from "@mui/icons-material/QueueMusicRounded";
import SecurityRoundedIcon from "@mui/icons-material/SecurityRounded";
import SyncAltRoundedIcon from "@mui/icons-material/SyncAltRounded";

const CreateSession: React.FC = () => {
  const navigate = useNavigate();
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [roomName, setRoomName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const createSession = async (event: FormEvent) => {
    event.preventDefault();
    if (!youtubeUrl.trim()) return;
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ youtubeUrl, name: roomName }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "We couldn't create that room.");
      navigate(`/watch/${data.sessionId}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="landing">
      <header className="site-nav wrap">
        <a className="brand" href="/" aria-label="Afterplay home">
          <span className="brand-mark"><PlayCircleOutlineRoundedIcon /></span>
          <span>afterplay</span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#features">The good stuff</a>
        </nav>
        <a className="nav-cta" href="#start">Start a room <ArrowForwardRoundedIcon /></a>
      </header>

      <section className="hero wrap" id="start">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot" /> YOUR PEOPLE. YOUR PICK. HIT PLAY.</div>
          <h1>Movie night,<br /><span>minus the distance.</span></h1>
          <p className="hero-subtitle">A little closer, even when you’re miles apart. Watch YouTube in sync, share the moment, and keep the conversation going.</p>
          <form className="create-form" onSubmit={createSession}>
            <label htmlFor="youtube-url">Drop in a YouTube link</label>
            <div className="url-input-wrap">
              <PlayCircleOutlineRoundedIcon className="input-play-icon" />
              <input id="youtube-url" type="url" autoComplete="url" placeholder="https://youtube.com/watch?v=…" value={youtubeUrl} onChange={(event) => setYoutubeUrl(event.target.value)} required />
            </div>
            <label className="optional-label" htmlFor="room-name">Give your room a name <span>optional</span></label>
            <input id="room-name" className="room-name-input" type="text" maxLength={60} placeholder="Friday night watch party" value={roomName} onChange={(event) => setRoomName(event.target.value)} />
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="primary-button create-button" type="submit" disabled={busy || !youtubeUrl.trim()}>
              {busy ? "Setting the scene…" : "Create your room"}<ArrowForwardRoundedIcon />
            </button>
            <p className="form-footnote"><SecurityRoundedIcon /> No account needed. Just bring your people.</p>
          </form>
          <div className="social-proof"><div className="avatar-stack"><span>J</span><span>M</span><span>A</span><span>+</span></div><span><strong>Good things are better shared.</strong><br />Send a link. Everyone’s in.</span></div>
        </div>

        <div className="hero-art" aria-label="A preview of an Afterplay watch room">
          <div className="orbit orbit-one" /><div className="orbit orbit-two" />
          <div className="preview-window">
            <div className="preview-topbar"><div className="window-dots"><i /><i /><i /></div><span>afterplay / slow-sunday</span><span className="preview-live"><i /> LIVE</span></div>
            <div className="preview-video">
              <div className="preview-photo" />
              <span className="film-label">A LITTLE ESCAPE</span>
              <span className="preview-play"><PlayCircleOutlineRoundedIcon /></span>
              <span className="video-duration">12:48</span>
              <div className="preview-controls"><span className="preview-track"><i /></span><span>00:34 / 12:48</span><span>⛶</span></div>
            </div>
            <div className="preview-bottom">
              <div className="preview-people"><div className="tiny-faces"><span>J</span><span>M</span><span>A</span></div><span><strong>3 friends</strong> watching</span></div>
              <div className="preview-chat"><span className="chat-avatar">M</span><span><b>Mia</b><br />this is so good 🌿</span><i>now</i></div>
              <div className="preview-chat second-chat"><span className="chat-avatar pink">J</span><span><b>Jules</b><br />right? the soundtrack</span><i>now</i></div>
            </div>
          </div>
          <div className="sync-note"><span className="sync-note-icon"><SyncAltRoundedIcon /></span><span><strong>Perfectly in sync</strong><br />Every play, pause & rewind</span><span className="sync-check">✓</span></div>
          <div className="floating-note"><span className="float-icon"><GroupsRoundedIcon /></span><span><strong>Room for everyone</strong><br />Just share the link</span></div>
          <span className="art-sparkle sparkle-a">✳</span><span className="art-sparkle sparkle-b">✦</span>
        </div>
      </section>

      <section className="feature-strip wrap" id="features">
        <p>MADE FOR THE <span>“YOU HAD TO BE THERE”</span> MOMENTS</p>
        <div className="feature-items">
          <div><span className="feature-icon coral"><SyncAltRoundedIcon /></span><span><strong>In perfect sync</strong><small>Play, pause, react together</small></span></div>
          <div><span className="feature-icon yellow"><GroupsRoundedIcon /></span><span><strong>Your people, right there</strong><small>See who’s watching with you</small></span></div>
          <div><span className="feature-icon green"><QueueMusicRoundedIcon /></span><span><strong>Queue up the next one</strong><small>Build your night together</small></span></div>
          <div><span className="feature-icon lilac"><ContentCopyRoundedIcon /></span><span><strong>One link gets everyone in</strong><small>No sign-up, no fuss</small></span></div>
        </div>
      </section>

      <section className="how-section wrap" id="how-it-works">
        <div><span className="section-kicker">THREE LITTLE STEPS</span><h2>And you’re <em>together.</em></h2></div>
        <div className="steps"><article><span>01</span><h3>Pick your video</h3><p>Find something good on YouTube. Anything goes.</p></article><article><span>02</span><h3>Make it a room</h3><p>Paste the link and give your night a name.</p></article><article><span>03</span><h3>Send the invite</h3><p>Friends click in. You press play. That’s it.</p></article></div>
      </section>
      <footer className="site-footer wrap"><a className="brand" href="/" aria-label="Afterplay home"><span className="brand-mark"><PlayCircleOutlineRoundedIcon /></span><span>afterplay</span></a><span>Good nights are better together.</span><span>Made for your next movie night <AutoAwesomeRoundedIcon /></span></footer>
    </main>
  );
};

export default CreateSession;
