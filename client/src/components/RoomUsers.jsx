import { getMoodColor, getQuadrant, MOOD_QUADRANTS } from '../utils/moodMapping'

export default function RoomUsers({ users, mySocketId }) {
  return (
    <div className="p-4 border-b border-zinc-800">

      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-zinc-300">In the room</h3>
        <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded-full">
          {users.length} {users.length === 1 ? 'person' : 'people'}
        </span>
      </div>

      <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
        {users.length === 0 && (
          <p className="text-zinc-600 text-xs text-center py-2">
            Waiting for people to join...
          </p>
        )}

        {users.map((u) => {
          const isMe = u.socketId === mySocketId
          const moodColor = u.mood ? getMoodColor(u.mood.x, u.mood.y) : '#71717a'
          const quadrant = u.mood ? getQuadrant(u.mood.x, u.mood.y) : null
          const quadrantInfo = quadrant ? MOOD_QUADRANTS[quadrant] : null

          return (
            <div
              key={u.socketId}
              className="flex items-center gap-3 py-1"
            >
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: moodColor }}
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm text-white truncate">
                    {u.displayName}
                    {isMe && (
                      <span className="text-zinc-500 text-xs ml-1">(you)</span>
                    )}
                  </span>
                  {u.isHost && (
                    <span className="text-[10px] text-[#1DB954] bg-[#1DB954]/10 px-1.5 py-0.5 rounded-full flex-shrink-0">
                      host
                    </span>
                  )}
                </div>

                {quadrantInfo && (
                  <p className="text-[11px] text-zinc-500">
                    {quadrantInfo.emoji} {quadrantInfo.label}
                  </p>
                )}
              </div>

              {u.mood && (
                <div className="flex flex-col gap-0.5 flex-shrink-0">
                  <div className="w-12 h-1 bg-zinc-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${u.mood.x * 100}%`,
                        backgroundColor: moodColor
                      }}
                    />
                  </div>
                  <div className="w-12 h-1 bg-zinc-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${u.mood.y * 100}%`,
                        backgroundColor: moodColor
                      }}
                    />
                  </div>
                </div>
              )}

            </div>
          )
        })}
      </div>

    </div>
  )
}