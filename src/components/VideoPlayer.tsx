import React, { useEffect, useRef, useState } from "react";
import ReactPlayer from "react-player";
import PauseRoundedIcon from "@mui/icons-material/PauseRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import Replay10RoundedIcon from "@mui/icons-material/Replay10Rounded";
import Forward10RoundedIcon from "@mui/icons-material/Forward10Rounded";
import VolumeUpRoundedIcon from "@mui/icons-material/VolumeUpRounded";
import FullscreenRoundedIcon from "@mui/icons-material/FullscreenRounded";

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
  const player = useRef<ReactPlayer>(null);
  const seekRef = useRef<HTMLInputElement>(null);
  const [duration, setDuration] = useState(0);
  const [localPosition, setLocalPosition] = useState(position);
  const [ready, setReady] = useState(false);
  const appliedSequence = useRef(0);

  useEffect(() => setLocalPosition(position), [position]);
  useEffect(() => {
    if (!ready || syncCommand.sequence === 0 || syncCommand.sequence === appliedSequence.current) return;
    appliedSequence.current = syncCommand.sequence;
    player.current?.seekTo(syncCommand.position, "seconds");
    setLocalPosition(syncCommand.position);
  }, [ready, syncCommand]);
  const onPlayerDuration = (value: number) => { setDuration(value); onDuration(value); };
  const seek = (seconds: number) => {
    const bounded = Math.max(0, duration ? Math.min(seconds, duration) : seconds);
    player.current?.seekTo(bounded, "seconds");
    setLocalPosition(bounded);
    onSeek(bounded);
  };
  const commitSeek = () => {
    if (seekRef.current) seek(Number(seekRef.current.value));
  };
  const skip = (delta: number) => seek(Math.max(0, Math.min(duration || Infinity, (player.current?.getCurrentTime() || position) + delta)));

  return (
    <div className="player-shell">
      <div className="player-frame">
        <ReactPlayer
          ref={player}
          url={url}
          playing={playing}
          controls={false}
          onReady={() => { setReady(true); if (position > 0) player.current?.seekTo(position, "seconds"); onReady(); }}
          onDuration={onPlayerDuration}
          onProgress={(state) => { setLocalPosition(state.playedSeconds); onProgress(state.playedSeconds); }}
          onPlay={onPlay}
          onPause={onPause}
          width="100%"
          height="100%"
          config={{ youtube: { playerVars: { modestbranding: 1, rel: 0, playsinline: 1 } } }}
        />
        {!ready && <div className="player-loading"><span className="spinner" /><span>Getting the room ready…</span></div>}
        {!playing && ready && <button className="player-center-play" onClick={isHost ? onPlay : undefined} disabled={!isHost} aria-label={isHost ? "Play for everyone" : "Waiting for the host"}><PlayArrowRoundedIcon /></button>}
      </div>
      <div className="player-controls">
        <div className="control-main">
          <button className="play-toggle" onClick={playing ? onPause : onPlay} disabled={!isHost} aria-label={playing ? "Pause for everyone" : "Play for everyone"} title={isHost ? (playing ? "Pause for everyone" : "Play for everyone") : "The host controls playback"}>{playing ? <PauseRoundedIcon /> : <PlayArrowRoundedIcon />}</button>
          <button className="icon-button skip-button" onClick={() => skip(-10)} disabled={!isHost} aria-label="Back 10 seconds"><Replay10RoundedIcon /></button>
          <button className="icon-button skip-button" onClick={() => skip(10)} disabled={!isHost} aria-label="Forward 10 seconds"><Forward10RoundedIcon /></button>
          <span className="time-readout">{formatTime(localPosition)} <i>/</i> {formatTime(duration)}</span>
        </div>
        <div className="timeline-wrap"><input ref={seekRef} className="timeline" type="range" min="0" max={Math.max(1, duration)} step="0.25" value={Math.min(localPosition, duration || localPosition)} style={{ background: `linear-gradient(to right, var(--coral) 0%, var(--coral) ${duration ? (localPosition / duration) * 100 : 0}%, #50514d ${duration ? (localPosition / duration) * 100 : 0}%, #50514d 100%)` }} onChange={(event) => setLocalPosition(Number(event.target.value))} onPointerUp={commitSeek} onKeyUp={commitSeek} disabled={!isHost || !ready} aria-label="Seek video" /></div>
        <div className="control-end"><span className="sound-control"><VolumeUpRoundedIcon /></span><button className="icon-button" aria-label="Fullscreen" onClick={() => { const root = player.current?.getInternalPlayer?.(); if (root?.getIframe?.()?.requestFullscreen) root.getIframe().requestFullscreen(); }}><FullscreenRoundedIcon /></button></div>
      </div>
      {!isHost && <p className="host-control-note">The host is in control of playback</p>}
    </div>
  );
};

export default VideoPlayer;
