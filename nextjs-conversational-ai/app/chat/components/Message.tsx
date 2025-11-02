import React from 'react';

interface MessageProps {
  sender: 'user' | 'ai';
  content: string;
}

const Message: React.FC<MessageProps> = ({ sender, content }) => {
  return (
    <div className={`message ${sender}`}>
      <span className="sender">{sender === 'user' ? 'You' : 'AI'}:</span>
      <p className="content">{content}</p>
    </div>
  );
};

export default Message;