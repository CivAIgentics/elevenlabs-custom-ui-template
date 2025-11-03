# ElevenLabs Custom UI Template

Advanced Custom UI Template for ElevenLabs Conversational AI Agents with Next.js components and real-time audio features.

## 🌟 Features

- **Real-time Conversational AI** - Interactive voice agents powered by ElevenLabs
- **Advanced Audio Components** - Waveform visualizers, audio players, and voice controls
- **Modern React Components** - TypeScript/TSX components with responsive design
- **Next.js Framework** - Server-side rendering and optimized performance
- **Voice Interface** - Microphone selection, voice buttons, and audio processing
- **Conversational UI** - Chat interfaces, message components, and conversation management

## 📁 Project Structure

```
├── components/           # React/TypeScript components
│   ├── audio-player.tsx     # Audio playback component
│   ├── voice-button.tsx     # Voice interaction controls
│   ├── waveform.tsx         # Audio waveform visualization
│   ├── conversational-ai-agent.tsx  # Main AI agent interface
│   ├── realtime-conversational-ai.tsx  # Real-time AI chat
│   └── [other components]   # Various UI components
├── pages/               # Next.js pages
│   ├── index.js            # Home page
│   ├── widget.js           # Widget interface
│   └── api/                # API routes
├── styles/              # CSS modules and global styles
└── public/              # Static assets
```

## 🚀 Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.local.example .env.local
   ```
   Add your ElevenLabs API credentials and configuration.

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🛠️ Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production  
- `npm start` - Start production server

## 🎯 Key Components

### Conversational AI Components
- `conversational-ai-agent.tsx` - Main AI agent interface
- `realtime-conversational-ai.tsx` - Real-time chat functionality
- `hybrid-realtime-ai.tsx` - Hybrid AI interaction modes
- `conversation.tsx` - Conversation management
- `message.tsx` - Individual message components

### Audio & Voice Components  
- `audio-player.tsx` - Audio playback controls
- `voice-button.tsx` - Voice activation buttons
- `mic-selector.tsx` - Microphone selection interface
- `waveform.tsx` - Audio waveform visualization
- `live-waveform.tsx` - Real-time audio visualization
- `bar-visualizer.tsx` - Bar-style audio visualization

### UI Components
- `button.tsx` - Custom button components
- `input.tsx` - Form input components
- `dialog.tsx` - Modal dialogs
- `card.tsx` - Card layouts
- `badge.tsx` - Status badges
- `orb.tsx` - Interactive orb animations

## 🔧 Configuration

The project uses Next.js configuration in `next.config.js` and includes TypeScript support via `jsconfig.json`.

## 📝 Environment Setup

Create a `.env.local` file with your ElevenLabs configuration:

```env
ELEVENLABS_API_KEY=your_api_key_here
ELEVENLABS_VOICE_ID=your_voice_id_here
# Add other required environment variables
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Check the [documentation](./AGENT_SETUP.md)
- Open an [issue](https://github.com/CivAIgentics/elevenlabs-custom-ui-template/issues)
- Contact: ssierraalcabes@CivAIgentics.io

## 🏢 About CivAIgentics

This template is developed by [CivAIgentics](https://CivAIgentics.io) - Advancing AI solutions for modern applications.