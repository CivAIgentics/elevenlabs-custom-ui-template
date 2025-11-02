import React from 'react';
import ChatWindow from './components/ChatWindow';
import Composer from './components/Composer';

const ChatPage = () => {
    return (
        <div className="chat-container">
            <ChatWindow />
            <Composer />
        </div>
    );
};

export default ChatPage;