import axios from 'axios'
import Room from '../models/Room.js'
import {
  negotiateMood,
  applyMomentum,
  buildSpotifyParams,
  filterVetoed
} from '../utils/moodEngine.js'

// ─────────────────────────────────────────────
// helper — always get a fresh valid token
// ─────────────────────────────────────────────

async function getValidToken(req) {
  if (!req.session.accessToken) {
    throw new Error('No access token in session')
  }

  // refresh if token is within 5 minutes of expiry
  if (Date.now() > req.session.tokenExpiry - 5 * 60 * 1000) {
    const credentials = Buffer.from(
      `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
    ).toString('base64')

    const response = await axios.post(
      'https://accounts.spotify.com/api/token',
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: req.session.refreshToken
      }),
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    )

    req.session.accessToken = response.data.access_token
    req.session.tokenExpiry = Date.now() + response.data.expires_in * 1000
  }

  return req.session.accessToken
}

// ─────────────────────────────────────────────
// POST /api/spotify/recommendations
// called internally when queue needs refilling
// ─────────────────────────────────────────────

export async function getRecommendations(req, res) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const { roomCode, vetoedTrackIds = [] } = req.body

    const room = await Room.findOne({
      roomCode: roomCode.toUpperCase(),
      isActive: true
    })

    if (!room) {
      return res.status(404).json({ error: 'Room not found' })
    }

    const token = await getValidToken(req)
    const params = buildSpotifyParams(
      room.negotiatedMood,
      room.genreLock,
      vetoedTrackIds
    )

    const response = await axios.get(
      'https://api.spotify.com/v1/recommendations',
      {
        headers: { Authorization: `Bearer ${token}` },
        params
      }
    )

    let tracks = response.data.tracks.map(track => ({
      id: track.id,
      name: track.name,
      artist: track.artists.map(a => a.name).join(', '),
      albumArt: track.album.images?.[0]?.url || null,
      uri: track.uri,
      duration_ms: track.duration_ms,
      preview_url: track.preview_url
    }))

    // filter vetoed tracks
    tracks = filterVetoed(tracks, vetoedTrackIds)

    res.json({ tracks, mood: room.negotiatedMood })

  } catch (err) {
    console.error('Recommendations error:', err.message)
    res.status(500).json({ error: 'Failed to get recommendations' })
  }
}

// ─────────────────────────────────────────────
// POST /api/spotify/queue
// adds a single track to host spotify queue
// ─────────────────────────────────────────────

export async function addToQueue(req, res) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const { trackUri, roomCode } = req.body

    if (!trackUri) {
      return res.status(400).json({ error: 'trackUri is required' })
    }

    const token = await getValidToken(req)

    await axios.post(
      `https://api.spotify.com/v1/me/player/queue?uri=${encodeURIComponent(trackUri)}`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    )

    // save track to room history
    if (roomCode) {
      const room = await Room.findOne({
        roomCode: roomCode.toUpperCase(),
        isActive: true
      })

      if (room) {
        // extract track info from request body
        const { trackName, trackArtist, trackAlbumArt, trackId } = req.body

        room.trackHistory.push({
          spotifyId: trackId,
          name: trackName,
          artist: trackArtist,
          albumArt: trackAlbumArt,
          uri: trackUri,
          playedAt: new Date(),
          roomMoodAtPlay: { ...room.negotiatedMood }
        })

        await room.save()
      }
    }

    res.json({ success: true })

  } catch (err) {
    console.error('Add to queue error:', err.message)

    // spotify returns 404 if no active device
    if (err.response?.status === 404) {
      return res.status(404).json({
        error: 'No active Spotify device found. Open Spotify and play something first.'
      })
    }

    // premium required error
    if (err.response?.status === 403) {
      return res.status(403).json({
        error: 'Spotify Premium is required to control the queue.'
      })
    }

    res.status(500).json({ error: 'Failed to add track to queue' })
  }
}

// ─────────────────────────────────────────────
// GET /api/spotify/search?q=query
// search for a specific track (host manual add)
// ─────────────────────────────────────────────

export async function searchTracks(req, res) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const { q } = req.query

    if (!q) {
      return res.status(400).json({ error: 'Query is required' })
    }

    const token = await getValidToken(req)

    const response = await axios.get('https://api.spotify.com/v1/search', {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        q,
        type: 'track',
        limit: 8
      }
    })

    const tracks = response.data.tracks.items.map(track => ({
      id: track.id,
      name: track.name,
      artist: track.artists.map(a => a.name).join(', '),
      albumArt: track.album.images?.[0]?.url || null,
      uri: track.uri,
      duration_ms: track.duration_ms,
      preview_url: track.preview_url
    }))

    res.json({ tracks })

  } catch (err) {
    console.error('Search error:', err.message)
    res.status(500).json({ error: 'Failed to search tracks' })
  }
}

// ─────────────────────────────────────────────
// GET /api/spotify/player
// get current playback state
// ─────────────────────────────────────────────

export async function getPlayer(req, res) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const token = await getValidToken(req)

    const response = await axios.get('https://api.spotify.com/v1/me/player', {
      headers: { Authorization: `Bearer ${token}` }
    })

    // 204 means no active player
    if (response.status === 204 || !response.data) {
      return res.json({ isPlaying: false, track: null })
    }

    const { item, is_playing } = response.data

    res.json({
      isPlaying: is_playing,
      track: item ? {
        id: item.id,
        name: item.name,
        artist: item.artists.map(a => a.name).join(', '),
        albumArt: item.album.images?.[0]?.url || null,
        uri: item.uri,
        duration_ms: item.duration_ms,
        progress_ms: response.data.progress_ms
      } : null
    })

  } catch (err) {
    console.error('Player error:', err.message)
    res.status(500).json({ error: 'Failed to get player state' })
  }
}