import { useState } from 'react'
import axios from 'axios'
import { useRoom } from '../context/RoomContext'

const SERVER = import.meta.env.VITE_SERVER_URL

export default function SpotifyConnect({ displayName, onContributed }) {
  const { roomCode } = useRoom()
  const [step, setStep] = useState('idle') // idle | connecting | contributing | done | error
  const [tracksAdded, setTracksAdded] = useState(0)
  const [error, setError] = useState('')

  function handleConnect() {
    setStep('connecting')

    const width = 500
    const height = 700
    const left = window.screenX + (window.outerWidth - width) / 2
    const top = window.screenY + (window.outerHeight - height) / 2

    const popup = window.open(
      `${SERVER}/api/spotify/guest-login`,
      'spotify-auth',
      `width=${width},height=${height},left=${left},top=${top}`
    )

    const handleMessage = async (event) => {
      if (event.origin !== window.location.origin) return
      if (event.data?.type !== 'SPOTIFY_TOKEN') return

      window.removeEventListener('message', handleMessage)
      popup?.close()

      const { accessToken } = event.data

      if (!accessToken) {
        setStep('error')
        setError('Failed to get Spotify token')
        return
      }

      setStep('contributing')

      try {
        const res = await axios.post(
          `${SERVER}/api/rooms/${roomCode}/contribute-playlists`,
          { displayName },
          {
            withCredentials: true,
            headers: { 'x-access-token': accessToken }
          }
        )

        setTracksAdded(res.data.tracksAdded || 0)
        setStep('done')
        onContributed?.(res.data)

      } catch (err) {
        console.error('Contribution failed:', err.message)
        setStep('error')
        setError('Failed to load playlists')
      }
    }

    window.addEventListener('message', handleMessage)

    const checkClosed = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkClosed)
        window.removeEventListener('message', handleMessage)
        if (step === 'connecting') setStep('idle')
      }
    }, 1000)
  }

  if (step === 'done') {
    return (
      <div className="flex items-center gap-2 bg-[#1DB954]/10 border border-[#1DB954]/30 rounded-xl px-4 py-3">
        <span className="text-[#1DB954] text-lg">✓</span>
        <div>
          <p className="text-[#1DB954] text-sm font-medium">Playlists connected</p>
          <p className="text-zinc-500 text-xs">+{tracksAdded} tracks added to the pool</p>
        </div>
      </div>
    )
  }

  if (step === 'contributing') {
    return (
      <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
        <div className="w-4 h-4 border-2 border-[#1DB954] border-t-transparent rounded-full animate-spin flex-shrink-0" />
        <p className="text-zinc-400 text-sm">Loading your playlists...</p>
      </div>
    )
  }

  if (step === 'error') {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-red-400 text-xs text-center">{error}</p>
        <button
          onClick={() => { setStep('idle'); setError('') }}
          className="text-zinc-500 hover:text-white text-xs transition-colors"
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={handleConnect}
      disabled={step === 'connecting'}
      className="w-full flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-[#1DB954]/50 disabled:opacity-50 rounded-xl px-4 py-3 transition-all duration-200 group"
    >
      {step === 'connecting' ? (
        <>
          <div className="w-4 h-4 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-zinc-400 text-sm">Connecting...</span>
        </>
      ) : (
        <>
          <svg className="w-4 h-4 text-[#1DB954]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
          </svg>
          <span className="text-zinc-300 text-sm group-hover:text-white transition-colors">
            Add your Spotify playlists
          </span>
        </>
      )}
    </button>
  )
}