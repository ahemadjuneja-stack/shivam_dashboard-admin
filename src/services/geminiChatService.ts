import { GoogleGenAI } from '@google/genai';
import { useAppStore } from '../store';
import { ChatMessage } from '../types';
import { syncChatMessageToFirebase } from '../services/firebaseSync';

export async function processGeminiCustomerChat(userMessageText: string, customerCode: string) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
  console.log('Gemini Request - API Key check:', apiKey ? 'Present (length: ' + apiKey.length + ')' : 'MISSING / EMPTY');

  if (!apiKey) {
    console.error('Gemini Error: VITE_GEMINI_API_KEY is missing or invalid.');
    const fallbackMsg: ChatMessage = {
      id: `ai-err-${Date.now()}`,
      customerCode,
      sender: 'ADMIN',
      type: 'TEXT',
      content: 'Sorry, our AI assistant is currently unavailable. Please try again shortly.',
      timestamp: Date.now(),
      isRead: false
    };
    syncChatMessageToFirebase(fallbackMsg);
    useAppStore.setState(state => ({
      chatMessages: [...state.chatMessages, fallbackMsg]
    }));
    return;
  }

  const payload = {
    model: 'gemini-1.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `You are Shivam Wholesale AI Assistant for Shivam Wholesale (Imitation Jewelry, Cosmetics, and Hair Accessories based in Gujarat). A customer (Code: ${customerCode}) has sent the following message: "${userMessageText}". Respond politely, helpfully, and professionally regarding wholesale orders, catalogs, shipping, or stock availability. Keep your answer concise and business-friendly.`
          }
        ]
      }
    ]
  };

  console.log('Gemini Request Payload:', JSON.stringify(payload, null, 2));

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: payload.contents
    });

    const aiReplyText = response.text || 'Thank you for your message. Our wholesale team will process your request shortly!';
    console.log('Gemini Response Success:', aiReplyText);

    const botMsg: ChatMessage = {
      id: `ai-res-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      customerCode,
      sender: 'ADMIN',
      type: 'TEXT',
      content: aiReplyText,
      timestamp: Date.now(),
      isRead: false
    };

    // Save to Firebase & store under the exact user's conversation ID
    await syncChatMessageToFirebase(botMsg);
    useAppStore.setState(state => ({
      chatMessages: [...state.chatMessages, botMsg]
    }));

  } catch (error: any) {
    console.error('Gemini Error during generation:', error);
    const fallbackMsg: ChatMessage = {
      id: `ai-err-${Date.now()}`,
      customerCode,
      sender: 'ADMIN',
      type: 'TEXT',
      content: 'Sorry, our AI assistant is currently unavailable. Please try again shortly.',
      timestamp: Date.now(),
      isRead: false
    };
    await syncChatMessageToFirebase(fallbackMsg);
    useAppStore.setState(state => ({
      chatMessages: [...state.chatMessages, fallbackMsg]
    }));
  }
}
