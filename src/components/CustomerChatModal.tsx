import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../store';
import { X, Send, Image as ImageIcon, Mic, Square, Volume2, ShieldCheck } from 'lucide-react';
import { ChatMessage } from '../types';
import { processGeminiCustomerChat } from '../services/geminiChatService';

interface CustomerChatModalProps {
  onClose: () => void;
}

export const CustomerChatModal: React.FC<CustomerChatModalProps> = ({ onClose }) => {
  const { currentCustomer, chatMessages, sendMessage } = useAppStore();
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  // Filter messages for current customer
  const customerMessages = currentCustomer
    ? chatMessages.filter(m => m.customerCode === currentCustomer.customerCode)
    : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [customerMessages.length]);

  // Clean up timer/recorder on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  if (!currentCustomer) {
    return (
      <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 text-center max-w-sm w-full space-y-4">
          <p className="text-white font-bold">Please select your Customer ID first to chat with Shivam Admin.</p>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-brand-gold text-black font-black text-sm"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Send text message
  const handleSendText = async (e: React.FormEvent) => {
    e.preventDefault();
    const textToSend = inputText.trim();
    if (!textToSend) return;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      customerCode: currentCustomer.customerCode,
      sender: 'CUSTOMER',
      type: 'TEXT',
      content: textToSend,
      timestamp: Date.now(),
      isRead: false
    };

    sendMessage(newMsg);
    setInputText('');

    // Trigger Gemini API assistant response
    try {
      await processGeminiCustomerChat(textToSend, currentCustomer.customerCode);
    } catch (err) {
      console.error('Error triggering Gemini customer chat response:', err);
    }
  };

  // Send image
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const newMsg: ChatMessage = {
        id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        customerCode: currentCustomer.customerCode,
        sender: 'CUSTOMER',
        type: 'IMAGE',
        content: dataUrl,
        timestamp: Date.now(),
        isRead: false
      };
      sendMessage(newMsg);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Start voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = () => {
          const base64Audio = reader.result as string;
          const newMsg: ChatMessage = {
            id: `voice-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            customerCode: currentCustomer.customerCode,
            sender: 'CUSTOMER',
            type: 'VOICE',
            content: base64Audio,
            timestamp: Date.now(),
            isRead: false
          };
          sendMessage(newMsg);
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds(sec => sec + 1);
      }, 1000);
    } catch (err) {
      console.warn('Microphone access not available, generating demo audio note:', err);
      // Fallback demo voice note
      const newMsg: ChatMessage = {
        id: `voice-${Date.now()}`,
        customerCode: currentCustomer.customerCode,
        sender: 'CUSTOMER',
        type: 'VOICE',
        content: 'https://actions.google.com/sounds/v1/communication/answering_machine.ogg',
        timestamp: Date.now(),
        isRead: false
      };
      sendMessage(newMsg);
    }
  };

  // Stop voice recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setIsRecording(false);
    setRecordingSeconds(0);
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md h-[88vh] max-h-[650px] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Chat Header */}
        <div className="p-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold">
              HQ
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-white font-bold text-sm">SHIVAM Wholesale Admin</h3>
                <ShieldCheck size={14} className="text-emerald-400" />
              </div>
              <p className="text-[11px] text-emerald-400 font-medium">Live Live Sync Connected</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Customer Badge Banner */}
        <div className="bg-slate-800/60 px-4 py-1.5 border-b border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-400">Shop: <strong className="text-white">{currentCustomer.shopName}</strong></span>
          <span className="font-mono text-amber-400 font-bold">ID: {currentCustomer.customerCode}</span>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#080d1a]">
          {customerMessages.length === 0 ? (
            <div className="text-center py-12 text-slate-500 space-y-2">
              <Volume2 className="mx-auto text-slate-600" size={32} />
              <p className="text-sm font-medium">No messages yet with Shivam Admin.</p>
              <p className="text-xs text-slate-600">Send voice note or message regarding your orders & deliveries.</p>
            </div>
          ) : (
            customerMessages.map((msg) => {
              const isCustomer = msg.sender === 'CUSTOMER';
              return (
                <div key={msg.id} className={`flex flex-col ${isCustomer ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl p-3 shadow-md ${
                      isCustomer
                        ? 'bg-amber-500 text-black rounded-tr-sm font-medium'
                        : 'bg-slate-800 text-slate-100 rounded-tl-sm border border-slate-700'
                    }`}
                  >
                    {/* Header: Sender Label */}
                    <div className="text-[10px] opacity-70 font-bold mb-1">
                      {isCustomer ? 'You (App)' : 'Admin Dashboard'}
                    </div>

                    {/* Content */}
                    {msg.type === 'TEXT' && (
                      <p dir="ltr" className="text-xs sm:text-sm text-left whitespace-pre-wrap break-words">{msg.content || msg.text}</p>
                    )}

                    {msg.type === 'IMAGE' && (
                      <img src={msg.content} alt="Attachment" className="max-w-full rounded-lg max-h-56 object-contain" />
                    )}

                    {msg.type === 'VOICE' && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold">
                          <Volume2 size={14} />
                          <span>Voice Note</span>
                        </div>
                        <audio controls className="w-full max-w-[220px] h-8">
                          <source src={msg.content} />
                          Audio note
                        </audio>
                      </div>
                    )}

                    {/* Time */}
                    <div className={`text-[10px] text-right mt-1 ${isCustomer ? 'text-black/70' : 'text-slate-400'}`}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Audio Recording Banner */}
        {isRecording && (
          <div className="p-3 bg-red-950/90 border-t border-red-800 flex items-center justify-between text-red-200 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              <span className="font-bold">Recording Voice Note ({recordingSeconds}s)...</span>
            </div>
            <button
              onClick={stopRecording}
              className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold flex items-center gap-1"
            >
              <Square size={12} fill="white" />
              <span>Send Voice</span>
            </button>
          </div>
        )}

        {/* Chat Input Bar */}
        <div className="p-3 bg-slate-950 border-t border-slate-800">
          <form onSubmit={handleSendText} className="flex items-center gap-2">
            {/* Image attachment */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
              title="Attach Photo"
            >
              <ImageIcon size={18} />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />

            {/* Voice record button */}
            {!isRecording ? (
              <button
                type="button"
                onClick={startRecording}
                className="p-2.5 rounded-full bg-slate-800 text-amber-400 hover:bg-amber-500 hover:text-black transition"
                title="Record Voice Note"
              >
                <Mic size={18} />
              </button>
            ) : (
              <button
                type="button"
                onClick={stopRecording}
                className="p-2.5 rounded-full bg-red-500 text-white animate-pulse"
                title="Stop & Send Voice Note"
              >
                <Square size={18} fill="white" />
              </button>
            )}

            {/* Text Input */}
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              dir="ltr"
              style={{ direction: 'ltr', textAlign: 'left', unicodeBidi: 'plaintext' }}
              placeholder="Type message to Shivam Admin..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white text-left focus:outline-none focus:border-amber-400"
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2.5 rounded-full bg-amber-500 hover:bg-amber-400 text-black font-bold disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              <Send size={18} />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};
