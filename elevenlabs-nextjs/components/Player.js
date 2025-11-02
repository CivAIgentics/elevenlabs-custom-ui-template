import React from 'react'

const Player = ({ audioSrc, isPlaying, onPlay, onPause }) => {
  return (
    <div>
      <audio src={audioSrc} controls />
      <div>
        <button onClick={onPlay} disabled={isPlaying}>
          Play
        </button>
        <button onClick={onPause} disabled={!isPlaying}>
          Pause
        </button>
      </div>
    </div>
  )
}

export default Player