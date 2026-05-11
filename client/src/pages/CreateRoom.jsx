import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { useRoom } from '../context/RoomContext'
import { useSpotify } from '../hooks/useSpotify'

const SERVER = import.meta.env.VITE_SERVER_URL

export default function CreateRoom() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, setUser, tokens, setTokens, setIsHost, setRoomCode, roomCode } = useRoom()
  const { contributePlaylists } = useSpotify()
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState('')
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
      // step 1 — create the room
      setLoadingStep('Creating room...')
      const res = await axios.post(`${SERVER}/api/rooms/create`, {}, {
        withCredentials: true,
        headers: { 'x-access-token': tokens?.accessToken }
      })

      const newRoomCode = res.data.roomCode
      setRoomCode(newRoomCode)

      // step 2 — contribute host playlists to pool
      setLoadingStep('Loading your music...')
      try {
        const contribution = await axios.post(
          `${SERVER}/api/rooms/${newRoomCode}/contribute-playlists`,
          { displayName: user.name },
          {
            withCredentials: true,
            headers: { 'x-access-token': tokens?.accessToken }
          }
        )
        console.log(`Host contributed ${contribution.data.tracksAdded} tracks`)
      } catch (playlistErr) {
        // non fatal — room still works without pool
        console.error('Playlist contribution failed:', playlistErr.message)
      }

      // step 3 — navigate to room
      navigate(`/room/${newRoomCode}?name=${encodeURIComponent(user.name)}`)

    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create room')
    } finally {
      setLoading(false)
      setLoadingStep('')
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
        <p className="text-zinc-400 text-sm mb-2">
          Create a room and share the code with your friends.
        </p>
        <p className="text-zinc-600 text-xs mb-8">
          Your playlists will be used to build a shared music pool.
        </p>

        {error && (
          <p className="text-red-400 text-sm mb-4">{error}</p>
        )}

        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-[#1DB954] border-t-transparent rounded-full animate-spin" />
            <p className="text-zinc-400 text-sm">{loadingStep}</p>
          </div>
        ) : (
          <button
            onClick={handleCreateRoom}
            className="w-full bg-[#1DB954] hover:bg-[#1ed760] text-black font-semibold py-4 rounded-full text-base transition-all duration-200"
          >
            Create Room
          </button>
        )}

      </div>

    </div>
  )
}