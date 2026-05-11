import { useState, useEffect, useRef, useCallback } from 'react'
import { useRoom } from '../context/RoomContext'

export function usePlayer() {
  const { tokens } = useRoom()
  const [deviceId, setDeviceId] = useState(null)
  const [isReady, setIsReady] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTrack, setCurrentTrack] = useState(null)
  const [position, setPosition] = useState(0)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState(null)
  const playerRef = useRef(null)
  const positionIntervalRef = useRef(null)

  useEffect(() => {
    if (!tokens?.accessToken) return

    if (window.Spotify) {
        // SDK already loaded — init directly
        initPlayer()
        return
    }

    // load spotify sdk script
    const script = document.createElement('script')
    script.src = 'https://sdk.scdn.co/spotify-player.js'
    script.async = true
    document.body.appendChild(script)

    window.onSpotifyWebPlaybackSDKReady = () => {
      const player = new window.Spotify.Player({
        name: 'MoodSync Player',
        getOAuthToken: cb => cb(tokens.accessToken),
        volume: 0.8
      })

      // ready
      player.addListener('ready', ({ device_id }) => {
        console.log('MoodSync Player ready with device ID:', device_id)
        setDeviceId(device_id)
        setIsReady(true)
      })

      // not ready
      player.addListener('not_ready', ({ device_id }) => {
        console.log('MoodSync Player offline:', device_id)
        setIsReady(false)
      })

      // player state changed
      player.addListener('player_state_changed', (state) => {
        if (!state) return

        const track = state.track_window?.current_track
        if (track) {
          setCurrentTrack({
            id: track.id,
            name: track.name,
            artist: track.artists?.map(a => a.name).join(', '),
            albumArt: track.album?.images?.[0]?.url || null,
            uri: track.uri,
            duration_ms: state.duration
          })
        }

        setIsPlaying(!state.paused)
        setPosition(state.position)
        setDuration(state.duration)

        // track ended — position resets to 0 and paused
        if (state.paused && state.position === 0 && state.track_window?.previous_tracks?.length > 0) {
          console.log('Track ended')
        }
      })

      // errors
      player.addListener('initialization_error', ({ message }) => {
        console.error('Init error:', message)
        setError('Failed to initialize player')
      })

      player.addListener('authentication_error', ({ message }) => {
        console.error('Auth error:', message)
        setError('Authentication failed')
      })

      player.addListener('account_error', ({ message }) => {
        console.error('Account error:', message)
        setError('Spotify Premium required')
      })

      player.connect().then(success => {
        if (success) {
          console.log('MoodSync Player connected to Spotify')
        }
      })

      playerRef.current = player
    }

    return () => {
      playerRef.current?.disconnect()
      document.body.removeChild(script)
      if (positionIntervalRef.current) clearInterval(positionIntervalRef.current)
    }
  }, [tokens?.accessToken])

  // track position locally between state updates
  useEffect(() => {
    if (isPlaying) {
      positionIntervalRef.current = setInterval(() => {
        setPosition(prev => Math.min(prev + 1000, duration))
      }, 1000)
    } else {
      clearInterval(positionIntervalRef.current)
    }
    return () => clearInterval(positionIntervalRef.current)
  }, [isPlaying, duration])

  // transfer playback to MoodSync Player
  const transferPlayback = useCallback(async () => {
    if (!deviceId || !tokens?.accessToken) return

    try {
      await fetch('https://api.spotify.com/v1/me/player', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          device_ids: [deviceId],
          play: false
        })
      })
      console.log('Playback transferred to MoodSync Player')
    } catch (err) {
      console.error('Transfer playback error:', err)
    }
  }, [deviceId, tokens?.accessToken])

  // play a list of tracks
  const playTracks = useCallback(async (uris, offsetIndex = 0) => {
    if (!deviceId || !tokens?.accessToken) return
    if (!uris || uris.length === 0) return

    try {
      await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          uris,
          offset: { position: offsetIndex }
        })
      })
    } catch (err) {
      console.error('Play tracks error:', err)
    }
  }, [deviceId, tokens?.accessToken])

  // play a single track
  const playTrack = useCallback(async (uri) => {
    await playTracks([uri])
  }, [playTracks])

  // pause
  const pause = useCallback(async () => {
    await playerRef.current?.pause()
  }, [])

  // resume
  const resume = useCallback(async () => {
    await playerRef.current?.resume()
  }, [])

  // skip to next
  const skipNext = useCallback(async () => {
    await playerRef.current?.nextTrack()
  }, [])

  // set volume 0-1
  const setVolume = useCallback(async (vol) => {
    await playerRef.current?.setVolume(vol)
  }, [])

  // seek to position in ms
  const seek = useCallback(async (positionMs) => {
    await playerRef.current?.seek(positionMs)
  }, [])

  return {
    deviceId,
    isReady,
    isPlaying,
    currentTrack,
    position,
    duration,
    error,
    transferPlayback,
    playTracks,
    playTrack,
    pause,
    resume,
    skipNext,
    setVolume,
    seek
  }
}