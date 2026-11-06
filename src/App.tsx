import React from "react";
import { Route, Routes } from "react-router-dom";
import CreateSession from "./routes/CreateSession";
import WatchSession from "./routes/WatchSession";

const App: React.FC = () => (
  <Routes>
    <Route path="/" element={<CreateSession />} />
    <Route path="/create" element={<CreateSession />} />
    <Route path="/watch/:sessionId" element={<WatchSession />} />
    <Route path="*" element={<CreateSession />} />
  </Routes>
);

export default App;
