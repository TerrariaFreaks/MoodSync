const QUADRANT_PROFILES = {
  hype: {
    label: 'Hype',
    emoji: '🔥',
    genres: ['pop', 'dance', 'hip hop', 'edm'],
    target_energy: 0.85,
    target_valence: 0.8,
    target_tempo: 128,
    target_danceability: 0.8
  },
  chill: {
    label: 'Chill',
    emoji: '🌊',
    genres: ['indie', 'lo-fi', 'acoustic', 'folk'],
    target_energy: 0.35,
    target_valence: 0.65,
    target_tempo: 90,
    target_danceability: 0.45
  },
  intense: {
    label: 'Intense',
    emoji: '⚡',
    genres: ['rock', 'metal', 'hard rock', 'punk'],
    target_energy: 0.9,
    target_valence: 0.25,
    target_tempo: 145,
    target_danceability: 0.5
  },
  melancholic: {
    label: 'Melancholic',
    emoji: '🌧️',
    genres: ['blues', 'ambient', 'soul', 'classical'],
    target_energy: 0.25,
    target_valence: 0.2,
    target_tempo: 75,
    target_danceability: 0.3
  }
}

export function negotiateMood(users) {
  const activeMoods = users.filter(u => u.mood && u.mood.x !== undefined)

  if (activeMoods.length === 0) return { x: 0.5, y: 0.5 }
  if (activeMoods.length === 1) return { x: activeMoods[0].mood.x, y: activeMoods[0].mood.y }

  const totalX = activeMoods.reduce((sum, u) => sum + u.mood.x, 0)
  const totalY = activeMoods.reduce((sum, u) => sum + u.mood.y, 0)

  return {
    x: parseFloat((totalX / activeMoods.length).toFixed(3)),
    y: parseFloat((totalY / activeMoods.length).toFixed(3))
  }
}

export function applyMomentum(currentMood, newMood, factor = 0.3) {
  return {
    x: parseFloat((currentMood.x + (newMood.x - currentMood.x) * factor).toFixed(3)),
    y: parseFloat((currentMood.y + (newMood.y - currentMood.y) * factor).toFixed(3))
  }
}

export function getQuadrant(mood) {
  const { x, y } = mood
  if (x >= 0.5 && y >= 0.5) return 'hype'
  if (x >= 0.5 && y < 0.5) return 'intense'
  if (x < 0.5 && y >= 0.5) return 'chill'
  return 'melancholic'
}

// kept for backwards compatibility but no longer used for recommendations
export function buildSpotifyParams(mood, genreLock = null, vetoedTrackIds = []) {
  const quadrant = getQuadrant(mood)
  const profile = QUADRANT_PROFILES[quadrant]
  const genres = genreLock ? [genreLock] : shuffleArray(profile.genres).slice(0, 2)
  return {
    seed_genres: genres.join(','),
    target_energy: mood.x,
    target_valence: mood.y,
    target_tempo: profile.target_tempo,
    target_danceability: profile.target_danceability,
    min_popularity: 20,
    limit: 10
  }
}

// new — builds a search query from mood
export function buildSearchQuery(mood, genreLock = null) {
  const quadrant = getQuadrant(mood)
  const profile = QUADRANT_PROFILES[quadrant]

  // use plain genre names without the genre: prefix
  // spotify search is more reliable this way
  const genres = genreLock
    ? [genreLock]
    : shuffleArray(profile.genres).slice(0, 2)

  // build a simple keyword query
  const query = genres.join(' ')

  return {
    q: query,
    type: 'track',
    limit: 20,
    market: 'US'
  }
}

export function filterVetoed(tracks, vetoedTrackIds) {
  if (!vetoedTrackIds || vetoedTrackIds.length === 0) return tracks
  return tracks.filter(track => !vetoedTrackIds.includes(track.id))
}

export function getQuadrantProfile(quadrant) {
  return QUADRANT_PROFILES[quadrant]
}

export function getMoodLabel(mood) {
  const quadrant = getQuadrant(mood)
  const profile = QUADRANT_PROFILES[quadrant]
  return `${profile.emoji} ${profile.label}`
}

export function shuffleArray(arr) {
  return [...arr].sort(() => Math.random() - 0.5)
}