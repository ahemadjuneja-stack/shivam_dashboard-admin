import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAppStore } from '../store';
import { 
  X, 
  Search, 
  Image as ImageIcon, 
  Send, 
  MessageSquare, 
  Megaphone, 
  ZoomIn, 
  Download, 
  Store, 
  CheckCheck,
  Radio,
  Mic,
  Trash2,
  MessageCircle,
  MapPin,
  User,
  Package,
  Check,
  Volume2
} from 'lucide-react';
import { ChatMessage, Customer } from '../types';
import { 
  syncChatMessageToFirebase, 
  markMessagesAsReadInFirebase,
  sendBroadcastMessageToFirebase 
} from '../services/firebaseSync';
import { AudioPlayer } from './AudioPlayer';

interface CommunicationPanelProps {
  onClose: () => void;
  initialCustomerCode?: string | null;
  onFilterShopOrders?: (shopName: string) => void;
}

export const CommunicationPanel: React.FC<CommunicationPanelProps> = ({ 
  onClose,
  initialCustomerCode = null,
  onFilterShopOrders
}) => {
  const { customers, chatMessages, sendMessage, markMessagesAsRead } = useAppStore();
  
  // Active selected thread
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(initialCustomerCode);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilterTab, setActiveFilterTab] = useState<'all' | 'unread' | 'broadcasts'>('all');
  
  // Message composition state
  const [messageText, setMessageText] = useState('');
  const [attachedImageUrl, setAttachedImageUrl] = useState<string | null>(null);
  
  // Voice Recording State
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Broadcast Modal State
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastText, setBroadcastText] = useState('');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastImageUrl, setBroadcastImageUrl] = useState<string | null>(null);
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);
  const [broadcastSuccessNotice, setBroadcastSuccessNotice] = useState(false);

  // Full-screen image lightbox state
  const [zoomedImage, setZoomedImage] = useState<{ url: string; caption?: string; shopName?: string; time?: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);
  const broadcastFileInputRef = useRef<HTMLInputElement>(null);

  // 1. Group direct messages by customer ID/Code
  const messagesByCustomer = useMemo(() => {
    const map: Record<string, ChatMessage[]> = {};
    (chatMessages || []).forEach(msg => {
      const code = msg.customerCode || msg.customerId || 'UNKNOWN';
      if (!map[code]) map[code] = [];
      map[code].push(msg);
    });
    // Sort each customer's messages chronologically
    Object.keys(map).forEach(k => {
      map[k].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    });
    return map;
  }, [chatMessages]);

  // 2. Build complete list of Customer Chat Threads
  const chatThreads = useMemo(() => {
    const threadMap = new Map<string, {
      customerCode: string;
      customer?: Customer;
      shopName: string;
      cityName: string;
      mobileNumber: string;
      contactPerson: string;
      lastMessage?: ChatMessage;
      unreadCount: number;
      lastTimestamp: number;
      hasBroadcast: boolean;
    }>();

    // Add registered customers
    (customers || []).forEach(c => {
      threadMap.set(c.customerCode, {
        customerCode: c.customerCode,
        customer: c,
        shopName: c.shopName || `Shop ${c.customerCode}`,
        cityName: c.cityName || '',
        mobileNumber: c.mobileNumber || '',
        contactPerson: c.contactPerson || '',
        unreadCount: 0,
        lastTimestamp: 0,
        hasBroadcast: false
      });
    });

    // Process messages into thread metadata
    Object.entries(messagesByCustomer).forEach(([cCode, msgs]) => {
      const existing = threadMap.get(cCode) || {
        customerCode: cCode,
        shopName: `Shop (${cCode})`,
        cityName: '',
        mobileNumber: '',
        contactPerson: '',
        unreadCount: 0,
        lastTimestamp: 0,
        hasBroadcast: false
      };

      const lastMsg = msgs[msgs.length - 1];
      const unread = msgs.filter(m => {
        const sender = String(m.sender || '').toUpperCase();
        return sender === 'CUSTOMER' && !m.isRead;
      }).length;

      const hasBcast = msgs.some(m => m.isBroadcast === true);

      threadMap.set(cCode, {
        ...existing,
        lastMessage: lastMsg,
        unreadCount: unread,
        lastTimestamp: lastMsg ? (lastMsg.timestamp || 0) : 0,
        hasBroadcast: hasBcast
      });
    });

    const threads = Array.from(threadMap.values());

    // Sort: newest messages first
    threads.sort((a, b) => {
      if (a.lastTimestamp > 0 && b.lastTimestamp > 0) {
        return b.lastTimestamp - a.lastTimestamp;
      }
      if (a.lastTimestamp > 0) return -1;
      if (b.lastTimestamp > 0) return 1;
      return a.shopName.localeCompare(b.shopName);
    });

    return threads;
  }, [customers, messagesByCustomer]);

  // 3. Filtered Threads based on search and active tab
  const filteredThreads = useMemo(() => {
    let list = chatThreads;

    if (activeFilterTab === 'unread') {
      list = list.filter(t => t.unreadCount > 0);
    } else if (activeFilterTab === 'broadcasts') {
      list = list.filter(t => t.hasBroadcast);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(t => 
        t.shopName.toLowerCase().includes(q) ||
        t.customerCode.toLowerCase().includes(q) ||
        t.cityName.toLowerCase().includes(q) ||
        t.mobileNumber.toLowerCase().includes(q) ||
        t.contactPerson.toLowerCase().includes(q) ||
        (t.lastMessage && (t.lastMessage.text || t.lastMessage.content || '').toLowerCase().includes(q))
      );
    }

    return list;
  }, [chatThreads, activeFilterTab, searchQuery]);

  // Total unread count across all threads
  const totalUnreadCount = useMemo(() => {
    return chatThreads.reduce((sum, t) => sum + t.unreadCount, 0);
  }, [chatThreads]);

  // Active Chat details
  const activeThread = useMemo(() => {
    if (!selectedCustomerId) return null;
    return chatThreads.find(t => t.customerCode === selectedCustomerId) || null;
  }, [chatThreads, selectedCustomerId]);

  const activeChatMessages = useMemo(() => {
    if (!selectedCustomerId) return [];
    return messagesByCustomer[selectedCustomerId] || [];
  }, [messagesByCustomer, selectedCustomerId]);

  // Auto-select first thread if none selected on desktop
  useEffect(() => {
    if (!selectedCustomerId && chatThreads.length > 0 && window.innerWidth >= 768) {
      const firstUnread = chatThreads.find(t => t.unreadCount > 0);
      setSelectedCustomerId(firstUnread ? firstUnread.customerCode : chatThreads[0].customerCode);
    }
  }, [chatThreads.length]);

  // Mark messages as read in store & Firebase when thread is opened
  useEffect(() => {
    if (selectedCustomerId) {
      markMessagesAsRead(selectedCustomerId);
      markMessagesAsReadInFirebase(selectedCustomerId);
    }
  }, [selectedCustomerId, markMessagesAsRead]);

  // Auto-scroll chat to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeChatMessages.length, selectedCustomerId]);

  // Handle Send 1-on-1 Message from Admin
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedCustomerId) return;
    
    const textTrimmed = messageText.trim();
    if (!textTrimmed && !attachedImageUrl && !recordedAudioUrl) return;

    let msgType: 'TEXT' | 'IMAGE' | 'VOICE' = 'TEXT';
    let mediaUrl = '';
    
    if (recordedAudioUrl) {
      msgType = 'VOICE';
      mediaUrl = recordedAudioUrl;
    } else if (attachedImageUrl) {
      msgType = 'IMAGE';
      mediaUrl = attachedImageUrl;
    }

    const newMsg: ChatMessage = {
      id: `msg-admin-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      customerCode: selectedCustomerId,
      customerId: selectedCustomerId,
      sender: 'ADMIN',
      type: msgType,
      text: textTrimmed,
      content: textTrimmed || mediaUrl,
      mediaUrl: mediaUrl,
      imageUrl: msgType === 'IMAGE' ? mediaUrl : undefined,
      voiceNoteUrl: msgType === 'VOICE' ? mediaUrl : undefined,
      timestamp: Date.now(),
      isRead: true,
      isBroadcast: false
    };

    sendMessage(newMsg);
    syncChatMessageToFirebase(newMsg);

    setMessageText('');
    setAttachedImageUrl(null);
    setRecordedAudioUrl(null);
  };

  // Image File Picker Handler
  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setAttachedImageUrl(event.target.result as string);
      }
    };
    reader.onerror = () => {
      alert('Failed to read selected image file.');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Broadcast Image File Picker Handler
  const handleBroadcastImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setBroadcastImageUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Voice Note Recording Management
  const startVoiceRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Microphone access is not supported in this browser.');
        return;
      }

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
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
        const reader = new FileReader();
        reader.onloadend = () => {
          setRecordedAudioUrl(reader.result as string);
        };
        reader.readAsDataURL(audioBlob);

        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(100);
      setIsRecordingVoice(true);
      setRecordingDuration(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Error starting audio recording:', err);
      alert('Could not access microphone. Please grant permission.');
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecordingVoice(false);
  };

  const cancelVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecordingVoice(false);
    setRecordedAudioUrl(null);
    setRecordingDuration(0);
  };

  // Send Broadcast to All Customers
  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastText.trim() && !broadcastImageUrl) return;

    setIsSendingBroadcast(true);
    try {
      await sendBroadcastMessageToFirebase({
        title: broadcastTitle.trim() || 'Store Announcement',
        text: broadcastText.trim(),
        imageUrl: broadcastImageUrl || undefined,
        type: broadcastImageUrl ? 'IMAGE' : 'TEXT'
      });

      setBroadcastSuccessNotice(true);
      setTimeout(() => {
        setBroadcastSuccessNotice(false);
        setShowBroadcastModal(false);
        setBroadcastText('');
        setBroadcastTitle('');
        setBroadcastImageUrl(null);
      }, 1500);

    } catch (err) {
      console.error('Failed to send broadcast:', err);
      alert('Error broadcasting message to customers. Please check connection.');
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  const formatTime = (ts?: number) => {
    if (!ts) return '';
    const date = new Date(ts);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4">
      
      {/* Hidden File Inputs */}
      <input 
        type="file" 
        ref={chatFileInputRef} 
        onChange={handleImageFileSelect} 
        accept="image/*" 
        className="hidden" 
      />
      <input 
        type="file" 
        ref={broadcastFileInputRef} 
        onChange={handleBroadcastImageSelect} 
        accept="image/*" 
        className="hidden" 
      />

      {/* Main WhatsApp Web Style Container */}
      <div className="w-full max-w-7xl h-[92vh] bg-[#0b1424] border border-slate-700/80 rounded-2xl shadow-2xl flex overflow-hidden relative">
        
        {/* ================================================================= */}
        {/* LEFT SIDEBAR: CHAT THREADS & CUSTOMER DIRECTORY (WhatsApp Web Style) */}
        {/* ================================================================= */}
        <div className={`w-full md:w-80 lg:w-96 flex-shrink-0 bg-[#070e1c] border-r border-slate-800 flex flex-col ${selectedCustomerId ? 'hidden md:flex' : 'flex'}`}>
          
          {/* Top Header with Profile & Broadcast Button */}
          <div className="p-3.5 bg-[#09152a] border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-slate-950 font-black shadow-md">
                <Store size={18} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-white uppercase tracking-wider">SHIVAM Helpdesk</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Live & Connected" />
                </div>
                <span className="text-[10px] text-slate-400 block font-medium">WhatsApp Support HQ</span>
              </div>
            </div>

            {/* Quick Actions in Header */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowBroadcastModal(true)}
                className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-[11px] flex items-center gap-1.5 transition active:scale-95"
                title="Send Broadcast Announcement to all mobile users"
              >
                <Megaphone size={13} className="text-amber-400" />
                <span className="hidden sm:inline">Broadcast</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-lg transition"
                title="Close Helpdesk"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="p-3 bg-[#081225] border-b border-slate-800/60">
            <div className="relative flex items-center bg-[#0d1c36] border border-slate-700/80 rounded-xl px-3 py-1.5 focus-within:border-emerald-400 transition">
              <Search size={14} className="text-slate-400 mr-2 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search shop, phone, city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-xs text-white placeholder-slate-400 w-full"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-0.5 text-slate-400 hover:text-white rounded"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 mt-2.5">
              <button
                type="button"
                onClick={() => setActiveFilterTab('all')}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 ${
                  activeFilterTab === 'all'
                    ? 'bg-slate-700 text-white'
                    : 'bg-slate-900/60 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <span>All Chats</span>
                <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-slate-300">
                  {chatThreads.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFilterTab('unread')}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 ${
                  activeFilterTab === 'unread'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-900/60 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <span>Unread</span>
                {totalUnreadCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-red-500 text-[10px] text-white font-black animate-pulse">
                    {totalUnreadCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveFilterTab('broadcasts')}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 ${
                  activeFilterTab === 'broadcasts'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-900/60 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <Radio size={11} />
                <span>Broadcasts</span>
              </button>
            </div>
          </div>

          {/* Thread List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-slate-800/40">
            {filteredThreads.length === 0 ? (
              <div className="p-8 text-center text-slate-500 space-y-2">
                <MessageSquare size={32} className="mx-auto text-slate-600 opacity-60" />
                <p className="text-xs font-semibold">No customer threads found.</p>
                {searchQuery && (
                  <p className="text-[11px] text-slate-400">
                    Try searching with another shop name or mobile number.
                  </p>
                )}
              </div>
            ) : (
              filteredThreads.map(thread => {
                const isSelected = selectedCustomerId === thread.customerCode;
                const initials = (thread.shopName || 'CU')
                  .split(' ')
                  .map(w => w[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase();

                const lastMsg = thread.lastMessage;
                const lastMsgType = String(lastMsg?.type || 'TEXT').toUpperCase();

                return (
                  <div
                    key={thread.customerCode}
                    onClick={() => setSelectedCustomerId(thread.customerCode)}
                    className={`p-3 cursor-pointer transition-all flex items-start gap-3 relative group ${
                      isSelected 
                        ? 'bg-[#122444] border-l-4 border-emerald-400 shadow-inner' 
                        : 'hover:bg-[#0c182e]'
                    }`}
                  >
                    {/* Customer Initial Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-xs shadow-md transition-transform group-hover:scale-105 ${
                        thread.unreadCount > 0 
                          ? 'bg-emerald-500 text-slate-950 ring-2 ring-emerald-400/50' 
                          : isSelected 
                          ? 'bg-amber-500 text-slate-950' 
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}>
                        {initials}
                      </div>
                      {thread.unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-black shadow-lg animate-bounce">
                          {thread.unreadCount}
                        </span>
                      )}
                    </div>

                    {/* Thread Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className={`text-xs font-bold truncate ${isSelected ? 'text-white font-extrabold' : 'text-slate-200'}`}>
                          {thread.shopName}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-mono flex-shrink-0">
                          {formatTime(thread.lastTimestamp)}
                        </span>
                      </div>

                      {/* City & Mobile Subtext */}
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                        {thread.cityName && (
                          <span className="flex items-center gap-0.5 text-amber-400/80">
                            <MapPin size={9} />
                            {thread.cityName}
                          </span>
                        )}
                        {thread.mobileNumber && (
                          <span className="font-mono text-slate-400 truncate">
                            • {thread.mobileNumber}
                          </span>
                        )}
                      </div>

                      {/* Last Message Snippet */}
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <div className="flex items-center gap-1 text-[11px] truncate">
                          {lastMsg && String(lastMsg.sender || '').toUpperCase() === 'ADMIN' && (
                            <CheckCheck size={13} className="text-emerald-400 flex-shrink-0" />
                          )}

                          {lastMsgType === 'VOICE' ? (
                            <span className="flex items-center gap-1 text-emerald-400 font-semibold italic">
                              <Mic size={11} /> Voice Note
                            </span>
                          ) : lastMsgType === 'IMAGE' ? (
                            <span className="flex items-center gap-1 text-cyan-400 font-semibold italic">
                              <ImageIcon size={11} /> Photo Attachment
                            </span>
                          ) : lastMsg?.isBroadcast ? (
                            <span className="flex items-center gap-1 text-amber-400 font-semibold italic">
                              <Megaphone size={11} /> Broadcast
                            </span>
                          ) : (
                            <span className={`truncate ${thread.unreadCount > 0 ? 'text-emerald-300 font-bold' : 'text-slate-400'}`}>
                              {lastMsg?.text || lastMsg?.content || 'No messages yet'}
                            </span>
                          )}
                        </div>

                        {/* Unread Pill on right */}
                        {thread.unreadCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] flex-shrink-0 shadow-sm">
                            {thread.unreadCount} NEW
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ================================================================= */}
        {/* MAIN CHAT WINDOW (WhatsApp Web Style) */}
        {/* ================================================================= */}
        <div className={`flex-1 flex flex-col bg-[#081224] relative ${!selectedCustomerId ? 'hidden md:flex' : 'flex'}`}>
          
          {activeThread ? (
            <>
              {/* 1. Chat Header */}
              <div className="p-3 bg-[#09152a] border-b border-slate-800 flex items-center justify-between z-10 shadow-sm">
                
                {/* Left: Customer Info & Back on Mobile */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedCustomerId(null)}
                    className="md:hidden p-1.5 text-slate-400 hover:text-white rounded-lg"
                    title="Back to Chats"
                  >
                    <X size={18} />
                  </button>

                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-xs shadow-md">
                    {(activeThread.shopName || 'CU').substring(0, 2).toUpperCase()}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-extrabold text-white tracking-wide">
                        {activeThread.shopName}
                      </h3>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-amber-300 border border-slate-700">
                        {activeThread.customerCode}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      {activeThread.contactPerson && (
                        <span className="flex items-center gap-1 text-slate-300">
                          <User size={11} className="text-slate-400" />
                          {activeThread.contactPerson}
                        </span>
                      )}
                      {activeThread.cityName && (
                        <span className="flex items-center gap-1 text-amber-400">
                          <MapPin size={11} />
                          {activeThread.cityName}
                        </span>
                      )}
                      {activeThread.mobileNumber && (
                        <span className="font-mono text-slate-300">
                          • {activeThread.mobileNumber}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Action Tools */}
                <div className="flex items-center gap-2">
                  {/* WhatsApp Direct Chat on Desktop PC */}
                  {activeThread.mobileNumber && (
                    <a
                      href={(() => {
                        const cleanNum = activeThread.mobileNumber.replace(/\D/g, '');
                        const waNumber = cleanNum.length === 10 ? `91${cleanNum}` : cleanNum;
                        const greetText = encodeURIComponent(
                          `Hello ${activeThread.shopName || ''} (SHIVAM B2B Wholesale), regarding your wholesale inquiry and orders.`
                        );
                        return `https://wa.me/${waNumber}?text=${greetText}`;
                      })()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-[#25D366]/20 hover:bg-[#25D366]/30 border border-[#25D366]/60 text-[#25D366] text-xs font-black flex items-center gap-1.5 transition active:scale-95 shadow-sm"
                      title={`Open WhatsApp chat with ${activeThread.shopName} (${activeThread.mobileNumber}) on Desktop`}
                    >
                      <MessageCircle size={14} className="text-[#25D366]" />
                      <span>WhatsApp</span>
                    </a>
                  )}

                  {/* Filter Dashboard Orders by this Shop */}
                  {onFilterShopOrders && (
                    <button
                      type="button"
                      onClick={() => {
                        onFilterShopOrders(activeThread.shopName);
                        onClose();
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 text-xs font-bold flex items-center gap-1.5 transition"
                      title="Filter Orders for this Shop on Dashboard"
                    >
                      <Package size={13} className="text-blue-400" />
                      <span className="hidden sm:inline">View Orders</span>
                    </button>
                  )}

                  {/* Close Helpdesk */}
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                    title="Close"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* 2. Messages Canvas (WhatsApp Styled Bubbles) */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-[#060c18] relative">
                
                {/* Subtle WhatsApp Watermark background */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />

                {/* Day Divider */}
                <div className="flex justify-center my-2">
                  <span className="px-3 py-1 rounded-full bg-[#0c1b33] border border-slate-700/60 text-[10px] font-bold text-slate-400 uppercase tracking-widest shadow-sm">
                    Direct Customer Chat
                  </span>
                </div>

                {activeChatMessages.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-slate-500 space-y-2">
                    <MessageSquare size={36} className="text-slate-600" />
                    <p className="text-xs font-bold text-slate-400">No chat history with this customer yet.</p>
                    <p className="text-[11px] text-slate-500">
                      Send a message, catalog photo, or voice note below.
                    </p>
                  </div>
                ) : (
                  activeChatMessages.map((msg) => {
                    const isSenderAdmin = String(msg.sender || '').toUpperCase() === 'ADMIN';
                    const msgType = String(msg.type || 'TEXT').toUpperCase();

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isSenderAdmin ? 'items-end' : 'items-start'} relative z-10`}
                      >
                        <div
                          className={`max-w-[85%] sm:max-w-[70%] rounded-2xl p-3 shadow-md transition-all ${
                            msg.isBroadcast
                              ? 'bg-[#2b1f09] border border-amber-500/50 text-amber-100 rounded-tr-none'
                              : isSenderAdmin
                              ? 'bg-[#064e3b] text-emerald-50 rounded-tr-none border border-emerald-600/40'
                              : 'bg-[#162238] text-slate-100 rounded-tl-none border border-slate-700/60'
                          }`}
                        >
                          {/* Sender Label & Broadcast Badge */}
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className={`text-[10px] font-black uppercase tracking-wider ${
                              msg.isBroadcast 
                                ? 'text-amber-400 flex items-center gap-1' 
                                : isSenderAdmin 
                                ? 'text-emerald-300' 
                                : 'text-cyan-400'
                            }`}>
                              {msg.isBroadcast ? (
                                <>
                                  <Megaphone size={10} /> BROADCAST ANNOUNCEMENT
                                </>
                              ) : isSenderAdmin ? (
                                'SHIVAM Admin'
                              ) : (
                                activeThread.shopName
                              )}
                            </span>

                            <span className="text-[9px] text-slate-400 font-mono">
                              {formatTime(msg.timestamp)}
                            </span>
                          </div>

                          {/* Message Body based on type */}
                          {/* A. VOICE NOTE */}
                          {(msgType === 'VOICE' || msg.voiceNoteUrl) ? (
                            <div className="my-1 w-64 sm:w-72">
                              <AudioPlayer 
                                url={msg.voiceNoteUrl || msg.mediaUrl || msg.content} 
                                title={isSenderAdmin ? 'Admin Voice Note' : `${activeThread.shopName} Voice`}
                              />
                            </div>
                          ) : null}

                          {/* B. IMAGE ATTACHMENT */}
                          {(msgType === 'IMAGE' || msg.imageUrl) ? (
                            <div className="my-1.5 relative group rounded-xl overflow-hidden border border-slate-700/80 bg-black/40">
                              <img
                                src={msg.imageUrl || msg.mediaUrl || msg.content}
                                alt="Attachment"
                                className="max-h-60 w-auto rounded-lg object-contain cursor-pointer transition-transform duration-200 group-hover:scale-[1.02]"
                                onClick={() => setZoomedImage({
                                  url: msg.imageUrl || msg.mediaUrl || msg.content,
                                  caption: msg.text || msg.content,
                                  shopName: isSenderAdmin ? 'SHIVAM HQ' : activeThread.shopName,
                                  time: formatTime(msg.timestamp)
                                })}
                              />
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none">
                                <span className="px-2.5 py-1 rounded bg-black/70 text-white text-[11px] font-bold flex items-center gap-1">
                                  <ZoomIn size={13} /> Click to Zoom
                                </span>
                              </div>
                            </div>
                          ) : null}

                          {/* C. TEXT CONTENT */}
                          {msg.text || (msgType === 'TEXT' && msg.content) ? (
                            <p dir="ltr" className="text-xs sm:text-[13px] text-left leading-relaxed whitespace-pre-wrap break-words font-sans selection:bg-amber-500 selection:text-black">
                              {msg.text || msg.content}
                            </p>
                          ) : null}

                          {/* Footer with Read Receipt ticks */}
                          <div className="flex items-center justify-end gap-1 mt-1">
                            {isSenderAdmin && (
                              <CheckCheck size={12} className="text-emerald-300" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* 3. Bottom Composer Bar */}
              <div className="p-3 bg-[#09152a] border-t border-slate-800 space-y-2">
                
                {/* Image / Audio Attachment Preview Card */}
                {attachedImageUrl && (
                  <div className="flex items-center gap-2 p-2 bg-[#0d1c36] border border-cyan-500/40 rounded-xl">
                    <img 
                      src={attachedImageUrl} 
                      alt="Attachment Preview" 
                      className="w-12 h-12 rounded-lg object-cover border border-slate-700" 
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-cyan-300 block truncate">Photo ready to send</span>
                      <span className="text-[10px] text-slate-400">Click Send to upload to customer thread</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAttachedImageUrl(null)}
                      className="p-1 text-slate-400 hover:text-red-400 rounded"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}

                {recordedAudioUrl && !isRecordingVoice && (
                  <div className="flex items-center gap-2 p-2 bg-[#063327] border border-emerald-500/40 rounded-xl">
                    <Volume2 size={18} className="text-emerald-400 flex-shrink-0 ml-1" />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-emerald-300 block truncate">Voice Note Ready</span>
                      <span className="text-[10px] text-emerald-400/80 font-mono">Recorded Audio ({formatSeconds(recordingDuration)})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setRecordedAudioUrl(null);
                        setRecordingDuration(0);
                      }}
                      className="p-1 text-slate-400 hover:text-red-400 rounded"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}

                {/* Quick Reply Template Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {[
                    'Order Received & Processing ✅',
                    'Checking stock in warehouse 📦',
                    'Parcel dispatched today 🚚',
                    'Voice Note received 👍',
                    'Payment received, thank you 💳'
                  ].map((quickText, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setMessageText(quickText)}
                      className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-semibold flex-shrink-0 transition border border-slate-700/60"
                    >
                      {quickText}
                    </button>
                  ))}
                </div>

                {/* Active Voice Recording Bar vs Standard Input Form */}
                {isRecordingVoice ? (
                  <div className="flex items-center justify-between gap-3 bg-red-950/70 border border-red-800/80 rounded-xl p-2.5 shadow-inner">
                    <div className="flex items-center gap-3">
                      <span className="w-3.5 h-3.5 rounded-full bg-red-500 animate-ping" />
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-red-300">Recording Voice Note...</span>
                        <span className="text-xs font-mono font-black text-white px-2 py-0.5 rounded bg-red-900 border border-red-700">
                          {formatSeconds(recordingDuration)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={cancelVoiceRecording}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1 transition"
                      >
                        <Trash2 size={13} /> Cancel
                      </button>
                      <button
                        type="button"
                        onClick={stopVoiceRecording}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1 transition shadow-md"
                      >
                        <Check size={13} /> Done Recording
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    
                    {/* Attach Image Button */}
                    <button
                      type="button"
                      onClick={() => chatFileInputRef.current?.click()}
                      className="p-2.5 rounded-xl bg-[#0d1c36] hover:bg-slate-700 border border-slate-700 text-cyan-400 hover:text-cyan-300 transition flex-shrink-0"
                      title="Attach Image / Photo"
                    >
                      <ImageIcon size={18} />
                    </button>

                    {/* Text Input */}
                    <input
                      type="text"
                      placeholder={`Type message to ${activeThread.shopName}... (Press Enter)`}
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      dir="ltr"
                      style={{ direction: 'ltr', textAlign: 'left', unicodeBidi: 'plaintext' }}
                      className="flex-1 bg-[#0d1c36] border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white text-left placeholder-slate-400 focus:outline-none focus:border-emerald-400 transition"
                    />

                    {/* Mic Button for Voice Recording */}
                    <button
                      type="button"
                      onClick={startVoiceRecording}
                      className="p-2.5 rounded-xl bg-[#0d1c36] hover:bg-slate-700 border border-slate-700 text-emerald-400 hover:text-emerald-300 transition flex-shrink-0"
                      title="Record Voice Note"
                    >
                      <Mic size={18} />
                    </button>

                    {/* Send Button */}
                    <button
                      type="submit"
                      disabled={!messageText.trim() && !attachedImageUrl && !recordedAudioUrl}
                      className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold transition flex-shrink-0 shadow-md active:scale-95"
                      title="Send Message"
                    >
                      <Send size={18} />
                    </button>
                  </form>
                )}
              </div>
            </>
          ) : (
            /* Splash / Empty State (WhatsApp Web Style) */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
              <div className="w-20 h-20 rounded-3xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-emerald-400 shadow-xl">
                <Store size={40} />
              </div>

              <div className="max-w-md space-y-1">
                <h2 className="text-lg font-black text-white">SHIVAM Wholesale Helpdesk</h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Select a customer thread from the left to view order instructions, listen to customer voice notes, and send instant WhatsApp replies.
                </p>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowBroadcastModal(true)}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg transition active:scale-95"
                >
                  <Megaphone size={16} />
                  <span>Send Broadcast Announcement</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* =================================================================== */}
      {/* BROADCAST ANNOUNCEMENT MODAL ("Send to All") */}
      {/* =================================================================== */}
      {showBroadcastModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="w-full max-w-lg bg-[#09152a] border border-amber-500/50 rounded-2xl shadow-2xl p-5 space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black">
                  <Megaphone size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    Broadcast Announcement
                  </h3>
                  <span className="text-[11px] text-amber-300 font-medium block">
                    Will be delivered to {customers.length} registered buyer apps
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowBroadcastModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {broadcastSuccessNotice ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center mx-auto animate-bounce">
                  <Check size={24} />
                </div>
                <h4 className="text-sm font-extrabold text-white">Broadcast Delivered!</h4>
                <p className="text-xs text-slate-300">
                  Announcement has been posted to community feeds and all customer chat inboxes with unread badges.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendBroadcast} className="space-y-3.5">
                
                {/* Title */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Announcement Headline (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 🌟 New Imitation Bridal Collection Launched!"
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                    className="w-full bg-[#050c18] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* Announcement Body */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Broadcast Message Content *
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Type details, discounts, new arrivals, transport schedules..."
                    value={broadcastText}
                    onChange={(e) => setBroadcastText(e.target.value)}
                    className="w-full bg-[#050c18] border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 resize-none"
                    required
                  />
                </div>

                {/* Image Attachment for Broadcast */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Attached Showcase Photo (Optional)
                  </label>
                  
                  {broadcastImageUrl ? (
                    <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-black/40 h-32 flex items-center justify-center">
                      <img 
                        src={broadcastImageUrl} 
                        alt="Broadcast Attached" 
                        className="max-h-full object-contain" 
                      />
                      <button
                        type="button"
                        onClick={() => setBroadcastImageUrl(null)}
                        className="absolute top-2 right-2 p-1 rounded-lg bg-red-600 text-white hover:bg-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => broadcastFileInputRef.current?.click()}
                      className="w-full py-3 rounded-xl border border-dashed border-slate-700 hover:border-amber-400 text-slate-400 hover:text-amber-300 flex items-center justify-center gap-2 text-xs font-bold transition bg-[#050c18]"
                    >
                      <ImageIcon size={16} />
                      <span>Select Photo from Computer</span>
                    </button>
                  )}
                </div>

                {/* Actions */}
                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowBroadcastModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSendingBroadcast || (!broadcastText.trim() && !broadcastImageUrl)}
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg transition active:scale-95"
                  >
                    {isSendingBroadcast ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                        <span>Sending to All...</span>
                      </>
                    ) : (
                      <>
                        <Megaphone size={14} />
                        <span>Send Broadcast to All</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* IMAGE LIGHTBOX MODAL (Full Zoom & Inspection) */}
      {/* =================================================================== */}
      {zoomedImage && (
        <div 
          onClick={() => setZoomedImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-sm"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="max-w-4xl max-h-[90vh] flex flex-col items-center relative"
          >
            <div className="w-full flex items-center justify-between text-white mb-2 px-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-amber-400">{zoomedImage.shopName || 'Customer Photo'}</span>
                {zoomedImage.time && (
                  <span className="text-[10px] text-slate-400 font-mono">• {zoomedImage.time}</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={zoomedImage.url}
                  download="customer-photo.jpg"
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs flex items-center gap-1"
                >
                  <Download size={14} /> Download
                </a>
                <button
                  type="button"
                  onClick={() => setZoomedImage(null)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <img
              src={zoomedImage.url}
              alt="Zoomed"
              className="max-h-[75vh] max-w-full rounded-xl object-contain border border-slate-700 shadow-2xl"
            />

            {zoomedImage.caption && (
              <p className="mt-3 text-xs text-slate-200 bg-slate-900/90 px-4 py-2 rounded-xl border border-slate-800 max-w-lg text-center">
                {zoomedImage.caption}
              </p>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
