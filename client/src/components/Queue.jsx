import { formatDuration } from '../utils/moodMapping'

export default function Queue({ queue, isHost, onVeto }) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">

      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-300">Up next</h3>
        <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded-full">
          {queue.length} {queue.length === 1 ? 'track' : 'tracks'}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2">
        {queue.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <p className="text-zinc-600 text-sm">Queue is empty</p>
            <p className="text-zinc-700 text-xs mt-1">
              Tracks will appear as the mood settles
            </p>
          </div>
        )}

        {queue.map((track, index) => (
          <div
            key={`${track.id}-${index}`}
            className="flex items-center gap-3 py-2.5 border-b border-zinc-800/50 group"
          >
            {/* album art */}
            <div className="w-10 h-10 rounded flex-shrink-0 overflow-hidden bg-zinc-800">
              {track.albumArt ? (
                <img
                  src={track.albumArt}
                  alt={track.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-600">
                  ♪
                </div>
              )}
            </div>

            {/* track info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{track.name}</p>
              <p className="text-xs text-zinc-500 truncate">{track.artist}</p>
            </div>

            {/* duration + veto */}
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <span className="text-xs text-zinc-600">
                {track.duration_ms ? formatDuration(track.duration_ms) : '--:--'}
              </span>

              <button
                onClick={() => onVeto(track)}
                className="text-[10px] text-zinc-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
              >
                ✕ skip
              </button>
            </div>

          </div>
        ))}
      </div>

    </div>
  )
}