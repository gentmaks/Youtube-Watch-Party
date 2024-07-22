import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Box, Button, TextField } from "@mui/material";
import { v4 as uuidv4 } from "uuid";

const CreateSession: React.FC = () => {
  const navigate = useNavigate();
  const [newUrl, setNewUrl] = useState("");

  const createSession = async () => {
    const youtubeVidUrl = newUrl;
    setNewUrl("");
    const sessionId = uuidv4();
    // send youtubeVidUrl and sessionId to backend
    // we'll get true if the session was created successfully
    fetch('/api/createSession', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ youtubeVidUrl, sessionId }),
    })
    .then((response) => response.json())
    .then((data) => {
      if (data) {
        console.log('Success:', data);
        navigate(`/watch/${sessionId}`);
      } else {
        console.log('Error creating session');
      }
    }
    )
    .catch((error) => {
      console.error('Error:', error);
    });
  };

  return (
    <Box width="100%" maxWidth={600} display="flex" gap={1} marginTop={1}>
      <TextField
        label="Youtube URL"
        variant="outlined"
        value={newUrl}
        onChange={(e) => setNewUrl(e.target.value)}
        fullWidth
      />
      <Button
        disabled={!newUrl}
        onClick={createSession}
        size="small"
        variant="contained"
      >
        Create a session
      </Button>
    </Box>
  );
};

export default CreateSession;
