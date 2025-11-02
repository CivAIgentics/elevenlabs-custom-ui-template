# Next.js Conversational AI

This project is a Next.js application designed to demonstrate conversational AI capabilities. It provides a chat interface where users can interact with an AI model, sending messages and receiving responses in real-time.

## Project Structure

```
nextjs-conversational-ai
├── app
│   ├── layout.tsx          # Layout component for the application
│   ├── page.tsx            # Main entry point for the application
│   ├── chat
│   │   ├── page.tsx        # Chat interface rendering
│   │   └── components
│   │       ├── ChatWindow.tsx  # Displays chat messages and history
│   │       ├── Composer.tsx     # Input component for user messages
│   │       └── Message.tsx       # Represents an individual chat message
│   └── api
│       └── conversation
│           └── route.ts      # API route for handling conversation requests
├── lib
│   ├── ai
│   │   ├── openai.ts        # Functions for interacting with the OpenAI API
│   │   └── convoManager.ts   # Manages conversation state and logic
│   └── prompts
│       └── examples.ts      # Example prompts for initiating conversations
├── hooks
│   └── useChat.ts          # Custom hook for managing chat state
├── styles
│   └── globals.css         # Global CSS styles for the application
├── types
│   └── index.ts            # TypeScript types and interfaces
├── .gitignore               # Files and directories to ignore by Git
├── package.json             # npm configuration file
├── tsconfig.json            # TypeScript configuration file
├── next.config.js           # Next.js configuration settings
└── README.md                # Project documentation
```

## Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd nextjs-conversational-ai
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to `http://localhost:3000` to view the application.

## Usage

- Use the chat interface to send messages to the AI.
- The AI will respond based on the input provided.
- You can customize the prompts in `lib/prompts/examples.ts` to change the context of the conversation.

## Contributing

Feel free to submit issues or pull requests to improve the project.