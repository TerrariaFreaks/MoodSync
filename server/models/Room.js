import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
  socketId: { type: String, required: true },
  displayName: { type: String, required: true },
  isHost: { type: Boolean, default: false },
  mood: {
    x: { type: Number, default: 0.5 }, // energy 0-1
    y: { type: Number, default: 0.5 }  // valence 0-1
  },
  joinedAt: { type: Date, default: Date.now }
})

const trackSchema = new mongoose.Schema({
  spotifyId: { type: String, required: true },
  name: { type: String, required: true },
  artist: { type: String, required: true },
  albumArt: { type: String },
  uri: { type: String, required: true }, // spotify:track:xxxx
  playedAt: { type: Date },
  roomMoodAtPlay: {
    x: { type: Number },
    y: { type: Number }
  }
})

const moodSnapshotSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  negotiatedMood: {
    x: { type: Number },
    y: { type: Number }
  },
  userCount: { type: Number }
})

const roomSchema = new mongoose.Schema({
  roomCode: {
    type: String,
    required: true,
    unique: true,
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
  isActive: {
    type: Boolean,
    default: true
  },
  genreLock: {
    type: String,
    default: null // null means no lock, otherwise e.g. 'indie', 'pop'
  },
  users: [userSchema],
  trackHistory: [trackSchema],
  moodHistory: [moodSnapshotSchema],
  negotiatedMood: {
    x: { type: Number, default: 0.5 },
    y: { type: Number, default: 0.5 }
  },
  trackPool: [
    {
      spotifyId: { type: String, required: true },
      name: { type: String, required: true },
      artist: { type: String, required: true },
      uri: { type: String, required: true },
      albumArt: { type: String },
      moodTags: [{ type: String }],      // ['hype', 'chill', 'intense', 'melancholic']
      contributedBy: { type: String }    // display name of who added it
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  },
  endedAt: {
    type: Date,
    default: null
  }
})

export default mongoose.model('Room', roomSchema)