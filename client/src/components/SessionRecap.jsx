import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts'
import { MOOD_QUADRANTS, getQuadrant } from '../utils/moodMapping'

const SERVER = import.meta.env.VITE_SERVER_URL

export default function SessionRecap() {
  const { roomCode } = useParams()
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await axios.get(`${SERVER}/api/rooms/${roomCode}/session`, {
          withCredentials: true
        })
        setSession(res.data)
      } catch (err) {
        setError('Could not load session data')
      } finally {
        setLoading(false)
      }
    }
    fetchSession()
  }, [roomCode])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[#1DB954] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex flex-col items-center justify-center gap-4">
        <p className="text-red-400">{error || 'Session not found'}</p>
        <button
          onClick={() => navigate('/')}
          className="text-sm text-zinc-400 hover:text-white transition-colors"
        >
          ← Back to home
        </button>
      </div>
    )
  }

  const dominantQuadrant = session.moodSummary?.dominantQuadrant
  const quadrantInfo = dominantQuadrant ? MOOD_QUADRANTS[dominantQuadrant] : null

  // format mood history for recharts
  const moodChartData = session.moodHistory.map((snapshot, index) => ({
    index,
    energy: parseFloat((snapshot.negotiatedMood.x * 100).toFixed(1)),
    valence: parseFloat((snapshot.negotiatedMood.y * 100).toFixed(1)),
    users: snapshot.userCount
  }))

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white px-4 py-10">
      <div className="max-w-2xl mx-auto">

        {/* header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-2">
            Mood<span className="text-[#1DB954]">Sync</span>
          </h1>
          <p className="text-zinc-400">Session Recap</p>
          <p className="text-zinc-600 text-sm mt-1 font-mono">{roomCode}</p>
        </div>

        {/* dominant mood card */}
        {quadrantInfo && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6 text-center">
            <p className="text-6xl mb-3">{quadrantInfo.emoji}</p>
            <h2 className="text-2xl font-bold mb-1">{quadrantInfo.label} Session</h2>
            <p className="text-zinc-400 text-sm">{quadrantInfo.description}</p>
          </div>
        )}

        {/* stats row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-[#1DB954]">
              {session.duration || 0}
            </p>
            <p className="text-zinc-500 text-xs mt-1">minutes</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-[#1DB954]">
              {session.peakUserCount || 1}
            </p>
            <p className="text-zinc-500 text-xs mt-1">peak listeners</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-[#1DB954]">
              {session.totalTracksPlayed || 0}
            </p>
            <p className="text-zinc-500 text-xs mt-1">tracks played</p>
          </div>
        </div>

        {/* mood journey chart */}
        {moodChartData.length > 1 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6">
            <h3 className="text-sm font-semibold text-zinc-300 mb-4">
              Mood Journey
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={moodChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis
                  dataKey="index"
                  hide
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: '#71717a', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    border: '1px solid #3f3f46',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  labelFormatter={() => ''}
                  formatter={(value, name) => [
                    `${value}%`,
                    name === 'energy' ? '⚡ Energy' : '😊 Happiness'
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="energy"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="valence"
                  stroke="#1DB954"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-3 justify-center">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 bg-[#f97316] rounded" />
                <span className="text-xs text-zinc-500">Energy</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 bg-[#1DB954] rounded" />
                <span className="text-xs text-zinc-500">Happiness</span>
              </div>
            </div>
          </div>
        )}

        {/* track history */}
        {session.trackHistory?.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6">
            <h3 className="text-sm font-semibold text-zinc-300 mb-4">
              Tracks Played
            </h3>
            <div className="flex flex-col gap-3">
              {session.trackHistory.map((track, index) => {
                const q = track.roomMoodAtPlay
                  ? getQuadrant(track.roomMoodAtPlay.x, track.roomMoodAtPlay.y)
                  : null
                const qInfo = q ? MOOD_QUADRANTS[q] : null

                return (
                  <div
                    key={`${track.spotifyId}-${index}`}
                    className="flex items-center gap-3"
                  >
                    <span className="text-zinc-600 text-xs w-5 text-right flex-shrink-0">
                      {index + 1}
                    </span>

                    {track.albumArt ? (
                      <img
                        src={track.albumArt}
                        alt={track.name}
                        className="w-9 h-9 rounded flex-shrink-0 object-cover"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded bg-zinc-800 flex-shrink-0 flex items-center justify-center text-zinc-600">
                        ♪
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{track.name}</p>
                      <p className="text-xs text-zinc-500 truncate">{track.artist}</p>
                    </div>

                    {qInfo && (
                      <span className="text-xs text-zinc-600 flex-shrink-0">
                        {qInfo.emoji}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* footer actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate('/')}
            className="w-full bg-[#1DB954] hover:bg-[#1ed760] text-black font-semibold py-4 rounded-full transition-all duration-200"
          >
            Start a New Room
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full text-zinc-500 hover:text-white text-sm transition-colors"
          >
            Back to Home
          </button>
        </div>

      </div>
    </div>
  )
}