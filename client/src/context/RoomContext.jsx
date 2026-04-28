import { createContext, useContext, useState } from 'react'

const RoomContext = createContext(null)

export function RoomProvider({ children }) {
  const [user, setUser] = useState(null)
  const [tokens, setTokens] = useState(null)
  const [roomCode, setRoomCode] = useState(null)
  const [isHost, setIsHost] = useState(false)
  const [users, setUsers] = useState([])
  const [negotiatedMood, setNegotiatedMood] = useState({ x: 0.5, y: 0.5 })
  const [moodLabel, setMoodLabel] = useState('Chill')
  const [genreLock, setGenreLock] = useState(null)
  const [queue, setQueue] = useState([])
  const [nowPlaying, setNowPlaying] = useState(null)
  const [vetoedTrackIds, setVetoedTrackIds] = useState([])

  function addVeto(trackId) {
    setVetoedTrackIds(prev => [...new Set([...prev, trackId])])
  }

  function resetRoom() {
    setRoomCode(null)
    setIsHost(false)
    setUsers([])
    setNegotiatedMood({ x: 0.5, y: 0.5 })
    setMoodLabel('Chill')
    setGenreLock(null)
    setQueue([])
    setNowPlaying(null)
    setVetoedTrackIds([])
  }

  return (
    <RoomContext.Provider value={{
      user, setUser,
      tokens, setTokens,
      roomCode, setRoomCode,
      isHost, setIsHost,
      users, setUsers,
      negotiatedMood, setNegotiatedMood,
      moodLabel, setMoodLabel,
      genreLock, setGenreLock,
      queue, setQueue,
      nowPlaying, setNowPlaying,
      vetoedTrackIds, addVeto,
      resetRoom
    }}>
      {children}
    </RoomContext.Provider>
  )
}

export function useRoom() {
  const ctx = useContext(RoomContext)
  if (!ctx) throw new Error('useRoom must be used inside RoomProvider')
  return ctx
}