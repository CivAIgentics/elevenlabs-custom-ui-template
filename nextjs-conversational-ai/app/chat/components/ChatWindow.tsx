import React from 'react';
import Message from './Message';

interface ChatWindowProps {
  messages: { id: number; sender: string; content: string }[];
}

const ChatWindow: React.FC<ChatWindowProps> = ({ messages }) => {
  return (
    <div className="chat-window">
      {messages.map((message) => (
        <Message key={message.id} sender={message.sender} content={message.content} />
      ))}
    </div>
  );
};

export default ChatWindow;