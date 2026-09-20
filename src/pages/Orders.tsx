import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { ArrowLeft, Smartphone, Monitor } from 'lucide-react';
import { db } from '../firebase';
import { useAppStore } from '../store';
import { WholesaleOrder } from '../types';
import { OrderTimeline } from '../components/OrderTimeline';

export const Orders: React.FC = () => {
  const { orders, setOrders } = useAppStore();
  const [isLoading, setIsLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'YESTERDAY'>('ALL');
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');

  useEffect(() => {
    setIsLoading(true);
    const ordersCol = collection(db, 'orders');
    const ordersQuery = query(ordersCol, orderBy('createdAt', 'desc'), limit(50));

    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      // CRITICAL FIX: Ignore empty cache reads completely
      if (snapshot.empty && snapshot.metadata.fromCache) {
        return; 
      }
      const fetchedOrders = snapshot.docs.map(doc => {
        const data = doc.data() as any;
        return {
          id: doc.id,
          ...data,
          shopName: data.shopName || data.customerName || 'Direct Customer',
          notes: data.notes || data.orderNote || '',
          orderNote: data.orderNote || data.notes || '',
          voiceNoteUrl: data.voiceNoteUrl || data.voiceNote || undefined,
          voiceNote: data.voiceNote || data.voiceNoteUrl || undefined,
          overallStatus: data.overallStatus || 'PENDING',
          createdAt: typeof data.createdAt === 'number'
            ? data.createdAt
            : (data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now())
        } as WholesaleOrder;
      });
      // Auto-Sorting: Descending order (newest first)
      fetchedOrders.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setOrders(fetchedOrders);
      setIsLoading(false);
    }, (error) => {
      console.warn('Orders onSnapshot error:', error);
      setIsLoading(false);
    });
    
    // Failsafe timeout
    const timer = setTimeout(() => setIsLoading(false), 2500);
    return () => { unsubscribe(); clearTimeout(timer); };
  }, [setOrders]);

  // Strict UI Blocking in JSX Return
  if (isLoading) {
    return (
      <div className="w-full h-full min-h-screen flex items-center justify-center bg-[#0F172A]">
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-white font-medium">Loading orders...</div>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="w-full h-full min-h-screen flex items-center justify-center text-slate-400 bg-[#0F172A]">
        <p className="text-sm font-semibold">No orders found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#040812] text-white flex flex-col">
      {/* Top Navigation Bar */}
      <header className="h-14 bg-[#0B1120] border-b border-slate-800 px-4 flex items-center justify-between flex-shrink-0 z-30">
        <div className="flex items-center gap-3">
          <Link
            to="/admin"
            className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl transition"
          >
            <ArrowLeft size={14} />
            <span>Admin</span>
          </Link>
          <div className="h-4 w-[1px] bg-slate-800" />
          <h1 className="text-sm font-black tracking-wider uppercase text-slate-200">
            Order Line Dashboard & Mobile APK
          </h1>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-2">
          {/* Quick Date Filters */}
          <div className="hidden sm:flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5">
            {(['ALL', 'TODAY', 'YESTERDAY'] as const).map(filter => (
              <button
                key={filter}
                type="button"
                onClick={() => setDateFilter(filter)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  dateFilter === filter ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setViewMode(viewMode === 'desktop' ? 'mobile' : 'desktop')}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition ${
              viewMode === 'mobile'
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
            }`}
          >
            {viewMode === 'mobile' ? <Monitor size={14} /> : <Smartphone size={14} />}
            <span>{viewMode === 'mobile' ? 'Switch to Desktop' : 'Switch to Mobile APK'}</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 overflow-hidden flex justify-center p-3 sm:p-6">
        {viewMode === 'desktop' ? (
          <div className="w-full max-w-6xl h-full bg-[#0B1120] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            <OrderTimeline mode="dashboard" />
          </div>
        ) : (
          <div className="w-full max-w-[420px] h-[820px] bg-black rounded-[44px] p-3 shadow-2xl border-4 border-slate-800 overflow-hidden relative flex flex-col">
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-1 bg-slate-800 rounded-full z-40" />
            <div className="w-full h-full bg-[#040812] rounded-[34px] overflow-hidden flex flex-col">
              <OrderTimeline mode="mobile" />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Orders;
