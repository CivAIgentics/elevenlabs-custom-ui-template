import { useState, useEffect } from 'react';
import { sendMessage } from '../lib/ai/openai';
import { useConvoManager } from '../lib/ai/convoManager';

const useChat = () => {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const convoManager = useConvoManager();

    const sendChatMessage = async (message) => {
        setLoading(true);
        setMessages((prevMessages) => [...prevMessages, { text: message, sender: 'user' }]);

        try {
            const response = await sendMessage(message);
            setMessages((prevMessages) => [...prevMessages, { text: response, sender: 'ai' }]);
            convoManager.addMessage(message, response);
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const initialMessages = convoManager.getMessages();
        setMessages(initialMessages);
    }, [convoManager]);

    return {
        messages,
        loading,
        sendChatMessage,
    };
};

export default useChat;