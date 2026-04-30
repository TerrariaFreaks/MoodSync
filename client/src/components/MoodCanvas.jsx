import { useRef, useState } from 'react'
import { Stage, Layer, Circle, Line, Text, Rect } from 'react-konva'
import React from 'react'
import { toCanvasCoords, fromCanvasCoords, getMoodColor, getQuadrant, MOOD_QUADRANTS } from '../utils/moodMapping'

const CANVAS_SIZE = 320

export default function MoodCanvas({ myMood, users, negotiatedMood, onMoodChange, mySocketId }) {
  const [isDragging, setIsDragging] = useState(false)
  const stageRef = useRef(null)

  const myPos = toCanvasCoords(myMood.x, myMood.y, CANVAS_SIZE)
  const negotiatedPos = toCanvasCoords(negotiatedMood.x, negotiatedMood.y, CANVAS_SIZE)

  function handleStageClick(e) {
    if (isDragging) return
    const stage = stageRef.current
    const pos = stage.getPointerPosition()
    const newMood = fromCanvasCoords(pos.x, pos.y, CANVAS_SIZE)
    onMoodChange({
      x: Math.max(0, Math.min(1, newMood.x)),
      y: Math.max(0, Math.min(1, newMood.y))
    })
  }

  function handleDragMove(e) {
    const pos = e.target.position()
    const newMood = fromCanvasCoords(pos.x, pos.y, CANVAS_SIZE)
    onMoodChange({
      x: Math.max(0, Math.min(1, newMood.x)),
      y: Math.max(0, Math.min(1, newMood.y))
    })
  }

  // current mood quadrant for label
  const currentQuadrant = getQuadrant(myMood.x, myMood.y)
  const currentQuadrantInfo = MOOD_QUADRANTS[currentQuadrant]

  return (
    <div className="flex flex-col items-center">
      <div className="rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900">
        <Stage
          ref={stageRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          onClick={handleStageClick}
          style={{ cursor: 'crosshair' }}
        >
          <Layer>

            {/* background */}
            <Rect
              x={0} y={0}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              fill="#18181b"
            />

            {/* quadrant dividers */}
            <Line
              points={[CANVAS_SIZE / 2, 0, CANVAS_SIZE / 2, CANVAS_SIZE]}
              stroke="#3f3f46"
              strokeWidth={1}
              dash={[4, 4]}
            />
            <Line
              points={[0, CANVAS_SIZE / 2, CANVAS_SIZE, CANVAS_SIZE / 2]}
              stroke="#3f3f46"
              strokeWidth={1}
              dash={[4, 4]}
            />

            {/* quadrant labels */}
            <Text
              x={CANVAS_SIZE / 2 + 8} y={8}
              text={`${MOOD_QUADRANTS.hype.emoji} ${MOOD_QUADRANTS.hype.label}`}
              fontSize={11}
              fill="#71717a"
            />
            <Text
              x={8} y={8}
              text={`${MOOD_QUADRANTS.chill.emoji} ${MOOD_QUADRANTS.chill.label}`}
              fontSize={11}
              fill="#71717a"
            />
            <Text
              x={CANVAS_SIZE / 2 + 8} y={CANVAS_SIZE - 20}
              text={`${MOOD_QUADRANTS.intense.emoji} ${MOOD_QUADRANTS.intense.label}`}
              fontSize={11}
              fill="#71717a"
            />
            <Text
              x={8} y={CANVAS_SIZE - 20}
              text={`${MOOD_QUADRANTS.melancholic.emoji} Melancholic`}
              fontSize={11}
              fill="#71717a"
            />

            {/* axis labels */}
            <Text
              x={4} y={CANVAS_SIZE / 2 - 20}
              text="calm"
              fontSize={10}
              fill="#52525b"
            />
            <Text
              x={CANVAS_SIZE - 32} y={CANVAS_SIZE / 2 - 20}
              text="hype"
              fontSize={10}
              fill="#52525b"
            />
            <Text
              x={CANVAS_SIZE / 2 + 4} y={4}
              text="happy"
              fontSize={10}
              fill="#52525b"
            />
            <Text
              x={CANVAS_SIZE / 2 + 4} y={CANVAS_SIZE - 14}
              text="sad"
              fontSize={10}
              fill="#52525b"
            />

            {/* other users dots — filtered to exclude self */}
            {users
              .filter(u => u.socketId !== mySocketId)
              .map((u) => {
                if (!u.mood) return null
                const pos = toCanvasCoords(u.mood.x, u.mood.y, CANVAS_SIZE)
                const color = getMoodColor(u.mood.x, u.mood.y)
                return (
                  <React.Fragment key={u.socketId}>
                    <Circle
                      x={pos.cx}
                      y={pos.cy}
                      radius={10}
                      fill={color}
                      opacity={0.6}
                    />
                    <Text
                      x={pos.cx + 12}
                      y={pos.cy - 6}
                      text={u.displayName.slice(0, 10)}
                      fontSize={11}
                      fill="#e4e4e7"
                    />
                  </React.Fragment>
                )
              })
            }

            {/* negotiated mood — room average */}
            <Circle
              x={negotiatedPos.cx}
              y={negotiatedPos.cy}
              radius={18}
              fill="transparent"
              stroke="#1DB954"
              strokeWidth={2}
              dash={[4, 2]}
              opacity={0.8}
            />
            <Text
              x={negotiatedPos.cx + 20}
              y={negotiatedPos.cy - 6}
              text="room"
              fontSize={10}
              fill="#1DB954"
            />

            {/* my dot — draggable */}
            <Circle
              x={myPos.cx}
              y={myPos.cy}
              radius={14}
              fill={getMoodColor(myMood.x, myMood.y)}
              draggable
              onDragStart={() => setIsDragging(true)}
              onDragEnd={(e) => {
                setIsDragging(false)
                handleDragMove(e)
              }}
              onDragMove={handleDragMove}
              shadowBlur={12}
              shadowColor={getMoodColor(myMood.x, myMood.y)}
              shadowOpacity={0.6}
            />
            <Text
              x={myPos.cx + 16}
              y={myPos.cy - 6}
              text="you"
              fontSize={10}
              fill="white"
            />

          </Layer>
        </Stage>
      </div>

      {/* mood label below canvas */}
      <p className="mt-3 text-sm text-zinc-400">
        Your mood —{' '}
        <span className="text-white font-medium">
          {currentQuadrantInfo.emoji} {currentQuadrantInfo.label}
        </span>
      </p>
    </div>
  )
}