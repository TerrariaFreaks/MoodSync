import { useEffect, useState } from 'react'
import { formatDuration } from '../utils/moodMapping'

export default function NowPlaying({ track }) {
  const [progress, setProgress] = useState(0)

  // animate progress bar locally
  useEffect(() => {
    if (!track) return
    setProgress(track.progress_ms || 0)

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= track.duration_ms) return track.duration_ms
        return prev + 1000
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [track?.id])

  if (!track) return null

  const progressPercent = track.duration_ms
    ? Math.min((progress / track.duration_ms) * 100, 100)
    : 0

  return (
    <div className="bg-zinc-900 border-b border-zinc-800 px-6 py-3">
      <div className="flex items-center gap-4">

        {/* album art */}
        <div className="w-12 h-12 rounded flex-shrink-0 overflow-hidden bg-zinc-800">
          {track.albumArt ? (
            <img
              src={track.albumArt}
              alt={track.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-500 text-xl">
              ♪
            </div>
          )}
        </div>

        {/* track info + progress */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {track.name}
              </p>
              <p className="text-xs text-zinc-400 truncate">
                {track.artist}
              </p>
            </div>

            <div className="text-xs text-zinc-500 flex-shrink-0 ml-4">
              {formatDuration(progress)} / {formatDuration(track.duration_ms)}
            </div>
          </div>

          {/* progress bar */}
          <div className="w-full h-1 bg-zinc-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#1DB954] rounded-full transition-all duration-1000"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* now playing animation */}
        <div className="flex items-end gap-0.5 flex-shrink-0 h-5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="w-1 bg-[#1DB954] rounded-full"
              style={{
                height: `${Math.random() * 100}%`,
                animation: `pulse ${0.5 + i * 0.2}s ease-in-out infinite alternate`
              }}
            />
          ))}
        </div>

      </div>
    </div>
  )
}