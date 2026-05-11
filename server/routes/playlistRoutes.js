import express from 'express'
import { contributePlaylists, getPoolStats } from '../controllers/playlistController.js'

const router = express.Router()

router.post('/:roomCode/contribute-playlists', contributePlaylists)
router.get('/:roomCode/pool-stats', getPoolStats)

export default router