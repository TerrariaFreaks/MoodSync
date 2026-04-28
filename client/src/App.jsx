import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Room from './pages/Room'
import CreateRoom from './pages/CreateRoom'
import Callback from './pages/Callback'
import Recap from './pages/Recap'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/callback" element={<Callback />} />
        <Route path="/create-room" element={<CreateRoom />} />
        <Route path="/room/:roomCode" element={<Room />} />
        <Route path="/recap/:roomCode" element={<Recap />} />
      </Routes>
    </BrowserRouter>
  )
}