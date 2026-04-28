import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useRoom } from '../context/RoomContext'

const SERVER = import.meta.env.VITE_SERVER_URL

export default function Home() {
  const navigate = useNavigate()
  const { setRoomCode, setIsHost } = useRoom()
  const [joinCode, setJoinCode] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [step, setStep] = useState('landing') // landing | join
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleHostClick() {
    window.location.href = `${SERVER}/api/spotify/login`
  }

  async function handleJoinSubmit() {
    if (!joinCode.trim() || !displayName.trim()) {
      setError('Please enter both a room code and your name')
      return
    }

    setLoading(true)
    setError('')

    try {
      await axios.get(`${SERVER}/api/rooms/${joinCode.toUpperCase()}`, {
        withCredentials: true
      })

      setRoomCode(joinCode.toUpperCase())
      setIsHost(false)
      navigate(`/room/${joinCode.toUpperCase()}?name=${encodeURIComponent(displayName)}`)

    } catch (err) {
      setError(err.response?.data?.error || 'Room not found')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex flex-col items-center justify-center px-4">

      {/* logo */}
      <div className="mb-12 text-center">
        <h1 className="text-5xl font-bold tracking-tight text-white">
        Mood<span className="text-[#1DB954]">Sync</span>
        </h1>
        <p className="text-white mt-3 text-lg">
          A shared queue that reads the whole room.
        </p>
      </div>

      {step === 'landing' && (
        <div className="flex flex-col gap-4 w-full max-w-sm">

          {/* host button */}
          <button
            onClick={handleHostClick}
            className="w-full bg-[#1DB954] hover:bg-[#077c30] text-black font-semibold py-4 rounded-full text-base transition-all duration-200 cursor-pointer"
          >
            Create a Room with Spotify
          </button>

          {/* divider */}
          <div className="flex items-center gap-3 my-1">
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="text-zinc-500 text-sm">or</span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>

          {/* join button */}
          <button
            onClick={() => setStep('join')}
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-4 rounded-full text-base transition-all duration-200 cursor-pointer"
          >
            Join a Room
          </button>

        </div>
      )}

      {step === 'join' && (
        <div className="flex flex-col gap-4 w-full max-w-sm">

          <input
            type="text"
            placeholder="Your display name"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 focus:border-[#1DB954] outline-none text-white placeholder-zinc-500 py-4 px-5 rounded-xl text-base transition-colors"
          />

          <input
            type="text"
            placeholder="Room code (e.g. XK92J)"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            maxLength={5}
            className="w-full bg-zinc-900 border border-zinc-700 focus:border-[#1DB954] outline-none text-white placeholder-zinc-500 py-4 px-5 rounded-xl text-base tracking-widest transition-colors"
          />

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            onClick={handleJoinSubmit}
            disabled={loading}
            className="w-full bg-[#1DB954] hover:bg-[#1ed760] disabled:opacity-50 text-black font-semibold py-4 rounded-full text-base transition-all duration-200"
          >
            {loading ? 'Checking...' : 'Join Room'}
          </button>

          <button
            onClick={() => { setStep('landing'); setError('') }}
            className="text-zinc-500 hover:text-white text-sm text-center transition-colors"
          >
            ← Back
          </button>

        </div>
      )}

      {/* footer */}
      <p className="absolute bottom-6 text-zinc-600 text-xs">
        Spotify Premium required for the host · Guests join free
      </p>

    </div>
  )
}