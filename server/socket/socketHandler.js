import Room from '../models/Room.js'
import {
  negotiateMood,
  applyMomentum,
  getMoodLabel,
  getQuadrant
} from '../utils/moodEngine.js'

// ─────────────────────────────────────────────
// track peak user count per room in memory
// ─────────────────────────────────────────────
const roomPeakUsers = {}

// ─────────────────────────────────────────────
// mood snapshot interval — every 2 minutes
// ─────────────────────────────────────────────
const MOOD_SNAPSHOT_INTERVAL = 2 * 60 * 1000
const moodSnapshotTimers = {}

export function initSocket(io) {

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`)

    // ─────────────────────────────────────────
    // JOIN ROOM
    // payload: { roomCode, displayName, isHost }
    // ─────────────────────────────────────────
    socket.on('join_room', async ({ roomCode, displayName, isHost }) => {
      try {
        const room = await Room.findOne({
          roomCode: roomCode.toUpperCase(),
          isActive: true
        })

        if (!room) {
          socket.emit('error', { message: 'Room not found or has ended' })
          return
        }

        // add user to socket room
        socket.join(roomCode)
        socket.data.roomCode = roomCode
        socket.data.displayName = displayName
        socket.data.isHost = isHost

        // add user to mongodb room
        room.users.push({
          socketId: socket.id,
          displayName,
          isHost: isHost || false,
          mood: { x: 0.5, y: 0.5 }
        })

        await room.save()

        // track peak users
        const userCount = room.users.length
        if (!roomPeakUsers[roomCode] || userCount > roomPeakUsers[roomCode]) {
          roomPeakUsers[roomCode] = userCount
        }

        // start mood snapshot timer if not already running
        if (!moodSnapshotTimers[roomCode]) {
          moodSnapshotTimers[roomCode] = setInterval(async () => {
            await saveMoodSnapshot(roomCode)
          }, MOOD_SNAPSHOT_INTERVAL)
        }

        // tell the joining user the current room state
        socket.emit('room_state', {
          roomCode: room.roomCode,
          hostDisplayName: room.hostDisplayName,
          users: room.users.map(u => ({
            socketId: u.socketId,
            displayName: u.displayName,
            isHost: u.isHost,
            mood: u.mood
          })),
          negotiatedMood: room.negotiatedMood,
          moodLabel: getMoodLabel(room.negotiatedMood),
          genreLock: room.genreLock
        })

        // tell everyone else someone joined
        socket.to(roomCode).emit('user_joined', {
          socketId: socket.id,
          displayName,
          isHost: isHost || false,
          mood: { x: 0.5, y: 0.5 },
          userCount: room.users.length
        })

        console.log(`${displayName} joined room ${roomCode}`)

      } catch (err) {
        console.error('join_room error:', err.message)
        socket.emit('error', { message: 'Failed to join room' })
      }
    })

    // ─────────────────────────────────────────
    // MOOD UPDATE
    // payload: { roomCode, mood: { x, y } }
    // ─────────────────────────────────────────
    socket.on('mood_update', async ({ roomCode, mood }) => {
      try {
        const room = await Room.findOne({
          roomCode: roomCode.toUpperCase(),
          isActive: true
        })

        if (!room) return

        // update this user's mood in the users array
        const user = room.users.find(u => u.socketId === socket.id)
        if (!user) return

        user.mood = {
          x: Math.max(0, Math.min(1, mood.x)), // clamp 0-1
          y: Math.max(0, Math.min(1, mood.y))
        }

        // recompute negotiated mood
        const rawNegotiated = negotiateMood(room.users)

        // apply momentum to smooth the transition
        const smoothedMood = applyMomentum(room.negotiatedMood, rawNegotiated)

        room.negotiatedMood = smoothedMood
        await room.save()

        // broadcast updated mood state to everyone in the room
        io.to(roomCode).emit('mood_changed', {
          socketId: socket.id,
          displayName: user.displayName,
          userMood: user.mood,
          negotiatedMood: smoothedMood,
          moodLabel: getMoodLabel(smoothedMood),
          quadrant: getQuadrant(smoothedMood)
        })

      } catch (err) {
        console.error('mood_update error:', err.message)
      }
    })

    // ─────────────────────────────────────────
    // TRACK QUEUED
    // host emits this after successfully adding to spotify
    // payload: { roomCode, track }
    // ─────────────────────────────────────────
    socket.on('track_queued', ({ roomCode, track }) => {
      // broadcast to all users so everyone sees the queue update
      io.to(roomCode).emit('queue_updated', { track })
    })

    // ─────────────────────────────────────────
    // VETO TRACK
    // payload: { roomCode, trackId, trackName }
    // ─────────────────────────────────────────
    socket.on('veto_track', async ({ roomCode, trackId, trackName }) => {
      try {
        // broadcast veto to everyone
        io.to(roomCode).emit('track_vetoed', {
          trackId,
          trackName,
          vetoedBy: socket.data.displayName
        })

        console.log(`Track vetoed in ${roomCode}: ${trackName}`)

      } catch (err) {
        console.error('veto_track error:', err.message)
      }
    })

    // ─────────────────────────────────────────
    // GENRE LOCK UPDATE
    // host emits this after calling the REST endpoint
    // payload: { roomCode, genre }
    // ─────────────────────────────────────────
    socket.on('genre_lock_updated', ({ roomCode, genre }) => {
      io.to(roomCode).emit('genre_lock_changed', { genre })
    })

    // ─────────────────────────────────────────
    // NOW PLAYING
    // host emits this when spotify track changes
    // payload: { roomCode, track }
    // ─────────────────────────────────────────
    socket.on('now_playing', ({ roomCode, track }) => {
      io.to(roomCode).emit('now_playing_updated', { track })
    })

    // ─────────────────────────────────────────
    // DISCONNECT
    // ─────────────────────────────────────────
    socket.on('disconnect', async () => {
      try {
        const { roomCode, displayName, isHost } = socket.data
        if (!roomCode) return

        const room = await Room.findOne({
          roomCode: roomCode.toUpperCase(),
          isActive: true
        })

        if (!room) return

        // remove user from room
        room.users = room.users.filter(u => u.socketId !== socket.id)
        await room.save()

        // tell everyone this user left
        io.to(roomCode).emit('user_left', {
          socketId: socket.id,
          displayName,
          userCount: room.users.length
        })

        // if host disconnected, notify the room
        if (isHost) {
          io.to(roomCode).emit('host_disconnected', {
            message: 'The host has disconnected. Music control is paused.'
          })
        }

        // if room is empty clean up the snapshot timer
        if (room.users.length === 0) {
          if (moodSnapshotTimers[roomCode]) {
            clearInterval(moodSnapshotTimers[roomCode])
            delete moodSnapshotTimers[roomCode]
          }
          delete roomPeakUsers[roomCode]
        }

        // recompute mood without the disconnected user
        if (room.users.length > 0) {
          const rawNegotiated = negotiateMood(room.users)
          const smoothedMood = applyMomentum(room.negotiatedMood, rawNegotiated)
          room.negotiatedMood = smoothedMood
          await room.save()

          io.to(roomCode).emit('mood_changed', {
            socketId: null,
            displayName: null,
            userMood: null,
            negotiatedMood: smoothedMood,
            moodLabel: getMoodLabel(smoothedMood),
            quadrant: getQuadrant(smoothedMood)
          })
        }

        console.log(`${displayName} left room ${roomCode}`)

      } catch (err) {
        console.error('disconnect error:', err.message)
      }
    })
  })
}

// ─────────────────────────────────────────────
// save periodic mood snapshot to mongodb
// ─────────────────────────────────────────────
async function saveMoodSnapshot(roomCode) {
  try {
    const room = await Room.findOne({
      roomCode: roomCode.toUpperCase(),
      isActive: true
    })

    if (!room || room.users.length === 0) return

    room.moodHistory.push({
      timestamp: new Date(),
      negotiatedMood: { ...room.negotiatedMood },
      userCount: room.users.length
    })

    await room.save()

  } catch (err) {
    console.error('Mood snapshot error:', err.message)
  }
}