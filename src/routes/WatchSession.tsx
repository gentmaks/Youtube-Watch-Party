import React, { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import VideoPlayer from "../components/VideoPlayer";
import PlayCircleOutlineRoundedIcon from "@mui/icons-material/PlayCircleOutlineRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import QueueMusicRoundedIcon from "@mui/icons-material/QueueMusicRounded";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import MoreHorizRoundedIcon from "@mui/icons-material/MoreHorizRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";

interface Participant { id: string; name: string; joinedAt: number; }
interface ChatMessage { id: string; clientId: string; name: string; text: string; sentAt: number; }
interface QueueItem { id: string; videoId: string; youtubeLink: string; addedBy: string; }
interface Room { sessionId: string; name: string; youtubeLink: string; videoId: string; position: number; isPlaying: boolean; hostId: string | null; participants: Participant[]; messages: ChatMessage[]; queue: QueueItem[]; }

const palette = ["#e7a77e", "#a9b6a1", "#b99ecb", "#d5857e", "#8db8c1", "#d8bd78"];
const WebSocketUrl = () => `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/ws`;

const WatchSession: React.FC = () => {
  const { sessionId = "" } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState("");
  const [name, setName] = useState(() => localStorage.getItem("afterplay-name") || "");
  const [joined, setJoined] = useState(false);
  const [connection, setConnection] = useState<"connecting" | "connected" | "reconnecting" | "offline">("connecting");
  const [clientId, setClientId] = useState("");
  const [chatText, setChatText] = useState("");
  const [queueUrl, setQueueUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState("");
  const [activePanel, setActivePanel] = useState<"chat" | "queue">("chat");
  const [playerReady, setPlayerReady] = useState(false);
  const [position, setPosition] = useState(0);
  const [syncCommand, setSyncCommand] = useState({ sequence: 0, position: 0 });
  const [duration, setDuration] = useState(0);
  const socket = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<number | undefined>(undefined);
  const retryCount = useRef(0);
  const suppressPlayerEvents = useRef(false);
  const chatEnd = useRef<HTMLDivElement>(null);
  const reconnectWanted = useRef(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/sessions/${encodeURIComponent(sessionId)}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "This room could not be found.");
        if (!cancelled) { setRoom(data.room); setPosition(data.room.position); }
      })
      .catch((reason) => { if (!cancelled) setError(reason instanceof Error ? reason.message : "Could not load this room."); });
    return () => { cancelled = true; };
  }, [sessionId]);

  const connect = useCallback((displayName: string) => {
    if (!sessionId) return;
    reconnectWanted.current = true;
    const ws = new WebSocket(WebSocketUrl());
    socket.current = ws;
    setConnection(retryCount.current ? "reconnecting" : "connecting");
    ws.onopen = () => {
      retryCount.current = 0;
      setConnection("connected");
      ws.send(JSON.stringify({ type: "JOIN", sessionId, name: displayName }));
    };
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "ERROR") { setToast(data.error); window.setTimeout(() => setToast(""), 3200); return; }
        if (data.type === "WELCOME") {
          setClientId(data.clientId);
          setRoom(data.room);
          setPosition(data.room.position);
          setSyncCommand((current) => ({ sequence: current.sequence + 1, position: data.room.position }));
          setJoined(true);
          return;
        }
        if (data.room) {
          setRoom(data.room);
          if (data.type === "PLAYBACK" || data.type === "VIDEO_CHANGED") {
            setPosition(data.room.position);
            setSyncCommand((current) => ({ sequence: current.sequence + 1, position: data.room.position }));
            suppressPlayerEvents.current = true;
            window.setTimeout(() => { suppressPlayerEvents.current = false; }, 700);
          }
        }
      } catch (_) { setToast("A room update could not be read."); }
    };
    ws.onerror = () => setConnection("offline");
    ws.onclose = () => {
      setConnection("reconnecting");
      if (reconnectWanted.current) {
        const delay = Math.min(1000 * (2 ** retryCount.current), 12000);
        retryCount.current += 1;
        reconnectTimer.current = window.setTimeout(() => connect(displayName), delay);
      }
    };
  }, [sessionId]);

  useEffect(() => () => {
    reconnectWanted.current = false;
    window.clearTimeout(reconnectTimer.current);
    socket.current?.close();
  }, []);

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [room?.messages.length]);

  const isHost = Boolean(clientId && room?.hostId === clientId);
  const send = (message: Record<string, unknown>) => {
    if (socket.current?.readyState === WebSocket.OPEN) socket.current.send(JSON.stringify(message));
  };
  const playback = (type: "PLAY" | "PAUSE" | "SEEK", nextPosition?: number) => {
    if (!isHost) return;
    send({ type, position: typeof nextPosition === "number" ? nextPosition : position });
    if (typeof nextPosition === "number") setPosition(nextPosition);
    if (type === "PLAY" || type === "PAUSE") setRoom((current) => current ? { ...current, isPlaying: type === "PLAY" } : current);
  };

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true); setToast("Invite link copied");
      window.setTimeout(() => { setCopied(false); setToast(""); }, 2200);
    } catch (_) { setToast("Copying isn’t available in this browser."); window.setTimeout(() => setToast(""), 2600); }
  };
  const submitJoin = (event: FormEvent) => {
    event.preventDefault();
    const cleanName = name.trim().slice(0, 24) || "Guest";
    localStorage.setItem("afterplay-name", cleanName);
    setName(cleanName);
    connect(cleanName);
  };
  const submitChat = (event: FormEvent) => {
    event.preventDefault();
    if (!chatText.trim()) return;
    send({ type: "CHAT", text: chatText.trim() });
    setChatText("");
  };
  const addToQueue = (event: FormEvent) => {
    event.preventDefault();
    if (!queueUrl.trim()) return;
    send({ type: "ADD_TO_QUEUE", youtubeUrl: queueUrl.trim() });
    setQueueUrl("");
  };

  const videoTitle = useMemo(() => room?.name || "Your watch party", [room?.name]);

  if (error) return <main className="room-state-page"><a className="brand" href="/"><span className="brand-mark"><PlayCircleOutlineRoundedIcon /></span><span>afterplay</span></a><section className="state-card"><span className="state-symbol">⌁</span><h1>This room went missing.</h1><p>{error}</p><button className="primary-button" onClick={() => navigate("/")}>Start a new room <ArrowBackRoundedIcon /></button></section></main>;
  if (!room) return <main className="room-state-page"><a className="brand" href="/"><span className="brand-mark"><PlayCircleOutlineRoundedIcon /></span><span>afterplay</span></a><section className="state-card"><span className="spinner" /><h1>Finding your people…</h1><p>We’re getting the room ready.</p></section></main>;

  const onLeave = () => { reconnectWanted.current = false; window.clearTimeout(reconnectTimer.current); setJoined(false); socket.current?.close(); navigate("/"); };

  return (
    <main className="watch-app">
      <header className="watch-header">
        <a className="brand" href="/" aria-label="Afterplay home"><span className="brand-mark"><PlayCircleOutlineRoundedIcon /></span><span>afterplay</span></a>
        <div className="room-heading"><span className="room-live-mark"><i />{room.isPlaying ? "WATCHING NOW" : "ROOM IS OPEN"}</span><h1>{videoTitle}</h1></div>
        <div className="header-actions"><div className="participant-count"><PeopleAltRoundedIcon /><span>{room.participants.length}</span><span className="header-count-label">here</span></div><button className="invite-button" onClick={copyInvite}>{copied ? <CheckRoundedIcon /> : <LinkRoundedIcon />}<span>{copied ? "Copied" : "Invite friends"}</span></button><button className="icon-button header-more" onClick={onLeave} aria-label="Leave room" title="Leave room"><MoreHorizRoundedIcon /></button></div>
      </header>
      <div className="room-body">
        <section className="watch-main">
          <div className="video-meta"><div><span className="watching-label">NOW PLAYING</span><h2>{room.name}</h2></div><div className={`sync-status ${connection}`}><i />{connection === "connected" ? "In sync" : connection === "reconnecting" ? "Reconnecting" : connection === "offline" ? "Connection lost" : "Connecting"}</div></div>
          <VideoPlayer key={room.videoId} url={room.youtubeLink} playing={room.isPlaying} position={position} syncCommand={syncCommand} isHost={isHost && connection === "connected"} onPlay={() => { if (!suppressPlayerEvents.current && !room.isPlaying) playback("PLAY"); }} onPause={() => { if (!suppressPlayerEvents.current && room.isPlaying) playback("PAUSE"); }} onSeek={(seconds) => playback("SEEK", seconds)} onProgress={setPosition} onDuration={setDuration} onReady={() => setPlayerReady(true)} />
          <div className="under-player"><div className="room-presence"><div className="presence-avatars">{room.participants.slice(0, 4).map((person, index) => <span key={person.id} style={{ background: palette[index % palette.length] }} title={person.name}>{person.name.charAt(0).toUpperCase()}</span>)}{room.participants.length > 4 && <span className="avatar-more">+{room.participants.length - 4}</span>}</div><span><strong>{room.participants.length} {room.participants.length === 1 ? "person" : "people"}</strong> hanging out{isHost && <em> · You’re hosting</em>}</span></div><button className="text-action" onClick={copyInvite}><ContentCopyRoundedIcon /> Copy room link</button></div>
          <div className="room-tip"><span className="tip-line" /><span>Little tip</span><p>Only the host controls playback, so everyone stays right together.</p></div>
        </section>

        <aside className="party-sidebar">
          <div className="sidebar-tabs" role="tablist" aria-label="Room sidebar"><button role="tab" aria-selected={activePanel === "chat"} className={activePanel === "chat" ? "active" : ""} onClick={() => setActivePanel("chat")}>Chat <span>{room.messages.length || ""}</span></button><button role="tab" aria-selected={activePanel === "queue"} className={activePanel === "queue" ? "active" : ""} onClick={() => setActivePanel("queue")}>Up next <span>{room.queue.length || ""}</span></button></div>
          {activePanel === "chat" ? <>
            <div className="sidebar-section-title"><span>THE HANGOUT</span><span className="mini-online"><i />{room.participants.length} here</span></div>
            <div className="chat-list" aria-live="polite">
              {room.messages.length === 0 ? <div className="chat-empty"><span className="empty-chat-icon">✦</span><strong>The conversation starts here.</strong><p>Send the first message. Or react to that plot twist.</p><div className="suggested-reactions">{["👏", "😂", "💛"].map((emoji) => <button key={emoji} onClick={() => send({ type: "CHAT", text: emoji })} aria-label={`React ${emoji}`}>{emoji}</button>)}</div></div> : room.messages.map((message) => <article className={`chat-message ${message.clientId === clientId ? "mine" : ""}`} key={message.id}><span className="chat-face" style={{ background: palette[Math.abs(message.name.charCodeAt(0) || 0) % palette.length] }}>{message.name.charAt(0).toUpperCase()}</span><div className="chat-bubble-wrap"><div className="chat-byline"><strong>{message.name}{message.clientId === room.hostId && <span className="host-tag">HOST</span>}</strong><time>{new Date(message.sentAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time></div><p>{message.text}</p></div></article>)}<div ref={chatEnd} /></div>
            <form className="chat-compose" onSubmit={submitChat}><input aria-label="Message to the room" maxLength={500} placeholder={joined ? "Say something nice…" : "Join to join the chat…"} value={chatText} onChange={(event) => setChatText(event.target.value)} disabled={!joined || connection !== "connected"} /><button type="submit" disabled={!chatText.trim() || !joined || connection !== "connected"} aria-label="Send message"><SendRoundedIcon /></button></form><p className="chat-guideline">Be kind. The best nights are shared.</p>
          </> : <>
            <div className="sidebar-section-title queue-title"><span><QueueMusicRoundedIcon /> THE QUEUE</span>{isHost && room.queue.length > 0 && <button className="next-up-button" onClick={() => send({ type: "PLAY_NEXT" })}><PlayArrowRoundedIcon /> Play next</button>}</div>
            <form className="queue-add-form" onSubmit={addToQueue}><input aria-label="YouTube video URL" type="url" placeholder="Paste a YouTube link" value={queueUrl} onChange={(event) => setQueueUrl(event.target.value)} disabled={!joined || connection !== "connected"} /><button type="submit" disabled={!queueUrl.trim() || !joined} aria-label="Add to queue"><AddRoundedIcon /></button></form>
            <div className="queue-list">{room.queue.length === 0 ? <div className="queue-empty"><span><QueueMusicRoundedIcon /></span><strong>One more for the road?</strong><p>Add a video and keep the good times rolling.</p></div> : room.queue.map((item, index) => <article className="queue-item" key={item.id}><span className="queue-number">{String(index + 1).padStart(2, "0")}</span><img src={`https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg`} alt="" /><div><strong>{item.videoId}</strong><small>Added by {item.addedBy}</small></div>{isHost && <button aria-label="Remove from queue" title="Remove from queue" onClick={() => send({ type: "REMOVE_FROM_QUEUE", id: item.id })}>×</button>}</article>)}</div>
            <div className="queue-footer"><span>Good picks only.</span><span>{room.queue.length} / 50</span></div>
          </>}
          <div className="sidebar-people"><div className="sidebar-section-title"><span>IN THE ROOM</span><button aria-label="Invite friends" onClick={copyInvite}><AddRoundedIcon /></button></div>{room.participants.length ? room.participants.map((person, index) => <div className="person-row" key={person.id}><span className="person-avatar" style={{ background: palette[index % palette.length] }}>{person.name.charAt(0).toUpperCase()}</span><span className="person-name">{person.name}{person.id === clientId && <i>you</i>}</span><span className="person-role">{person.id === room.hostId ? "HOST" : "HERE"}</span></div>) : <p className="empty-presence">Waiting for the first guest.</p>}</div>
        </aside>
      </div>
      {toast && <div className="toast" role="status"><CheckRoundedIcon />{toast}</div>}
      {!joined && <div className="join-backdrop"><form className="join-card" onSubmit={submitJoin}><a className="brand" href="/"><span className="brand-mark"><PlayCircleOutlineRoundedIcon /></span><span>afterplay</span></a><span className="join-kicker"><i /> YOU’VE GOT AN INVITE</span><h2>{room.name}</h2><p>Your people are waiting. What should we call you?</p><label htmlFor="display-name">YOUR NAME</label><input id="display-name" type="text" maxLength={24} placeholder="e.g. Sam" value={name} onChange={(event) => setName(event.target.value)} autoFocus /><button className="primary-button" type="submit" disabled={connection === "connecting" && socket.current !== null}>Join the party <PlayArrowRoundedIcon /></button><small>No account needed. Just good company.</small></form></div>}
      <div className="room-mobile-bar"><span className="mobile-sync"><i />{connection === "connected" ? "In sync" : "Connecting"}</span><button onClick={copyInvite}><LinkRoundedIcon /> Invite</button></div>
      {playerReady && duration > 0 && <span className="sr-only">Video length {Math.floor(duration / 60)} minutes</span>}
    </main>
  );
};

export default WatchSession;
