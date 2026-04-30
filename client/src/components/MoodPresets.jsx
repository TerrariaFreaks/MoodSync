import { MOOD_QUADRANTS } from '../utils/moodMapping'

const PRESETS = [
  {
    id: 'hype',
    label: 'Hype',
    emoji: '🔥',
    mood: { x: 0.85, y: 0.85 },
    color: '#f97316'
  },
  {
    id: 'chill',
    label: 'Chill',
    emoji: '🌊',
    mood: { x: 0.25, y: 0.75 },
    color: '#1DB954'
  },
  {
    id: 'focus',
    label: 'Focus',
    emoji: '🎯',
    mood: { x: 0.4, y: 0.55 },
    color: '#3b82f6'
  },
  {
    id: 'intense',
    label: 'Intense',
    emoji: '⚡',
    mood: { x: 0.9, y: 0.2 },
    color: '#ef4444'
  },
  {
    id: 'melancholic',
    label: 'Sad',
    emoji: '🌧️',
    mood: { x: 0.2, y: 0.15 },
    color: '#8b5cf6'
  },
  {
    id: 'romantic',
    label: 'Romantic',
    emoji: '🌙',
    mood: { x: 0.35, y: 0.6 },
    color: '#ec4899'
  }
]

export default function MoodPresets({ onSelect }) {
  return (
    <div className="mt-5 w-full max-w-xs">

      <p className="text-xs text-zinc-500 text-center mb-3">
        or pick a preset
      </p>

      <div className="grid grid-cols-3 gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => onSelect(preset.mood)}
            className="flex flex-col items-center gap-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-600 rounded-xl py-3 px-2 transition-all duration-200 group"
          >
            <span className="text-xl group-hover:scale-110 transition-transform duration-200">
              {preset.emoji}
            </span>
            <span
              className="text-xs font-medium"
              style={{ color: preset.color }}
            >
              {preset.label}
            </span>
          </button>
        ))}
      </div>

    </div>
  )
}