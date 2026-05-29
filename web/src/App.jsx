import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import EventDetail from "./pages/EventDetail";
import Discover from "./pages/Discover";
import AdminDashboard from "./pages/AdminDashboard";
import SKSDashboard from "./pages/SKSDashboard"; // YENİ
import OrganizerDashboard from "./pages/OrganizerDashboard"; // YENİ
import Profile from "./pages/Profile";

function App() {
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (savedTheme === "dark" || (!savedTheme && systemPrefersDark)) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/home" element={<Home />} />
        <Route path="/event/:id" element={<EventDetail />} />
        <Route path="/discover" element={<Discover />} />
        <Route path="/admin" element={<AdminDashboard />} />
        
        {/* YENİ ROTALARIMIZ */}
        <Route path="/sks" element={<SKSDashboard />} />
        <Route path="/organizer" element={<OrganizerDashboard />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;