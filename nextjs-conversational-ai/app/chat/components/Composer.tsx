import React, { useState } from 'react';

const Composer = ({ onSend }) => {
    const [message, setMessage] = useState('');

    const handleSend = () => {
        if (message.trim()) {
            onSend(message);
            setMessage('');
        }
    };

    return (
        <div className="composer">
            <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                className="composer-input"
            />
            <button onClick={handleSend} className="composer-send-button">
                Send
            </button>
        </div>
    );
};

export default Composer;