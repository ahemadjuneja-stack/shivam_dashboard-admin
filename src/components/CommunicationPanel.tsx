import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../store';
import { X, Search, Image as ImageIcon, Mic, Send, MessageSquare } from 'lucide-react';
import { ChatMessage } from '../types';

interface CommunicationPanelProps {
  onClose: () => void;
}

export const CommunicationPanel: React.FC<CommunicationPanelProps> = ({ onClose }) => {
  const { customers, chatMessages, sendMessage, markMessagesAsRead } = useAppStore();
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageText, setMessageText] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Group messages by customer
  const messagesByCustomer = chatMessages.reduce((acc, msg) => {
    if (!acc[msg.customerCode]) acc[msg.customerCode] = [];
    acc[msg.customerCode].push(msg);
    return acc;
  }, {} as Record<string, ChatMessage[]>);

  // Get active chat
  const activeChatMessages = selectedCustomerId ? (messagesByCustomer[selectedCustomerId] || []) : [];
  const activeCustomer = customers.find(c => c.customerCode === selectedCustomerId);

  // Mark as read when opening a chat
  useEffect(() => {
    if (selectedCustomerId) {
      markMessagesAsRead(selectedCustomerId);
    }
  }, [selectedCustomerId, chatMessages.length, markMessagesAsRead]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChatMessages.length]);

  // Handle Send Text
  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedCustomerId) return;
    
    sendMessage({
      id: `msg-${Date.now()}`,
      customerCode: selectedCustomerId,
      sender: 'ADMIN',
      type: 'TEXT',
      content: messageText.trim(),
      timestamp: Date.now(),
      isRead: true
    });
    setMessageText('');
  };

  // Handle Image Upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCustomerId) return;
    
    const objectUrl = URL.createObjectURL(file);
    sendMessage({
      id: `img-${Date.now()}`,
      customerCode: selectedCustomerId,
      sender: 'ADMIN',
      type: 'IMAGE',
      content: objectUrl,
      timestamp: Date.now(),
      isRead: true
    });
    e.target.value = '';
  };

  // List of all customers for the sidebar, sorted by latest message
  const chatList = customers.map(customer => {
    const msgs = messagesByCustomer[customer.customerCode] || [];
    const latestMsg = msgs[msgs.length - 1];
    const unreadCount = msgs.filter(m => m.sender === 'CUSTOMER' && !m.isRead).length;
    return {
      customer,
      latestMsg,
      unreadCount
    };
  }).filter(c => {
    if (searchQuery) {
      return c.customer.shopName.toLowerCase().includes(searchQuery.toLowerCase()) || 
             c.customer.cityName.toLowerCase().includes(searchQuery.toLowerCase());
    }
    // Only show customers with messages if not searching, OR allow seeing all
    return true; 
  }).sort((a, b) => {
    const aTime = a.latestMsg?.timestamp || 0;
    const bTime = b.latestMsg?.timestamp || 0;
    return bTime - aTime;
  });

  return (
    <div className="fixed inset-0 z-50 bg-[#060c1c]/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-6xl h-[85vh] bg-[#070f23] border border-[#142444] rounded-2xl shadow-2xl flex overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* LEFT SIDEBAR - Chat List */}
        <div className="w-80 flex flex-col border-r border-slate-800 bg-slate-900/40">
          
          {/* Header */}
          <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-white font-bold flex items-center gap-2">
              <MessageSquare size={18} className="text-emerald-400" />
              <span>Messages</span>
            </h2>
            <button onClick={onClose} className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition">
              <X size={16} />
            </button>
          </div>

          {/* Search */}
          <div className="p-3 border-b border-slate-800">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search shop or city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            {/* New Chat Button logic is integrated in the list, searching brings up all customers */}
            <div className="mt-2 text-[10px] text-slate-500 italic text-center">
              Search finds any registered customer to start a new chat.
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {chatList.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">No customers found</div>
            ) : (
              chatList.map(({ customer, latestMsg, unreadCount }) => (
                <button
                  key={customer.customerCode}
                  onClick={() => setSelectedCustomerId(customer.customerCode)}
                  className={`w-full p-4 border-b border-slate-800 flex items-start gap-3 hover:bg-slate-800/50 transition text-left ${selectedCustomerId === customer.customerCode ? 'bg-slate-800/80' : ''}`}
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 text-emerald-400 font-bold text-sm">
                    {customer.shopName.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <span className="font-bold text-white text-sm truncate">{customer.shopName}</span>
                      {latestMsg && (
                        <span className="text-[10px] text-slate-500 flex-shrink-0">
                          {new Date(latestMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-xs text-slate-400 truncate">
                        {latestMsg ? (
                          latestMsg.type === 'IMAGE' ? '📷 Image' :
                          latestMsg.type === 'VOICE' ? '🎤 Voice Note' :
                          latestMsg.content
                        ) : 'Start a new chat'}
                      </span>
                      {unreadCount > 0 && (
                        <span className="bg-emerald-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* RIGHT AREA - Chat View */}
        <div className="flex-1 flex flex-col bg-[#0b1221] relative">
          {activeCustomer ? (
            <>
              {/* Chat Header */}
              <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm">
                    {activeCustomer.shopName.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-sm">{activeCustomer.shopName}</h3>
                    <p className="text-xs text-slate-400">{activeCustomer.cityName} • {activeCustomer.mobileNumber}</p>
                  </div>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-chat-pattern">
                {activeChatMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-2">
                    <MessageSquare size={48} className="opacity-20" />
                    <p className="text-sm">No messages yet.</p>
                    <p className="text-xs">Send a message to start communicating.</p>
                  </div>
                ) : (
                  activeChatMessages.map((msg) => {
                    const isAdmin = msg.sender === 'ADMIN';
                    return (
                      <div key={msg.id} className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[70%] rounded-2xl p-3 shadow-md ${
                          isAdmin 
                            ? 'bg-emerald-600 text-white rounded-tr-sm' 
                            : 'bg-slate-800 text-slate-200 rounded-tl-sm border border-slate-700'
                        }`}>
                          
                          {/* Content Rendering */}
                          {msg.type === 'TEXT' && (
                            <p className="text-sm break-words">{msg.content}</p>
                          )}
                          {msg.type === 'IMAGE' && (
                            <img src={msg.content} alt="Attachment" className="max-w-full rounded-lg max-h-64 object-contain mb-1" />
                          )}
                          {msg.type === 'VOICE' && (
                            <audio controls className="max-w-[240px] h-10">
                              <source src={msg.content} />
                            </audio>
                          )}
                          
                          {/* Time */}
                          <div className={`text-[10px] text-right mt-1.5 ${isAdmin ? 'text-emerald-200' : 'text-slate-400'}`}>
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-3 bg-slate-900 border-t border-slate-800">
                <form onSubmit={handleSendText} className="flex items-end gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-3 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
                    title="Attach Image"
                  >
                    <ImageIcon size={20} />
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  
                  <div className="flex-1 bg-slate-950 border border-slate-700 rounded-2xl flex items-center pr-1 focus-within:border-emerald-500/50 transition">
                    <input
                      type="text"
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 bg-transparent border-none text-white text-sm px-4 py-3 focus:outline-none"
                    />
                    {messageText.trim() ? (
                      <button
                        type="submit"
                        className="p-2 rounded-full bg-emerald-600 text-white hover:bg-emerald-500 transition mr-1"
                      >
                        <Send size={18} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => alert('Voice recording from Admin panel requires microphone access (Simulated)')}
                        className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition mr-1"
                        title="Record Voice Note"
                      >
                        <Mic size={20} />
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
              <MessageSquare size={64} className="opacity-10 mb-4" />
              <p className="text-lg font-bold">Select a chat to start messaging</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
