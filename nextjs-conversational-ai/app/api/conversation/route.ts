import { NextResponse } from 'next/server';
import { sendMessage } from '@/lib/ai/openai';
import { updateConversation } from '@/lib/ai/convoManager';

export async function POST(request: Request) {
    const { message } = await request.json();

    if (!message) {
        return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    try {
        const response = await sendMessage(message);
        updateConversation(message, response);

        return NextResponse.json({ response });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to process the message' }, { status: 500 });
    }
}