// mirrors the server side moodEngine.js but for frontend use
// used for labels, colors and canvas rendering

export const MOOD_QUADRANTS = {
  hype: {
    label: 'Hype',
    emoji: '🔥',
    color: '#f97316',        // orange
    description: 'High energy, happy vibes'
  },
  chill: {
    label: 'Chill',
    emoji: '🌊',
    color: '#1DB954',        // spotify green
    description: 'Relaxed and content'
  },
  intense: {
    label: 'Intense',
    emoji: '⚡',
    color: '#ef4444',        // red
    description: 'High energy, dark vibes'
  },
  melancholic: {
    label: 'Melancholic',
    emoji: '🌧️',
    color: '#3b82f6',        // blue
    description: 'Low energy, reflective'
  }
}

export function getQuadrant(x, y) {
  if (x >= 0.5 && y >= 0.5) return 'hype'
  if (x >= 0.5 && y < 0.5) return 'intense'
  if (x < 0.5 && y >= 0.5) return 'chill'
  return 'melancholic'
}

export function getMoodColor(x, y) {
  const quadrant = getQuadrant(x, y)
  return MOOD_QUADRANTS[quadrant].color
}

export function getMoodLabel(x, y) {
  const quadrant = getQuadrant(x, y)
  const q = MOOD_QUADRANTS[quadrant]
  return `${q.emoji} ${q.label}`
}

// convert 0-1 coords to canvas pixel coords
export function toCanvasCoords(x, y, canvasSize) {
  return {
    cx: x * canvasSize,
    cy: (1 - y) * canvasSize // flip y so top = happy, bottom = sad
  }
}

// convert canvas pixel coords back to 0-1 mood coords
export function fromCanvasCoords(cx, cy, canvasSize) {
  return {
    x: cx / canvasSize,
    y: 1 - cy / canvasSize // flip y back
  }
}

export function formatDuration(ms) {
  const mins = Math.floor(ms / 60000)
  const secs = Math.floor((ms % 60000) / 1000)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}