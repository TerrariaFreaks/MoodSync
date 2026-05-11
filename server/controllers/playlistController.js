import axios from 'axios'
import Room from '../models/Room.js'

// ─────────────────────────────────────────────
// mood heuristic — tag playlists and tracks
// based on playlist name keywords
// ─────────────────────────────────────────────

const MOOD_KEYWORDS = {
  hype: [
    'party', 'hype', 'lit', 'dance', 'club', 'banger',
    'turn up', 'energy', 'pump', 'hype', 'trap', 'edm',
    'rave', 'festival', 'workout', 'gym', 'run', 'cardio'
  ],
  intense: [
    'metal', 'rock', 'rage', 'angry', 'aggressive', 'hard',
    'punk', 'grunge', 'heavy', 'dark', 'brutal', 'intense',
    'beast mode', 'war', 'fire'
  ],
  chill: [
    'chill', 'lofi', 'lo-fi', 'relax', 'calm', 'study',
    'focus', 'coffee', 'morning', 'sunday', 'acoustic',
    'mellow', 'soft', 'easy', 'background', 'sleep', 'ambient',
    'peaceful', 'quiet', 'slow'
  ],
  melancholic: [
    'sad', 'melancholy', 'heartbreak', 'cry', 'emotional',
    'feels', 'night', 'late night', 'alone', 'lonely',
    'depression', 'blue', 'gloomy', 'rainy', 'nostalgia',
    'missing', 'lost', 'hurt', 'pain', 'breakup'
  ]
}

function tagFromPlaylistName(name) {
  if (!name) return []
  const lower = name.toLowerCase()
  const tags = []

  for (const [mood, keywords] of Object.entries(MOOD_KEYWORDS)) {
    if (keywords.some(k => lower.includes(k))) {
      tags.push(mood)
    }
  }

  // if no tags found default to all moods — generic playlist
  return tags.length > 0 ? tags : ['hype', 'chill', 'intense', 'melancholic']
}

// ─────────────────────────────────────────────
// get valid token from session or header
// ─────────────────────────────────────────────

async function getValidToken(req) {
  const tokenFromHeader = req.headers['x-access-token']

  if (!req.session.accessToken && !tokenFromHeader) {
    throw new Error('No access token available')
  }

  if (!req.session.accessToken && tokenFromHeader) {
    return tokenFromHeader
  }

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
// fetch playlists for a user
// returns top 5 playlists with up to 50 tracks each
// ─────────────────────────────────────────────

async function fetchUserPlaylists(token, displayName) {
  // get user's spotify id first
  const meRes = await axios.get('https://api.spotify.com/v1/me', {
    headers: { Authorization: `Bearer ${token}` }
  })
  const userId = meRes.data.id
  console.log(`Spotify user ID: ${userId}`)

  // get playlists
  const playlistRes = await axios.get('https://api.spotify.com/v1/me/playlists', {
    headers: { Authorization: `Bearer ${token}` },
    params: { limit: 20 }
  })

  const playlists = playlistRes.data.items
  console.log(`Found ${playlists?.length} playlists for ${displayName}`)

  if (!playlists || playlists.length === 0) return []

  // only owned or collaborative playlists
  const ownedPlaylists = playlists
    .filter(p => p &&
      (p.items?.total > 0 || p.tracks?.total > 0) &&
      (p.owner?.id === userId || p.collaborative)
    )
    .sort((a, b) =>
      (b.items?.total || b.tracks?.total || 0) -
      (a.items?.total || a.tracks?.total || 0)
    )
    .slice(0, 5)

  console.log(`Owned playlists:`, ownedPlaylists.map(p =>
    `${p.name} (${p.items?.total || p.tracks?.total || 0} tracks)`
  ))

  const allTracks = []

  // fetch tracks from owned playlists
  for (const playlist of ownedPlaylists) {
    try {
      const moodTags = tagFromPlaylistName(playlist.name)

      const tracksRes = await axios.get(
        `https://api.spotify.com/v1/playlists/${playlist.id}/tracks`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { limit: 50 }
        }
      )

      const tracks = tracksRes.data.items
        .filter(item => item?.track && item.track.id && item.track.uri)
        .map(item => ({
          spotifyId: item.track.id,
          name: item.track.name,
          artist: item.track.artists?.map(a => a.name).join(', ') || 'Unknown',
          uri: item.track.uri,
          albumArt: item.track.album?.images?.[0]?.url || null,
          moodTags,
          contributedBy: displayName
        }))

      console.log(`${playlist.name}: ${tracks.length} tracks added`)
      allTracks.push(...tracks)

    } catch (err) {
      console.error(`Failed to fetch tracks for playlist ${playlist.name}:`,
        err.response?.data || err.message)
    }
  }

  // fetch liked songs — always works with user-library-read scope
  try {
    const likedRes = await axios.get('https://api.spotify.com/v1/me/tracks', {
      headers: { Authorization: `Bearer ${token}` },
      params: { limit: 50 }
    })

    const likedTracks = likedRes.data.items
      .filter(item => item?.track && item.track.id && item.track.uri)
      .map(item => ({
        spotifyId: item.track.id,
        name: item.track.name,
        artist: item.track.artists?.map(a => a.name).join(', ') || 'Unknown',
        uri: item.track.uri,
        albumArt: item.track.album?.images?.[0]?.url || null,
        moodTags: ['hype', 'chill', 'intense', 'melancholic'],
        contributedBy: displayName
      }))

    console.log(`Liked songs: ${likedTracks.length} tracks added`)
    allTracks.push(...likedTracks)

  } catch (err) {
    console.error('Failed to fetch liked songs:', err.response?.data || err.message)
  }

  return allTracks
}

// ─────────────────────────────────────────────
// POST /api/rooms/:roomCode/contribute-playlists
// any user with a spotify token can call this
// ─────────────────────────────────────────────

export async function contributePlaylists(req, res) {
  const tokenFromHeader = req.headers['x-access-token']

  if (!req.session.user && !tokenFromHeader) {
    return res.status(401).json({ error: 'Spotify connection required to contribute playlists' })
  }

  try {
    const { roomCode } = req.params
    const { displayName } = req.body

    const room = await Room.findOne({
      roomCode: roomCode.toUpperCase(),
      isActive: true
    })

    if (!room) {
      return res.status(404).json({ error: 'Room not found' })
    }

    const token = await getValidToken(req)
    const name = displayName || req.session.user?.name || 'Someone'

    console.log(`Fetching playlists for ${name}...`)

    const tracks = await fetchUserPlaylists(token, name)
    console.log(`Fetched ${tracks.length} tracks from playlists`)

    if (tracks.length === 0) {
      return res.json({
        success: true,
        message: 'No tracks found in playlists',
        tracksAdded: 0
      })
    }

    // deduplicate — don't add tracks already in the pool
    const existingIds = new Set(room.trackPool.map(t => t.spotifyId))
    const newTracks = tracks.filter(t => !existingIds.has(t.spotifyId))

    room.trackPool.push(...newTracks)
    await room.save()

    console.log(`Added ${newTracks.length} tracks from ${name}'s playlists to room ${roomCode}`)

    res.json({
      success: true,
      tracksAdded: newTracks.length,
      totalPoolSize: room.trackPool.length,
      contributor: name
    })

  } catch (err) {
    console.error('Contribute playlists error:', err.message)
    res.status(500).json({ error: 'Failed to fetch playlists' })
  }
}

// ─────────────────────────────────────────────
// GET /api/rooms/:roomCode/pool-stats
// returns pool size and contributors
// ─────────────────────────────────────────────

export async function getPoolStats(req, res) {
  try {
    const room = await Room.findOne({
      roomCode: req.params.roomCode.toUpperCase(),
      isActive: true
    })

    if (!room) {
      return res.status(404).json({ error: 'Room not found' })
    }

    // count tracks per contributor
    const contributors = {}
    for (const track of room.trackPool) {
      const name = track.contributedBy || 'Unknown'
      contributors[name] = (contributors[name] || 0) + 1
    }

    res.json({
      totalTracks: room.trackPool.length,
      contributors
    })

  } catch (err) {
    console.error('Pool stats error:', err.message)
    res.status(500).json({ error: 'Failed to get pool stats' })
  }
}