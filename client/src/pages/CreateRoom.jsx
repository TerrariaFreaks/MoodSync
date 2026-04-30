import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { useRoom } from '../context/RoomContext'

const SERVER = import.meta.env.VITE_SERVER_URL

export default function CreateRoom() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, setUser, tokens, setTokens, setIsHost, setRoomCode } = useRoom()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const userParam = searchParams.get('user')
    if (userParam) {
      try {
        const parsed = JSON.parse(decodeURIComponent(userParam))
        const { id, name, image, accessToken, refreshToken, tokenExpiry } = parsed
        setUser({ id, name, image })
        setTokens({ accessToken, refreshToken, tokenExpiry })
        setIsHost(true)
        return
      } catch {
        // fall through
      }
    }

    if (user) return
    navigate('/')
  }, [])

  async function handleCreateRoom() {
    setLoading(true)
    setError('')

    try {
      const res = await axios.post(`${SERVER}/api/rooms/create`, {}, {
        withCredentials: true,
        headers: {
          'x-access-token': tokens?.accessToken
        }
      })
      setRoomCode(res.data.roomCode)
      // pass host name in URL just like guests do
      navigate(`/room/${res.data.roomCode}?name=${encodeURIComponent(user.name)}`)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create room')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[#1DB954] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex flex-col items-center justify-center px-4">

      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold mb-2 text-white">
          Mood<span className="text-[#1DB954]">Sync</span>
        </h1>
        <p className="text-zinc-400">
          Logged in as{' '}
          <span className="text-white font-medium">{user.name}</span>
        </p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 w-full max-w-sm text-center">

        <div className="w-16 h-16 bg-[#1DB954]/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl">🎵</span>
        </div>

        <h2 className="text-xl font-semibold mb-2 text-white">Ready to host?</h2>
        <p className="text-zinc-400 text-sm mb-8">
          Create a room and share the code with your friends. Their mood shapes the music.
        </p>

        {error && (
          <p className="text-red-400 text-sm mb-4">{error}</p>
        )}

        <button
          onClick={handleCreateRoom}
          disabled={loading}
          className="w-full bg-[#1DB954] hover:bg-[#1ed760] disabled:opacity-50 text-black font-semibold py-4 rounded-full text-base transition-all duration-200"
        >
          {loading ? 'Creating...' : 'Create Room'}
        </button>

      </div>

    </div>
  )
}