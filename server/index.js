import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import mongoose from 'mongoose'
import cors from 'cors'
import session from 'express-session'
import dotenv from 'dotenv'
import spotifyRoutes from './routes/spotifyRoutes.js'
import roomRoutes from './routes/roomRoutes.js'
import { initSocket } from './socket/socketHandler.js'

dotenv.config()

const app = express()
const httpServer = createServer(app)

const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://127.0.0.1:5000'],
    methods: ['GET', 'POST'],
    credentials: true
  }
})

app.use(cors({
  origin: function(origin, callback) {
    const allowed = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://127.0.0.1:5000']
    if (!origin || allowed.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true
}))

app.use(express.json())
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    sameSite: 'lax',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}))

app.use('/api/spotify', spotifyRoutes)
app.use('/api/rooms', roomRoutes)

initSocket(io)

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err))

const PORT = process.env.PORT || 5000
httpServer.listen(PORT, '127.0.0.1', () => {
  console.log(`Server running on http://127.0.0.1:${PORT}`)
})