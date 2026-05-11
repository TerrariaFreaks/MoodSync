import { useEffect, useRef, useState, useCallback } from 'react'
import { useRoom } from '../context/RoomContext'
import { usePlayer } from '../hooks/usePlayer'
import { useSpotify } from '../hooks/useSpotify'
import { useSocket } from '../hooks/useSocket'
import { getQuadrant } from '../utils/moodMapping'

export default function Player({ roomCode, isHost, negotiatedMood, onTracksLoaded }) {
  const { queue, setQueue, vetoedTrackIds } = useRoom()
  const {
    deviceId,
    isReady,
    isPlaying,
    currentTrack,
    position,
    duration,
    error,
    transferPlayback,
    playTracks,
    pause,
    resume,
    skipNext,
    setVolume
  } = usePlayer()

  const { getRecommendations } = useSpotify()
  const { emitNowPlaying, emitTrackQueued } = useSocket()

  const [volume, setVolumeState] = useState(0.8)
  const [trackList, setTrackList] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [transferred, setTransferred] = useState(false)
  const [loading, setLoading] = useState(false)
  const prevTrackId = useRef(null)
  const lastQuadrantRef = useRef(null)

  // ─────────────────────────────────────────────
  // step 1 — when player is ready transfer playback
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!isReady || !isHost || transferred) return

    async function init() {
      await transferPlayback()
      setTransferred(true)
    }

    init()
  }, [isReady, isHost])

  // ─────────────────────────────────────────────
  // step 2 — once transferred fetch tracks and start playing
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!transferred || !isHost) return

    async function startSession() {
      setLoading(true)
      const tracks = await getRecommendations()
      if (!tracks.length) {
        setLoading(false)
        return
      }

      const limited = tracks.slice(0, 10)
      setTrackList(limited)
      setCurrentIndex(0)
      onTracksLoaded?.(limited)
      limited.forEach(t => emitTrackQueued(roomCode, t))

      // play only the first track
      await playTracks([limited[0].uri])
      setLoading(false)
    }

    startSession()
  }, [transferred])

  // ─────────────────────────────────────────────
  // step 3 — when currentIndex changes play that track
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!transferred || !isHost) return
    if (currentIndex === 0) return // handled by startSession
    if (!trackList[currentIndex]) return

    const nextTrack = trackList[currentIndex]
    console.log(`Playing next track: ${nextTrack.name}`)
    playTracks([nextTrack.uri])
    emitNowPlaying(roomCode, nextTrack)
    setQueue(prev => prev.filter(t => t.id !== nextTrack.id))

  }, [currentIndex])

  // ─────────────────────────────────────────────
  // step 4 — detect track end and advance index
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!currentTrack) return
    if (currentTrack.id === prevTrackId.current) return

    prevTrackId.current = currentTrack.id

    // only broadcast if playing first track
    // subsequent tracks are handled by currentIndex effect
    if (currentIndex === 0) {
      emitNowPlaying(roomCode, currentTrack)
      setQueue(prev => prev.filter(t => t.id !== currentTrack.id))
    }
  }, [currentTrack?.id])

  // ─────────────────────────────────────────────
  // detect track ended via state change
  // ─────────────────────────────────────────────
  const { isPlaying: sdkIsPlaying } = usePlayer()

  useEffect(() => {
    // we use usePlayer's internal state change
    // track ended when paused at position 0 with previous tracks
  }, [])

  // listen for track end via position — when position resets
  const lastPositionRef = useRef(0)
  useEffect(() => {
    if (position > 1000) {
      lastPositionRef.current = position
    }

    // track ended — position reset to near 0 after being > 1000ms
    if (
      position < 500 &&
      lastPositionRef.current > 5000 &&
      !isPlaying &&
      transferred
    ) {
      console.log('Track ended detected — advancing to next')
      lastPositionRef.current = 0
      setCurrentIndex(prev => prev + 1)
    }
  }, [position, isPlaying])

  // ─────────────────────────────────────────────
  // step 5 — refill when running low
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!isHost || !transferred) return

    const tracksRemaining = trackList.length - currentIndex
    if (tracksRemaining > 3) return

    async function refill() {
      const newTracks = await getRecommendations()
      if (!newTracks.length) return

      const existingIds = new Set(trackList.map(t => t.id))
      const fresh = newTracks.filter(t => !existingIds.has(t.id)).slice(0, 10)

      if (fresh.length === 0) return

      const updatedList = [...trackList, ...fresh]
      setTrackList(updatedList)

      onTracksLoaded?.(fresh)
      fresh.forEach(t => emitTrackQueued(roomCode, t))
    }

    refill()
  }, [currentIndex, isHost, transferred])

  // ─────────────────────────────────────────────
  // step 6 — refresh on mood quadrant change
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!isHost || !transferred || !negotiatedMood) return

    const currentQuadrant = getQuadrant(negotiatedMood.x, negotiatedMood.y)
    if (currentQuadrant === lastQuadrantRef.current) return

    lastQuadrantRef.current = currentQuadrant
    console.log(`Mood shifted to ${currentQuadrant} — refreshing upcoming tracks`)

    async function refreshOnMoodChange() {
      const newTracks = await getRecommendations()
      if (!newTracks.length) return

      const played = trackList.slice(0, currentIndex + 1)
      const updated = [...played, ...newTracks.slice(0, 10)]

      setTrackList(updated)
      onTracksLoaded?.(newTracks.slice(0, 10))
      newTracks.slice(0, 5).forEach(t => emitTrackQueued(roomCode, t))
    }

    refreshOnMoodChange()
  }, [negotiatedMood, isHost, transferred])

  // ─────────────────────────────────────────────
  // volume change
  // ─────────────────────────────────────────────
  async function handleVolumeChange(e) {
    const vol = parseFloat(e.target.value)
    setVolumeState(vol)
    await setVolume(vol)
  }

  function formatTime(ms) {
    if (!ms) return '0:00'
    const mins = Math.floor(ms / 60000)
    const secs = Math.floor((ms % 60000) / 1000)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!isHost) return null

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-800 px-4 py-3 text-red-400 text-sm text-center">
        {error}
      </div>
    )
  }

  if (!isReady) {
    return (
      <div className="bg-zinc-900 border-b border-zinc-800 px-6 py-3 flex items-center gap-3">
        <div className="w-4 h-4 border-2 border-[#1DB954] border-t-transparent rounded-full animate-spin" />
        <span className="text-zinc-400 text-sm">Connecting MoodSync Player...</span>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-zinc-900 border-b border-zinc-800 px-6 py-3 flex items-center gap-3">
        <div className="w-4 h-4 border-2 border-[#1DB954] border-t-transparent rounded-full animate-spin" />
        <span className="text-zinc-400 text-sm">Loading tracks...</span>
      </div>
    )
  }

  if (!currentTrack) {
    return (
      <div className="bg-zinc-900 border-b border-zinc-800 px-6 py-3 text-center">
        <span className="text-zinc-500 text-sm">Waiting for playback to start...</span>
      </div>
    )
  }

  const progressPercent = duration ? Math.min((position / duration) * 100, 100) : 0

  return (
    <div className="bg-zinc-900 border-b border-zinc-800 px-6 py-3">
      <div className="flex items-center gap-4">

        {/* album art */}
        <div className="w-12 h-12 rounded flex-shrink-0 overflow-hidden bg-zinc-800">
          {currentTrack.albumArt ? (
            <img
              src={currentTrack.albumArt}
              alt={currentTrack.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-500 text-xl">♪</div>
          )}
        </div>

        {/* track info + progress */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{currentTrack.name}</p>
              <p className="text-xs text-zinc-400 truncate">{currentTrack.artist}</p>
            </div>
            <span className="text-xs text-zinc-500 flex-shrink-0 ml-4">
              {formatTime(position)} / {formatTime(duration)}
            </span>
          </div>

          <div className="w-full h-1 bg-zinc-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#1DB954] rounded-full transition-all duration-1000"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* controls */}
        <div className="flex items-center gap-3 flex-shrink-0">

          <button
            onClick={isPlaying ? pause : resume}
            className="w-9 h-9 bg-white rounded-full flex items-center justify-center hover:scale-105 transition-transform"
          >
            {isPlaying ? (
              <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
              </svg>
            ) : (
              <svg className="w-4 h-4 text-black ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            )}
          </button>

          <button
            onClick={() => setCurrentIndex(prev => prev + 1)}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 18l8.5-6L6 6v12zm2-8.14L11.03 12 8 14.14V9.86zM16 6h2v12h-2z"/>
            </svg>
          </button>

          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-zinc-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
            </svg>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={handleVolumeChange}
              className="w-20 accent-[#1DB954]"
            />
          </div>

        </div>

      </div>
    </div>
  )
}