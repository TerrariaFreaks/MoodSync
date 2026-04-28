import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useRoom } from '../context/RoomContext'

const SERVER = import.meta.env.VITE_SERVER_URL

export default function Callback() {
  const navigate = useNavigate()
  const { setUser, setIsHost } = useRoom()

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await axios.get(`${SERVER}/api/spotify/me`, {
          withCredentials: true
        })
        setUser(res.data.user)
        setIsHost(true)
        navigate('/create-room')
      } catch {
        navigate('/?error=auth_failed')
      }
    }
    fetchUser()
  }, [])

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-[#1DB954] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-zinc-400">Connecting to Spotify...</p>
      </div>
    </div>
  )
}