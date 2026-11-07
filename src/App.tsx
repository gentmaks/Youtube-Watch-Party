import React from "react";
import { Route, Routes } from "react-router-dom";
import CreateSession from "./routes/CreateSession";
import WatchSession from "./routes/WatchSession";
import Docs from "./routes/Docs";

const App: React.FC = () => (
  <Routes>
    <Route path="/" element={<CreateSession />} />
    <Route path="/create" element={<CreateSession />} />
    <Route path="/docs" element={<Docs />} />
    <Route path="/watch/:sessionId" element={<WatchSession />} />
    <Route path="*" element={<CreateSession />} />
  </Routes>
);

export default App;
