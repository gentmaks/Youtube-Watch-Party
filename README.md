# Yoututbe Watch Party App

This project is a collaborative "Watch Party" app that allows a distributed group of users to watch YouTube videos together. The app supports two main pages:
/create: Create a new session by giving it a name and a YouTube video link.
/watch/:sessionId: Join an existing session and watch the video in sync with others.
The frontend is built in TypeScript, and the backend is built in Node.js. WebSockets are used to keep the video state synchronized between multiple users.

# Features 
- Creating a session: Any user can create a session with a given YouTube video.
- Joining a session: Users can join a session using a shareable link.
- Playing/pausing: Video play/pause actions are synchronized across all users.
- Seeking: Jumping to a certain time in the video is synchronized across all users.
- Late to the party: New users joining an ongoing session will see the video at the correct time, synchronized with others.
- Player controls: Intuitive player controls for play, pause, and seek.

