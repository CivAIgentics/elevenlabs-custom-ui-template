import { useState } from 'react'
import Button from './Button'

function VoiceForm({ onSubmit }) {
  const [text, setText] = useState('')
  const [voice, setVoice] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({ text, voice })
    setText('')
    setVoice('')
  }

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="text">Text:</label>
        <textarea
          id="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          required
        />
      </div>
      <div>
        <label htmlFor="voice">Select Voice:</label>
        <select
          id="voice"
          value={voice}
          onChange={(e) => setVoice(e.target.value)}
          required
        >
          <option value="">Choose a voice</option>
          <option value="voice1">Voice 1</option>
          <option value="voice2">Voice 2</option>
          <option value="voice3">Voice 3</option>
        </select>
      </div>
      <Button type="submit">Convert to Speech</Button>
    </form>
  )
}

export default VoiceForm