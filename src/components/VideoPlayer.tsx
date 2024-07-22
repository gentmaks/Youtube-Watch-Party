import { Box, Button } from "@mui/material";
import React, { useRef, useState, useEffect } from "react";
import ReactPlayer from "react-player";

// Component that wraps the ReactPlayer component and handles all the websocket communication
interface VideoPlayerProps {
  url: string;
  hideControls?: boolean;
  sessionId: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ url, hideControls, sessionId }) => {
  // variables to keep track of the state of the video
  const [hasJoined, setHasJoined] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const player = useRef<ReactPlayer>(null);
  const ws = useRef<WebSocket | null>(null);
  const clientId = useRef<string | null>(null);
  const [isBuffering, setIsBuffering] = useState(false);
  const [lastPlayedSeconds, setLastPlayedSeconds] = useState(0);

  useEffect(() => {
    // establish websocket connection
    ws.current = new WebSocket("ws://localhost:" + process.env.REACT_APP_WS_PORT);
    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      // handle messages from server
      if (data.action === "INITIALIZE" && clientId.current === null) {
        clientId.current = data.clientId;
        if (player.current && data.watchParty.timestamp && Math.abs(player.current.getCurrentTime() - data.watchParty.timestamp) > 2) {
          player.current?.seekTo(data.watchParty.timestamp);
        } else if (player.current && !data.watchParty.timestamp) {
          player.current?.seekTo(0);
        }
        if (!data.watchParty.isPlaying) {
          setIsReady(false);
        } else {
          setIsReady(true);
        }
      } else if (data.action === "PLAY" && clientId.current !== data.clientId && data.watchParty.sessionId === sessionId) {
        // only seek if the timestamp is different by more than 2 seconds
        if (player.current && data.watchParty.timestamp && Math.abs(player.current.getCurrentTime() - data.watchParty.timestamp) > 2) {
          player.current?.seekTo(data.watchParty.timestamp);
        }
        setIsReady(true);
      } else if (data.action === "PAUSE" && clientId.current !== data.clientId && data.watchParty.sessionId === sessionId) {
        // pause video
        if (player.current && data.watchParty.timestamp && Math.abs(player.current.getCurrentTime() - data.watchParty.timestamp) > 2) {
          player.current?.seekTo(data.watchParty.timestamp);
        }
        setIsReady(false);
      } else if (data.action === "BUFFER" && clientId.current !== data.clientId && data.watchParty.sessionId === sessionId) {
        // buffer video
        if (player.current && data.watchParty.timestamp && Math.abs(player.current.getCurrentTime() - data.watchParty.timestamp) > 2) {
          player.current?.seekTo(data.watchParty.timestamp);
        }
        setIsBuffering(true);
      } else if (data.action === "SEEK" && clientId.current !== data.clientId && data.watchParty.sessionId === sessionId) {
        // seek video
        if (player.current && data.watchParty.timestamp && Math.abs(player.current.getCurrentTime() - data.watchParty.timestamp) > 2) {
          player.current?.seekTo(data.watchParty.timestamp);
          setLastPlayedSeconds(data.watchParty.timestamp);
        }
      } else if (data.action === "END" && data.watchParty.sessionId === sessionId) {
        console.log("Received end message");
        // end video NOTE: nothing for now since it was not a requirement in the project description but we could easily add some 
        // functionality in regards to the video ending as well.
      }

    }
    return () => {
      ws.current?.close();
      console.log("Websocket closed");
    };
  }, []);

  // Handles the ready event from the video player
  const handleReady = () => {
    console.log("Video ready");
    setIsReady(true);
  };

  // Handles the end event from the video player
  const handleEnd = () => {
    console.log("Video ended");
    ws.current?.send(JSON.stringify({ action: "END" }));
  };

  // Handles the seek event from the video player
  const handleSeek = (seconds: number) => {
    console.log(
      "User seeked video to time: ",
      seconds

    );
    ws.current?.send(JSON.stringify({ action: "SEEK", timestamp: seconds, sessionId: sessionId, clientId: clientId.current }));
  };

  // Handles the play event from the video player
  const handlePlay = () => {
    console.log(
      "User played video at time: ",
      player.current?.getCurrentTime(),
      " with client ID: ",
      clientId.current
    );
    ws.current?.send(JSON.stringify({ action: "PLAY", timestamp: player.current?.getCurrentTime(), sessionId: sessionId, clientId: clientId.current }));
  };

  // Handles the pause event from the video player
  const handlePause = () => {
    console.log(
      "User paused video at time: ",
      player.current?.getCurrentTime(),
      " with client ID: ",
      clientId.current
    );
    ws.current?.send(JSON.stringify({ action: "PAUSE", timestamp: player.current?.getCurrentTime(), sessionId: sessionId, clientId: clientId.current }));
  };

  // Handles the buffer event from the video player
  const handleBuffer = () => {
    console.log(
      "User buffered video at time: ",
      player.current?.getCurrentTime(),
      " with client ID: ",
      clientId.current
    );
    ws.current?.send(JSON.stringify({ action: "BUFFER", timestamp: player.current?.getCurrentTime(), sessionId: sessionId, clientId: clientId.current }));
  };

  // Handles the progress event from the video player
  const handleProgress = (state: {
    played: number;
    playedSeconds: number;
    loaded: number;
    loadedSeconds: number;
  }) => {
    if (!isBuffering && Math.abs(state.playedSeconds - lastPlayedSeconds) > 1.5) {
      handleSeek(state.playedSeconds);
    }
    setLastPlayedSeconds(state.playedSeconds);
  };

  return (
    <Box
      width="100%"
      height="100%"
      display="flex"
      alignItems="center"
      justifyContent="center"
      flexDirection="column"
    >
      <Box
        width="100%"
        height="100%"
        display={hasJoined ? "flex" : "none"}
        flexDirection="column"
      >
        <ReactPlayer
          ref={player}
          url={url}
          playing={hasJoined && isReady}
          controls={!hideControls}
          onReady={handleReady}
          onEnded={handleEnd}
          onSeek={handleSeek}
          onPlay={handlePlay}
          onPause={handlePause}
          onBuffer={handleBuffer}
          onProgress={handleProgress}
          onBufferEnd={() => setIsBuffering(false)}
          width="100%"
          height="100%"
          style={{ pointerEvents: hideControls ? "none" : "auto" }}
        />
      </Box>
      {!hasJoined && isReady && (
        // Youtube doesn't allow autoplay unless you've interacted with the page already
        // So we make the user click "Join Session" button and then start playing the video immediately after
        // This is necessary so that when people join a session, they can seek to the same timestamp and start watching the video with everyone else
        <Button
          variant="contained"
          size="large"
          onClick={() => {
            setIsReady(false);
            setHasJoined(true);
            ws.current?.send(JSON.stringify({ action: "INITIALIZE", timestamp: player.current?.getCurrentTime(), sessionId: sessionId }));
          }
          }
        >
          Watch Session
        </Button>
      )}
    </Box>
  );
};

export default VideoPlayer;