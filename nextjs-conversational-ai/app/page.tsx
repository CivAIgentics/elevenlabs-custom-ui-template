import React from 'react';
import { ChatWindow } from './chat/components/ChatWindow';
import { Composer } from './chat/components/Composer';

const HomePage = () => {
    return (
        <div>
            <h1>Welcome to the Conversational AI</h1>
            <ChatWindow />
            <Composer />
        </div>
    );
};

export default HomePage;