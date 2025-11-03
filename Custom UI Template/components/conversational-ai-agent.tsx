"use client"

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { Mic, Send, Settings, Volume2, VolumeX } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { VoiceButton } from '@/components/ui/voice-button'
import { Card } from '@/components/ui/card'
import { Conversation, ConversationContent, ConversationEmptyState } from '@/components/ui/conversation'
import { Message } from '@/components/ui/message'
import { LiveWaveform } from '@/components/ui/live-waveform'
// Audio player components removed - using native audio element for simplicity
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

export interface ConversationMessage {
  id: string
  type: 'user' | 'assistant'
  content: string
  audioUrl?: string
  timestamp: Date
  transcription?: string
}

export interface ConversationalAIAgentProps {
  className?: string
  apiKey?: string
  voiceId?: string
  modelId?: string
  onMessage?: (message: ConversationMessage) => void
  onError?: (error: Error) => void
  enableVoiceInput?: boolean
  enableTextInput?: boolean
  enableVoiceOutput?: boolean
  enableRealTimeTranscription?: boolean
}

export const ConversationalAIAgent: React.FC<ConversationalAIAgentProps> = ({
  className,
  apiKey,
  voiceId = "21m00Tcm4TlvDq8ikWAM", // Default ElevenLabs voice
  modelId = "eleven_monolingual_v1",
  onMessage,
  onError,
  enableVoiceInput = true,
  enableTextInput = true,
  enableVoiceOutput = true,
  enableRealTimeTranscription = true,
  ...props
}) => {
  // State management
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [textInput, setTextInput] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [realTimeTranscript, setRealTimeTranscript] = useState('')
  const [isMuted, setIsMuted] = useState(false)

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  // Add a new message to the conversation
  const addMessage = useCallback((message: Omit<ConversationMessage, 'id' | 'timestamp'>) => {
    const newMessage: ConversationMessage = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date(),
    }
    
    setMessages(prev => [...prev, newMessage])
    onMessage?.(newMessage)
    return newMessage
  }, [onMessage])

  // Handle text input submission
  const handleTextSubmit = useCallback(async () => {
    if (!textInput.trim() || isProcessing) return

    const userMessage = addMessage({
      type: 'user',
      content: textInput,
    })

    setTextInput('')
    setIsProcessing(true)

    try {
      // Process the message with AI
      await processUserMessage(userMessage.content)
    } catch (error) {
      console.error('Error processing message:', error)
      onError?.(error as Error)
    } finally {
      setIsProcessing(false)
    }
  }, [textInput, isProcessing, addMessage, onError])

  // Handle voice recording
  const handleVoiceToggle = useCallback(async () => {
    if (isRecording) {
      // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      setIsRecording(false)
      setRealTimeTranscript('')
    } else {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        streamRef.current = stream
        
        const mediaRecorder = new MediaRecorder(stream)
        mediaRecorderRef.current = mediaRecorder
        audioChunksRef.current = []

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data)
          }
        }

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
          await processAudioInput(audioBlob)
        }

        mediaRecorder.start()
        setIsRecording(true)

        // Setup real-time transcription if enabled
        if (enableRealTimeTranscription) {
          setupRealTimeTranscription(stream)
        }
      } catch (error) {
        console.error('Error starting recording:', error)
        onError?.(error as Error)
      }
    }
  }, [isRecording, enableRealTimeTranscription, onError])

  // Process audio input (transcription + AI response)
  const processAudioInput = useCallback(async (audioBlob: Blob) => {
    setIsProcessing(true)

    try {
      // Convert audio to text using ElevenLabs or Web Speech API
      const transcription = await transcribeAudio(audioBlob)
      
      if (transcription) {
        const userMessage = addMessage({
          type: 'user',
          content: transcription,
          transcription,
        })

        // Process the transcribed message
        await processUserMessage(transcription)
      }
    } catch (error) {
      console.error('Error processing audio:', error)
      onError?.(error as Error)
    } finally {
      setIsProcessing(false)
    }
  }, [addMessage, onError])

  // Main message processing function
  const processUserMessage = useCallback(async (content: string) => {
    try {
      // Here you would integrate with your AI service (OpenAI, Claude, etc.)
      // For now, we'll simulate a response
      const aiResponse = await generateAIResponse(content)
      
      // Generate speech if voice output is enabled
      let audioUrl: string | undefined
      if (enableVoiceOutput && !isMuted) {
        audioUrl = await generateSpeech(aiResponse)
      }

      const assistantMessage = addMessage({
        type: 'assistant',
        content: aiResponse,
        audioUrl,
      })

      // Auto-play the response if voice output is enabled
      if (audioUrl && enableVoiceOutput && !isMuted) {
        setIsPlaying(true)
        // Audio will be handled by the AudioPlayer component
      }
    } catch (error) {
      console.error('Error generating response:', error)
      onError?.(error as Error)
    }
  }, [enableVoiceOutput, isMuted, addMessage, onError])

  // Setup real-time transcription
  const setupRealTimeTranscription = useCallback((stream: MediaStream) => {
    // This would typically use a streaming speech recognition service
    // For demo purposes, we'll simulate it
    if ('webkitSpeechRecognition' in window) {
      const recognition = new (window as any).webkitSpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US'

      recognition.onresult = (event: any) => {
        let interimTranscript = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            setRealTimeTranscript('')
          } else {
            interimTranscript += transcript
          }
        }
        if (interimTranscript) {
          setRealTimeTranscript(interimTranscript)
        }
      }

      recognition.start()
    }
  }, [])

  // Placeholder AI functions (to be implemented with actual services)
  const generateAIResponse = useCallback(async (input: string): Promise<string> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    return `I received your message: "${input}". This is a simulated AI response. In a real implementation, this would connect to your preferred AI service like OpenAI GPT, Claude, or others.`
  }, [])

  const transcribeAudio = useCallback(async (audioBlob: Blob): Promise<string> => {
    // This would use ElevenLabs Speech-to-Text or another service
    // For now, return a placeholder
    await new Promise(resolve => setTimeout(resolve, 500))
    return "This is a transcribed message from audio input."
  }, [])

  const generateSpeech = useCallback(async (text: string): Promise<string> => {
    // This would use ElevenLabs Text-to-Speech
    // For now, return a placeholder URL
    await new Promise(resolve => setTimeout(resolve, 800))
    return "data:audio/wav;base64,placeholder" // Placeholder audio URL
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Enter to send text (Ctrl/Cmd + Enter for new line)
      if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
        if (document.activeElement?.tagName === 'TEXTAREA') {
          event.preventDefault()
          handleTextSubmit()
        }
      }
      // Space to toggle recording (when not typing)
      if (event.code === 'Space' && event.altKey) {
        event.preventDefault()
        handleVoiceToggle()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleTextSubmit, handleVoiceToggle])

  return (
    <div className={cn("flex flex-col h-full max-w-4xl mx-auto", className)} {...props}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            <span className="font-medium">AI Assistant</span>
          </div>
          {isProcessing && (
            <Badge variant="secondary" className="animate-pulse">
              Processing...
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMuted(!isMuted)}
            className="text-muted-foreground"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Real-time transcription indicator */}
      {realTimeTranscript && (
        <div className="p-3 bg-muted/50 border-b">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span>Listening:</span>
            <span className="italic">{realTimeTranscript}</span>
          </div>
        </div>
      )}

      {/* Conversation Area */}
      <div className="flex-1 flex flex-col min-h-0">
        <Conversation className="flex-1">
          <ConversationContent>
            {messages.length === 0 ? (
              <ConversationEmptyState
                title="Ready to chat!"
                description="Start a conversation using voice or text input below."
                icon={<Mic className="w-8 h-8 text-muted-foreground" />}
              />
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id}>
                    <Message from={message.type === 'user' ? 'user' : 'assistant'}>
                      <div className="flex flex-col gap-2">
                        <div className="whitespace-pre-wrap">
                          {message.content}
                        </div>
                        {message.audioUrl && enableVoiceOutput && (
                          <div className="mt-1">
                            <audio
                              controls
                              src={message.audioUrl}
                              className="w-full max-w-sm h-8"
                              onPlay={() => setIsPlaying(true)}
                              onPause={() => setIsPlaying(false)}
                              onEnded={() => setIsPlaying(false)}
                            />
                          </div>
                        )}
                      </div>
                    </Message>
                  </div>
                ))}
              </div>
            )}
          </ConversationContent>
        </Conversation>
      </div>

      <Separator />

      {/* Input Area */}
      <div className="p-4 space-y-3">
        {/* Voice Input Controls */}
        {enableVoiceInput && (
          <div className="flex items-center gap-3">
            <VoiceButton
              state={isRecording ? 'recording' : isProcessing ? 'processing' : 'idle'}
              onPress={handleVoiceToggle}
              label={isRecording ? 'Stop Recording' : 'Start Recording'}
              trailing="⌥Space"
              className="flex-1"
            />
            {isRecording && (
              <div className="flex-1">
                <LiveWaveform
                  active={isRecording}
                  processing={isProcessing}
                  className="w-full"
                  height={32}
                />
              </div>
            )}
          </div>
        )}

        {/* Text Input */}
        {enableTextInput && (
          <div className="flex gap-2">
            <Textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Type your message... (Press Enter to send)"
              className="flex-1 min-h-[44px] max-h-32 resize-none"
              disabled={isProcessing}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleTextSubmit()
                }
              }}
            />
            <Button
              onClick={handleTextSubmit}
              disabled={!textInput.trim() || isProcessing}
              size="lg"
              className="shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Input Mode Indicator */}
        <div className="flex justify-center">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {enableVoiceInput && (
              <span className="flex items-center gap-1">
                <Mic className="w-3 h-3" />
                Voice enabled
              </span>
            )}
            {enableTextInput && (
              <span className="flex items-center gap-1">
                <Send className="w-3 h-3" />
                Text enabled
              </span>
            )}
            {enableRealTimeTranscription && (
              <span>Real-time transcription</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConversationalAIAgent