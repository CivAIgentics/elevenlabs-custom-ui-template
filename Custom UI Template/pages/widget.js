import { useState, useCallback } from 'react';
import { useConversation } from '@elevenlabs/react';
import styles from '../styles/widget.module.css';

// Function to parse text and create hyperlinks
const parseMessageWithLinks = (text) => {
  const urlWithProtocolRegex = /(https?:\/\/[^\s]+)/g;
  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/g;
  const urlWithoutProtocolRegex = /\b([a-zA-Z0-9][-a-zA-Z0-9]*\.(gov|com|org|net|edu|mil|us|ca|uk|info|io|co|ai|app|dev|tech|online|site|website|blog|shop|store|biz|me)(?:\/[^\s]*)?)\b/gi;
  
  let parts = [text];
  
  parts = parts.flatMap(part => {
    if (typeof part !== 'string') return part;
    const split = part.split(urlWithProtocolRegex);
    return split.map((segment, i) => 
      urlWithProtocolRegex.test(segment) 
        ? <a key={`url-proto-${i}`} href={segment} target="_blank" rel="noopener noreferrer" className={styles.link}>{segment}</a>
        : segment
    );
  });
  
  parts = parts.flatMap(part => {
    if (typeof part !== 'string') return part;
    const split = part.split(emailRegex);
    return split.map((segment, i) => 
      emailRegex.test(segment)
        ? <a key={`email-${i}`} href={`mailto:${segment}`} className={styles.link}>{segment}</a>
        : segment
    );
  });
  
  parts = parts.flatMap((part, partIdx) => {
    if (typeof part !== 'string') return part;
    
    const matches = [];
    let match;
    const regex = new RegExp(urlWithoutProtocolRegex);
    
    while ((match = regex.exec(part)) !== null) {
      matches.push({
        text: match[0],
        index: match.index
      });
    }
    
    if (matches.length === 0) return part;
    
    const result = [];
    let lastIndex = 0;
    
    matches.forEach((m, i) => {
      if (m.index > lastIndex) {
        result.push(part.substring(lastIndex, m.index));
      }
      
      result.push(
        <a key={`url-${partIdx}-${i}`} href={`https://${m.text}`} target="_blank" rel="noopener noreferrer" className={styles.link}>
          {m.text}
        </a>
      );
      
      lastIndex = m.index + m.text.length;
    });
    
    if (lastIndex < part.length) {
      result.push(part.substring(lastIndex));
    }
    
    return result;
  });
  
  return parts;
};

const AGENT_ID = 'agent_8601k89mc91repq8xd2zg2brmkkq';

export default function WidgetPage() {
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const conversation = useConversation({
    onConnect: () => {
      console.log('✅ Connected to ElevenLabs agent');
      console.log('Input volume:', conversation.getInputVolume?.());
      console.log('Output volume:', conversation.getOutputVolume?.());
      setIsConnected(true);
      // Don't show connection message in chat
    },
    onDisconnect: (disconnectEvent) => {
      console.log('❌ Disconnected from agent');
      console.log('Disconnect event details:', disconnectEvent);
      setIsConnected(false);
      
      // Handle abnormal disconnects (code 1006)
      if (disconnectEvent?.code === 1006) {
        console.error('Abnormal disconnect (1006) - possible causes: API key issue, network problem, or agent configuration');
        addMessage('error', 'Connection failed. Please check your internet connection and try again.');
      }
    },
    onMessage: (message) => {
      console.log('📨 Message received:', message);
      if (message.message) {
        const isUserMessage = message.source === 'user' || message.role === 'user';
        console.log(`Message type: ${isUserMessage ? 'USER' : 'AGENT'}, Content:`, message.message);
        addMessage(isUserMessage ? 'user' : 'agent', message.message);
      }
      console.log('Full message object:', JSON.stringify(message));
    },
    onAudio: (audio) => {
      console.log('🔊 Audio received:', audio);
    },
    onError: (error) => {
      console.error('❌ Error:', error);
      addMessage('error', `Error: ${error.message}`);
    },
    onModeChange: (mode) => {
      console.log('🔄 Mode changed to:', mode);
      // Don't show mode changes in the chat
    },
    onStatusChange: (status) => {
      console.log('📊 Status changed:', status);
    },
  });

  const addMessage = useCallback((type, content) => {
    setMessages(prev => [...prev, { type, content, timestamp: Date.now() }]);
  }, []);

  const handleConnect = async () => {
    if (isConnected) return;
    
    try {
      // Unlock audio context with user interaction
      if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        const audioContext = new AudioContextClass();
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
          console.log('Audio context resumed');
        }
        audioContext.close();
      }
      
      // Request microphone permission
      addMessage('system', 'Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('Microphone access granted');
      
      // Stop the test stream, the conversation will handle it
      stream.getTracks().forEach(track => track.stop());
      
      addMessage('system', 'Connecting to Jacky...');
      
      // Get signed URL from our API endpoint
      console.log('Fetching signed URL...');
      const signedUrlResponse = await fetch('/api/get-signed-url');
      if (!signedUrlResponse.ok) {
        throw new Error('Failed to get signed URL from server');
      }
      const { signedUrl } = await signedUrlResponse.json();
      console.log('Got signed URL, starting session...');
      
      const conversationId = await conversation.startSession({
        signedUrl: signedUrl,
      });
      console.log('Connected with conversation ID:', conversationId);
    } catch (error) {
      console.error('Failed to start conversation:', error);
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        addMessage('error', 'Microphone permission denied. Please allow microphone access to use voice chat.');
      } else {
        addMessage('error', `Failed to connect: ${error.message}`);
      }
    }
  };

  const handleDisconnect = () => {
    conversation.endSession();
    addMessage('system', 'Conversation ended');
  };

  const handleSendText = async (e) => {
    e.preventDefault();
    if (!textInput.trim()) return;

    const messageToSend = textInput.trim();
    setTextInput('');
    
    if (!isConnected) {
      try {
        addMessage('system', 'Connecting to Jacky...');
        
        // Get signed URL from our API endpoint
        const signedUrlResponse = await fetch('/api/get-signed-url');
        if (!signedUrlResponse.ok) {
          throw new Error('Failed to get signed URL from server');
        }
        const { signedUrl } = await signedUrlResponse.json();
        
        const conversationId = await conversation.startSession({
          signedUrl: signedUrl,
        });
        console.log('Connected with conversation ID:', conversationId);
        
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        addMessage('user', messageToSend);
        console.log('Sending message:', messageToSend);
        conversation.sendUserMessage(messageToSend);
      } catch (error) {
        console.error('Failed to connect:', error);
        addMessage('error', `Failed to connect: ${error.message}`);
        return;
      }
    } else {
      addMessage('user', messageToSend);
      
      try {
        console.log('Sending message to agent:', messageToSend);
        conversation.sendUserMessage(messageToSend);
        console.log('Message sent successfully');
      } catch (error) {
        console.error('Failed to send text message:', error);
        addMessage('error', `Failed to send message: ${error.message}`);
      }
    }
  };

  const handleToggleMute = () => {
    if (conversation.isMuted) {
      conversation.unmute();
      addMessage('system', 'Microphone unmuted');
    } else {
      conversation.mute();
      addMessage('system', 'Microphone muted');
    }
  };

  console.log('Widget render - isExpanded:', isExpanded);

  // Notify parent window of widget state changes
  const notifyParent = useCallback((type) => {
    if (window.parent !== window) {
      window.parent.postMessage({ type }, '*');
    }
  }, []);

  const handleExpand = useCallback(() => {
    console.log('Button clicked, expanding widget');
    setIsExpanded(true);
    notifyParent('widgetExpanded');
  }, [notifyParent]);

  const handleCollapse = useCallback(() => {
    console.log('Closing widget');
    setIsExpanded(false);
    notifyParent('widgetCollapsed');
  }, [notifyParent]);

  return (
    <div className={styles.pageContainer}>
      {/* Collapsed Widget Button */}
      {!isExpanded && (
        <button 
          className={styles.widgetButton}
          onClick={handleExpand}
          aria-label="Open Jacky 2.0 Chat"
        >
          <div className={styles.widgetTop}>
            <div className={styles.widgetAvatar}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" fill="#00599c"/>
                <circle cx="12" cy="12" r="6" fill="#ffffff"/>
                <circle cx="12" cy="12" r="3" fill="#00599c"/>
              </svg>
            </div>
            <span className={styles.widgetGreeting}>Hi, I'm Jacky 2.0 - Test 👋!</span>
          </div>
          <div className={styles.widgetCta}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.487 17.14l-4.065-3.696a1.001 1.001 0 0 0-1.391.043l-2.393 2.461c-.576-.11-1.734-.471-2.926-1.66-1.192-1.193-1.553-2.354-1.66-2.926l2.459-2.394a1 1 0 0 0 .043-1.391L6.859 3.513a1 1 0 0 0-1.391-.087l-2.17 1.861a1 1 0 0 0-.29.649c-.015.25-.301 6.172 4.291 10.766C11.305 20.707 16.323 21 17.705 21c.202 0 .326-.006.359-.008a.992.992 0 0 0 .648-.291l1.86-2.171a.997.997 0 0 0-.085-1.39z"/>
            </svg>
            <span>How can I help you?</span>
          </div>
        </button>
      )}

      {/* Expanded Widget Window */}
      {isExpanded && (
        <div className={styles.widgetWindow}>
          <div className={styles.widgetHeader}>
            <div className={styles.widgetHeaderContent}>
              <div className={styles.widgetTitleSection}>
                <h1>City of Midland, Texas</h1>
                <p className={styles.widgetSubtitle}>Jacky 2.0 - Test</p>
              </div>
              <button 
                className={styles.widgetCloseBtn}
                onClick={handleCollapse}
                aria-label="Close chat"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
          </div>

          <div className={styles.widgetContent}>
            <div className={styles.messagesContainer}>
              <div className={styles.messages}>
                {messages.length === 0 ? (
                  <div className={styles.welcomeState}>
                    <h2>Welcome to Jacky 2.0 - Test</h2>
                    <p>Type a message below or click the phone icon to start speaking</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <div key={idx} className={`${styles.message} ${styles[msg.type]}`}>
                      <span className={styles.messageType}>
                        {msg.type === 'agent' ? 'Jacky 2.0' : 
                         msg.type === 'user' ? 'User' :
                         msg.type === 'error' ? 'Error' : 'System'}
                      </span>
                      <span className={styles.messageContent}>
                        {parseMessageWithLinks(msg.content)}
                      </span>
                      <span className={styles.timestamp}>
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className={styles.inputArea}>
              <form onSubmit={handleSendText} className={styles.inputForm}>
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder={isConnected ? "Type your message or speak..." : "Type a message to start..."}
                  className={styles.messageInput}
                  autoFocus
                />
                <button 
                  type="submit" 
                  className={styles.sendBtn}
                  disabled={!textInput.trim()}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2 10l18-8-8 18-2-8-8-2z"/>
                  </svg>
                </button>
                
                {isConnected ? (
                  <>
                    <button
                      type="button"
                      onClick={handleToggleMute}
                      className={`${styles.phoneBtn} ${conversation.isMuted ? styles.muted : ''}`}
                      title="Toggle Microphone"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.487 17.14l-4.065-3.696a1.001 1.001 0 0 0-1.391.043l-2.393 2.461c-.576-.11-1.734-.471-2.926-1.66-1.192-1.193-1.553-2.354-1.66-2.926l2.459-2.394a1 1 0 0 0 .043-1.391L6.859 3.513a1 1 0 0 0-1.391-.087l-2.17 1.861a1 1 0 0 0-.29.649c-.015.25-.301 6.172 4.291 10.766C11.305 20.707 16.323 21 17.705 21c.202 0 .326-.006.359-.008a.992.992 0 0 0 .648-.291l1.86-2.171a.997.997 0 0 0-.085-1.39z"/>
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={handleDisconnect}
                      className={styles.disconnectBtn}
                      title="End Call"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M16.707 2.293a1 1 0 0 0-1.414 0L12 5.586 8.707 2.293a1 1 0 0 0-1.414 1.414L10.586 7l-3.293 3.293a1 1 0 1 0 1.414 1.414L12 8.414l3.293 3.293a1 1 0 0 0 1.414-1.414L13.414 7l3.293-3.293a1 1 0 0 0 0-1.414z"/>
                      </svg>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleConnect}
                    className={styles.connectBtn}
                    title="Start Voice Call"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.487 17.14l-4.065-3.696a1.001 1.001 0 0 0-1.391.043l-2.393 2.461c-.576-.11-1.734-.471-2.926-1.66-1.192-1.193-1.553-2.354-1.66-2.926l2.459-2.394a1 1 0 0 0 .043-1.391L6.859 3.513a1 1 0 0 0-1.391-.087l-2.17 1.861a1 1 0 0 0-.29.649c-.015.25-.301 6.172 4.291 10.766C11.305 20.707 16.323 21 17.705 21c.202 0 .326-.006.359-.008a.992.992 0 0 0 .648-.291l1.86-2.171a.997.997 0 0 0-.085-1.39z"/>
                    </svg>
                  </button>
                )}
              </form>
            </div>

            <div className={styles.widgetFooter}>
              <div className={styles.widgetFooterContent}>
                <div className={styles.statusSection}>
                  <span className={`${styles.statusIndicator} ${isConnected ? styles.online : styles.offline}`}></span>
                  <span className={styles.statusText}>{isConnected ? 'Listening' : 'Not Listening'}</span>
                </div>
                <span className={styles.poweredBy}>• Powered by City of Midland AI Team</span>
                <a 
                  href="https://cityofmidlandtx.gov1.qualtrics.com/jfe/form/SV_0OPsa3AFYQafkSa" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={styles.surveyLink}
                >
                  Share Feedback
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
