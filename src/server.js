// server.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const WebSocket = require('ws');
const app = express();
const wss = new WebSocket.Server({ port: process.env.WS_PORT });
const { MongoClient } = require('mongodb');
const port = process.env.PORT || 5000;
let db;
app.use(express.json());

// Connect to the database (used for disaster recovery)
MongoClient.connect(process.env.MONGODB_URI, { useUnifiedTopology: true }, (err, client) => {
    if (err) throw err;
    db = client.db('watchPartyDatabase');
    console.log('Connected to database');
});

const watchPartyDatabase = {}; // In memory cache solution used to reduce database calls

// The watch party object that is stored in the database
const watchPartyObj = {
    youtubeLink: '',
    timestamp: 0,
    timeOfLastUpdate: 0,
    isPlaying: false,
    sessionId: ''
};

// Serve static files from the React app
app.use(express.static(path.join(__dirname.replace('src', 'build'))));

// api endpoint to create a new session
// it takes in a youtube link and a sessionId and creates a new watch party object
// and stores it in the database and in the in memory cache
app.post('/api/createSession', (req, res) => {
    console.log(req.body);
    const sessionId = req.body.sessionId;
    const youtubeLink = req.body.youtubeVidUrl;
    watchPartyDatabase[sessionId] = { ...watchPartyObj, youtubeLink, sessionId };
    // insert into the database using the sessionId as the key
    db.collection('watchParty').insertOne({ ...watchPartyObj, youtubeLink, sessionId }, (err, result) => {
        if (err) {
            console.log(err);
            res.send(false);
        } else {
            console.log('Inserted new watch party object into database: ', watchPartyDatabase[sessionId]);
            res.send(true);
        }
    });
});

// api endpoint to get a watch party object from the database
// it takes in a sessionId and returns the watch party object
app.get('/api/session/:sessionId', (req, res) => {
    const sessionId = req.params.sessionId;
    if (watchPartyDatabase[sessionId]) {
        res.json(watchPartyDatabase[sessionId]);
    } else {
        // if the session does not exist in the in memory cache, then we query the database
        db.collection('watchParty').findOne({ sessionId }, (err, result) => {
            if (err) {
                console.log(err);
                res.send(false);
            } else if (result) {
                console.log('found session in database ' + JSON.stringify(result));
                watchPartyDatabase[sessionId] = result;
                res.json(result);
            } else {
                console.log('session not found on database ' + sessionId);
                res.send(false);
            }
        });
    }
});

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname.replace('src', 'build'), 'index.html'));
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

// Websocket connection
wss.on('connection', (ws) => {
    console.log('Websocket connection established');
    // When a client connects give them an id and send them the current watch party object
    ws.on('message', (message) => {
        const { sessionId, action, timestamp, clientId } = JSON.parse(message);
        console.log(message);
        switch (action) {
            case 'INITIALIZE':
                const newClientId = Math.random().toString(36).substring(2, 15);
                if (!watchPartyDatabase[sessionId].isPlaying) {
                    watchPartyDatabase[sessionId].timeOfLastUpdate = Date.now();
                } else {
                    let secondsPassed = (Date.now() - watchPartyDatabase[sessionId].timeOfLastUpdate) / 1000;
                    watchPartyDatabase[sessionId].timeOfLastUpdate = Date.now();
                    watchPartyDatabase[sessionId].timestamp += secondsPassed;
                }
                ws.send(JSON.stringify({ clientId: newClientId, watchParty: watchPartyDatabase[sessionId], action }));
                break;
            case 'PLAY':
                watchPartyDatabase[sessionId].timestamp = timestamp;
                watchPartyDatabase[sessionId].timeOfLastUpdate = Date.now();
                watchPartyDatabase[sessionId].isPlaying = true;
                break;
            case 'PAUSE':
                watchPartyDatabase[sessionId].timestamp = timestamp;
                watchPartyDatabase[sessionId].timeOfLastUpdate = Date.now();
                watchPartyDatabase[sessionId].isPlaying = false;
                break;
            case 'SEEK':
                watchPartyDatabase[sessionId].timestamp = timestamp;
                watchPartyDatabase[sessionId].timeOfLastUpdate = Date.now();
                break;
            case 'BUFFER':
                watchPartyDatabase[sessionId].timestamp = timestamp;
                watchPartyDatabase[sessionId].timeOfLastUpdate = Date.now();
                break;
            default:
                break;
        }

        // Update the database with the new watch party object
        db.collection('watchParty').updateOne({ sessionId }, { $set: watchPartyDatabase[sessionId] }, (err, result) => {
            if (err) {
                console.log(err);
            } else {
                console.log('Updated watch party object in database: ', watchPartyDatabase[sessionId]);
            }
        });

        // Broadcast the updated watch party object to all connected clients
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                console.log('sending message with client id' + clientId);
                if (action !== "INITIALIZE") {
                    client.send(JSON.stringify({ watchParty: watchPartyDatabase[sessionId], action, clientId }));
                }
            }
        });
    });
});