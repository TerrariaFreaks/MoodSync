import { useCallback } from 'react'
import axios from 'axios'
import { useRoom } from '../context/RoomContext'

const SERVER = import.meta.env.VITE_SERVER_URL

export function useSpotify() {
  const { tokens, roomCode, vetoedTrackIds } = useRoom()

  const authHeaders = {
    'x-access-token': tokens?.accessToken
  }

  const getRecommendations = useCallback(async () => {
    try {
      const res = await axios.post(
        `${SERVER}/api/rooms/spotify/recommendations`,
        { roomCode, vetoedTrackIds },
        { withCredentials: true, headers: authHeaders }
      )
      return res.data.tracks
    } catch (err) {
      console.error('Failed to get recommendations:', err.message)
      return []
    }
  }, [roomCode, vetoedTrackIds, tokens])

  const addToQueue = useCallback(async (track) => {
    try {
      await axios.post(
        `${SERVER}/api/rooms/spotify/queue`,
        {
          trackUri: track.uri,
          trackId: track.id,
          trackName: track.name,
          trackArtist: track.artist,
          trackAlbumArt: track.albumArt,
          roomCode
        },
        { withCredentials: true, headers: authHeaders }
      )
      return true
    } catch (err) {
      console.error('Failed to add to queue:', err.message)
      return false
    }
  }, [roomCode, tokens])

  const searchTracks = useCallback(async (query) => {
    try {
      const res = await axios.get(
        `${SERVER}/api/rooms/spotify/search?q=${encodeURIComponent(query)}`,
        { withCredentials: true, headers: authHeaders }
      )
      return res.data.tracks
    } catch (err) {
      console.error('Search failed:', err.message)
      return []
    }
  }, [tokens])

  const getPlayer = useCallback(async () => {
    try {
      const res = await axios.get(
        `${SERVER}/api/rooms/spotify/player`,
        { withCredentials: true, headers: authHeaders }
      )
      return res.data
    } catch (err) {
      console.error('Failed to get player:', err.message)
      return null
    }
  }, [tokens])

  const endRoom = useCallback(async (peakUserCount) => {
    try {
      const res = await axios.post(
        `${SERVER}/api/rooms/${roomCode}/end`,
        { peakUserCount },
        { withCredentials: true, headers: authHeaders }
      )
      return res.data
    } catch (err) {
      console.error('Failed to end room:', err.message)
      return null
    }
  }, [roomCode, tokens])

  const setGenreLock = useCallback(async (genre) => {
    try {
      await axios.post(
        `${SERVER}/api/rooms/${roomCode}/genre-lock`,
        { genre },
        { withCredentials: true, headers: authHeaders }
      )
      return true
    } catch (err) {
      console.error('Failed to set genre lock:', err.message)
      return false
    }
  }, [roomCode, tokens])

  // ─────────────────────────────────────────────
  // contribute playlists to room pool
  // ─────────────────────────────────────────────
  const contributePlaylists = useCallback(async (displayName, accessToken) => {
    try {
      const headers = {
        'x-access-token': accessToken || tokens?.accessToken
      }

      const res = await axios.post(
        `${SERVER}/api/rooms/${roomCode}/contribute-playlists`,
        { displayName },
        { withCredentials: true, headers }
      )

      console.log(`Pool contribution: +${res.data.tracksAdded} tracks from ${displayName}`)
      return res.data

    } catch (err) {
      console.error('Failed to contribute playlists:', err.message)
      return null
    }
  }, [roomCode, tokens])

  const getPoolStats = useCallback(async () => {
    try {
      const res = await axios.get(
        `${SERVER}/api/rooms/${roomCode}/pool-stats`,
        { withCredentials: true, headers: authHeaders }
      )
      return res.data
    } catch (err) {
      console.error('Failed to get pool stats:', err.message)
      return null
    }
  }, [roomCode, tokens])

  return {
    getRecommendations,
    addToQueue,
    searchTracks,
    getPlayer,
    endRoom,
    setGenreLock,
    contributePlaylists,
    getPoolStats
  }
}