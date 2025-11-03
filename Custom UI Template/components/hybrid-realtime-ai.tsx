"use client"

import React, { useState, useCallback, useRef } from 'react'
import { Mic, Send, Volume2, VolumeX, Settings, Zap, Circle } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { LiveWaveform } from '@/components/ui/live-waveform'

export interface HybridRealtimeAIProps {
  className?: string
  apiKey: string
  agentId?: string
  onMessage?: (role: 'user' | 'assistant', message: string) => void
  onError?: (error: Error) => void
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isStreaming?: boolean
}

export const HybridRealtimeAI: React.FC<HybridRealtimeAIProps> = ({
  className,
  apiKey,
  agentId,
  onMessage,
  onError,
}) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [textInput, setTextInput] = useState('')
  const [isVoiceMode, setIsVoiceMode] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [isStreamingResponse, setIsStreamingResponse] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Add message
  const addMessage = useCallback((role: 'user' | 'assistant', content: string, isStreaming = false) => {
    const newMessage: Message = {
      id: Date.now().toString() + Math.random(),
      role,
      content,
      timestamp: new Date(),
      isStreaming,
    }
    
    setMessages(prev => {
      // If there's already a streaming message, update it
      if (isStreaming && prev.length > 0 && prev[prev.length - 1].isStreaming) {
        const updated = [...prev]
        updated[updated.length - 1] = newMessage
        return updated
      }
      return [...prev, newMessage]
    })
    
    onMessage?.(role, content)
    scrollToBottom()
  }, [onMessage])

  // Handle streaming text response from AI
  const handleStreamingTextResponse = useCallback(async (userInput: string) => {
    try {
      setIsStreamingResponse(true)
      abortControllerRef.current = new AbortController()

      // This is a placeholder for your streaming AI API
      // Replace with actual OpenAI, Claude, or other streaming API
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userInput,
          apiKey: apiKey,
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error('Failed to get AI response')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let accumulatedText = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          accumulatedText += chunk
          
          // Update streaming message
          addMessage('assistant', accumulatedText, true)
          
          // Optional: Stream audio for each chunk
          if (!isMuted) {
            await streamAudioChunk(chunk)
          }
        }
      }

      // Finalize the message
      addMessage('assistant', accumulatedText, false)
      setIsStreamingResponse(false)
      
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Streaming error:', error)
        onError?.(error)
        setIsStreamingResponse(false)
      }
    }
  }, [apiKey, isMuted, addMessage, onError])

  // Stream audio for text chunks
  const streamAudioChunk = useCallback(async (text: string) => {
    if (!text.trim()) return

    try {
      // Use ElevenLabs streaming TTS
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/stream`, {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      })

      if (response.ok && response.body) {
        const reader = response.body.getReader()
        const audioContext = new AudioContext()
        
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          
          // Play audio chunk
          const audioBuffer = await audioContext.decodeAudioData(value.buffer)
          const source = audioContext.createBufferSource()
          source.buffer = audioBuffer
          source.connect(audioContext.destination)
          source.start()
        }
      }
    } catch (error) {
      console.error('Audio streaming error:', error)
    }
  }, [apiKey])

  // Handle text input submission
  const handleTextSubmit = useCallback(async () => {
    if (!textInput.trim() || isStreamingResponse) return

    const userMessage = textInput.trim()
    setTextInput('')

    // Add user message
    addMessage('user', userMessage, false)

    // Get streaming response
    await handleStreamingTextResponse(userMessage)
  }, [textInput, isStreamingResponse, addMessage, handleStreamingTextResponse])

  // Stop streaming
  const handleStopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setIsStreamingResponse(false)
    }
  }, [])

  return (
    <div className={cn("flex flex-col h-full max-w-4xl mx-auto", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Circle 
              className={cn(
                "w-3 h-3 rounded-full",
                isConnected ? "fill-green-500 text-green-500 animate-pulse" : "fill-gray-500 text-gray-500"
              )}
            />
            <span className="font-medium">Hybrid Real-time AI</span>
          </div>
          {isStreamingResponse && (
            <Badge variant="secondary" className="animate-pulse">
              <Zap className="w-3 h-3 mr-1" />
              Streaming...
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={isVoiceMode ? "default" : "outline"}
            size="sm"
            onClick={() => setIsVoiceMode(!isVoiceMode)}
          >
            <Mic className="w-4 h-4 mr-1" />
            {isVoiceMode ? 'Voice Mode' : 'Text Mode'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMuted(!isMuted)}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="sm">
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Zap className="w-12 h-12 text-primary mb-4 animate-pulse" />
            <h3 className="text-lg font-medium mb-2">Real-time AI Chat</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Type or speak to start a conversation. Responses stream in real-time with synchronized audio.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex w-full animate-in fade-in slide-in-from-bottom-2",
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-lg px-4 py-3 text-sm",
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-foreground',
                    message.isStreaming && 'animate-pulse'
                  )}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  {message.isStreaming && (
                    <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1">|</span>
                  )}
                  {!message.isStreaming && (
                    <span className="text-xs opacity-70 mt-1 block">
                      {message.timestamp.toLocaleTimeString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <Separator />

      {/* Input Area */}
      <div className="p-4 space-y-3">
        {isVoiceMode ? (
          <>
            {/* Voice Mode UI */}
            <div className="h-16 bg-muted/30 rounded-lg flex items-center justify-center">
              <LiveWaveform
                active={isListening}
                processing={isSpeaking}
                className="w-full h-full"
                height={64}
              />
            </div>
            <Button
              onClick={() => {/* Implement voice toggle */}}
              className="w-full"
              size="lg"
            >
              <Mic className="w-4 h-4 mr-2" />
              {isListening ? 'Stop Recording' : 'Start Recording'}
            </Button>
          </>
        ) : (
          <>
            {/* Text Mode UI */}
            <div className="flex gap-2">
              <Textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type your message... (Press Enter to send)"
                className="flex-1 min-h-[44px] max-h-32 resize-none"
                disabled={isStreamingResponse}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleTextSubmit()
                  }
                }}
              />
              {isStreamingResponse ? (
                <Button
                  onClick={handleStopStreaming}
                  variant="destructive"
                  size="lg"
                  className="shrink-0"
                >
                  Stop
                </Button>
              ) : (
                <Button
                  onClick={handleTextSubmit}
                  disabled={!textInput.trim()}
                  size="lg"
                  className="shrink-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              )}
            </div>
          </>
        )}

        <div className="flex justify-center items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Zap className="w-3 h-3" />
            Real-time streaming
          </span>
          <span>•</span>
          <span>Synchronized audio</span>
          <span>•</span>
          <span>Switch modes anytime</span>
        </div>
      </div>
    </div>
  )
}

export default HybridRealtimeAI
