## Nooks Watch Party Project

In this takehome project, we want to understand your:
- ability to build something non-trivial from scratch
- comfort picking up unfamiliar technologies
- architectural decisions, abstractions, and rigor

We want to respect your time, so please try not to spend more than 5 hours on this. We know that this is a challenging task & you are under time pressure and will keep that in mind when evaluating your solution.

### Instructions

Video demo: https://www.youtube.com/watch?v=gPznf1ZyNoE

To run the app simply "npm i" and then "npm start"

Before running you need to make sure to set these environment variables:

- MONGODB_URI: the uri to your MongoDB database
- WS_PORT: the port that the websocket server will run on
- HTTP_PORT: the port that the http server will run on
- REACT_APP_WS_PORT: the port that the websocket client will connect to 
(the react app side)


### Problem
Your task is to build a collaborative “Watch Party” app that lets a distributed group of users watch youtube videos together. The frontend should be written in Typescript (we have a skeleton for you set up) and the backend should be written in Node.JS. The app should support two main pages:

- `/create` **Create a new session**
    - by giving it a name and a youtube video link. After creating a session `ABC`, you should be automatically redirected to the page `/watch` page for that session
- `/watch/:sessionId` **Join an existing session**
    
    *⚠️ The player must be **synced for all users at all times** no matter when they join the party*
    
    - **Playing/pausing/seek** the video. When someone plays/pauses the video or jumps to a certain time in the video, this should update for everyone in the session
    - **Late to the party**... Everything should stay synced if a user joins the session late (e.g. if the video was already playing, the new user should see it playing at the correct time)
        
### Assumptions

- This app obviously **doesn’t need to be production-ready**, but you should at least be aware of any issues you may encounter in more real-world scenarios.
- We gave you all of the frontend UX you’ll need in the [starter repo](https://github.com/NooksApp/nooks-fullstack-takehome), including skeleton pages for the `create` and `watch` routes, so you can focus on implementing the core backend functionality & frontend video playing logic for the app.
- You should probably use **websockets** to keep state synchronized between multiple users.

You will need to embed a Youtube video directly in the website. In our skeleton code we use [react-player](https://www.npmjs.com/package/react-player), but feel free to use another library or use the [Youtube IFrame API](https://developers.google.com/youtube/iframe_api_reference) directly.

In order to sync the video, you’ll need to know when any user plays, pauses, or seeks in their own player and transmit that information to everyone else. In order to get play, pause, and seek events you can use:
1. [YouTube iFrame API - Events](https://developers.google.com/youtube/iframe_api_reference#Events)
2. Build your own custom controls for play, pause & seek. If you choose  this option, make sure the controls UX works very similarly to youtube’s standard controls (e.g. play/pause button and a slider for seek)

### Required Functionality

- [x] **Creating a session**. Any user should be able to create a session to watch a given Youtube video.
- [x] **Joining a session**. Any user should be able to join a session created by another user using the shareable session link.
- [x] **Playing/pausing** the video. When a participant pauses the video, it should pause for everyone. When a participant plays the video, it should start playing for everyone.
- [x] **“Seek”**. When someone jumps to a certain time in the video it should jump to that time for everyone.
- [x] **Late to the party**... Everything should stay synced even if a user joins the watch party late (e.g. the video is already playing)
- [x] **Player controls.** All the player controls (e.g. play, pause, and seek) should be intuitive and behave as expected. For play, pause & seek operations you can use the built-in YouTube controls or disable the YouTube controls and build your own UI (including a slider for the seek operation)

🚨 **Please fill out the rubric in the README with the functionality you were able to complete**


### Architecture Questions

After building the watch party app, we would like you to answer the following questions about design decisions and tradeoffs you made while building it. Please fill them out in the README along with your submission.

1. **How did you approach the problem? What did you choose to learn or work on first? Did any unexpected difficulties come up - if so, how did you resolve them?**

Answer: I started by familiarizing myself with the starter code and the libraries used. I then started with an initial implementation of the backend, creating the api endpoints, keeping track of the created sessions with a dummy database, and filling the rest of the frontend logic on the react app side. I then moved on the websocket implementation to ensure synchronization between the users in a particular session. Lastly, I made sure to implement a real database into the solution (used MongoDB) and keep an in-memory caching solution to reduce the API calls to the database. As a final touch, I added some comments to the code to make it easier to understand.

2. **How did you implement seeking to different times in the video? Are there any other approaches you considered and what are the tradeoffs between them?**

Answer: I implemented seeking by keeping track of the last played seconds and then comparing it with the current timestamp. If the difference is greater than 1.5 seconds (subject to change), then I would emit a seek event to the other users in the session to indicate that the video should be seeked to the last played seconds. This approach seemed the most appropriate with my current solution and the limited time I had to work on this project. I tested the approach thoroughly and it seems to be holding up well with 10+ users in the session at the same time.

3. **How do new users know what time to join the watch party? Are there any other approaches you considered and what were the tradeoffs between them?**

Answer: I achieved this functionality by keeping track of two timestamps: the last updated timestamp in the backend, and the time that this timestamp was recorded. By just these two records, I was able to calculate the time that the video should be seeked to for the new user. I considered other approaches such as communicating the current timestamp to the new user, but this would require a lot of API calls and would be inefficient. Furthermore it would probably be too complicated to implement and even cause issues as the number of users in the session increases.

4. **How do you guarantee that the time that a new user joins is accurate (i.e perfectly in sync with the other users in the session) and are there any edge cases where it isn’t? Think about cases that might occur with real production traffic.**

Answer: I guarantee that the time that a new user joins is accurate by keeping track of the last updated timestamp in the backend and the time that this timestamp was recorded. The solution was thoroughly tested and seems to be holding up well with 10+ users in the session at the same time. However, I can see some edge cases where the time that a new user joins is not accurate. There does not seem to be any big losses of synchronization (more than 1 second). The existence of events such as buffer and seek ensure that synchronization gets back on track quickly without any losses in quality of experience.

5. **Are there any other situations - i.e race conditions, edge cases - where one user can be out of sync with another? (Out of sync meaning that user A has the video playing or paused at some time, while user B has the video playing or paused at some other time.)**

Answer: After thoroughly testing the solution, I have not found any other situations where one user can be out of sync with another. The solution seems to be holding up well with 10+ users in the session at the same time. 

6. **How would you productionize this application to a scale where it needs to be used reliably with 1M+ DAUs and 10k people connected to a single session? Think infrastructure changes, code changes & UX changes.**

Answer: Due to the limited time I had to work on this project, there are several aspects of my solution that I would change during productionization. First, I would change the database from MongoDB to a more scalable solution such as DynamoDB. I would also change the caching solution from an in-memory cache to a more scalable solution such as Redis. As far as Websockets go, I would swap it for something like RabbitMQ, offering more scalability and reliability. I would also add a load balancer to the backend to ensure that the application can handle the increased traffic. Lastly, I would add a CDN to the frontend to ensure that the application can handle the increased traffic.

🚨 **Please fill out this section in the README with answers to these questions, or send the answers in your email instead.**

### Help & Clarifications

If you want something about the problem statement clarified at any point while you’re working on this, feel free to **email me** at nikhil@nooks.in or even **text me** at 408-464-2288. I will reply as soon as humanly possible and do my best to unblock you.

Feel free to use any resource on the Internet to help you tackle this challenge better: guides, technical documentation, sample projects on Github — anything is fair game! We want to see how you can build things in a real working environment where no information is off limits.

### Submission

When you’ve finished, please send back your results to me via email as a **zip file**. Make sure to include any instructions about how to run the app in the README.md. 

I will take a look and schedule a time to talk about your solution!

