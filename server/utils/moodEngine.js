// ─────────────────────────────────────────────
// MOOD ENGINE — the brain of MoodSync
// Handles negotiation + Spotify mapping
// ─────────────────────────────────────────────

// mood quadrant definitions
// x = energy (0 = calm, 1 = hype)
// y = valence (0 = sad, 1 = happy)

const QUADRANT_PROFILES = {
  hype: {
    label: 'Hype',
    emoji: '🔥',
    genres: ['pop', 'dance', 'hip-hop', 'edm'],
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
    genres: ['rock', 'metal', 'hard-rock', 'punk'],
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

// ─────────────────────────────────────────────
// STEP 1 — negotiate all users moods into one point
// ─────────────────────────────────────────────

export function negotiateMood(users) {
  // filter out users who havent set a mood yet
  const activeMoods = users.filter(u => u.mood && u.mood.x !== undefined)

  if (activeMoods.length === 0) {
    return { x: 0.5, y: 0.5 } // dead center fallback
  }

  if (activeMoods.length === 1) {
    return { x: activeMoods[0].mood.x, y: activeMoods[0].mood.y }
  }

  // weighted average — all users equal weight for now
  // you can extend this later (e.g. host gets 2x weight)
  const totalX = activeMoods.reduce((sum, u) => sum + u.mood.x, 0)
  const totalY = activeMoods.reduce((sum, u) => sum + u.mood.y, 0)

  const avgX = totalX / activeMoods.length
  const avgY = totalY / activeMoods.length

  // apply momentum — new mood cant jump more than 0.15 units per update
  // prevents jarring queue changes when one person trolls
  return {
    x: parseFloat(avgX.toFixed(3)),
    y: parseFloat(avgY.toFixed(3))
  }
}

// ─────────────────────────────────────────────
// STEP 2 — apply momentum to smooth mood shifts
// ─────────────────────────────────────────────

export function applyMomentum(currentMood, newMood, factor = 0.3) {
  // blends current and new mood
  // factor 0.3 means new mood only moves 30% toward target per update
  // prevents sudden queue whiplash
  return {
    x: parseFloat((currentMood.x + (newMood.x - currentMood.x) * factor).toFixed(3)),
    y: parseFloat((currentMood.y + (newMood.y - currentMood.y) * factor).toFixed(3))
  }
}

// ─────────────────────────────────────────────
// STEP 3 — map mood point to a quadrant
// ─────────────────────────────────────────────

export function getQuadrant(mood) {
  const { x, y } = mood

  if (x >= 0.5 && y >= 0.5) return 'hype'
  if (x >= 0.5 && y < 0.5) return 'intense'
  if (x < 0.5 && y >= 0.5) return 'chill'
  return 'melancholic'
}

// ─────────────────────────────────────────────
// STEP 4 — build spotify recommendation params
// ─────────────────────────────────────────────

export function buildSpotifyParams(mood, genreLock = null, vetoedTrackIds = []) {
  const quadrant = getQuadrant(mood)
  const profile = QUADRANT_PROFILES[quadrant]

  // if host locked a genre, use only that
  // otherwise pick 2 random genres from the quadrant profile
  let genres
  if (genreLock) {
    genres = [genreLock]
  } else {
    genres = shuffleArray(profile.genres).slice(0, 2)
  }

  return {
    seed_genres: genres.join(','),
    target_energy: mood.x,               // use exact mood coords
    target_valence: mood.y,              // not profile defaults
    target_tempo: profile.target_tempo,
    target_danceability: profile.target_danceability,
    min_popularity: 20,                  // avoid totally obscure tracks
    limit: 10                            // fetch 10, queue the best ones
  }
}

// ─────────────────────────────────────────────
// STEP 5 — filter out vetoed tracks from results
// ─────────────────────────────────────────────

export function filterVetoed(tracks, vetoedTrackIds) {
  if (!vetoedTrackIds || vetoedTrackIds.length === 0) return tracks
  return tracks.filter(track => !vetoedTrackIds.includes(track.id))
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

export function getQuadrantProfile(quadrant) {
  return QUADRANT_PROFILES[quadrant]
}

export function getMoodLabel(mood) {
  const quadrant = getQuadrant(mood)
  const profile = QUADRANT_PROFILES[quadrant]
  return `${profile.emoji} ${profile.label}`
}

function shuffleArray(arr) {
  return [...arr].sort(() => Math.random() - 0.5)
}