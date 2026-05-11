import { useEffect, useState, useRef } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useRoom } from '../context/RoomContext'
import { useSocket } from '../hooks/useSocket'
import { useSpotify } from '../hooks/useSpotify'
import MoodCanvas from '../components/MoodCanvas'
import RoomUsers from '../components/RoomUsers'
import Queue from '../components/Queue'
import NowPlaying from '../components/NowPlaying'
import MoodPresets from '../components/MoodPresets'
import SpotifyConnect from '../components/SpotifyConnect'
import Player from '../components/Player'

export default function Room() {
  const { roomCode } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const {
    user,
    isHost,
    users,
    negotiatedMood,
    moodLabel,
    queue,
    nowPlaying,
    setRoomCode,
    setQueue
  } = useRoom()

  const {
    connect,
    disconnect,
    emitMoodUpdate,
    emitTrackQueued,
    emitVeto,
    emitNowPlaying,
    getSocketId
  } = useSocket()

  const { getPlayer, endRoom } = useSpotify()

  const [myMood, setMyMood] = useState({ x: 0.5, y: 0.5 })
  const [mySocketId, setMySocketId] = useState(null)
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCopied, setShowCopied] = useState(false)

  const playerPollRef = useRef(null)
  const queueRefillRef = useRef(null)
  const peakUsersRef = useRef(1)
  

  useEffect(() => {
    const name = searchParams.get('name') || user?.name

    // no name means invalid entry — redirect home
    if (!name) {
      navigate('/')
      return
    }

    setDisplayName(name)
    setRoomCode(roomCode)
    connect(roomCode, name, isHost)

    setTimeout(() => {
      setMySocketId(getSocketId())
    }, 1000)

    setLoading(false)

    return () => {
      disconnect()
      if (playerPollRef.current) clearInterval(playerPollRef.current)
      if (queueRefillRef.current) clearInterval(queueRefillRef.current)
    }
  }, [])

  useEffect(() => {
    if (users.length > peakUsersRef.current) {
      peakUsersRef.current = users.length
    }
  }, [users])

  useEffect(() => {
    if (!isHost) return

    async function pollPlayer() {
      const data = await getPlayer()
      if (data?.track) {
        emitNowPlaying(roomCode, data.track)
      }
    }

    pollPlayer()
    playerPollRef.current = setInterval(pollPlayer, 5000)

    return () => clearInterval(playerPollRef.current)
  }, [isHost])


  function handleTracksLoaded(tracks) {
    tracks.forEach(t => {
      setQueue(prev => {
        const exists = prev.find(q => q.id === t.id)
        if (exists) return prev
        return [...prev, t]
      })
    })
  }

  function handleMoodChange(newMood) {
    setMyMood(newMood)
    emitMoodUpdate(roomCode, newMood)
  }

  function handleVeto(track) {
    emitVeto(roomCode, track.id, track.name)
  }

  function handleCopyCode() {
    navigator.clipboard.writeText(roomCode)
    setShowCopied(true)
    setTimeout(() => setShowCopied(false), 2000)
  }

  async function handleEndRoom() {
    const result = await endRoom(peakUsersRef.current)
    if (result) {
      navigate(`/recap/${roomCode}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[#1DB954] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <p className="text-red-400">{error}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white flex flex-col">

      {/* header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
        <h1 className="text-xl font-bold">
          Mood<span className="text-[#1DB954]">Sync</span>
        </h1>

        <button
          onClick={handleCopyCode}
          className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-full text-sm transition-colors"
        >
          <span className="text-zinc-400">Room</span>
          <span className="font-mono font-bold tracking-widest text-white">{roomCode}</span>
          <span className="text-zinc-500 text-xs">{showCopied ? '✓ copied' : '⎘'}</span>
        </button>

        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-400 hidden sm:block">{moodLabel}</span>
          {isHost && (
            <button
              onClick={handleEndRoom}
              className="text-xs text-zinc-500 hover:text-red-400 transition-colors"
            >
              End Room
            </button>
          )}
        </div>
      </div>

      {/* now playing bar */}
            {isHost ? (
        <Player
          roomCode={roomCode}
          isHost={isHost}
          negotiatedMood={negotiatedMood}
          onTracksLoaded={handleTracksLoaded}
        />
      ) : (
        nowPlaying && <NowPlaying track={nowPlaying} />
      )}

      {/* main content */}
      <div className="flex flex-1 overflow-hidden">

        {/* left panel */}
        <div className="flex flex-col items-center justify-start p-6 flex-1">
          <p className="text-zinc-400 text-sm mb-4">
            Drag your dot to set your mood
          </p>

          <MoodCanvas
            myMood={myMood}
            users={users}
            negotiatedMood={negotiatedMood}
            onMoodChange={handleMoodChange}
            mySocketId={mySocketId}
          />

          <MoodPresets onSelect={handleMoodChange} />
          {!isHost && (
          <div className="mt-4 w-full max-w-xs">
            <SpotifyConnect
              displayName={displayName}
              onContributed={(data) => {
                console.log(`Pool updated: ${data.totalPoolSize} total tracks`)
              }}
            />
          </div>
        )}
        </div>

        {/* right panel */}
        <div className="w-80 border-l border-zinc-800 flex flex-col overflow-hidden">
          <RoomUsers users={users} mySocketId={mySocketId} />
          <Queue
            queue={queue}
            isHost={isHost}
            onVeto={handleVeto}
          />
        </div>

      </div>

    </div>
  )
}