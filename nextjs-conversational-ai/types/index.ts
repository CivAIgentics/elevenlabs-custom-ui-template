export interface Message {
    id: string;
    sender: 'user' | 'ai';
    content: string;
    timestamp: Date;
}

export interface Conversation {
    id: string;
    messages: Message[];
}

export interface ChatState {
    conversation: Conversation;
    isLoading: boolean;
}

export interface SendMessageResponse {
    success: boolean;
    message: Message;
}

export interface ApiResponse {
    success: boolean;
    data?: any;
    error?: string;
}