import mongoose from 'mongoose'

const sessionSchema = new mongoose.Schema({
  roomCode: {
    type: String,
    required: true,
    uppercase: true
  },
  hostSpotifyId: {
    type: String,
    required: true
  },
  hostDisplayName: {
    type: String,
    required: true
  },
  duration: {
    type: Number, // in minutes
    default: 0
  },
  peakUserCount: {
    type: Number,
    default: 1
  },
  totalTracksPlayed: {
    type: Number,
    default: 0
  },
  trackHistory: [
    {
      spotifyId: String,
      name: String,
      artist: String,
      albumArt: String,
      uri: String,
      playedAt: Date,
      roomMoodAtPlay: {
        x: Number,
        y: Number
      }
    }
  ],
  moodHistory: [
    {
      timestamp: Date,
      negotiatedMood: {
        x: Number,
        y: Number
      },
      userCount: Number
    }
  ],
  moodSummary: {
    averageEnergy: { type: Number },    // average x over session
    averageValence: { type: Number },   // average y over session
    dominantQuadrant: { type: String }  // e.g. 'hype', 'chill', 'melancholic', 'focus'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
})

// auto compute mood summary before saving
sessionSchema.pre('save', function (next) {
  if (this.moodHistory.length === 0) return next()

  const totalX = this.moodHistory.reduce((sum, s) => sum + s.negotiatedMood.x, 0)
  const totalY = this.moodHistory.reduce((sum, s) => sum + s.negotiatedMood.y, 0)

  this.moodSummary.averageEnergy = totalX / this.moodHistory.length
  this.moodSummary.averageValence = totalY / this.moodHistory.length

  const x = this.moodSummary.averageEnergy
  const y = this.moodSummary.averageValence

  // quadrant mapping
  if (x >= 0.5 && y >= 0.5) this.moodSummary.dominantQuadrant = 'hype'
  else if (x >= 0.5 && y < 0.5) this.moodSummary.dominantQuadrant = 'intense'
  else if (x < 0.5 && y >= 0.5) this.moodSummary.dominantQuadrant = 'chill'
  else this.moodSummary.dominantQuadrant = 'melancholic'

  next()
})

export default mongoose.model('Session', sessionSchema)