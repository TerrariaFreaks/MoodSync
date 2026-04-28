import axios from 'axios'
import Room from '../models/Room.js'
import Session from '../models/Session.js'
import { negotiateMood, applyMomentum, getMoodLabel } from '../utils/moodEngine.js'

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export async function createRoom(req, res) {
  const accessToken = req.session.accessToken || req.headers['x-access-token']

  if (!req.session.user && !accessToken) {
    return res.status(401).json({ error: 'Must be logged in with Spotify to create a room' })
  }

  let user = req.session.user

  if (!user && accessToken) {
    try {
      const profile = await axios.get('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      user = {
        id: profile.data.id,
        name: profile.data.display_name,
        image: profile.data.images?.[0]?.url || null
      }
      req.session.accessToken = accessToken
      req.session.user = user
      await new Promise((resolve) => req.session.save(resolve))
    } catch {
      return res.status(401).json({ error: 'Invalid access token' })
    }
  }

  try {
    let roomCode = generateRoomCode()
    let exists = await Room.findOne({ roomCode, isActive: true })
    while (exists) {
      roomCode = generateRoomCode()
      exists = await Room.findOne({ roomCode, isActive: true })
    }

    const room = new Room({
      roomCode,
      hostSpotifyId: user.id,
      hostDisplayName: user.name,
      isActive: true,
      users: [],
      trackHistory: [],
      moodHistory: [],
      negotiatedMood: { x: 0.5, y: 0.5 }
    })

    await room.save()

    res.json({
      success: true,
      roomCode,
      room: {
        roomCode: room.roomCode,
        hostDisplayName: room.hostDisplayName,
        negotiatedMood: room.negotiatedMood,
        isActive: room.isActive
      }
    })

  } catch (err) {
    console.error('Create room error:', err.message)
    res.status(500).json({ error: 'Failed to create room' })
  }
}

export async function getRoom(req, res) {
  try {
    const room = await Room.findOne({
      roomCode: req.params.roomCode.toUpperCase(),
      isActive: true
    })

    if (!room) {
      return res.status(404).json({ error: 'Room not found or has ended' })
    }

    res.json({
      roomCode: room.roomCode,
      hostDisplayName: room.hostDisplayName,
      userCount: room.users.length,
      negotiatedMood: room.negotiatedMood,
      moodLabel: getMoodLabel(room.negotiatedMood),
      genreLock: room.genreLock,
      isActive: room.isActive
    })

  } catch (err) {
    console.error('Get room error:', err.message)
    res.status(500).json({ error: 'Failed to get room' })
  }
}

export async function endRoom(req, res) {
  const accessToken = req.session.accessToken || req.headers['x-access-token']

  if (!req.session.user && !accessToken) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  let user = req.session.user
  if (!user && accessToken) {
    try {
      const profile = await axios.get('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      user = { id: profile.data.id, name: profile.data.display_name }
    } catch {
      return res.status(401).json({ error: 'Invalid access token' })
    }
  }

  try {
    const room = await Room.findOne({
      roomCode: req.params.roomCode.toUpperCase(),
      isActive: true
    })

    if (!room) {
      return res.status(404).json({ error: 'Room not found' })
    }

    if (room.hostSpotifyId !== user.id) {
      return res.status(403).json({ error: 'Only the host can end the room' })
    }

    const duration = Math.round((Date.now() - room.createdAt.getTime()) / 60000)

    const session = new Session({
      roomCode: room.roomCode,
      hostSpotifyId: room.hostSpotifyId,
      hostDisplayName: room.hostDisplayName,
      duration,
      peakUserCount: req.body.peakUserCount || room.users.length,
      totalTracksPlayed: room.trackHistory.length,
      trackHistory: room.trackHistory,
      moodHistory: room.moodHistory,
      moodSummary: {}
    })

    await session.save()

    room.isActive = false
    room.endedAt = new Date()
    await room.save()

    res.json({
      success: true,
      sessionId: session._id,
      summary: session.moodSummary
    })

  } catch (err) {
    console.error('End room error:', err.message)
    res.status(500).json({ error: 'Failed to end room' })
  }
}

export async function setGenreLock(req, res) {
  const accessToken = req.session.accessToken || req.headers['x-access-token']

  if (!req.session.user && !accessToken) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  let user = req.session.user
  if (!user && accessToken) {
    try {
      const profile = await axios.get('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      user = { id: profile.data.id }
    } catch {
      return res.status(401).json({ error: 'Invalid access token' })
    }
  }

  try {
    const { genre } = req.body

    const room = await Room.findOne({
      roomCode: req.params.roomCode.toUpperCase(),
      isActive: true
    })

    if (!room) {
      return res.status(404).json({ error: 'Room not found' })
    }

    if (room.hostSpotifyId !== user.id) {
      return res.status(403).json({ error: 'Only the host can set genre lock' })
    }

    room.genreLock = genre || null
    await room.save()

    res.json({ success: true, genreLock: room.genreLock })

  } catch (err) {
    console.error('Genre lock error:', err.message)
    res.status(500).json({ error: 'Failed to set genre lock' })
  }
}

export async function getSession(req, res) {
  try {
    const session = await Session.findOne({
      roomCode: req.params.roomCode.toUpperCase()
    }).sort({ createdAt: -1 })

    if (!session) {
      return res.status(404).json({ error: 'No session found for this room' })
    }

    res.json(session)

  } catch (err) {
    console.error('Get session error:', err.message)
    res.status(500).json({ error: 'Failed to get session' })
  }
}