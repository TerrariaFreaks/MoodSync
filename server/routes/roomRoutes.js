import express from 'express'
import {
  createRoom,
  getRoom,
  endRoom,
  setGenreLock,
  getSession
} from '../controllers/roomController.js'
import {
  getRecommendations,
  addToQueue,
  searchTracks,
  getPlayer
} from '../controllers/spotifyController.js'

const router = express.Router()

// ─────────────────────────────────────────────
// room routes
// ─────────────────────────────────────────────

router.post('/create', createRoom)
router.get('/:roomCode', getRoom)
router.post('/:roomCode/end', endRoom)
router.post('/:roomCode/genre-lock', setGenreLock)
router.get('/:roomCode/session', getSession)

// ─────────────────────────────────────────────
// spotify routes (require active room context)
// ─────────────────────────────────────────────

router.post('/spotify/recommendations', getRecommendations)
router.post('/spotify/queue', addToQueue)
router.get('/spotify/search', searchTracks)
router.get('/spotify/player', getPlayer)

export default router