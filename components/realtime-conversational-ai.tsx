"use client"

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { Mic, MicOff, Volume2, VolumeX, Settings, Circle, PhoneOff, Send } from 'lucide-react'
import { useConversation } from '@elevenlabs/react'
import type { Status } from '@elevenlabs/react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { LiveWaveform } from '@/components/ui/live-waveform'
import { Orb, type AgentState } from '@/components/ui/orb'
import { MicSelector } from '@/components/ui/mic-selector'
import { ShimmeringText } from '@/components/ui/shimmering-text'
import { Waveform } from '@/components/ui/waveform'

export interface RealtimeConversationalAIProps {
  className?: string
  agentId?: string
  apiKey?: string
  onMessage?: (role: 'user' | 'assistant', message: string) => void
  onError?: (error: Error) => void
}

interface ConversationMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  message: string
  timestamp: Date
}

// Function to parse text and create hyperlinks
const parseMessageWithLinks = (text: string): React.ReactNode[] => {
  // Regular expressions for URLs and emails
  const urlWithProtocolRegex = /(https?:\/\/[^\s]+)/g;
  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/g;
  const urlWithoutProtocolRegex = /\b([a-zA-Z0-9][-a-zA-Z0-9]*\.(gov|com|org|net|edu|mil|us|ca|uk|info|io|co|ai|app|dev|tech|online|site|website|blog|shop|store|biz|me)(?:\/[^\s]*)?)\b/gi;
  
  let parts: (string | React.ReactNode)[] = [text];
  
  // Replace URLs with protocol (http/https)
  parts = parts.flatMap(part => {
    if (typeof part !== 'string') return part;
    const split = part.split(urlWithProtocolRegex);
    return split.map((segment, i) => 
      urlWithProtocolRegex.test(segment) 
        ? <a key={`url-proto-${i}`} href={segment} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">{segment}</a>
        : segment
    );
  });
  
  // Replace emails (do this before plain URLs to avoid conflicts)
  parts = parts.flatMap(part => {
    if (typeof part !== 'string') return part;
    const split = part.split(emailRegex);
    return split.map((segment, i) => 
      emailRegex.test(segment)
        ? <a key={`email-${i}`} href={`mailto:${segment}`} className="text-blue-400 hover:text-blue-300 underline">{segment}</a>
        : segment
    );
  });
  
  // Replace URLs without protocol (e.g., example.com, midlandtexas.gov/parks)
  parts = parts.flatMap((part, partIdx) => {
    if (typeof part !== 'string') return part;
    
    const matches: Array<{ text: string; index: number }> = [];
    let match;
    const regex = new RegExp(urlWithoutProtocolRegex);
    
    while ((match = regex.exec(part)) !== null) {
      matches.push({
        text: match[0],
        index: match.index
      });
    }
    
    if (matches.length === 0) return part;
    
    const result: (string | React.ReactNode)[] = [];
    let lastIndex = 0;
    
    matches.forEach((m, i) => {
      // Add text before the match
      if (m.index > lastIndex) {
        result.push(part.substring(lastIndex, m.index));
      }
      
      // Add the link
      result.push(
        <a key={`url-${partIdx}-${i}`} href={`https://${m.text}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">
          {m.text}
        </a>
      );
      
      lastIndex = m.index + m.text.length;
    });
    
    // Add remaining text
    if (lastIndex < part.length) {
      result.push(part.substring(lastIndex));
    }
    
    return result;
  });
  
  return parts as React.ReactNode[];
};

// Function to convert spelled-out numbers to digits in phone number contexts
const convertSpelledNumbersToDigits = (text: string): string => {
  // Map of word numbers to digits (including common phonetic variations)
  const wordToDigit: { [key: string]: string } = {
    'zero': '0', 'oh': '0', 'o': '0',
    'one': '1',
    'two': '2', 'to': '2', 'too': '2',
    'three': '3',
    'four': '4', 'for': '4',
    'five': '5',
    'six': '6',
    'seven': '7',
    'eight': '8',
    'nine': '9',
  };

  // Map for time expressions (expanded set)
  const timeWords: { [key: string]: string } = {
    'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
    'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9',
    'ten': '10', 'eleven': '11', 'twelve': '12'
  };

  let result = text;

  // Pattern to detect phone number context (e.g., "The number is: four... three... two...")
  const phoneNumberContextPattern = /(?:The number is:|phone number is:|call|reach them at:|contact them at:)\s*([^.!?]*(?:\.\.\.|,|\s)+[^.!?]*)/gi;
  
  result = result.replace(phoneNumberContextPattern, (match: string, numberPart: string) => {
    // Convert the number part
    const convertedNumber = numberPart.replace(/\b(zero|oh|o|one|two|to|too|three|four|for|five|six|seven|eight|nine)\b/gi, (word: string) => {
      return wordToDigit[word.toLowerCase()] || word;
    });
    
    // Clean up excessive dots and spaces
    const cleaned = convertedNumber
      .replace(/\.{2,}/g, ' ') // Replace multiple dots with space
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
    
    // Format as phone number if it's 10 digits
    const digitsOnly = cleaned.replace(/\D/g, '');
    if (digitsOnly.length === 10) {
      const formatted = `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
      return match.replace(numberPart, formatted);
    }
    
    return match.replace(numberPart, cleaned);
  });

  // Also handle sequences that look like phone numbers being spelled out
  // Matches 10 consecutive spelled numbers with various separators
  const spelledPhonePattern = /\b((?:zero|oh|o|one|two|to|too|three|four|for|five|six|seven|eight|nine)(?:\s*(?:\.\.\.|,|-|\.)\s*|\s+)){9}(?:zero|oh|o|one|two|to|too|three|four|for|five|six|seven|eight|nine)\b/gi;
  
  result = result.replace(spelledPhonePattern, (match: string) => {
    // Extract just the number words, ignoring all separators
    const words = match.toLowerCase().match(/\b(?:zero|oh|o|one|two|to|too|three|four|for|five|six|seven|eight|nine)\b/gi) || [];
    const digits = words.map((w: string) => wordToDigit[w.toLowerCase()] || w).join('');
    
    // Format as phone number if it's 10 digits
    if (digits.length === 10 && /^\d{10}$/.test(digits)) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    
    return digits;
  });

  // Convert time formats: "eight a.m." -> "8 a.m." (preserve for readability)
  result = result.replace(/\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(a\.m\.|p\.m\.|am|pm)\b/gi, (match: string, number: string, period: string) => {
    const digit = timeWords[number.toLowerCase()];
    return `${digit} ${period}`;
  });

  // Clean up any "Contact:" lines that might have been garbled
  result = result.replace(/Contact:\s*([^.\n]*)/gi, (match: string, content: string) => {
    const digitsOnly = content.replace(/\D/g, '');
    if (digitsOnly.length === 10) {
      return `Contact: (${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
    }
    return match;
  });

  // Handle individual digits with spaces/separators like "4 3 2 6 8 5 7 2 6 0"
  // Match sequences of exactly 10 single digits with spaces
  result = result.replace(/\b(\d)\s+(\d)\s+(\d)\s+(\d)\s+(\d)\s+(\d)\s+(\d)\s+(\d)\s+(\d)\s+(\d)\b/g, (match, ...digits) => {
    const phoneNumber = digits.slice(0, 10).join('');
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6)}`;
  });

  // Format any remaining 10-digit sequences as phone numbers
  // Matches: 4326857260, 432 685 7260, 432-685-7260, etc.
  result = result.replace(/\b(\d{3})[\s-]?(\d{3})[\s-]?(\d{4})\b/g, '($1) $2-$3');

  return result;
};

export const RealtimeConversationalAI: React.FC<RealtimeConversationalAIProps> = ({
  className,
  agentId: initialAgentId,
  apiKey,
  onMessage,
  onError,
}) => {
  // State management
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [currentTranscript, setCurrentTranscript] = useState('')
  const [streamingResponse, setStreamingResponse] = useState('')
  const [selectedMicDevice, setSelectedMicDevice] = useState<string>('')
  const [isMicMuted, setIsMicMuted] = useState(false)
  const [agentState, setAgentState] = useState<AgentState>(null)
  const [textInput, setTextInput] = useState('')
  const [connectionError, setConnectionError] = useState<string>('')
  const [conversationId, setConversationId] = useState<string>('')
  const [canSendFeedback, setCanSendFeedback] = useState(false)
  const [connectionType, setConnectionType] = useState<'websocket' | 'webrtc'>('websocket')
  const [agentId, setAgentId] = useState(initialAgentId || '')
  const [isAgentResponding, setIsAgentResponding] = useState(false)
  
  // Refs for volume levels
  const inputVolumeRef = useRef<number>(0)
  const outputVolumeRef = useRef<number>(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const currentTranscriptRef = useRef<string>('')
  
  // Use ElevenLabs Conversation hook with controlled micMuted state
  // This tells the SDK to respect our mute state
  const conversation = useConversation({
    apiKey: apiKey || undefined,
    micMuted: isMicMuted,
    onConnect: () => {
      console.log('✅ Connected to ElevenLabs Conversational AI')
      const sessionId = conversation.getId()
      if (sessionId) {
        setConversationId(sessionId)
        console.log('Connected with conversation ID:', sessionId)
      }
      setConnectionError('')
      // Don't add a system message - let the agent greet naturally
    },
    onDisconnect: (event) => {
      console.log('❌ Disconnected from ElevenLabs Conversational AI', event)
      
      // Clear any pending transcripts
      setCurrentTranscript('')
      
      // If we have a streaming response, finalize it
      if (streamingResponse) {
        addMessage('assistant', streamingResponse)
        setStreamingResponse('')
      }
      
      // Only show disconnect message if unexpected (not a clean close)
      if (event && typeof event === 'object' && 'wasClean' in event && !event.wasClean) {
        const closeEvent = event as CloseEvent
        if (closeEvent.code !== 1000 && closeEvent.code !== 1005) {
          // Not a normal closure - show error
          setConnectionError(`Disconnected unexpectedly (code: ${closeEvent.code}). ${closeEvent.reason || 'Please try reconnecting.'}`)
        }
      }
    },
    // Generic message handler - improved detection
    onMessage: (message) => {
      console.log('📨 onMessage received:', message)
      console.log('Full message object:', JSON.stringify(message))
      
      // Try to extract message content from various formats
      if (message && typeof message === 'object') {
        const msg = message as any
        
        // Check if message has direct content property
        if (msg.message) {
          // Determine if it's a user message (speech transcription) or agent response
          const isUserMessage = msg.source === 'user' || msg.role === 'user'
          const content = convertSpelledNumbersToDigits(msg.message)
          
          if (isUserMessage) {
            console.log('👤 User message detected:', content)
            setCurrentTranscript(content)
          } else {
            console.log('🤖 Agent message detected:', content)
            setStreamingResponse(prev => prev + content)
          }
        }
        // Fallback to checking type/role
        else if (msg.type === 'agent_response' || msg.role === 'assistant' || msg.source === 'ai') {
          const text = msg.text || msg.content
          if (text) {
            const convertedText = convertSpelledNumbersToDigits(text)
            console.log('🤖 Found agent text in onMessage:', convertedText)
            setStreamingResponse(prev => prev + convertedText)
          }
        }
        else if (msg.type === 'user_transcript' || msg.role === 'user' || msg.source === 'user') {
          const text = msg.text || msg.content
          if (text) {
            const convertedText = convertSpelledNumbersToDigits(text)
            console.log('👤 Found user text in onMessage:', convertedText)
            setCurrentTranscript(convertedText)
          }
        }
      }
      
      handleMessage(message)
    },
    // Agent chat response parts (streaming text parts) - THIS IS THE KEY ONE
    onAgentChatResponsePart: (part) => {
      console.log('🤖 onAgentChatResponsePart called with:', part)
      console.log('🔍 Current transcript ref value:', currentTranscriptRef.current)
      
      // Mark agent as responding - this will hide the user transcript bubble immediately
      setIsAgentResponding(true)
      
      // IMPORTANT: Delay finalization slightly to ensure we capture the FULL user transcript
      // The transcript might still be streaming in when agent starts responding
      setTimeout(() => {
        const pendingTranscript = currentTranscriptRef.current.trim()
        
        // Clear the transcript state
        currentTranscriptRef.current = ''
        setCurrentTranscript('')
        
        if (pendingTranscript) {
          console.log('🎤 Agent responding - finalizing pending user transcript:', pendingTranscript)
          addMessage('user', pendingTranscript)
        } else {
          console.log('✓ No pending transcript to finalize')
        }
        
        // Clear the timeout since we're finalizing now
        if (transcriptTimeoutRef.current) {
          clearTimeout(transcriptTimeoutRef.current)
          transcriptTimeoutRef.current = undefined
        }
      }, 200) // 200ms delay to capture the full transcript
      
      try {
        const text = (part as any).text ?? (part as any).content ?? (part as any).message ?? String(part)
        if (text && text.length > 0 && text !== '[object Object]') {
          const convertedText = convertSpelledNumbersToDigits(text)
          console.log('✅ Adding agent text (converted):', convertedText)
          setStreamingResponse(prev => {
            const newResponse = prev + convertedText
            console.log('📝 Streaming response now:', newResponse)
            
            // Clear any existing safety timeout
            if (responseTimeoutRef.current) {
              clearTimeout(responseTimeoutRef.current)
            }
            
            // Set a LONG safety timeout (3 seconds) as fallback only
            // Primary finalization should happen via isSpeaking state change
            responseTimeoutRef.current = setTimeout(() => {
              if (newResponse.trim()) {
                console.log('⏱️ Safety timeout: Finalizing agent response after 3s idle:', newResponse)
                setStreamingResponse('')
                addMessage('assistant', newResponse.trim())
              }
            }, 3000)
            
            return newResponse
          })
        }
      } catch (err) {
        console.error('❌ onAgentChatResponsePart error', err)
      }
    },
    // Audio chunk events - useful for debugging/playback
    onAudio: (audioEvent) => {
      // audioEvent may include info about partial audio streaming; we don't
      // directly render it here, but keep as hook for future features
      // console.debug('onAudio event', audioEvent)
    },
    onError: (error) => {
      console.error('❌ Conversation error:', error)
      
      // Handle different error types
      let errorMessage = 'Connection error occurred'
      
      // Check if it's a CloseEvent (WebSocket close)
      if (error && typeof error === 'object' && 'code' in error && 'type' in error) {
        const closeEvent = error as any
        console.log('WebSocket close code:', closeEvent.code, 'reason:', closeEvent.reason)
        
        if (closeEvent.code === 1006) {
          errorMessage = 'Connection closed unexpectedly. Please check your Agent ID and network connection.'
        } else if (closeEvent.code === 1008 || closeEvent.code === 1003) {
          errorMessage = 'Invalid Agent ID or authentication failed. Please verify your Agent ID is correct.'
        } else if (closeEvent.code === 4001) {
          errorMessage = 'Agent not found. Please verify your Agent ID exists in your ElevenLabs account.'
        } else if (closeEvent.code === 4003) {
          errorMessage = 'API key invalid or missing. Please check your ElevenLabs API configuration.'
        } else {
          errorMessage = `Connection closed (code: ${closeEvent.code}). ${closeEvent.reason || 'Please try reconnecting.'}`
        }
      } else if (typeof error === 'string') {
        errorMessage = error
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = (error as Error).message
      } else {
        errorMessage = 'An unexpected error occurred. Please try again.'
      }
      
      setConnectionError(errorMessage)
      
      // Always pass a proper Error object to onError callback
      const errorObj = typeof error === 'string' 
        ? new Error(error) 
        : new Error(errorMessage)
      onError?.(errorObj)
    },
    onModeChange: (mode) => {
      console.log('Mode changed:', mode)
    },
    onStatusChange: (status) => {
      console.log('Status changed:', status)
    },
    onCanSendFeedbackChange: (data) => {
      console.log('Can send feedback:', data)
      const canSend = typeof data === 'object' && 'canSendFeedback' in data ? data.canSendFeedback : data
      setCanSendFeedback(!!canSend)
    },
    onConversationMetadata: (metadata) => {
      console.log('Conversation metadata:', metadata)
    },
  })

  const isConnected = conversation.status === 'connected'
  const isConnecting = conversation.status === 'connecting'
  
  // Add message to history
  const addMessage = useCallback((role: 'user' | 'assistant' | 'system', message: string) => {
    // Convert spelled-out numbers to digits for user and assistant messages
    const processedMessage = (role === 'user' || role === 'assistant') 
      ? convertSpelledNumbersToDigits(message)
      : message;
    
    const newMessage: ConversationMessage = {
      id: Date.now().toString() + Math.random(),
      role,
      message: processedMessage,
      timestamp: new Date(),
    }
    
    setMessages(prev => [...prev, newMessage])
    if (role !== 'system') {
      onMessage?.(role, processedMessage)
    }
  }, [onMessage])
  
  // Update volume refs for Orb visualization
  useEffect(() => {
    if (isConnected) {
      const interval = setInterval(() => {
        inputVolumeRef.current = conversation.getInputVolume()
        outputVolumeRef.current = conversation.getOutputVolume()
      }, 50)
      
      return () => clearInterval(interval)
    }
  }, [isConnected, conversation])
  
  // Update agent state for Orb
  useEffect(() => {
    if (!isConnected) {
      setAgentState(null)
    } else if (conversation.isSpeaking) {
      setAgentState('talking')
    } else {
      setAgentState('listening')
    }
  }, [isConnected, conversation.isSpeaking])

  // Track when agent STOPS speaking to finalize the current message
  const prevIsSpeakingRef = useRef<boolean>(false)
  useEffect(() => {
    const wasSpeaking = prevIsSpeakingRef.current
    const isSpeakingNow = conversation.isSpeaking
    
    // Agent just STARTED speaking - finalize any pending user transcript immediately
    if (!wasSpeaking && isSpeakingNow) {
      const pendingTranscript = currentTranscriptRef.current.trim()
      if (pendingTranscript) {
        console.log('🎤 Agent started speaking - finalizing pending user transcript:', pendingTranscript)
        currentTranscriptRef.current = ''
        setCurrentTranscript('')
        addMessage('user', pendingTranscript)
        
        // Clear the timeout
        if (transcriptTimeoutRef.current) {
          clearTimeout(transcriptTimeoutRef.current)
          transcriptTimeoutRef.current = undefined
        }
      }
    }
    
    // Agent just stopped speaking - finalize the current streaming response immediately
    if (wasSpeaking && !isSpeakingNow && streamingResponse.trim()) {
      console.log('🛑 Agent stopped speaking - finalizing complete message:', streamingResponse)
      const finalText = streamingResponse.trim()
      
      // Clear streaming state FIRST to prevent duplicate
      setStreamingResponse('')
      
      // Agent finished responding - allow user transcript to show again
      setIsAgentResponding(false)
      
      // Add the complete message as one bubble
      addMessage('assistant', finalText)
      
      // Clear any pending timeout
      if (responseTimeoutRef.current) {
        clearTimeout(responseTimeoutRef.current)
        responseTimeoutRef.current = undefined
      }
    }
    
    prevIsSpeakingRef.current = isSpeakingNow
  }, [conversation.isSpeaking, streamingResponse, currentTranscript, addMessage])

  // Track previous transcript and response to detect changes
  const prevTranscriptRef = useRef<string>('')
  const prevStreamingRef = useRef<string>('')
  const transcriptTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const responseTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // Handle conversation messages
  const handleMessage = useCallback((message: any) => {
    console.log('🔔 Received message:', JSON.stringify(message, null, 2))
    
    // Handle different message types
    const msgType = message.type || message.message_type || message.event
    const msgRole = message.role || message.source
    
    console.log('Message type:', msgType, 'Role:', msgRole)
    
    if (msgType === 'user_transcript' || (msgType === 'transcript' && msgRole === 'user')) {
      // User is speaking (interim)
      const text = message.text || message.transcript || ''
      const convertedText = convertSpelledNumbersToDigits(text)
      console.log('👤 User interim transcript:', convertedText)
      currentTranscriptRef.current = convertedText
      setCurrentTranscript(convertedText)
      
      // Clear any existing timeout
      if (transcriptTimeoutRef.current) {
        clearTimeout(transcriptTimeoutRef.current)
      }
      
      // Set timeout to finalize if no new transcript comes in 1 second
      transcriptTimeoutRef.current = setTimeout(() => {
        const currentText = convertedText.trim()
        if (currentText && currentText === convertedText.trim()) {
          console.log('⏱️ Finalizing complete user transcript:', currentText)
          // Immediately clear the interim state BEFORE adding message to avoid duplication
          currentTranscriptRef.current = ''
          setCurrentTranscript('')
          addMessage('user', currentText)
        }
      }, 1000)
      
    } else if (msgType === 'agent_response' || (msgType === 'text' && msgRole === 'agent')) {
      // Agent is responding (streaming) - finalize any pending user transcript first
      const pendingTranscript = currentTranscriptRef.current.trim()
      if (pendingTranscript) {
        console.log('🎤 Agent response detected - finalizing pending user transcript:', pendingTranscript)
        currentTranscriptRef.current = ''
        setCurrentTranscript('')
        addMessage('user', pendingTranscript)
        
        if (transcriptTimeoutRef.current) {
          clearTimeout(transcriptTimeoutRef.current)
          transcriptTimeoutRef.current = undefined
        }
      }
      
      // Now accumulate agent response
      const text = message.text || message.content || ''
      const convertedText = convertSpelledNumbersToDigits(text)
      console.log('🤖 Agent response chunk:', convertedText)
      setStreamingResponse(prev => prev + convertedText)
    } else if (msgType === 'agent_response_complete' || msgType === 'agent_turn_complete' || 
               msgType === 'response_done' || message.complete === true) {
      // Agent explicitly completed this turn - finalize immediately
      console.log('✅ Agent response complete event received')
      if (responseTimeoutRef.current) {
        clearTimeout(responseTimeoutRef.current)
      }
      const finalText = (message.text || streamingResponse).trim()
      if (finalText) {
        console.log('💬 Finalizing agent message immediately:', finalText)
        setStreamingResponse('')
        addMessage('assistant', finalText)
      }
    } else {
      console.log('⚠️ Unknown message type:', msgType, 'Full message:', message)
    }
  }, [addMessage])

  // Keep the connection alive by sending user activity signals
  const handleUserActivity = useCallback(() => {
    if (isConnected && conversation.sendUserActivity) {
      conversation.sendUserActivity()
    }
  }, [isConnected, conversation])

  // Toggle mute/unmute function
  const handleToggleMute = useCallback(() => {
    setIsMicMuted(prev => {
      const newMutedState = !prev
      addMessage('system', newMutedState ? '🔇 Microphone muted' : '🎤 Microphone unmuted')
      return newMutedState
    })
  }, [addMessage])

  // Start conversation from header button
  const handleStartConversation = useCallback(async () => {
    if (!agentId) {
      const errorMsg = 'Agent ID is required to start the conversation'
      setConnectionError(errorMsg)
      onError?.(new Error(errorMsg))
      return
    }

    try {
      setConnectionError('')
      
      await conversation.startSession({ 
        agentId, 
        connectionType 
      })
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to connect'
      setConnectionError(errorMsg)
      console.error('Failed to connect:', error)
      addMessage('system', `❌ Failed to connect: ${errorMsg}`)
      onError?.(error instanceof Error ? error : new Error(errorMsg))
    }
  }, [agentId, addMessage, conversation, connectionType, onError])

  // Send feedback (like/dislike)
  const handleSendFeedback = useCallback((isPositive: boolean) => {
    if (canSendFeedback && conversation.sendFeedback) {
      conversation.sendFeedback(isPositive)
      addMessage('system', isPositive ? '👍 Thanks for your positive feedback!' : '👎 Thanks for your feedback!')
      console.log('Feedback sent:', isPositive ? 'positive' : 'negative')
    }
  }, [canSendFeedback, conversation, addMessage])

  // Handle text input submission with auto-connect
  const handleTextSubmit = useCallback(async () => {
    if (!textInput.trim()) return
    
    const messageToSend = textInput.trim()
    setTextInput('')
    
    // Auto-connect if not connected
    if (!isConnected) {
      if (!agentId) {
        const errorMsg = 'Agent ID is required to start the conversation'
        setConnectionError(errorMsg)
        onError?.(new Error(errorMsg))
        return
      }
      
      try {
        setConnectionError('')
        
        await conversation.startSession({ 
          agentId, 
          connectionType 
        })
        
        // Wait a moment for connection to establish
        await new Promise(resolve => setTimeout(resolve, 1500))
        
        // Send the message
        addMessage('user', messageToSend)
        console.log('Sending message:', messageToSend)
        conversation.sendUserMessage(messageToSend)
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to connect'
        setConnectionError(errorMsg)
        console.error('Failed to connect:', error)
        addMessage('system', `❌ Failed to connect: ${errorMsg}`)
        onError?.(error instanceof Error ? error : new Error(errorMsg))
      }
    } else {
      // Already connected, just send
      addMessage('user', messageToSend)
      
      try {
        console.log('Sending message to agent:', messageToSend)
        conversation.sendUserMessage(messageToSend)
        console.log('Message sent successfully')
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to send message'
        console.error('Failed to send text message:', error)
        addMessage('system', `❌ Failed to send message: ${errorMsg}`)
      }
    }
  }, [textInput, isConnected, agentId, addMessage, conversation, onError])

  // Get status indicators
  const getConnectionStatus = (): 'connected' | 'connecting' | 'disconnected' | 'error' => {
    if (conversation.status === 'connected') return 'connected'
    if (conversation.status === 'connecting') return 'connecting'
    if (conversation.status === 'disconnected') return 'disconnected'
    return 'error'
  }
  
  // Auto-scroll to bottom when messages or streaming content changes (but not on initial load)
  useEffect(() => {
    // Only auto-scroll if there are messages or active conversation
    if (messages.length > 0 || streamingResponse || currentTranscript) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, streamingResponse, currentTranscript])
  
  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (transcriptTimeoutRef.current) {
        clearTimeout(transcriptTimeoutRef.current)
      }
      if (responseTimeoutRef.current) {
        clearTimeout(responseTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div className={cn("flex flex-col h-full bg-white", className)}>
      {/* Header - Static Black Banner */}
      <div className="bg-black text-white p-4 shadow-md">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Left: Orb and Title */}
            <div className="flex items-center gap-4">
              {/* ElevenLabs Orb */}
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-16 h-16">
                  <Orb 
                    agentState={agentState}
                    colors={["#00599c", "#76B9F0"]}
                    inputVolumeRef={inputVolumeRef}
                    outputVolumeRef={outputVolumeRef}
                    className="w-full h-full"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={cn("w-1.5 h-1.5 rounded-full", isConnected ? "bg-green-400 animate-pulse" : "bg-gray-300")} />
                  <span className="text-xs text-white/90">
                    {isConnected ? (agentState === 'talking' ? 'Speaking' : 'Listening') : 'Offline'}
                  </span>
                </div>
              </div>
              
              {/* Title */}
              <div className="text-left">
                <h1 className="text-xl md:text-2xl font-semibold m-0">CivAIgentics</h1>
                <p className="text-sm opacity-90 font-normal mt-0.5">AI Conversational Demo</p>
              </div>
            </div>
            
            {/* Right: Agent ID Input and Connection Controls */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                placeholder="Enter Agent ID"
                disabled={isConnected}
                className="w-56 px-3 py-1.5 text-sm text-gray-700 bg-white border border-white/20 rounded-md focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-60 disabled:cursor-not-allowed"
              />
              {!isConnected ? (
                <button
                  onClick={handleStartConversation}
                  disabled={!agentId}
                  className="px-4 py-1.5 text-sm font-medium bg-green-500 hover:bg-green-600 text-white rounded-md transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Mic className="w-4 h-4" />
                  Start
                </button>
              ) : (
                <button
                  onClick={() => conversation.endSession()}
                  className="px-4 py-1.5 text-sm font-medium bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors flex items-center gap-2"
                >
                  <PhoneOff className="w-4 h-4" />
                  End
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto overflow-hidden">
        <div className="flex-1 flex flex-col bg-gray-200 overflow-hidden">
          {/* Connection Error Alert */}
          {connectionError && (
            <div className="mx-4 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Circle className="w-5 h-5 text-red-500 fill-red-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-red-900 mb-1">
                    Connection Error
                  </h4>
                  <p className="text-sm text-red-800 mb-2">
                    {connectionError}
                  </p>
                  <details className="text-xs text-red-700">
                    <summary className="cursor-pointer hover:underline">Common solutions</summary>
                    <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
                      <li>Verify your Agent ID is correct (check ElevenLabs dashboard)</li>
                      <li>Ensure your agent is published and active</li>
                      <li>Check browser console for detailed error messages</li>
                      <li>Try refreshing the page and reconnecting</li>
                      <li>Make sure microphone permissions are granted</li>
                    </ul>
                  </details>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConnectionError('')}
                  className="shrink-0"
                >
                  ✕
                </Button>
              </div>
            </div>
          )}

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8 min-h-[400px]">
            <div className="flex flex-col gap-4">
            {/* Welcome state when no messages */}
            {messages.length === 0 && !currentTranscript && !streamingResponse && (
              <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center px-8">
                <div className="mb-6">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
                    <Mic className="w-10 h-10 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    Welcome to CivAIgentics Demo
                  </h2>
                  <p className="text-muted-foreground max-w-md">
                    {isConnected 
                      ? "I'm ready to assist you! Start speaking or type your message below."
                      : "Click 'Start Conversation' to begin, or simply type a message to auto-connect and chat with the AI agent."
                    }
                  </p>
                </div>
                {!isConnected && (
                  <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Circle className="w-2 h-2 fill-blue-500 text-blue-500" />
                      <span>Natural voice conversations</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Circle className="w-2 h-2 fill-purple-500 text-purple-500" />
                      <span>Real-time text chat</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Circle className="w-2 h-2 fill-green-500 text-green-500" />
                      <span>Intelligent responses</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Render all messages in chronological order */}
            {messages.map((message: ConversationMessage, index: number) => {
              const isUser = message.role === 'user'
              const isAgent = message.role === 'assistant'
              const isSystem = message.role === 'system'
              
              return (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3 items-start animate-in fade-in",
                    isUser ? 'flex-row-reverse' : 'flex-row',
                    isSystem && 'justify-center'
                  )}
                >
                  {/* Orb - only for user and agent messages */}
                  {!isSystem && (
                    <div className="w-10 h-10 shrink-0">
                      <Orb
                        agentState={isAgent ? 'talking' : null}
                        colors={isUser ? ["#EF4444", "#FCA5A5"] : ["#00599c", "#76B9F0"]}
                        className="w-full h-full"
                      />
                    </div>
                  )}
                  
                  {/* Message Bubble */}
                  <div
                    className={cn(
                      "flex flex-col gap-2 p-4 rounded-lg max-w-[75%]",
                      isSystem 
                        ? 'bg-yellow-50 text-yellow-900 text-center text-sm max-w-[90%]'
                        : isUser
                        ? 'bg-[#8B1538] text-white rounded-br-sm'
                        : 'bg-[#04386D] text-white rounded-bl-sm'
                    )}
                  >
                    <span className="text-[0.85rem] font-bold opacity-90">
                      {isUser ? 'User' : isAgent ? 'Agent' : 'System'}
                    </span>
                    <div className="leading-relaxed break-words">
                      {parseMessageWithLinks(message.message)}
                    </div>
                    <span className="text-xs opacity-60 self-end">
                      {message.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              )
            })}
            
            {/* Show live user transcript ONLY if it's not empty, we're getting transcripts, AND agent is NOT responding */}
            {currentTranscript && currentTranscript.trim() && !isAgentResponding && (
              <div className="flex gap-3 items-start flex-row-reverse animate-in fade-in">
                <div className="w-10 h-10 shrink-0">
                  <Orb
                    agentState="listening"
                    colors={["#EF4444", "#FCA5A5"]}
                    className="w-full h-full"
                  />
                </div>
                <div className="max-w-[75%] rounded-2xl px-4 py-3 shadow-sm bg-[#8B1538] text-white border-2 border-[#6B0F2A] animate-pulse">
                  <div className="text-xs font-semibold mb-1 opacity-80">User</div>
                  <div className="text-sm whitespace-pre-wrap leading-relaxed italic">
                    {parseMessageWithLinks(currentTranscript)}
                  </div>
                  <span className="text-xs opacity-60 mt-1.5 block">Speaking...</span>
                </div>
              </div>
            )}
            
            {/* Show streaming agent response (live) */}
            {streamingResponse && streamingResponse.trim() && (
              <div className="flex gap-3 items-start animate-in fade-in">
                <div className="w-10 h-10 shrink-0">
                  <Orb
                    agentState="talking"
                    colors={["#00599c", "#76B9F0"]}
                    className="w-full h-full"
                  />
                </div>
                <div className="max-w-[75%] rounded-2xl px-4 py-3 shadow-sm bg-blue-900 text-white border-2 border-blue-700 animate-pulse">
                  <div className="text-xs font-semibold mb-1 opacity-80">Agent</div>
                  <div className="text-sm whitespace-pre-wrap leading-relaxed">
                    {parseMessageWithLinks(streamingResponse)}
                  </div>
                  <span className="text-xs opacity-60 mt-1.5 block flex items-center gap-1">
                    <Circle className="w-2 h-2 fill-white animate-pulse" />
                    Responding...
                  </span>
                </div>
              </div>
            )}
            
              {/* Scroll anchor */}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area - Fixed at bottom */}
          <div className="border-t border-gray-200 p-4 md:p-6 bg-white">
            <div className="space-y-4">
              <div className="flex gap-3 items-center max-w-5xl mx-auto">
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => {
                    setTextInput(e.target.value)
                    handleUserActivity()
                  }}
                  placeholder={isConnected ? "Type your message or speak..." : "Type a message to start..."}
                  className="flex-1 px-5 py-3.5 border border-gray-300 rounded-full text-base bg-gray-50 focus:outline-none focus:border-[#00599c] focus:bg-white focus:shadow-[0_0_0_3px_rgba(0,89,156,0.1)] transition-all placeholder:text-gray-400"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleTextSubmit()
                    }
                  }}
                  onFocus={handleUserActivity}
                />
                <button
                  onClick={handleTextSubmit}
                  disabled={!textInput.trim()}
                  className="w-11 h-11 flex items-center justify-center bg-[#00599c] text-white rounded-full shrink-0 hover:bg-[#04386D] hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none transition-all"
                >
                  <Send className="w-5 h-5" />
                </button>
                
                {isConnected ? (
                  <>
                    {/* Mute/Unmute Button */}
                    <button
                      type="button"
                      onClick={handleToggleMute}
                      className={cn(
                        "w-11 h-11 flex items-center justify-center rounded-full shrink-0 transition-all hover:scale-105",
                        isMicMuted 
                          ? "bg-red-500 hover:bg-red-600" 
                          : "bg-green-500 hover:bg-green-600"
                      )}
                      title={isMicMuted ? "Unmute Microphone" : "Mute Microphone"}
                    >
                      {isMicMuted ? <MicOff className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5 text-white" />}
                    </button>
                    
                    {/* End Call Button */}
                    <button
                      type="button"
                      onClick={() => {
                        conversation.endSession()
                        addMessage('system', '👋 Conversation ended')
                      }}
                      className="w-11 h-11 flex items-center justify-center bg-red-500 text-white rounded-full shrink-0 hover:bg-red-600 hover:scale-105 transition-all"
                      title="End Call"
                    >
                      <PhoneOff className="w-5 h-5" />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (!agentId) {
                        const errorMsg = 'Agent ID is required to start the conversation'
                        setConnectionError(errorMsg)
                        onError?.(new Error(errorMsg))
                        return
                      }
                      setConnectionError('')
                      try {
                        conversation.startSession({ agentId, connectionType })
                      } catch (err) {
                        const errorMsg = err instanceof Error ? err.message : 'Failed to start conversation'
                        setConnectionError(errorMsg)
                        onError?.(err instanceof Error ? err : new Error(errorMsg))
                      }
                    }}
                    className="w-11 h-11 flex items-center justify-center bg-green-500 text-white rounded-full shrink-0 hover:bg-green-600 hover:scale-105 transition-all"
                    title="Start Voice Call"
                  >
                    <Mic className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-black text-white px-4 py-3">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
            {/* Left: Company Info */}
            <div className="text-center md:text-left">
              <span className="font-semibold">Powered by CIVAIGENTICS, LLC</span>
              <span className="hidden md:inline mx-2 opacity-50">•</span>
              <span className="block md:inline opacity-90">Dr. Steven Sierra Alcabes</span>
            </div>
            
            {/* Center: Contact */}
            <div className="flex items-center gap-3">
              <a
                href="https://civaigentics.io"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#76B9F0] hover:text-white transition-colors font-medium"
              >
                civaigentics.io
              </a>
              <span className="opacity-50">•</span>
              <a
                href="tel:+13256501770"
                className="text-[#76B9F0] hover:text-white transition-colors font-medium"
              >
                (325) 650-1770
              </a>
            </div>
            
            {/* Right: Feedback */}
            <div>
              <a
                href="https://www.surveymonkey.com/r/ZWZFSJ6"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#76B9F0] hover:text-white transition-colors font-medium underline"
              >
                Share Feedback
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RealtimeConversationalAI
