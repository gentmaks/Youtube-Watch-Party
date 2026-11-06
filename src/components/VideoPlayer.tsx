import React, { useEffect, useRef, useState } from "react";
import PauseRoundedIcon from "@mui/icons-material/PauseRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import Replay10RoundedIcon from "@mui/icons-material/Replay10Rounded";
import Forward10RoundedIcon from "@mui/icons-material/Forward10Rounded";
import VolumeUpRoundedIcon from "@mui/icons-material/VolumeUpRounded";
import VolumeOffRoundedIcon from "@mui/icons-material/VolumeOffRounded";
import FullscreenRoundedIcon from "@mui/icons-material/FullscreenRounded";

interface YouTubeEvent { target: YouTubePlayerApi; data: number; }
interface YouTubePlayerApi {
  destroy: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getIframe: () => HTMLIFrameElement;
  isMuted: () => boolean;
  mute: () => void;
  pauseVideo: () => void;
  playVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  unMute: () => void;
  setVolume: (volume: number) => void;
}
interface YouTubeApi { Player: new (element: HTMLElement, options: Record<string, unknown>) => YouTubePlayerApi; PlayerState: { ENDED: number; PLAYING: number; PAUSED: number; BUFFERING: number; CUED: number; }; }
declare global { interface Window { YT?: YouTubeApi; onYouTubeIframeAPIReady?: () => void; } }

let apiPromise: Promise<YouTubeApi> | null = null;
const loadYouTubeApi = () => {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    const timeout = window.setTimeout(() => reject(new Error("YouTube player timed out.")), 15000);
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (window.YT?.Player) { window.clearTimeout(timeout); resolve(window.YT); }
      else reject(new Error("YouTube player is unavailable."));
    };
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://www.youtube.com/iframe_api"]');
    if (!existing) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onerror = () => { window.clearTimeout(timeout); reject(new Error("YouTube player could not load.")); };
      document.head.appendChild(script);
    }
  });
  return apiPromise;
};

interface VideoPlayerProps {
  url: string;
  playing: boolean;
  position: number;
  syncCommand: { sequence: number; position: number };
  isHost: boolean;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (seconds: number) => void;
  onProgress: (seconds: number) => void;
  onDuration: (seconds: number) => void;
  onReady: () => void;
}

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
};

const VideoPlayer: React.FC<VideoPlayerProps> = ({ url, playing, position, syncCommand, isHost, onPlay, onPause, onSeek, onProgress, onDuration, onReady }) => {
  const container = useRef<HTMLDivElement>(null);
  const seekRef = useRef<HTMLInputElement>(null);
  const player = useRef<YouTubePlayerApi | null>(null);
  const appliedSequence = useRef(0);
  const [duration, setDuration] = useState(0);
  const [localPosition, setLocalPosition] = useState(position);
  const [ready, setReady] = useState(false);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const videoId = new URL(url).searchParams.get("v") || "";
    loadYouTubeApi().then((youtube) => {
      if (cancelled || !container.current) return;
      player.current = new youtube.Player(container.current, {
        videoId,
        width: "100%",
        height: "100%",
        playerVars: { controls: 0, disablekb: 1, modestbranding: 1, rel: 0, playsinline: 1, origin: window.location.origin },
        events: {
          onReady: (event: YouTubeEvent) => {
            if (cancelled) return;
            const total = event.target.getDuration();
            if (total > 0) { setDuration(total); onDuration(total); }
            if (position > 0) event.target.seekTo(position, true);
            setReady(true);
            onReady();
          },
          onStateChange: (event: YouTubeEvent) => {
            if (event.data === youtube.PlayerState.PLAYING) onPlay();
            if (event.data === youtube.PlayerState.PAUSED) onPause();
          },
          onError: () => setError(true),
        },
      });
    }).catch(() => { if (!cancelled) setError(true); });
    return () => {
      cancelled = true;
      player.current?.destroy();
      player.current = null;
    };
  // The player is bound to a video ID and is remounted when the queue changes video.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  useEffect(() => setLocalPosition(position), [position]);
  useEffect(() => {
    if (!ready || syncCommand.sequence === 0 || syncCommand.sequence === appliedSequence.current) return;
    appliedSequence.current = syncCommand.sequence;
    player.current?.seekTo(syncCommand.position, true);
    setLocalPosition(syncCommand.position);
  }, [ready, syncCommand]);
  useEffect(() => {
    if (!ready || !player.current) return;
    if (playing) player.current.playVideo();
    else player.current.pauseVideo();
  }, [playing, ready]);
  useEffect(() => {
    if (!ready) return;
    const interval = window.setInterval(() => {
      if (!player.current) return;
      const current = player.current.getCurrentTime();
      const total = player.current.getDuration();
      if (Number.isFinite(current)) { setLocalPosition(current); onProgress(current); }
      if (total > 0 && total !== duration) { setDuration(total); onDuration(total); }
    }, 1000);
    return () => window.clearInterval(interval);
  }, [ready, duration, onDuration, onProgress]);

  const seek = (seconds: number) => {
    const bounded = Math.max(0, duration ? Math.min(seconds, duration) : seconds);
    player.current?.seekTo(bounded, true);
    setLocalPosition(bounded);
    onSeek(bounded);
  };
  const commitSeek = () => { if (seekRef.current) seek(Number(seekRef.current.value)); };
  const skip = (delta: number) => seek(Math.max(0, Math.min(duration || Infinity, (player.current?.getCurrentTime() || position) + delta)));
  const toggleMute = () => {
    if (!player.current) return;
    if (player.current.isMuted()) { player.current.unMute(); player.current.setVolume(75); setMuted(false); }
    else { player.current.mute(); setMuted(true); }
  };

  return (
    <div className="player-shell">
      <div className="player-frame">
        <div className="youtube-player" ref={container} />
        {!ready && !error && <div className="player-loading"><span className="spinner" /><span>Getting the room ready…</span></div>}
        {error && <div className="player-loading player-error"><strong>This video can’t be played here.</strong><a href={url} target="_blank" rel="noreferrer">Open it on YouTube</a></div>}
        {!playing && ready && <button className="player-center-play" onClick={isHost ? onPlay : undefined} disabled={!isHost} aria-label={isHost ? "Play for everyone" : "Waiting for the host"}><PlayArrowRoundedIcon /></button>}
      </div>
      <div className="player-controls">
        <div className="control-main">
          <button className="play-toggle" onClick={playing ? onPause : onPlay} disabled={!isHost || !ready} aria-label={playing ? "Pause for everyone" : "Play for everyone"} title={isHost ? (playing ? "Pause for everyone" : "Play for everyone") : "The host controls playback"}>{playing ? <PauseRoundedIcon /> : <PlayArrowRoundedIcon />}</button>
          <button className="icon-button skip-button" onClick={() => skip(-10)} disabled={!isHost || !ready} aria-label="Back 10 seconds"><Replay10RoundedIcon /></button>
          <button className="icon-button skip-button" onClick={() => skip(10)} disabled={!isHost || !ready} aria-label="Forward 10 seconds"><Forward10RoundedIcon /></button>
          <span className="time-readout">{formatTime(localPosition)} <i>/</i> {formatTime(duration)}</span>
        </div>
        <div className="timeline-wrap"><input ref={seekRef} className="timeline" type="range" min="0" max={Math.max(1, duration)} step="0.25" value={Math.min(localPosition, duration || localPosition)} style={{ background: `linear-gradient(to right, var(--coral) 0%, var(--coral) ${duration ? (localPosition / duration) * 100 : 0}%, #50514d ${duration ? (localPosition / duration) * 100 : 0}%, #50514d 100%)` }} onChange={(event) => setLocalPosition(Number(event.target.value))} onPointerUp={commitSeek} onKeyUp={commitSeek} disabled={!isHost || !ready} aria-label="Seek video" /></div>
        <div className="control-end"><button className="icon-button sound-control" onClick={toggleMute} aria-label={muted ? "Turn sound on" : "Mute video"}><span className="sound-control">{muted ? <VolumeOffRoundedIcon /> : <VolumeUpRoundedIcon />}</span></button><button className="icon-button" aria-label="Fullscreen" onClick={() => { const frame = player.current?.getIframe(); if (frame?.requestFullscreen) frame.requestFullscreen(); }}><FullscreenRoundedIcon /></button></div>
      </div>
      {!isHost && <p className="host-control-note">The host is in control of playback</p>}
    </div>
  );
};

export default VideoPlayer;
