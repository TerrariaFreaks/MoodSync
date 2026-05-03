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
    type: Number,
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
    averageEnergy: { type: Number },
    averageValence: { type: Number },
    dominantQuadrant: { type: String }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
})

sessionSchema.pre('save', function (next) {
  if (!this.moodHistory || this.moodHistory.length === 0) {
    if (!this.moodSummary) this.moodSummary = {}
    this.moodSummary.averageEnergy = 0.5
    this.moodSummary.averageValence = 0.5
    this.moodSummary.dominantQuadrant = 'chill'
    return next()
  }

  const totalX = this.moodHistory.reduce((sum, s) => sum + (s.negotiatedMood?.x || 0), 0)
  const totalY = this.moodHistory.reduce((sum, s) => sum + (s.negotiatedMood?.y || 0), 0)

  if (!this.moodSummary) this.moodSummary = {}

  this.moodSummary.averageEnergy = totalX / this.moodHistory.length
  this.moodSummary.averageValence = totalY / this.moodHistory.length

  const x = this.moodSummary.averageEnergy
  const y = this.moodSummary.averageValence

  if (x >= 0.5 && y >= 0.5) this.moodSummary.dominantQuadrant = 'hype'
  else if (x >= 0.5 && y < 0.5) this.moodSummary.dominantQuadrant = 'intense'
  else if (x < 0.5 && y >= 0.5) this.moodSummary.dominantQuadrant = 'chill'
  else this.moodSummary.dominantQuadrant = 'melancholic'

  return next()
})

export default mongoose.model('Session', sessionSchema)