# ElevenLabs Next.js Project

This project is a Next.js application that integrates ElevenLabs' text-to-speech functionality. Below are the details regarding the structure and components of the project.

## Project Structure

```
elevenlabs-nextjs
├── pages
│   ├── api
│   │   └── tts.js          # API route for text-to-speech functionality
│   ├── _app.js             # Initializes pages and global styles
│   ├── index.js            # Main landing page
│   └── 404.js              # Custom 404 error page
├── components
│   ├── VoiceForm.js        # Form for user input for text-to-speech
│   ├── Player.js           # Component for playing audio
│   └── Button.js           # Reusable button component
├── lib
│   └── elevenlabs.js       # Utility functions for ElevenLabs API
├── styles
│   ├── globals.css         # Global CSS styles
│   └── home.module.css     # Scoped styles for the home page
├── public                  # Directory for static files
├── .env.local.example      # Template for environment variables
├── .gitignore              # Specifies files to ignore in Git
├── package.json            # Project metadata and dependencies
├── next.config.js          # Custom Next.js configuration
├── jsconfig.json           # JavaScript language configuration
└── README.md               # Project documentation
```

## Setup Instructions

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd elevenlabs-nextjs
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Variables**
   - Copy `.env.local.example` to `.env.local` and fill in the required values.

4. **Run the Development Server**
   ```bash
   npm run dev
   ```

5. **Access the Application**
   - Open your browser and navigate to `http://localhost:3000`.

## Usage

- Use the main page to input text and convert it to speech using the provided form.
- The audio player allows you to play, pause, and stop the generated speech.
- If you encounter a 404 error, a custom error page will be displayed.

## Contributing

Feel free to submit issues or pull requests for improvements and bug fixes.