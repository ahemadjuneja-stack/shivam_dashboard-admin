import React, { useState, useMemo, useEffect } from 'react';
import { 
  Clock, 
  Store, 
  MapPin, 
  Phone, 
  MessageSquare, 
  Mic, 
  Sparkles, 
  Search, 
  CheckCircle2, 
  Radio,
  Flame
} from 'lucide-react';
import { useAppStore } from '../store';
import { WholesaleOrder, MainCategory } from '../types';
import { formatOrderTime12Hour, formatOrderDate } from '../utils';

interface OrderTimelineProps {
  mode?: 'dashboard' | 'mobile' | 'responsive';
  onSelectOrder?: (order: WholesaleOrder) => void;
  selectedOrderId?: string | null;
  compact?: boolean;
}

export const OrderTimeline: React.FC<OrderTimelineProps> = ({
  mode = 'responsive',
  onSelectOrder,
  selectedOrderId,
  compact = false
}) => {
  const orders = useAppStore(state => state.orders);
  const categories = useAppStore(state => state.categories);
  const addOrder = useAppStore(state => state.addOrder);

  // Filter and search states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'DONE'>('ALL');
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'SALESMAN' | 'CUSTOMER'>('ALL');
  const [deptFilter, setDeptFilter] = useState<'ALL' | 'imitation' | 'cosmetics' | 'hair'>('ALL');

  // Relative time tick (refreshes relative timestamps every 30s)
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  // Requirement 3: Auto-Sorting Logic
  // Automatic sorting based on the timestamp in descending order.
  // The newest/latest orders MUST always appear at the very top of the list,
  // and the oldest orders must go to the very bottom.
  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => {
      const timeA = typeof a.createdAt === 'number' 
        ? a.createdAt 
        : (typeof a.createdAt === 'string' && !isNaN(Number(a.createdAt))
            ? Number(a.createdAt)
            : (a.createdAt ? new Date(a.createdAt).getTime() : 0));
      const timeB = typeof b.createdAt === 'number' 
        ? b.createdAt 
        : (typeof b.createdAt === 'string' && !isNaN(Number(b.createdAt))
            ? Number(b.createdAt)
            : (b.createdAt ? new Date(b.createdAt).getTime() : 0));
      return timeB - timeA; // Descending: newest first
    });
  }, [orders]);

  // Filtered orders based on search and filters
  const displayedOrders = useMemo(() => {
    return sortedOrders.filter(order => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchesShop = order.shopName?.toLowerCase().includes(q);
        const matchesCity = order.cityName?.toLowerCase().includes(q);
        const matchesCode = order.orderNumber?.toLowerCase().includes(q) || order.customerCode?.toLowerCase().includes(q);
        const matchesSalesman = order.salesmanName?.toLowerCase().includes(q);
        if (!matchesShop && !matchesCity && !matchesCode && !matchesSalesman) return false;
      }

      // 2. Status Filter
      if (statusFilter === 'DONE') {
        const isDone = order.overallStatus === 'DONE' || order.overallStatus === 'READY_TO_SHIP';
        if (!isDone) return false;
      } else if (statusFilter === 'PENDING') {
        const isDone = order.overallStatus === 'DONE' || order.overallStatus === 'READY_TO_SHIP';
        if (isDone) return false;
      }

      // 3. Source Filter
      if (sourceFilter !== 'ALL' && order.source !== sourceFilter) {
        return false;
      }

      // 4. Department Filter
      if (deptFilter === 'imitation' && (!order.imitationStatus || order.imitationStatus === 'NOT_APPLICABLE')) return false;
      if (deptFilter === 'cosmetics' && (!order.cosmeticsStatus || order.cosmeticsStatus === 'NOT_APPLICABLE')) return false;
      if (deptFilter === 'hair' && (!order.hairStatus || order.hairStatus === 'NOT_APPLICABLE')) return false;

      return true;
    });
  }, [sortedOrders, searchQuery, statusFilter, sourceFilter, deptFilter]);

  // Quick helper to calculate relative elapsed time
  const getRelativeTime = (timestamp?: number) => {
    if (!timestamp) return '';
    const now = Date.now();
    const diff = Math.max(0, now - timestamp);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // Quick test feature to simulate a new live order (Demonstrating Requirement 4)
  const handleSimulateNewOrder = () => {
    const dummyShops = [
      { shop: 'Royal Fancy Novelty', city: 'Ahmedabad', salesman: 'RAMIZ' },
      { shop: 'Jai Jinendra Bangles', city: 'Surat', salesman: 'HARESH' },
      { shop: 'Mahalaxmi Cosmetics', city: 'Rajkot', salesman: 'RAMIZ' },
      { shop: 'Apsara Beauty Centre', city: 'Vadodara', salesman: 'BHAVESH' },
    ];
    const picked = dummyShops[Math.floor(Math.random() * dummyShops.length)];
    const now = Date.now();
    const newOrder: WholesaleOrder = {
      id: `live-${now}`,
      orderNumber: `ORD-${Math.floor(Math.random() * 90000) + 10000}`,
      customerCode: `CUST-${Math.floor(Math.random() * 900) + 100}`,
      shopName: picked.shop,
      cityName: picked.city,
      mobileNumber: '9825012345',
      items: [
        {
          photoId: 'p-1',
          photoCode: 'TEST-01',
          imageUri: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=300',
          quantity: 24,
          optionLetter: 'A',
          subCategoryName: 'Cosmetics',
          categoryId: MainCategory.COSMETICS,
        }
      ],
      totalItemsCount: 24,
      imitationStatus: 'NOT_APPLICABLE',
      cosmeticsStatus: 'PENDING',
      hairStatus: 'NOT_APPLICABLE',
      overallStatus: 'PENDING',
      notes: 'Express dispatch requested',
      createdAt: now,
      source: 'SALESMAN',
      salesmanName: picked.salesman,
      dateFormatted: formatOrderDate(now)
    };
    addOrder(newOrder);
  };

  const isMobile = mode === 'mobile';

  return (
    <div className={`flex flex-col h-full ${isMobile ? 'bg-[#040812] text-slate-100' : 'bg-[#0B1120] text-slate-100'}`}>
      
      {/* ------------------------------------------------------------- */}
      {/* TIMELINE CONTROL HEADER */}
      {/* ------------------------------------------------------------- */}
      <div className="p-3 sm:p-4 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md flex-shrink-0 space-y-3">
        
        {/* Title, Live Pulse & Quick Stats */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-sm">
              <Clock size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black tracking-wider uppercase text-white">
                  Order Line Timeline
                </h2>
                {/* Live Feed indicator */}
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold uppercase tracking-wider animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  LIVE
                </div>
              </div>
              <p className="text-[11px] text-slate-400">
                Sorted newest to oldest • Strict 12-Hour AM/PM Time Format
              </p>
            </div>
          </div>

          {/* Quick Counter & Simulation Action */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
              <span className="text-amber-400">{displayedOrders.length}</span> / {orders.length} orders
            </span>
            <button
              type="button"
              onClick={handleSimulateNewOrder}
              className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-[11px] uppercase tracking-wider flex items-center gap-1 shadow-md transition-all active:scale-95"
              title="Add a test live order to verify dynamic top-pushing without refresh"
            >
              <Sparkles size={13} />
              <span>+ Test Order</span>
            </button>
          </div>
        </div>

        {/* Filters & Search Row */}
        {!compact && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
            
            {/* Search Input */}
            <div className="relative flex-1 min-w-[180px] max-w-sm">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search shop, city, order ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900/90 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Status Filter */}
              <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-[11px]">
                {(['ALL', 'PENDING', 'DONE'] as const).map(st => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2 py-0.5 rounded font-bold transition ${
                      statusFilter === st ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              {/* Source Filter */}
              <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-[11px]">
                {(['ALL', 'SALESMAN', 'CUSTOMER'] as const).map(src => (
                  <button
                    key={src}
                    onClick={() => setSourceFilter(src)}
                    className={`px-2 py-0.5 rounded font-bold transition ${
                      sourceFilter === src ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {src}
                  </button>
                ))}
              </div>

              {/* Department Filter */}
              <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-[11px]">
                {(['ALL', 'imitation', 'cosmetics', 'hair'] as const).map(dept => (
                  <button
                    key={dept}
                    onClick={() => setDeptFilter(dept)}
                    className={`px-2 py-0.5 rounded font-bold transition capitalize ${
                      deptFilter === dept ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {dept}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TIMELINE LIST CONTAINER */}
      {/* ------------------------------------------------------------- */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 space-y-3 custom-scrollbar relative">
        
        {displayedOrders.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-500 space-y-2">
            <Radio size={32} className="text-slate-600 animate-pulse" />
            <p className="text-sm font-bold text-slate-400">No orders match the current filter</p>
            <p className="text-xs text-slate-600">New orders will instantly appear at the top as they arrive</p>
          </div>
        ) : (
          <div className="relative pl-4 sm:pl-6 border-l-2 border-slate-800/80 space-y-4">
            {displayedOrders.map((order, index) => {
              const isFirst = index === 0;
              const isSelected = selectedOrderId === order.id;
              const formattedTime = formatOrderTime12Hour(order.createdAt);
              const formattedDate = formatOrderDate(order.createdAt);
              const relativeTime = getRelativeTime(order.createdAt);

              // Overall status styles
              const isAllDone = order.overallStatus === 'DONE' || order.overallStatus === 'READY_TO_SHIP';
              const isImitationDone = order.imitationStatus === 'DONE';
              const isCosmeticsDone = order.cosmeticsStatus === 'DONE';
              const isHairDone = order.hairStatus === 'DONE';

              // Category accent
              let accentColor = '#D97706'; // default amber
              if (order.items && order.items.length > 0) {
                const cat = categories.find(c => c.id === order.items[0].categoryId);
                if (cat?.accentColorHex) accentColor = cat.accentColorHex;
              }

              return (
                <div
                  key={order.id}
                  onClick={() => onSelectOrder?.(order)}
                  className={`group relative transition-all duration-200 cursor-pointer ${
                    isSelected ? 'ring-2 ring-amber-500 scale-[1.01]' : 'hover:scale-[1.005]'
                  }`}
                >
                  {/* Timeline Node Bullet */}
                  <div className="absolute -left-[23px] sm:-left-[31px] top-3.5 flex items-center justify-center">
                    <div className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border-2 transition-all flex items-center justify-center ${
                      isFirst 
                        ? 'bg-amber-500 border-white shadow-[0_0_10px_#F59E0B] animate-pulse' 
                        : isAllDone 
                        ? 'bg-emerald-500 border-slate-900 shadow-sm' 
                        : 'bg-slate-900 border-amber-500/80 shadow-sm'
                    }`}>
                      {isAllDone && <CheckCircle2 size={10} className="text-slate-950 font-bold" />}
                    </div>
                  </div>

                  {/* Order Card */}
                  <div 
                    className={`rounded-xl border p-3 sm:p-4 transition-all shadow-md ${
                      isFirst 
                        ? 'bg-slate-900/95 border-amber-500/50 shadow-amber-500/5' 
                        : 'bg-slate-900/80 hover:bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                    style={{
                      borderLeft: `4px solid ${accentColor}`
                    }}
                  >
                    
                    {/* Header Row: Strict 12-Hour Time Badge + Order Number + Source */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/60">
                      
                      {/* Left: Time Stamp with 12-Hour AM/PM format */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 bg-black/40 border border-slate-800 px-2.5 py-1 rounded-lg">
                          <Clock size={13} className="text-amber-400" />
                          <span className="font-mono font-black text-xs sm:text-sm text-amber-300 tracking-tight">
                            {formattedTime}
                          </span>
                        </div>
                        
                        <span className="font-mono text-[11px] text-slate-400 font-semibold">
                          {formattedDate}
                        </span>

                        {relativeTime && (
                          <span className="text-[10px] font-mono text-slate-500 font-medium px-1.5 py-0.5 rounded bg-slate-800/60">
                            {relativeTime}
                          </span>
                        )}

                        {isFirst && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-[10px] tracking-wider uppercase flex items-center gap-1">
                            <Flame size={11} className="text-amber-400" />
                            Latest
                          </span>
                        )}
                      </div>

                      {/* Right: Order Number & Source Pill */}
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60">
                          {order.orderNumber || `ORD-${order.id.slice(-5)}`}
                        </span>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                          order.source === 'SALESMAN'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                            : 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                        }`}>
                          {order.source === 'SALESMAN' 
                            ? `SALESMAN • ${order.salesmanName || 'RAMIZ'}`
                            : 'CUSTOMER APP'}
                        </span>
                      </div>
                    </div>

                    {/* Middle Row: Shop Name, City, Mobile, Item Count */}
                    <div className="pt-2.5 flex flex-wrap items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Store size={15} className="text-amber-400 flex-shrink-0" />
                          <h3 className="font-black text-sm sm:text-base text-white tracking-wide uppercase group-hover:text-amber-300 transition-colors">
                            {order.shopName || order.displayTitle || 'Wholesale Client'}
                          </h3>
                        </div>

                        <div className="flex items-center gap-2.5 text-xs text-slate-400 pl-5 flex-wrap">
                          {order.cityName && (
                            <span className="flex items-center gap-1 font-semibold">
                              <MapPin size={12} className="text-slate-500" />
                              {order.cityName}
                            </span>
                          )}
                          {order.mobileNumber && (
                            <span className="flex items-center gap-1 font-mono text-[11px] text-slate-400">
                              <Phone size={11} className="text-slate-500" />
                              {order.mobileNumber}
                            </span>
                          )}
                          {order.customerCode && (
                            <span className="font-mono text-[11px] text-slate-500 font-bold bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                              {order.customerCode}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Items & Pieces Count */}
                      <div className="flex items-center gap-2">
                        <div className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-right">
                          <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Pieces</span>
                          <span className="font-mono font-black text-xs sm:text-sm text-slate-200">
                            {order.totalQuantity ?? (order.items||[]).reduce((s,i)=>s+(Number(i.quantity)||0),0)} pcs
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Department Status Badges & Notes */}
                    <div className="mt-3 pt-2 border-t border-slate-800/50 flex flex-wrap items-center justify-between gap-2">
                      
                      {/* Department Wise Status Badges */}
                      <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-bold">
                        
                        {/* Cosmetics Department */}
                        {order.cosmeticsStatus && order.cosmeticsStatus !== 'NOT_APPLICABLE' && (
                          <span className={`px-2 py-0.5 rounded font-mono uppercase tracking-wider flex items-center gap-1 ${
                            isCosmeticsDone 
                              ? 'bg-emerald-600 text-white animate-pulse shadow-sm shadow-emerald-500/20' 
                              : 'bg-slate-800/90 text-slate-300 border border-slate-700'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isCosmeticsDone ? 'bg-white' : 'bg-amber-400'}`} />
                            COSMETICS: {isCosmeticsDone ? 'DONE' : 'PENDING'}
                          </span>
                        )}

                        {/* Imitation Jewelry Department */}
                        {order.imitationStatus && order.imitationStatus !== 'NOT_APPLICABLE' && (
                          <span className={`px-2 py-0.5 rounded font-mono uppercase tracking-wider flex items-center gap-1 ${
                            isImitationDone 
                              ? 'bg-emerald-600 text-white animate-pulse shadow-sm shadow-emerald-500/20' 
                              : 'bg-slate-800/90 text-slate-300 border border-slate-700'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isImitationDone ? 'bg-white' : 'bg-amber-400'}`} />
                            IMITATION: {isImitationDone ? 'DONE' : 'PENDING'}
                          </span>
                        )}

                        {/* Hair Accessories Department */}
                        {order.hairStatus && order.hairStatus !== 'NOT_APPLICABLE' && (
                          <span className={`px-2 py-0.5 rounded font-mono uppercase tracking-wider flex items-center gap-1 ${
                            isHairDone 
                              ? 'bg-emerald-600 text-white animate-pulse shadow-sm shadow-emerald-500/20' 
                              : 'bg-slate-800/90 text-slate-300 border border-slate-700'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isHairDone ? 'bg-white' : 'bg-amber-400'}`} />
                            HAIR: {isHairDone ? 'DONE' : 'PENDING'}
                          </span>
                        )}

                        {/* Overall Status Badge */}
                        <span className={`px-2 py-0.5 rounded font-mono uppercase tracking-wider font-extrabold ${
                          isAllDone 
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}>
                          {order.overallStatus || 'PENDING'}
                        </span>
                      </div>

                      {/* Notes / Voice note attachments */}
                      <div className="flex items-center gap-2 text-xs">
                        {order.notes && order.notes.trim() && order.notes !== 'No Note' && (
                          <div 
                            title={order.notes}
                            className="flex items-center gap-1 text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-[11px]"
                          >
                            <MessageSquare size={12} className="text-blue-400" />
                            <span className="truncate max-w-[150px]">{order.notes}</span>
                          </div>
                        )}

                        {order.voiceNoteUrl && (
                          <div 
                            title="Voice Note Attached" 
                            className="flex items-center gap-1 text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-2 py-0.5 rounded text-[11px] font-mono font-bold"
                          >
                            <Mic size={12} />
                            <span>VOICE</span>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderTimeline;
