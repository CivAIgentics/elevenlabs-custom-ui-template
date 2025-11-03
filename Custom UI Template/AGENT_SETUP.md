# ElevenLabs Voice Agent - Setup Guide

This guide will help you set up and use the ElevenLabs Voice Agent feature in this Next.js application.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd /workspaces/codespaces-nextjs/elevenlabs-nextjs
npm install
```

### 2. Set Up Environment Variables

1. Copy the example environment file:
```bash
cp .env.local.example .env.local
```

2. Get your ElevenLabs API Key:
   - Go to [ElevenLabs](https://elevenlabs.io/)
   - Sign in or create an account
   - Navigate to your profile settings
   - Copy your API key

3. Create a Conversational AI Agent:
   - Go to [ElevenLabs Conversational AI](https://elevenlabs.io/app/conversational-ai)
   - Click "Create New Agent"
   - Configure your agent's voice, personality, and behavior
   - Copy the Agent ID

4. Update `.env.local`:
```bash
ELEVENLABS_API_KEY=ccec7000071ed43f44e871beea501f955bb406c6354f5026807b6ef7b36780e3
NEXT_PUBLIC_ELEVENLABS_AGENT_ID=agent_8601k89mc91repq8xd2zg2brmkkq
```

### 3. Run the Development Server

```bash
npm run dev
```

### 4. Access the Voice Agent

Open your browser and navigate to:
- Main page: http://localhost:3000
- Voice Agent: http://localhost:3000/agent

## 🎤 Using the Voice Agent

1. **Start Conversation**:
   - Enter your Agent ID (or it will use the one from .env.local)
   - Click "Start Conversation"
   - Allow microphone permissions when prompted

2. **Talk to Your Agent**:
   - Speak naturally - the agent will listen and respond
   - The conversation log shows all interactions
   - Use the Mute button to temporarily disable your microphone

3. **End Conversation**:
   - Click "End Conversation" when you're done
   - The session will be terminated and you can start a new one

## 🎨 Features

- **Real-time Voice Conversation**: Bidirectional audio streaming with your AI agent
- **Visual Feedback**: See when the agent is speaking or listening
- **Conversation Log**: Track all messages exchanged during the session
- **Microphone Control**: Mute/unmute functionality
- **Status Indicators**: Connection status and agent state
- **Modern UI**: Beautiful, responsive design

## 🔧 Troubleshooting

### Microphone Not Working
- Ensure you've granted microphone permissions to your browser
- Check your browser's site settings (🔒 icon in address bar)
- Try using Chrome or Edge for best compatibility

### Agent Not Responding
- Verify your Agent ID is correct
- Check that your ElevenLabs API key is valid
- Ensure your agent is properly configured in the ElevenLabs dashboard
- Check the browser console for error messages

### Connection Issues
- Make sure you have a stable internet connection
- WebRTC/WebSocket connections may be blocked by corporate firewalls
- Try disabling VPN if you're using one

## 📚 Learn More

- [ElevenLabs Documentation](https://elevenlabs.io/docs)
- [ElevenLabs React SDK](https://www.npmjs.com/package/@elevenlabs/react)
- [Next.js Documentation](https://nextjs.org/docs)

## 🛠️ Customization

You can customize the agent UI by editing:
- `/pages/agent.js` - Main agent page logic
- `/styles/agent.module.css` - Styling and appearance

## 💡 Tips

- Configure your agent's personality in the ElevenLabs dashboard for better conversations
- Set up knowledge bases for your agent to make it more helpful
- Use custom voices to match your brand or use case
- Test your agent thoroughly before deploying to production

---

**Need Help?** Check the [ElevenLabs Community](https://discord.gg/elevenlabs) or file an issue in this repository.
