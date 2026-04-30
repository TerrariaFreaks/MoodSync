import { useRef, useCallback } from 'react'
import { io } from 'socket.io-client'
import { useRoom } from '../context/RoomContext'

const SERVER = import.meta.env.VITE_SERVER_URL

export function useSocket() {
  const socketRef = useRef(null)
  const {
    setUsers,
    setNegotiatedMood,
    setMoodLabel,
    setGenreLock,
    setQueue,
    setNowPlaying,
    addVeto
  } = useRoom()

  function connect(roomCode, displayName, isHost) {
    if (socketRef.current?.connected) return

    socketRef.current = io(SERVER, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    })

    const socket = socketRef.current

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id)
      socket.emit('join_room', { roomCode, displayName, isHost })
    })

    socket.on('room_state', (data) => {
      console.log('room_state received:', data)
      setUsers(data.users)
      setNegotiatedMood(data.negotiatedMood)
      setMoodLabel(data.moodLabel)
      setGenreLock(data.genreLock)
    })

    socket.on('user_joined', (data) => {
      console.log('user_joined:', data)
      setUsers(prev => {
        const exists = prev.find(u => u.socketId === data.socketId)
        if (exists) return prev
        return [...prev, {
          socketId: data.socketId,
          displayName: data.displayName,
          isHost: data.isHost,
          mood: data.mood
        }]
      })
    })

    socket.on('user_left', (data) => {
      console.log('user_left:', data)
      setUsers(prev => prev.filter(u => u.socketId !== data.socketId))
    })

    socket.on('mood_changed', (data) => {
      if (data.socketId) {
        setUsers(prev => prev.map(u =>
          u.socketId === data.socketId
            ? { ...u, mood: data.userMood }
            : u
        ))
      }
      setNegotiatedMood(data.negotiatedMood)
      setMoodLabel(data.moodLabel)
    })

    socket.on('queue_updated', (data) => {
      setQueue(prev => [...prev, data.track])
    })

    socket.on('track_vetoed', (data) => {
      setQueue(prev => prev.filter(t => t.id !== data.trackId))
      addVeto(data.trackId)
    })

    socket.on('now_playing_updated', (data) => {
      setNowPlaying(data.track)
      setQueue(prev => prev.filter(t => t.id !== data.track?.id))
    })

    socket.on('genre_lock_changed', (data) => {
      setGenreLock(data.genre)
    })

    socket.on('host_disconnected', (data) => {
      console.warn(data.message)
    })

    socket.on('error', (data) => {
      console.error('Socket error:', data.message)
    })

    socket.on('disconnect', () => {
      console.log('Socket disconnected')
    })
  }

  const emitMoodUpdate = useCallback((roomCode, mood) => {
    socketRef.current?.emit('mood_update', { roomCode, mood })
  }, [])

  const emitTrackQueued = useCallback((roomCode, track) => {
    socketRef.current?.emit('track_queued', { roomCode, track })
  }, [])

  const emitVeto = useCallback((roomCode, trackId, trackName) => {
    socketRef.current?.emit('veto_track', { roomCode, trackId, trackName })
  }, [])

  const emitNowPlaying = useCallback((roomCode, track) => {
    socketRef.current?.emit('now_playing', { roomCode, track })
  }, [])

  const emitGenreLock = useCallback((roomCode, genre) => {
    socketRef.current?.emit('genre_lock_updated', { roomCode, genre })
  }, [])

  function disconnect() {
    socketRef.current?.disconnect()
    socketRef.current = null
  }

  function getSocketId() {
    return socketRef.current?.id || null
  }

  return {
    connect,
    disconnect,
    emitMoodUpdate,
    emitTrackQueued,
    emitVeto,
    emitNowPlaying,
    emitGenreLock,
    getSocketId,
    socket: socketRef.current
  }
}