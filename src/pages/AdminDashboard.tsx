import React, { useState, useMemo, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAppStore } from '../store';
import { WholesaleOrder, MainCategory, OrderCartItem, CatalogPhoto } from '../types';
import { ProductUploadEditor } from '../components/ProductUploadEditor';
import { ShowroomVideoManager } from '../components/ShowroomVideoManager';
import { HDTVManager } from '../components/HDTVManager';
import { CommunicationPanel } from '../components/CommunicationPanel';
import { CategoryManager } from '../components/CategoryManager';
import { CustomerDirectoryModal } from '../components/CustomerDirectoryModal';
import { CommunityMediaInbox } from '../components/CommunityMediaInbox';
import { initFirebaseSync, updateOrderStatusInFirebase, updateOrderNoteInFirebase, syncNotificationToFirebase, updateOrderNotificationHistory, toggleProductHideInFirebase, deletePhotoFromFirebase } from '../services/firebaseSync';
import { NotificationHub } from '../components/NotificationHub';
import { OrderTimeline } from '../components/OrderTimeline';
import { formatOrderTime12Hour } from '../utils';
import {
  Trash2,
  Plus, Tv,
  Image as ImageIcon,
  Package,
  Users,
  Power,
  ChevronDown,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  X,
  AlertCircle,
  MessageSquare,
  Search,
  Store,
  BellRing,
  Send,
  Truck,
  CheckCircle,
  ShoppingBag,
  Eye,
  EyeOff,
  Sliders,
  Edit2,
  Mic,
  Megaphone,
  Clock,
  Smartphone,
  List
} from 'lucide-react';



export const AdminDashboard: React.FC = () => {
  const {
    orders,
    setOrders,
    deleteOrder,
    updateOrderNotes,
    addOrder,
    photos,
    categories,
    chatMessages,
    resetToDefaults,
    updatePhoto,
    deletePhoto,
    updateOrderStatus
  } = useAppStore();

  const [isLoading, setIsLoading] = useState(true);

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
      fetchedOrders.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setOrders(fetchedOrders);
      setIsLoading(false);
    }, (err) => {
      console.warn('Orders onSnapshot error:', err);
      setIsLoading(false);
    });
    
    // Failsafe timeout
    const timer = setTimeout(() => setIsLoading(false), 2500);
    return () => { unsubscribe(); clearTimeout(timer); };
  }, [setOrders]);

  const unreadChatCount = useMemo(() => {
    return (chatMessages || []).filter(
      m => String(m.sender || '').toUpperCase() === 'CUSTOMER' && !m.isRead
    ).length;
  }, [chatMessages]);

  // Active Main Tab State (default: 'orders')
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'showroom' | 'settings'>('orders');
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('ALL');
  const [editingProduct, setEditingProduct] = useState<CatalogPhoto | null>(null);

  const filteredPhotos = useMemo(() => {
    return (photos || []).filter(p => {
      // Strictly show ONLY hidden products in this view
      if (!p.isHidden) return false;

      const code = (p.photoCode || p.code || '').toLowerCase();
      const sub = (p.subCategoryName || '').toLowerCase();
      const query = productSearchQuery.toLowerCase().trim();
      const matchesQuery = !query || code.includes(query) || sub.includes(query);
      const matchesCat = productCategoryFilter === 'ALL' || p.categoryId === productCategoryFilter;
      return matchesQuery && matchesCat;
    });
  }, [photos, productSearchQuery, productCategoryFilter]);

  // Initialize Firebase Realtime Sync
  useEffect(() => {
    initFirebaseSync();
  }, []);

  // Filter States
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'YESTERDAY'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'SALESMAN' | 'CUSTOMER' | 'PENDING' | 'DONE'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [shopNameFilter, setShopNameFilter] = useState<string | null>(null);
  const [selectedChatCustomerCode, setSelectedChatCustomerCode] = useState<string | null>(null);
  const [ordersLayoutMode, setOrdersLayoutMode] = useState<'standard' | 'timeline' | 'apk_view'>('standard');

  // Dropdown open states
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);


  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Reset page when filters or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [dateFilter, sourceFilter, categoryFilter, searchQuery, shopNameFilter]);

  // Helper to extract Date object from order
  const getOrderDateObj = (order: WholesaleOrder): Date => {
    if (order.createdAt) {
      return new Date(order.createdAt);
    }
    if (order.dateFormatted) {
      const parts = order.dateFormatted.split('-');
      if (parts.length === 3) {
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const y = parseInt(parts[2], 10);
        return new Date(y, m, d);
      }
    }
    return new Date();
  };

  // Modals & Station State
  const [selectedOrder, setSelectedOrder] = useState<WholesaleOrder | null>(null);
  const [showProductUploadScreen, setShowProductUploadScreen] = useState(false);
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [showVideoManager, setShowVideoManager] = useState(false);
  const [showHDTVManager, setShowHDTVManager] = useState(false);
  const [showCommunicationPanel, setShowCommunicationPanel] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [showCustomersModal, setShowCustomersModal] = useState(false);
  const [showCommunityInbox, setShowCommunityInbox] = useState(false);
  const [showNotificationHub, setShowNotificationHub] = useState(false);
  
  // Inline Dispatch mini popup tracking state
  const [miniDispatchOrderId, setMiniDispatchOrderId] = useState<string | null>(null);
  const [miniTransport, setMiniTransport] = useState('');
  const [miniBilty, setMiniBilty] = useState('');
  const [miniParcels, setMiniParcels] = useState('');
  const [miniBiltyPhoto, setMiniBiltyPhoto] = useState('');
  const [localFeedback, setLocalFeedback] = useState<string | null>(null);

  const [orderToDelete, setOrderToDelete] = useState<WholesaleOrder | null>(null);
  const [editingNoteOrderId, setEditingNoteOrderId] = useState<string | null>(null);
  const [editNoteText, setEditNoteText] = useState('');

  // Quick New Order Form state
  const [newOrderForm, setNewOrderForm] = useState<{
    source: 'SALESMAN' | 'CUSTOMER';
    salesmanName: string;
    shopName: string;
    cityName: string;
    mobileNumber: string;
    notes: string;
    totalPieces: number;
    categoryId: MainCategory;
  }>({
    source: 'SALESMAN',
    salesmanName: 'RAMIZ',
    shopName: 'Shree Krishna Novelty',
    cityName: 'Rajkot',
    mobileNumber: '9825012345',
    notes: '',
    totalPieces: 48,
    categoryId: MainCategory.IMITATION
  });

  // Calculate Order Title for display
  const getOrderDisplayTitle = (order: WholesaleOrder) => {
    if (order.shopName) return order.shopName;
    if (order.displayTitle) return order.displayTitle;
    if (order.source === 'SALESMAN') {
      const name = order.salesmanName || 'RAMIZ';
      return `SHIVAM – ${name}`;
    }
    // Customer mobile order: City - Shop
    const city = order.cityName || 'City';
    const shop = order.shopName || 'Shop';
    return `${city} - ${shop}`;
  };

  // Format or get date string
  const getOrderDate = (order: WholesaleOrder) => {
    if (order.dateFormatted) return order.dateFormatted;
    const d = new Date(order.createdAt);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Filter Orders
  const filteredOrders = useMemo(() => {
    const list = orders.filter((order: WholesaleOrder) => {
      // 0. Dedicated Shop Name Filter (from Customer Directory)
      if (shopNameFilter) {
        const matchesExactShop = 
          order.shopName?.toLowerCase() === shopNameFilter.toLowerCase() ||
          order.displayTitle?.toLowerCase().includes(shopNameFilter.toLowerCase());
        if (!matchesExactShop) return false;
      }

      // 1. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchesShop = order.shopName?.toLowerCase().includes(q);
        const matchesCity = order.cityName?.toLowerCase().includes(q);
        const matchesCust = order.customerCode?.toLowerCase().includes(q);
        const matchesSales = order.salesmanName?.toLowerCase().includes(q);
        const matchesOrdNum = order.orderNumber?.toLowerCase().includes(q);
        const matchesTitle = order.displayTitle?.toLowerCase().includes(q);
        const matchesNotes = order.notes?.toLowerCase().includes(q);
        const matchesMobile = order.mobileNumber?.toLowerCase().includes(q);
        const matchesDate = order.dateFormatted?.toLowerCase().includes(q);
        const matchesItem = order.items?.some(
          (i: OrderCartItem) =>
            i.photoCode?.toLowerCase().includes(q) ||
            i.subCategoryName?.toLowerCase().includes(q)
        );

        if (
          !matchesShop &&
          !matchesCity &&
          !matchesCust &&
          !matchesSales &&
          !matchesOrdNum &&
          !matchesTitle &&
          !matchesNotes &&
          !matchesMobile &&
          !matchesDate &&
          !matchesItem
        ) {
          return false;
        }
      }

      // 2. Date Filter
      const orderDate = getOrderDateObj(order);
      const now = new Date();
      const isToday =
        orderDate.getDate() === now.getDate() &&
        orderDate.getMonth() === now.getMonth() &&
        orderDate.getFullYear() === now.getFullYear();

      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const isYesterday =
        orderDate.getDate() === yesterday.getDate() &&
        orderDate.getMonth() === yesterday.getMonth() &&
        orderDate.getFullYear() === yesterday.getFullYear();

      if (dateFilter === 'TODAY' && !isToday && !order.dateFormatted?.includes('16-09')) return false;
      if (dateFilter === 'YESTERDAY' && !isYesterday && !order.dateFormatted?.includes('15-09')) return false;

      // 3. Source / Status Filter
      if (sourceFilter === 'SALESMAN' && order.source !== 'SALESMAN') return false;
      if (sourceFilter === 'CUSTOMER' && order.source !== 'CUSTOMER') return false;
      if (sourceFilter === 'PENDING') {
        const isDone = order.overallStatus === 'DONE' || order.overallStatus === 'READY_TO_SHIP';
        if (isDone) return false;
      }
      if (sourceFilter === 'DONE') {
        const isDone = order.overallStatus === 'DONE' || order.overallStatus === 'READY_TO_SHIP';
        if (!isDone) return false;
      }

      // 4. Category Filter
      if (categoryFilter !== 'ALL') {
        if (!order.items || order.items.length === 0) return false;
        const hasCat = order.items.some((i: OrderCartItem) => i.categoryId === categoryFilter);
        if (!hasCat) return false;
      }

      return true;
    });

    // Requirement 3: Auto-Sorting Logic
    // Automatic sorting based on the timestamp in descending order.
    // The newest/latest orders MUST always appear at the very top of the list,
    // and the oldest orders must go to the very bottom.
    return list.sort((a: WholesaleOrder, b: WholesaleOrder) => {
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
      return timeB - timeA;
    });
  }, [orders, dateFilter, sourceFilter, categoryFilter, searchQuery, shopNameFilter]);

  // Paginated Orders
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredOrders.slice(startIndex, startIndex + pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  // Handle Note Save with Firebase sync
  const handleSaveNote = async (orderId: string) => {
    updateOrderNotes(orderId, editNoteText);
    await updateOrderNoteInFirebase(orderId, editNoteText);
    setEditingNoteOrderId(null);
  };

  // Handle Order Status Update with Firebase sync
  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    const updatedOrders = orders.map(o => {
      if (o.id !== orderId) return o;
      return {
        ...o,
        overallStatus: status,
        imitationStatus: o.imitationStatus !== 'NOT_APPLICABLE' ? status : 'NOT_APPLICABLE',
        cosmeticsStatus: o.cosmeticsStatus !== 'NOT_APPLICABLE' ? status : 'NOT_APPLICABLE',
        hairStatus: o.hairStatus !== 'NOT_APPLICABLE' ? status : 'NOT_APPLICABLE'
      };
    });
    useAppStore.setState({ orders: updatedOrders });
    await updateOrderStatusInFirebase(orderId, status);
  };

  const showToastFeedback = (msg: string) => {
    setLocalFeedback(msg);
    setTimeout(() => setLocalFeedback(null), 4000);
  };

  const triggerConfirmationAlert = async (order: WholesaleOrder) => {
    try {
      const msg = `✅ Order #${order.orderNumber} Confirmed! Your items are moving to packing.`;
      
      const historyItem = {
        id: `confirm-${Date.now()}`,
        type: 'CONFIRMATION' as const,
        message: msg,
        timestamp: Date.now()
      };

      await updateOrderNotificationHistory(order.id, historyItem);

      const notificationPayload = {
        id: `push-confirm-${Date.now()}`,
        title: "✅ Order Confirmed",
        message: msg,
        type: "Order Alert",
        targetCustomerCode: order.customerCode,
        timestamp: Date.now()
      };
      await syncNotificationToFirebase(notificationPayload);

      showToastFeedback(`✅ Confirmation alert successfully pushed to ${order.shopName}!`);
    } catch (err) {
      console.error(err);
      showToastFeedback('❌ Error triggering confirmation alert.');
    }
  };

  const triggerDeptPackedAlert = async (order: WholesaleOrder) => {
    try {
      const msg = `📦 Department Packing Done! Your order is being consolidated.`;
      
      const historyItem = {
        id: `packed-${Date.now()}`,
        type: 'DEPT_PACKED' as const,
        message: msg,
        timestamp: Date.now()
      };

      await updateOrderNotificationHistory(order.id, historyItem);

      const notificationPayload = {
        id: `push-packed-${Date.now()}`,
        title: "📦 Packing Done",
        message: msg,
        type: "Order Alert",
        targetCustomerCode: order.customerCode,
        timestamp: Date.now()
      };
      await syncNotificationToFirebase(notificationPayload);

      showToastFeedback(`📦 Packing alert successfully pushed to ${order.shopName}!`);
    } catch (err) {
      console.error(err);
      showToastFeedback('❌ Error triggering packing alert.');
    }
  };

  const triggerDispatchAlert = async (order: WholesaleOrder, transport: string, bilty: string, parcels: string, biltyPhoto?: string) => {
    try {
      const pCount = parseInt(parcels, 10) || 1;
      const msg = `📦 Parcel Dispatched! Transporter: ${transport}, Bilty No: ${bilty}, Parcels: ${pCount}.`;
      
      const historyItem = {
        id: `dispatch-${Date.now()}`,
        type: 'DISPATCHED' as const,
        message: msg,
        timestamp: Date.now(),
        details: {
          transportName: transport,
          biltyNumber: bilty,
          parcelsCount: pCount,
          biltyPhotoUrl: biltyPhoto
        }
      };

      await updateOrderNotificationHistory(order.id, historyItem);

      const notificationPayload = {
        id: `push-dispatch-${Date.now()}`,
        title: "📦 Order Dispatched!",
        message: msg,
        type: "Parcel Dispatch",
        targetCustomerCode: order.customerCode,
        transportName: transport,
        biltyNumber: bilty,
        parcelsCount: pCount,
        biltyPhotoUrl: biltyPhoto || undefined,
        timestamp: Date.now()
      };
      await syncNotificationToFirebase(notificationPayload);

      await handleUpdateOrderStatus(order.id, 'DISPATCHED');

      showToastFeedback(`📦 Dispatch alert pushed successfully to ${order.shopName}!`);
    } catch (err) {
      console.error(err);
      showToastFeedback('❌ Error triggering dispatch alert.');
    }
  };

  // Handle Create New Order
  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const today = new Date();
    const d = String(today.getDate()).padStart(2, '0');
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const y = today.getFullYear();
    const dateFormatted = `${d}-${m}-${y}`;

    const newOrder: WholesaleOrder = {
      id: `ord-${Date.now()}`,
      orderNumber: `ORD-${Math.floor(Math.random() * 9000) + 1000}`,
      customerCode: newOrderForm.source === 'SALESMAN' ? `CUST-${newOrderForm.salesmanName}` : 'CUST-DIRECT',
      shopName: newOrderForm.shopName,
      cityName: newOrderForm.cityName,
      mobileNumber: newOrderForm.mobileNumber,
      source: newOrderForm.source,
      salesmanName: newOrderForm.source === 'SALESMAN' ? newOrderForm.salesmanName : undefined,
      displayTitle:
        newOrderForm.source === 'SALESMAN'
          ? `SHIVAM – ${newOrderForm.salesmanName}`
          : `${newOrderForm.cityName} - ${newOrderForm.shopName}`,
      dateFormatted,
      notes: newOrderForm.notes.trim() || 'No Note',
      items: [
        {
          photoId: 'p-er-101',
          photoCode: 'QUICK-ORD',
          imageUri: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=1280&h=720&q=80',
          categoryId: newOrderForm.categoryId,
          subCategoryName: 'Wholesale Package',
          optionLetter: 'A',
          quantity: Number(newOrderForm.totalPieces) || 24
        }
      ],
      totalItemsCount: Number(newOrderForm.totalPieces) || 24,
      imitationStatus: newOrderForm.categoryId === MainCategory.IMITATION ? 'PENDING' : 'NOT_APPLICABLE',
      cosmeticsStatus: newOrderForm.categoryId === MainCategory.COSMETICS ? 'PENDING' : 'NOT_APPLICABLE',
      hairStatus: newOrderForm.categoryId === MainCategory.HAIR_ACCESSORIES ? 'PENDING' : 'NOT_APPLICABLE',
      overallStatus: 'PENDING',
      createdAt: Date.now()
    };

    addOrder(newOrder);
    setShowNewOrderModal(false);
    // Reset form
    setNewOrderForm({
      source: 'SALESMAN',
      salesmanName: 'RAMIZ',
      shopName: 'Shree Krishna Novelty',
      cityName: 'Rajkot',
      mobileNumber: '9825012345',
      notes: '',
      totalPieces: 48,
      categoryId: MainCategory.IMITATION
    });
  };

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

  return (
    <div className="w-screen h-screen flex bg-[#0F172A] text-[#F8FAFC] font-sans overflow-hidden select-none">
      
      {/* ----------------------------------------------------------------- */}
      {/* MAIN CONTENT AREA */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* TOP HEADER BAR */}
        <header className="h-14 bg-[#0B1120] border-b border-[#334155]/40 px-4 flex items-center justify-between flex-shrink-0 z-30">
          
          {/* Left: View Title & Contextual Controls */}
          <div className="flex items-center gap-3 sm:gap-5">
            <h1 className="text-sm sm:text-base font-black tracking-wider text-[#F1F5F9] uppercase flex items-center gap-2">
              {activeTab === 'orders' ? (
                <>
                  <ShoppingBag size={18} className="text-[#3B82F6]" />
                  <span>Orders</span>
                </>
              ) : (
                <>
                  <Package size={18} className="text-amber-400" />
                  <span>Products / Inventory</span>
                </>
              )}
            </h1>

            {/* Date Filters for Orders */}
            {activeTab === 'orders' && (
              <div className="hidden sm:flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setDateFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition border ${
                    dateFilter === 'ALL'
                      ? 'bg-[#2563EB] text-white border-transparent'
                      : 'bg-[#1E293B] text-[#94A3B8] border-[#334155]/60 hover:text-white'
                  }`}
                >
                  ALL
                </button>
                <button
                  type="button"
                  onClick={() => setDateFilter('TODAY')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition border ${
                    dateFilter === 'TODAY'
                      ? 'bg-[#2563EB] text-white border-transparent'
                      : 'bg-[#1E293B] text-[#94A3B8] border-[#334155]/60 hover:text-white'
                  }`}
                >
                  TODAY
                </button>
                <button
                  type="button"
                  onClick={() => setDateFilter('YESTERDAY')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition border ${
                    dateFilter === 'YESTERDAY'
                      ? 'bg-[#2563EB] text-white border-transparent'
                      : 'bg-[#1E293B] text-[#94A3B8] border-[#334155]/60 hover:text-white'
                  }`}
                >
                  YESTERDAY
                </button>

                {/* Order Layout Switcher: Standard Table, Timeline, Mobile APK */}
                <div className="hidden lg:flex items-center ml-2 pl-2 border-l border-[#334155]/60 gap-1">
                  <button
                    type="button"
                    onClick={() => setOrdersLayoutMode('standard')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 border ${
                      ordersLayoutMode === 'standard'
                        ? 'bg-[#2563EB] text-white border-transparent'
                        : 'bg-[#1E293B] text-[#94A3B8] border-[#334155]/60 hover:text-white'
                    }`}
                    title="Standard Table View"
                  >
                    <List size={13} />
                    <span>Table</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrdersLayoutMode('timeline')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 border ${
                      ordersLayoutMode === 'timeline'
                        ? 'bg-amber-500 text-slate-950 font-black border-transparent shadow-sm'
                        : 'bg-[#1E293B] text-[#94A3B8] border-[#334155]/60 hover:text-white'
                    }`}
                    title="Order Line Timeline View"
                  >
                    <Clock size={13} />
                    <span>Timeline</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrdersLayoutMode('apk_view')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 border ${
                      ordersLayoutMode === 'apk_view'
                        ? 'bg-purple-600 text-white font-black border-transparent shadow-sm'
                        : 'bg-[#1E293B] text-[#94A3B8] border-[#334155]/60 hover:text-white'
                    }`}
                    title="Mobile APK Simulator View"
                  >
                    <Smartphone size={13} />
                    <span>Mobile APK</span>
                  </button>
                </div>
              </div>
            )}

            {/* Category Filter Pills for Products */}
            {activeTab === 'products' && (
              <div className="hidden sm:flex items-center gap-1">
                {[
                  { key: 'ALL', label: 'All' },
                  { key: MainCategory.IMITATION, label: 'Jewelry' },
                  { key: MainCategory.COSMETICS, label: 'Cosmetics' },
                  { key: MainCategory.HAIR_ACCESSORIES, label: 'Hair' }
                ].map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setProductCategoryFilter(c.key)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition border ${
                      productCategoryFilter === c.key
                        ? 'bg-[#2563EB] text-white border-transparent'
                        : 'bg-[#1E293B] text-[#94A3B8] border-[#334155]/60 hover:text-white'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Search, Filters & Brand Logo */}
          <div className="flex items-center gap-2 sm:gap-3">
            {activeTab === 'orders' ? (
              <>
                {/* Active Shop Filter Badge */}
                {shopNameFilter && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#1E293B] border border-[#334155] text-[#F1F5F9] text-xs font-bold shadow-sm">
                    <Store size={13} className="text-[#3B82F6]" />
                    <span className="truncate max-w-[120px]">{shopNameFilter}</span>
                    <button
                      type="button"
                      onClick={() => setShopNameFilter(null)}
                      className="p-0.5 hover:bg-[#334155] rounded text-[#94A3B8]"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}

                {/* Orders Search Bar */}
                <div className="relative flex items-center">
                  <div className="relative flex items-center bg-[#0F172A] border border-[#334155] rounded-xl px-2.5 py-1.5 focus-within:border-[#3B82F6] transition w-28 sm:w-36 md:w-44">
                    <Search size={14} className="text-[#64748B] mr-2 flex-shrink-0" />
                    <input
                      type="text"
                      placeholder="Search orders..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-transparent border-none outline-none text-xs text-[#F8FAFC] placeholder-[#64748B] w-full"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="p-0.5 text-[#64748B] hover:text-[#F8FAFC] rounded ml-1"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Filter Dropdown */}
                <div className="relative hidden md:block">
                  <button
                    onClick={() => {
                      setShowFilterDropdown(!showFilterDropdown);
                      setShowCategoryDropdown(false);
                    }}
                    className="bg-[#1E293B] hover:bg-[#334155] text-[#F8FAFC] border border-[#334155] px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    <span>
                      {sourceFilter === 'ALL' && 'ALL'}
                      {sourceFilter === 'SALESMAN' && 'SALESMEN'}
                      {sourceFilter === 'CUSTOMER' && 'CUSTOMERS'}
                      {sourceFilter === 'PENDING' && 'PENDING'}
                      {sourceFilter === 'DONE' && 'DONE'}
                    </span>
                    <ChevronDown size={14} className="text-[#94A3B8]" />
                  </button>

                  {showFilterDropdown && (
                    <div className="absolute right-0 mt-1 w-48 bg-[#111827] border border-[#334155] rounded-xl shadow-2xl py-1 z-50 text-xs">
                      <button
                        onClick={() => { setSourceFilter('ALL'); setShowFilterDropdown(false); }}
                        className={`w-full text-left px-3 py-2 hover:bg-[#1E293B] ${sourceFilter === 'ALL' ? 'text-[#3B82F6] font-bold' : 'text-[#F1F5F9]'}`}
                      >
                        All Orders
                      </button>
                      <button
                        onClick={() => { setSourceFilter('SALESMAN'); setShowFilterDropdown(false); }}
                        className={`w-full text-left px-3 py-2 hover:bg-[#1E293B] ${sourceFilter === 'SALESMAN' ? 'text-[#3B82F6] font-bold' : 'text-[#F1F5F9]'}`}
                      >
                        Salesmen Only (SHIVAM)
                      </button>
                      <button
                        onClick={() => { setSourceFilter('CUSTOMER'); setShowFilterDropdown(false); }}
                        className={`w-full text-left px-3 py-2 hover:bg-[#1E293B] ${sourceFilter === 'CUSTOMER' ? 'text-[#3B82F6] font-bold' : 'text-[#F1F5F9]'}`}
                      >
                        Customer Mobile Only
                      </button>
                      <div className="border-t border-[#334155] my-1" />
                      <button
                        onClick={() => { setSourceFilter('PENDING'); setShowFilterDropdown(false); }}
                        className={`w-full text-left px-3 py-2 hover:bg-[#1E293B] ${sourceFilter === 'PENDING' ? 'text-[#3B82F6] font-bold' : 'text-[#F1F5F9]'}`}
                      >
                        Pending Orders Only
                      </button>
                      <button
                        onClick={() => { setSourceFilter('DONE'); setShowFilterDropdown(false); }}
                        className={`w-full text-left px-3 py-2 hover:bg-[#1E293B] ${sourceFilter === 'DONE' ? 'text-[#3B82F6] font-bold' : 'text-[#F1F5F9]'}`}
                      >
                        Done Orders Only
                      </button>
                    </div>
                  )}
                </div>

                {/* Categories Dropdown */}
                <div className="relative hidden lg:block">
                  <button
                    onClick={() => {
                      setShowCategoryDropdown(!showCategoryDropdown);
                      setShowFilterDropdown(false);
                    }}
                    className="bg-[#1E293B] hover:bg-[#334155] text-[#F8FAFC] border border-[#334155] px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition uppercase"
                  >
                    <span>
                      {categoryFilter === 'ALL' ? 'CATEGORIES' : categoryFilter}
                    </span>
                    <ChevronDown size={14} className="text-[#94A3B8]" />
                  </button>

                  {showCategoryDropdown && (
                    <div className="absolute right-0 mt-1 w-52 bg-[#111827] border border-[#334155] rounded-xl shadow-2xl py-1 z-50 text-xs">
                      <button
                        onClick={() => { setCategoryFilter('ALL'); setShowCategoryDropdown(false); }}
                        className={`w-full text-left px-3 py-2 hover:bg-[#1E293B] ${categoryFilter === 'ALL' ? 'text-[#3B82F6] font-bold' : 'text-[#F1F5F9]'}`}
                      >
                        All Categories
                      </button>
                      <button
                        onClick={() => { setCategoryFilter(MainCategory.IMITATION); setShowCategoryDropdown(false); }}
                        className={`w-full text-left px-3 py-2 hover:bg-[#1E293B] ${categoryFilter === MainCategory.IMITATION ? 'text-[#3B82F6] font-bold' : 'text-[#F1F5F9]'}`}
                      >
                        Imitation Jewelry
                      </button>
                      <button
                        onClick={() => { setCategoryFilter(MainCategory.COSMETICS); setShowCategoryDropdown(false); }}
                        className={`w-full text-left px-3 py-2 hover:bg-[#1E293B] ${categoryFilter === MainCategory.COSMETICS ? 'text-[#3B82F6] font-bold' : 'text-[#F1F5F9]'}`}
                      >
                        Cosmetics
                      </button>
                      <button
                        onClick={() => { setCategoryFilter(MainCategory.HAIR_ACCESSORIES); setShowCategoryDropdown(false); }}
                        className={`w-full text-left px-3 py-2 hover:bg-[#1E293B] ${categoryFilter === MainCategory.HAIR_ACCESSORIES ? 'text-[#3B82F6] font-bold' : 'text-[#F1F5F9]'}`}
                      >
                        Hair Accessories
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Product Search Bar */}
                <div className="relative flex items-center">
                  <div className="relative flex items-center bg-[#0F172A] border border-[#334155] rounded-xl px-2.5 py-1.5 focus-within:border-[#3B82F6] transition w-32 sm:w-44 md:w-56">
                    <Search size={14} className="text-[#64748B] mr-2 flex-shrink-0" />
                    <input
                      type="text"
                      placeholder="Search photo code..."
                      value={productSearchQuery}
                      onChange={(e) => setProductSearchQuery(e.target.value)}
                      className="bg-transparent border-none outline-none text-xs text-[#F8FAFC] placeholder-[#64748B] w-full"
                    />
                    {productSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setProductSearchQuery('')}
                        className="p-0.5 text-[#64748B] hover:text-[#F8FAFC] rounded ml-1"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Upload Product Button */}
                <button
                  type="button"
                  onClick={() => setShowProductUploadScreen(true)}
                  className="px-3 py-1.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition active:scale-95 flex-shrink-0"
                >
                  <Plus size={15} />
                  <span className="hidden sm:inline">Upload Product</span>
                  <span className="sm:hidden">Upload</span>
                </button>
              </>
            )}

            {/* Brand Logo: Multi-Color "SHIVAM" */}
            <div 
              className="ml-2 sm:ml-4 font-black text-xl sm:text-2xl tracking-[0.18em] select-none flex items-center"
              title="SHIVAM Enterprise Wholesale"
            >
              <span className="text-[#ef4444]">S</span>
              <span className="text-[#f97316]">H</span>
              <span className="text-[#22c55e]">I</span>
              <span className="text-[#06b6d4]">V</span>
              <span className="text-[#3b82f6]">A</span>
              <span className="text-[#a855f7]">M</span>
            </div>
          </div>
        </header>

        {/* --------------------------------------------------------------- */}
        {/* TAB 1: PRODUCTS & INVENTORY MANAGEMENT VIEW */}
        {/* --------------------------------------------------------------- */}
        {activeTab === 'products' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto px-4 py-4 space-y-4 custom-scrollbar">
            
            {/* Products Grid */}
            {filteredPhotos.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 space-y-3 bg-[#0B1120]/50 border border-dashed border-[#334155] rounded-2xl">
                <AlertCircle size={40} className="text-amber-400" />
                <p className="text-sm font-bold text-center max-w-md text-slate-300">
                  {productSearchQuery ? `No products matching "${productSearchQuery}".` : 'No products found in Firestore database.'}
                </p>
                <button
                  type="button"
                  onClick={() => setShowProductUploadScreen(true)}
                  className="px-4 py-2 rounded-xl bg-[#2563EB] text-white font-bold text-xs hover:bg-[#1D4ED8] transition shadow-md flex items-center gap-2"
                >
                  <Plus size={15} />
                  <span>Upload First Product</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredPhotos.map((p) => {
                  const isHidden = p.isHidden === true;
                  const code = p.photoCode || p.code || 'NO-CODE';

                  return (
                    <div
                      key={p.id}
                      className="bg-[#0B1120] border border-[#334155]/60 hover:border-[#3B82F6]/50 rounded-2xl overflow-hidden shadow-lg flex flex-col transition-all group"
                    >
                      {/* Product Image Preview */}
                      <div className="relative aspect-video w-full bg-slate-950 overflow-hidden">
                        <img
                          src={p.imageUri}
                          alt={code}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <span className="absolute top-2 left-2 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-lg text-xs font-mono font-black text-amber-300 border border-amber-400/30">
                          {code}
                        </span>

                        {/* Status Badge in Top Right */}
                        <span
                          className={`absolute top-2 right-2 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 backdrop-blur-md border ${
                            isHidden
                              ? 'bg-rose-950/80 text-rose-300 border-rose-500/40'
                              : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                          }`}
                        >
                          {isHidden ? <EyeOff size={11} /> : <Eye size={11} />}
                          <span>{isHidden ? 'Hidden' : 'Visible'}</span>
                        </span>
                      </div>

                      {/* Info & Details */}
                      <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
                        <div>
                          <div className="font-black text-xs text-white truncate">{p.subCategoryName || 'Uncategorized'}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center justify-between font-mono">
                            <span>Default: {p.defaultQuantity || 1} pcs</span>
                            <span>{p.itemCount || 4} Designs</span>
                          </div>
                        </div>

                        {/* Actions Row with Status Toggle */}
                        <div className="pt-2 border-t border-[#334155]/30 flex items-center justify-between gap-2">
                          {/* Toggle Status Button */}
                          <button
                            type="button"
                            onClick={async () => {
                              const nextHidden = !isHidden;
                              updatePhoto(p.id, { isHidden: nextHidden, isVisible: !nextHidden });
                              await toggleProductHideInFirebase(p.id, nextHidden);
                            }}
                            className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition border ${
                              isHidden
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                            }`}
                            title="Click to toggle product visibility"
                          >
                            {isHidden ? <Eye size={13} /> : <EyeOff size={13} />}
                            <span>{isHidden ? 'Show Product' : 'Hide Product'}</span>
                          </button>

                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => setEditingProduct(p)}
                            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition border border-slate-700"
                            title="Edit Product Details"
                          >
                            <Edit2 size={14} />
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={async () => {
                              if (window.confirm(`Are you sure you want to delete product "${code}"?`)) {
                                deletePhoto(p.id);
                                await deletePhotoFromFirebase(p.id);
                              }
                            }}
                            className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/30 text-rose-400 transition border border-rose-500/20"
                            title="Delete Product"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* --------------------------------------------------------------- */}
        {/* TAB 2: ORDERS LIST CONTAINER */}
        {/* --------------------------------------------------------------- */}
        {activeTab === 'orders' && (
          <>
            {ordersLayoutMode === 'timeline' ? (
              <div className="flex-1 overflow-hidden flex flex-col bg-[#0B1120]">
                <OrderTimeline mode="dashboard" onSelectOrder={setSelectedOrder} selectedOrderId={selectedOrder?.id} />
              </div>
            ) : ordersLayoutMode === 'apk_view' ? (
              <div className="flex-1 overflow-y-auto p-4 flex justify-center items-start custom-scrollbar bg-[#040812]">
                <div className="w-full max-w-[420px] h-[820px] bg-black rounded-[44px] p-3 shadow-2xl border-4 border-slate-800 overflow-hidden relative flex flex-col my-auto">
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-1 bg-slate-800 rounded-full z-40" />
                  <div className="w-full h-full bg-[#040812] rounded-[34px] overflow-hidden flex flex-col">
                    <OrderTimeline mode="mobile" onSelectOrder={setSelectedOrder} selectedOrderId={selectedOrder?.id} />
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1.5 custom-scrollbar">
          {isLoading ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 space-y-3">
              <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-semibold text-slate-400">Loading live orders...</p>
            </div>
          ) : paginatedOrders.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 space-y-3">
              <AlertCircle size={36} className="text-slate-500" />
              <p className="text-sm font-semibold text-center max-w-md">
                {searchQuery
                  ? `No orders matching "${searchQuery}".`
                  : shopNameFilter
                  ? `No orders found for shop "${shopNameFilter}".`
                  : 'No orders found for the selected filter.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setDateFilter('ALL');
                  setSourceFilter('ALL');
                  setCategoryFilter('ALL');
                  setSearchQuery('');
                  setShopNameFilter(null);
                }}
                className="px-4 py-2 rounded-xl bg-[#2563EB] text-white font-bold text-xs hover:bg-[#1D4ED8] transition-all shadow-md shadow-blue-500/10 border border-transparent"
              >
                Clear Filters & Search
              </button>
            </div>
          ) : (
            paginatedOrders.map((order: WholesaleOrder) => {
              const dateStr = getOrderDate(order);
              const titleStr = getOrderDisplayTitle(order);

              // Determine Category color for custom left border accent and background tint
              let categoryAccentColor = '#475569'; // default slate-600
              if (order.items && order.items.length > 0) {
                const matchedCat = categories.find(c => c.id === order.items[0].categoryId);
                if (matchedCat) {
                  categoryAccentColor = matchedCat.accentColorHex || '#475569';
                }
              }

              return (
                <div
                  key={order.id}
                  className="w-full h-12 border border-[#334155]/30 hover:border-[#D97706]/40 rounded-xl flex items-center justify-between transition-all shadow-md overflow-hidden group relative"
                  style={{ 
                    borderLeft: `4px solid ${categoryAccentColor}`,
                    background: `linear-gradient(90deg, ${categoryAccentColor}22 0%, ${categoryAccentColor}06 100%)`
                  }}
                >
                  {/* Clickable Row Area to Open Breakdown */}
                  <div
                    onClick={() => setSelectedOrder(order)}
                    className="flex-1 h-full flex items-center cursor-pointer min-w-0"
                  >
                    {/* 1. Strict 12-Hour AM/PM Time Format & Date Column */}
                    <div className="w-28 sm:w-36 flex-shrink-0 px-3 flex flex-col justify-center select-none">
                      <span className="font-mono font-black text-xs sm:text-sm text-amber-400 tracking-tight flex items-center gap-1">
                        <Clock size={12} className="text-amber-400/80 flex-shrink-0" />
                        {formatOrderTime12Hour(order.createdAt)}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400 font-semibold mt-0.5">
                        {dateStr}
                      </span>
                    </div>

                    {/* 2. Prominent Customer Shop Name Column */}
                    <div className="w-1/3 min-w-[200px] flex-shrink-0 px-2 flex flex-col justify-center text-left truncate select-none">
                      <div className="font-extrabold text-xs sm:text-sm uppercase tracking-wide text-[#F1F5F9] truncate flex items-center gap-1.5 group-hover:text-[#D97706] transition-colors">
                        <Store size={13} className="flex-shrink-0 text-[#64748B] group-hover:text-[#D97706]/80" />
                        <span className="truncate">{titleStr}</span>
                      </div>
                      {order.cityName && (
                        <div className="text-[10px] text-[#64748B] font-semibold truncate mt-0.5">
                          {order.cityName} {order.mobileNumber ? `• ${order.mobileNumber}` : ''}
                        </div>
                      )}
                    </div>

                    {/* 3. Note / Remarks Column with Icons Only */}
                    <div className="flex-1 min-w-[80px] max-w-[120px] px-3 flex items-center justify-center gap-2 select-none">
                      {order.notes && order.notes.trim() && order.notes !== 'No Note' && (
                        <div title={order.notes} className="p-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center cursor-pointer hover:bg-blue-500/20">
                          <MessageSquare size={14} />
                        </div>
                      )}
                      {order.voiceNoteUrl && (
                        <div title="Voice Note Attached" className="p-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center cursor-pointer hover:bg-emerald-500/20">
                          <Mic size={14} />
                        </div>
                      )}
                      {(!order.notes || order.notes.trim() === '' || order.notes === 'No Note') && !order.voiceNoteUrl && (
                        <span className="text-[#64748B] opacity-40 italic text-[11px]">-</span>
                      )}
                    </div>
                  </div>

                  {/* 4. Category Tag & All Live Department Staff Status Badges in ONE Single Line */}
                  <div className="flex items-center gap-3 flex-nowrap relative">
                    {/* Live Department Staff Status Badges */}
                    {order.imitationStatus && order.imitationStatus !== 'NOT_APPLICABLE' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const next = order.imitationStatus === 'DONE' ? 'PENDING' : 'DONE';
                          updateOrderStatus(order.id, 'imitation', next);
                        }}
                        title="Click to toggle Jewelry department status"
                        className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border whitespace-nowrap transition-all ${
                          order.imitationStatus === 'DONE' 
                            ? 'bg-emerald-600 text-white border-emerald-500 animate-pulse' 
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        Jewelry
                      </button>
                    )}

                    {order.cosmeticsStatus && order.cosmeticsStatus !== 'NOT_APPLICABLE' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const next = order.cosmeticsStatus === 'DONE' ? 'PENDING' : 'DONE';
                          updateOrderStatus(order.id, 'cosmetics', next);
                        }}
                        title="Click to toggle Cosmetics department status"
                        className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border whitespace-nowrap transition-all ${
                          order.cosmeticsStatus === 'DONE' 
                            ? 'bg-emerald-600 text-white border-emerald-500 animate-pulse' 
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        Cosmetics
                      </button>
                    )}

                    {order.hairStatus && order.hairStatus !== 'NOT_APPLICABLE' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const next = order.hairStatus === 'DONE' ? 'PENDING' : 'DONE';
                          updateOrderStatus(order.id, 'hair', next);
                        }}
                        title="Click to toggle Hair department status"
                        className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border whitespace-nowrap transition-all ${
                          order.hairStatus === 'DONE' 
                            ? 'bg-emerald-600 text-white border-emerald-500 animate-pulse' 
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        Hair
                      </button>
                    )}

                    {/* Automatic Master Status Badge */}
                    {(() => {
                      const deptStatuses = [order.imitationStatus, order.cosmeticsStatus, order.hairStatus].filter(s => s && s !== 'NOT_APPLICABLE');
                      const doneDeptsCount = deptStatuses.filter(s => s === 'DONE').length;
                      const activeDeptsCount = deptStatuses.length;
                      
                      let displayStatus = 'PENDING';
                      let statusStyles = 'bg-amber-900/40 text-amber-400 border-amber-500/30';

                      if (doneDeptsCount === activeDeptsCount && activeDeptsCount > 0) {
                        displayStatus = 'DONE';
                        statusStyles = 'bg-emerald-600 text-white border-emerald-500';
                      } else if (doneDeptsCount > 0) {
                        displayStatus = 'IN PROGRESS';
                        statusStyles = 'bg-indigo-600 text-white border-indigo-500';
                      } else {
                        displayStatus = 'PENDING';
                        statusStyles = 'bg-amber-600/20 text-amber-400 border-amber-500/30';
                      }

                      return (
                        <div className={`px-4 py-1.5 rounded-full font-black text-[11px] uppercase tracking-wider border ${statusStyles}`}>
                          {displayStatus}
                        </div>
                      );
                    })()}
                  </div>

                  {/* 4b. Inline Live Broadcast/Bell alert trigger */}
                  <div className="w-10 h-full flex-shrink-0 flex items-center justify-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedOrder(order);
                      }}
                      title="Send Customer Live Push Alerts & Confirmations"
                      className="p-1.5 rounded-lg bg-[#1E293B] hover:bg-[#334155] text-slate-400 hover:text-[#D97706] active:scale-95 transition"
                    >
                      <BellRing size={13} className="animate-pulse text-[#D97706]" />
                    </button>
                  </div>

                  {/* 5. Delete Action (Elegant Minimal Red with Matte Transition) */}
                  <div className="w-12 h-full flex-shrink-0 flex items-center justify-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOrderToDelete(order);
                      }}
                      title="Delete Order"
                      className="w-full h-full bg-[#ef4444]/10 hover:bg-[#ef4444]/30 text-[#ef4444] flex items-center justify-center transition-colors active:scale-90 border-l border-[#334155]/20"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* --------------------------------------------------------------- */}
        {/* BOTTOM PAGINATION FOOTER BAR (Screenshot Faithful) */}
        {/* --------------------------------------------------------------- */}
        <footer className="h-10 bg-[#0B1120] border-t border-[#334155]/40 px-4 flex items-center justify-between text-xs text-[#94A3B8] flex-shrink-0 z-20">
          
          {/* Left: Counter info */}
          <div className="font-semibold text-[#94A3B8] text-xs">
            Showing {filteredOrders.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}-
            {Math.min(currentPage * pageSize, filteredOrders.length)} of {filteredOrders.length} orders
          </div>

          {/* Right: Page Navigation Icons */}
          <div className="flex items-center gap-1 sm:gap-2">
            
            {/* First Page */}
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="p-1 rounded hover:bg-slate-800 disabled:opacity-30 text-slate-300 hover:text-white transition"
              title="First Page"
            >
              <ChevronsLeft size={16} />
            </button>

            {/* Prev Page */}
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded hover:bg-slate-800 disabled:opacity-30 text-slate-300 hover:text-white transition"
              title="Previous Page"
            >
              <ChevronLeft size={16} />
            </button>

            <span className="px-2 font-mono font-bold text-slate-300">
              {currentPage} / {totalPages}
            </span>

            {/* Next Page */}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1 rounded hover:bg-slate-800 disabled:opacity-30 text-slate-300 hover:text-white transition"
              title="Next Page"
            >
              <ChevronRight size={16} />
            </button>

            {/* Last Page */}
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage >= totalPages}
              className="p-1 rounded hover:bg-slate-800 disabled:opacity-30 text-slate-300 hover:text-white transition"
              title="Last Page"
            >
              <ChevronsRight size={16} />
            </button>
          </div>
        </footer>
              </>
            )}
          </>
        )}

        {/* --------------------------------------------------------------- */}
        {/* TAB 3: SHOWROOM CATALOG & VIDEO SLIDER VIEW */}
        {/* --------------------------------------------------------------- */}
        {activeTab === 'showroom' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto px-4 py-4 space-y-4 custom-scrollbar">
            <div className="flex flex-wrap items-center justify-between bg-[#0B1120] border border-[#334155]/40 px-4 py-3 rounded-2xl gap-3">
              <div>
                <h2 className="text-sm font-black uppercase text-[#F1F5F9] tracking-wider flex items-center gap-2">
                  <Tv size={16} className="text-cyan-400" />
                  <span>Showroom & HDTV Media Management</span>
                </h2>
                <p className="text-[11px] text-[#94A3B8]">Configure digital showroom banners, promotional video loops, and live TV presentation slides.</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowHDTVManager(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Tv size={14} />
                  <span>HDTV Management</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowVideoManager(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 text-xs font-bold transition flex items-center gap-1.5"
                >
                  <ImageIcon size={14} />
                  <span>Video & Media Catalog</span>
                </button>
              </div>
            </div>

            {/* Catalog Grid Preview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {photos.slice(0, 9).map((p) => (
                <div key={p.id} className="bg-[#0B1120] border border-[#334155]/60 rounded-2xl overflow-hidden p-2 flex gap-3 items-center">
                  <img src={p.imageUri} alt={p.photoCode || 'Product'} className="w-20 h-20 object-cover rounded-xl bg-slate-950" />
                  <div className="flex-1 min-w-0">
                    <div className="font-mono font-black text-amber-400 text-xs">{p.photoCode || p.code || 'NO-CODE'}</div>
                    <div className="text-xs font-bold text-white truncate">{p.subCategoryName || 'Uncategorized'}</div>
                    <div className="text-[10px] text-slate-400 mt-1">{p.itemCount || 4} Designs • {p.defaultQuantity || 1} pcs</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --------------------------------------------------------------- */}
        {/* TAB 4: SYSTEM SETTINGS & UTILITIES VIEW */}
        {/* --------------------------------------------------------------- */}
        {activeTab === 'settings' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto px-4 py-4 space-y-4 custom-scrollbar">
            <div className="bg-[#0B1120] border border-[#334155]/40 px-4 py-3 rounded-2xl">
              <h2 className="text-sm font-black uppercase text-[#F1F5F9] tracking-wider flex items-center gap-2">
                <Sliders size={16} className="text-purple-400" />
                <span>Admin Directory & System Settings</span>
              </h2>
              <p className="text-[11px] text-[#94A3B8]">Manage customer directories, broadcast alerts, category master indexes, and database reset triggers.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Customer Directory */}
              <button
                type="button"
                onClick={() => setShowCustomersModal(true)}
                className="p-5 bg-[#0B1120] border border-[#334155]/60 hover:border-blue-500/50 rounded-2xl flex flex-col items-start gap-3 text-left transition group"
              >
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 group-hover:scale-110 transition">
                  <Users size={22} />
                </div>
                <div>
                  <div className="font-black text-sm text-white">Customer & Salesman Directory</div>
                  <div className="text-xs text-slate-400 mt-1">View retail buyer profiles, city directories, and order histories.</div>
                </div>
              </button>

              {/* Notification Hub */}
              <button
                type="button"
                onClick={() => setShowNotificationHub(true)}
                className="p-5 bg-[#0B1120] border border-[#334155]/60 hover:border-cyan-500/50 rounded-2xl flex flex-col items-start gap-3 text-left transition group"
              >
                <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 group-hover:scale-110 transition">
                  <Megaphone size={22} />
                </div>
                <div>
                  <div className="font-black text-sm text-white">Push Notification Control Hub</div>
                  <div className="text-xs text-slate-400 mt-1">Broadcast new product arrivals, dispatch notifications, and stock alerts.</div>
                </div>
              </button>

              {/* Category Master */}
              <button
                type="button"
                onClick={() => setShowInventoryModal(true)}
                className="p-5 bg-[#0B1120] border border-[#334155]/60 hover:border-amber-500/50 rounded-2xl flex flex-col items-start gap-3 text-left transition group"
              >
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 group-hover:scale-110 transition">
                  <Package size={22} />
                </div>
                <div>
                  <div className="font-black text-sm text-white">Categories & Subcategories Index</div>
                  <div className="text-xs text-slate-400 mt-1">Configure imitation jewelry, cosmetics, and hair accessories categories.</div>
                </div>
              </button>

              {/* Customer Chat */}
              <button
                type="button"
                onClick={() => setShowCommunicationPanel(true)}
                className="p-5 bg-[#0B1120] border border-[#334155]/60 hover:border-emerald-500/50 rounded-2xl flex flex-col items-start gap-3 text-left transition group"
              >
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition">
                  <MessageSquare size={22} />
                </div>
                <div>
                  <div className="font-black text-sm text-white">Customer Helpdesk Chat</div>
                  <div className="text-xs text-slate-400 mt-1">1-on-1 customer messages, voice note playback, and order confirmations.</div>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* RIGHT VERTICAL SIDEBAR (Screenshot Faithful Deep Muted Slate) */}
      {/* ----------------------------------------------------------------- */}
      <aside className="w-14 bg-[#0B1120] border-l border-[#334155]/40 h-full flex flex-col items-center justify-between py-4 z-40 flex-shrink-0 shadow-lg">
        
        {/* Top Action Icons */}
        <div className="flex flex-col items-center gap-3">
          
          {/* 0. ORDERS ICON: Switch to Orders View */}
          <button
            onClick={() => setActiveTab('orders')}
            title="Orders View"
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition relative ${
              activeTab === 'orders'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <ShoppingBag size={20} />
            {orders.length > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 bg-blue-500 text-white rounded-full flex items-center justify-center text-[9px] font-black border border-[#0B1120]">
                {orders.length > 99 ? '99+' : orders.length}
              </span>
            )}
          </button>

          {/* 0.1 PRODUCTS ICON: Switch to Catalog Products View */}
          <button
            onClick={() => setActiveTab('products')}
            title="Products / Catalog Inventory"
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition relative ${
              activeTab === 'products'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <Package size={20} />
            {photos.length > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 bg-amber-500 text-white rounded-full flex items-center justify-center text-[9px] font-black border border-[#0B1120]">
                {photos.length > 99 ? '99+' : photos.length}
              </span>
            )}
          </button>

          <div className="w-8 h-[1px] bg-[#334155]/40 my-0.5" />

          {/* 1. PLUS ICON: Upload Photos & Product Information */}
          <button
            onClick={() => setShowProductUploadScreen(true)}
            title="Upload Photos & Products (Product Information)"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-emerald-400 hover:bg-emerald-500/10 active:scale-95 transition"
          >
            <Plus size={22} className="stroke-[2.5]" />
          </button>

          {/* 2.1 TV ICON: HDTV Video Slider Management */}
          <button
            onClick={() => setShowHDTVManager(true)}
            title="HDTV Video Management"
            className="w-10 h-10 rounded-lg flex items-center justify-center text-amber-400 hover:text-amber-300 hover:bg-slate-800/80 active:scale-95 transition"
          >
            <Tv size={20} />
          </button>
          
          {/* 2. IMAGE ICON: Catalog Gallery */}
          <button
            onClick={() => setShowVideoManager(true)}
            title="Showroom Video Management"
            className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800/80 active:scale-95 transition"
          >
            <ImageIcon size={20} />
          </button>

          {/* 3. 3D BOX / PACKAGE ICON: Categories & Inventory */}
          <button
            onClick={() => setShowInventoryModal(true)}
            title="Categories & Inventory Stock"
            className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800/80 active:scale-95 transition"
          >
            <Package size={20} />
          </button>

          {/* 4. USERS ICON: Customer & Salesman Directory */}
          <button
            onClick={() => setShowCustomersModal(true)}
            title="Customers & Salesmen Directory"
            className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800/80 active:scale-95 transition"
          >
            <Users size={20} />
          </button>
          
          {/* 5. COMMUNITY & MEDIA INBOX: WhatsApp-Style Live Photo Feed & Broadcasts */}
          <button
            onClick={() => setShowNotificationHub(true)}
            title="Push Notification Control Hub (Live Broadcasts & Dispatch Alerts)"
            className="w-10 h-10 rounded-lg flex items-center justify-center text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 active:scale-95 transition relative"
          >
            <Megaphone size={20} />
          </button>

          {/* 6. MESSAGE/COMMUNICATION ICON: 1-on-1 Customer Chat */}
          <button
            onClick={() => setShowCommunicationPanel(true)}
            title="Customer 1-on-1 WhatsApp-Style Helpdesk"
            className="w-10 h-10 rounded-lg flex items-center justify-center text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 active:scale-95 transition relative"
          >
            <MessageSquare size={20} />
            {unreadChatCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-black shadow-lg animate-bounce border-2 border-[#09152a]">
                {unreadChatCount > 99 ? '99+' : unreadChatCount}
              </span>
            )}
          </button>
        </div>

        {/* Bottom Exit / Reset Icon */}
        <div>
          <button
            onClick={() => {
              if (window.confirm('Reset all demo orders and catalog to fresh initial sample?')) {
                resetToDefaults();
              }
            }}
            title="Reset Data to Factory Sample"
            className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-500/10 active:scale-95 transition"
          >
            <Power size={18} />
          </button>
        </div>
      </aside>

      {/* ----------------------------------------------------------------- */}
      {/* MODAL 1: FULL ORDER DETAILS & WHOLESALE INVOICE BREAKDOWN */}
      {/* ----------------------------------------------------------------- */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1E293B] border border-[#334155] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-[#0B1120] border-b border-[#334155]/40 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#78350F] text-[#FDE68A] border border-[#d97706]/30 font-bold">
                    {selectedOrder.orderNumber}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-[#1E1B4B] text-[#C7D2FE] border border-[#334155]/30">
                    {selectedOrder.source === 'SALESMAN' ? `Salesman: ${selectedOrder.salesmanName || 'RAMIZ'}` : 'Customer Mobile Order'}
                  </span>
                </div>
                <h2 className="text-lg font-black text-[#F1F5F9] mt-1">
                  {getOrderDisplayTitle(selectedOrder)}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-1.5 rounded-xl bg-[#1E293B] hover:bg-[#334155] text-[#94A3B8] hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-sm custom-scrollbar">
              
              {/* Order Meta Info Card */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#0F172A] border border-[#334155]/40 p-3 rounded-xl">
                <div>
                  <span className="text-[11px] text-[#64748B] font-semibold block">Date</span>
                  <span className="font-bold text-[#F1F5F9] text-xs">{getOrderDate(selectedOrder)}</span>
                </div>
                <div>
                  <span className="text-[11px] text-[#64748B] font-semibold block">City & Shop</span>
                  <span className="font-bold text-[#F1F5F9] text-xs truncate block">{selectedOrder.cityName} - {selectedOrder.shopName}</span>
                </div>
                <div>
                  <span className="text-[11px] text-[#64748B] font-semibold block">Mobile</span>
                  <span className="font-bold text-[#F1F5F9] text-xs">{selectedOrder.mobileNumber || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[11px] text-[#64748B] font-semibold block">Order Status</span>
                  <select
                    value={selectedOrder.overallStatus || 'PENDING'}
                    onChange={(e) => {
                      const newSt = e.target.value;
                      handleUpdateOrderStatus(selectedOrder.id, newSt);
                      setSelectedOrder(prev => prev ? { ...prev, overallStatus: newSt as any } : null);
                    }}
                    className="mt-0.5 bg-[#0F172A] border border-[#334155] rounded-xl px-2 py-1 text-xs font-bold text-[#D97706] outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]/30 uppercase cursor-pointer text-center"
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="PROCESSING">PROCESSING</option>
                    <option value="PACKED">PACKED</option>
                    <option value="DISPATCHED">DISPATCHED</option>
                    <option value="DONE">DONE</option>
                  </select>
                </div>
              </div>

              {/* Department Packing Statuses */}
              <div className="flex flex-wrap items-center gap-2 p-3 bg-[#0B1120] rounded-xl border border-[#334155]/40">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Packing:</span>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${selectedOrder.cosmeticsStatus === 'DONE' ? 'bg-emerald-900/50 text-emerald-400 border-emerald-500/30' : 'bg-amber-900/50 text-amber-400 border-amber-500/30'}`}>
                  Cosmetics: {selectedOrder.cosmeticsStatus || 'PENDING'}
                </span>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${selectedOrder.imitationStatus === 'DONE' ? 'bg-emerald-900/50 text-emerald-400 border-emerald-500/30' : 'bg-amber-900/50 text-amber-400 border-amber-500/30'}`}>
                  Jewelry: {selectedOrder.imitationStatus || 'PENDING'}
                </span>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${selectedOrder.hairStatus === 'DONE' ? 'bg-emerald-900/50 text-emerald-400 border-emerald-500/30' : 'bg-amber-900/50 text-amber-400 border-amber-500/30'}`}>
                  Hair Accessories: {selectedOrder.hairStatus || 'PENDING'}
                </span>
              </div>

              {/* Push Notification Alert Console */}
              <div className="bg-[#0F172A] border border-[#334155]/60 p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-[#334155]/30 pb-2">
                  <span className="text-xs font-black text-[#D97706] uppercase tracking-wider flex items-center gap-1.5">
                    <BellRing size={13} className="text-[#D97706] animate-pulse" />
                    <span>Customer Live Push Alerts</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Order Updates</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {/* Button 1: Send Confirmation */}
                  <button
                    type="button"
                    onClick={() => triggerConfirmationAlert(selectedOrder)}
                    className="py-2.5 px-2 bg-[#1E1B4B]/80 hover:bg-[#1E1B4B] border border-[#4338CA]/30 hover:border-[#4338CA]/60 rounded-xl text-center text-xs font-bold text-[#C7D2FE] flex flex-col items-center justify-center gap-1 transition active:scale-95"
                  >
                    <CheckCircle size={14} className="text-[#818CF8]" />
                    <span>Send Confirm</span>
                  </button>

                  {/* Button 2: Send Department Packed */}
                  <button
                    type="button"
                    onClick={() => triggerDeptPackedAlert(selectedOrder)}
                    className="py-2.5 px-2 bg-[#064E3B]/80 hover:bg-[#064E3B] border border-[#059669]/30 hover:border-[#059669]/60 rounded-xl text-center text-xs font-bold text-[#A7F3D0] flex flex-col items-center justify-center gap-1 transition active:scale-95"
                  >
                    <Package size={14} className="text-[#34D399]" />
                    <span>Send Dept Packed</span>
                  </button>

                  {/* Button 3: Send Dispatched */}
                  <button
                    type="button"
                    onClick={() => {
                      setMiniDispatchOrderId(selectedOrder.id);
                      setMiniTransport('');
                      setMiniBilty('');
                      setMiniParcels('');
                    }}
                    className="py-2.5 px-2 bg-[#78350F]/80 hover:bg-[#78350F] border border-[#D97706]/30 hover:border-[#D97706]/60 rounded-xl text-center text-xs font-bold text-[#FDE68A] flex flex-col items-center justify-center gap-1 transition active:scale-95"
                  >
                    <Truck size={14} className="text-[#FBBF24]" />
                    <span>Send Dispatched</span>
                  </button>
                </div>

                {/* Inline mini Bilty/Tracking Dispatch form */}
                {miniDispatchOrderId === selectedOrder.id && (
                  <div className="mt-3 p-3 bg-[#1E293B] border border-[#334155] rounded-xl space-y-3 animate-in slide-in-from-top duration-150 text-left">
                    <div className="flex items-center justify-between border-b border-[#334155]/30 pb-1.5">
                      <span className="text-[10px] font-black text-[#FBBF24] uppercase tracking-wider flex items-center gap-1">
                        <Truck size={10} />
                        <span>Dispatch Courier & LR Details</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setMiniDispatchOrderId(null)}
                        className="text-[10px] text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-left">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-[#94A3B8] uppercase">Transport Name</label>
                        <input
                          type="text"
                          placeholder="Shrinath Transport"
                          value={miniTransport}
                          onChange={(e) => setMiniTransport(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-[#0F172A] border border-[#334155] rounded-lg text-xs text-white focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-[#94A3B8] uppercase">Bilty / LR No.</label>
                        <input
                          type="text"
                          placeholder="LR-7729"
                          value={miniBilty}
                          onChange={(e) => setMiniBilty(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-[#0F172A] border border-[#334155] rounded-lg text-xs text-white focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-[#94A3B8] uppercase">Parcels Count</label>
                        <input
                          type="number"
                          placeholder="3"
                          value={miniParcels}
                          onChange={(e) => setMiniParcels(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-[#0F172A] border border-[#334155] rounded-lg text-xs text-white focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-[#94A3B8] uppercase">Bilty Photo (Optional URL)</label>
                        <input
                          type="text"
                          placeholder="Paste image URL..."
                          value={miniBiltyPhoto}
                          onChange={(e) => setMiniBiltyPhoto(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-[#0F172A] border border-[#334155] rounded-lg text-xs text-white focus:outline-none"
                        />
                      </div>
                    </div>

                    {miniBiltyPhoto && (
                      <div className="mt-1 flex items-center gap-2 bg-[#0F172A]/50 p-1.5 rounded-lg border border-[#334155]/40 w-max">
                        <img 
                          src={miniBiltyPhoto} 
                          alt="Bilty Photo" 
                          className="w-8 h-8 object-cover rounded"
                          referrerPolicy="no-referrer"
                        />
                        <span className="text-[9px] text-[#34D399] font-bold">Photo Linked successfully!</span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        if (!miniTransport.trim() || !miniBilty.trim() || !miniParcels) {
                          alert('Please enter all transport / Courier details.');
                          return;
                        }
                        triggerDispatchAlert(selectedOrder, miniTransport, miniBilty, miniParcels, miniBiltyPhoto);
                        setSelectedOrder(prev => prev ? { ...prev, overallStatus: 'DISPATCHED' } : null);
                        setMiniDispatchOrderId(null);
                        setMiniBiltyPhoto('');
                      }}
                      className="w-full py-1.5 bg-[#059669] hover:bg-[#047857] text-white rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1 shadow active:scale-95 transition-transform"
                    >
                      <Send size={11} />
                      <span>Push Live Dispatch Alert</span>
                    </button>
                  </div>
                )}

                {/* Notification Alert History Logs */}
                {selectedOrder.notificationHistory && selectedOrder.notificationHistory.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-[#334155]/30 text-left">
                    <span className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider block mb-1.5">
                      Alert Broadcast Log History
                    </span>
                    <div className="space-y-1.5 max-h-[100px] overflow-y-auto custom-scrollbar">
                      {selectedOrder.notificationHistory.map((h, i) => (
                        <div key={h.id || i} className="flex flex-col gap-1 text-[11px] bg-[#1E293B]/40 px-2.5 py-1.5 rounded-lg border border-[#334155]/20">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[#F1F5F9]">{h.message}</span>
                            <span className="text-[9px] text-[#64748B] font-semibold">
                              {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          {h.details?.biltyPhotoUrl && (
                            <div className="mt-1 flex items-center gap-1.5">
                              <span className="text-[9px] text-slate-500 font-bold uppercase">Bilty Photo:</span>
                              <a 
                                href={h.details.biltyPhotoUrl} 
                                target="_blank" 
                                rel="noreferrer"
                                className="text-[9px] text-[#D97706] hover:text-amber-500 font-extrabold flex items-center gap-1 transition"
                              >
                                <ImageIcon size={11} />
                                <span>View Bilty Photo ↗</span>
                              </a>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Remarks / Order Notes with Inline Edit & Voice Recording */}
              <div className="bg-[#0F172A] border border-[#334155]/40 p-3 rounded-xl space-y-4">
                
                {/* Text Note Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#94A3B8]">Order Note / Transport Instructions</span>
                    {editingNoteOrderId !== selectedOrder.id && (
                      <button
                        onClick={() => {
                          setEditingNoteOrderId(selectedOrder.id);
                          setEditNoteText(selectedOrder.notes || '');
                        }}
                        className="text-xs text-[#D97706] hover:underline font-semibold"
                      >
                        Edit Note
                      </button>
                    )}
                  </div>

                  {editingNoteOrderId === selectedOrder.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editNoteText}
                        onChange={(e) => setEditNoteText(e.target.value)}
                        className="w-full bg-[#0F172A] border border-[#334155] rounded-xl p-2.5 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6]"
                        rows={2}
                        placeholder="e.g. nail and lipstick ma box nakhjo..."
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingNoteOrderId(null)}
                          className="px-3 py-1 rounded-xl bg-[#1E293B] text-xs text-[#94A3B8] border border-[#334155]/60 hover:bg-[#334155]/50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            handleSaveNote(selectedOrder.id);
                            setSelectedOrder(prev => prev ? { ...prev, notes: editNoteText } : null);
                          }}
                          className="px-3 py-1 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-xs font-bold text-white shadow-md shadow-blue-500/10"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-[#94A3B8] bg-[#1E293B]/40 p-2.5 rounded-xl border border-[#334155]/40 italic min-h-[40px]">
                      {selectedOrder.notes || 'No Note entered for this order.'}
                    </p>
                  )}
                </div>

                {/* Voice Note Section with AudioPlayer */}
                <div className="pt-3 border-t border-[#334155]/40">
                  <span className="text-xs font-bold text-[#94A3B8] block mb-2">Customer Voice Note</span>
                  {selectedOrder.voiceNoteUrl ? (
                    <audio controls src={selectedOrder.voiceNoteUrl} className="w-full" />
                  ) : (
                    <div className="w-full bg-[#1E293B]/20 border border-[#334155]/20 rounded-xl p-3 flex items-center justify-center">
                      <span className="text-xs text-[#64748B] italic">No voice note</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Items List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">
                    Ordered Items ({selectedOrder.itemCount ?? selectedOrder.items?.length ?? 0} designs, {selectedOrder.totalQuantity ?? (selectedOrder.items||[]).reduce((s,i)=>s+(Number(i.quantity)||0),0)} pieces)
                  </h3>
                </div>

                {!selectedOrder.items || selectedOrder.items.length === 0 ? (
                  <div className="p-4 bg-[#0F172A] rounded-xl border border-[#334155]/40 text-center text-xs text-[#64748B]">
                    Direct bulk order logged ({selectedOrder.totalQuantity ?? (selectedOrder.items||[]).reduce((s,i)=>s+(Number(i.quantity)||0),0)} total pieces).
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {selectedOrder.items.map((item: OrderCartItem, idx: number) => (
                      <div
                        key={idx}
                        className="bg-[#0F172A] border border-[#334155]/40 p-2 rounded-xl flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={item.imageUri || item.imageUrl || item.image}
                            alt={item.photoCode}
                            className="w-12 h-9 object-cover rounded-xl bg-slate-950 flex-shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <div className="font-bold text-[#F1F5F9] font-mono">{item.photoCode}</div>
                            <div className="text-[11px] text-[#64748B]">{item.subCategoryName}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="px-2 py-0.5 rounded-full bg-[#1E293B] border border-[#334155] font-mono font-bold text-[#D97706] text-xs">
                            Option {item.optionLetter}
                          </span>
                          <span className="font-mono font-extrabold text-[#F1F5F9] text-sm">
                            {item.quantity} pcs
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-[#0B1120] border-t border-[#334155]/40 flex items-center justify-between">
              <button
                onClick={() => {
                  setOrderToDelete(selectedOrder);
                  setSelectedOrder(null);
                }}
                className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1.5 font-bold"
              >
                <Trash2 size={14} />
                <span>Delete Order</span>
              </button>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    handleUpdateOrderStatus(selectedOrder.id, 'DONE');
                    setSelectedOrder(prev => prev ? { ...prev, overallStatus: 'DONE' } : null);
                  }}
                  disabled={selectedOrder.overallStatus === 'DONE' || selectedOrder.overallStatus === 'READY_TO_SHIP'}
                  className={`px-4 py-1.5 rounded-xl font-extrabold text-xs transition-all ${
                    selectedOrder.overallStatus === 'DONE' || selectedOrder.overallStatus === 'READY_TO_SHIP'
                      ? 'bg-slate-700/50 text-[#64748B] cursor-not-allowed border border-transparent'
                      : 'bg-[#059669] hover:bg-[#047857] text-white shadow-md shadow-emerald-500/10'
                  }`}
                >
                  {selectedOrder.overallStatus === 'DONE' || selectedOrder.overallStatus === 'READY_TO_SHIP' ? 'ALREADY DONE' : 'MARK ALL DONE'}
                </button>

                <button
                  onClick={() => setSelectedOrder(null)}
                  className="px-4 py-1.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-extrabold text-xs transition-all shadow-md shadow-blue-500/10"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* MODAL 2: QUICK CREATE NEW ORDER (Plus Button in Sidebar) */}
      {/* ----------------------------------------------------------------- */}
      {showNewOrderModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1E293B] border border-[#334155] rounded-2xl w-full max-w-md flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            <div className="px-5 py-4 bg-[#0B1120] border-b border-[#334155]/40 flex items-center justify-between">
              <h2 className="text-base font-bold text-[#F1F5F9] flex items-center gap-2">
                <Plus size={18} className="text-[#3B82F6]" />
                <span>Add Wholesale Order</span>
              </h2>
              <button
                onClick={() => setShowNewOrderModal(false)}
                className="p-1 rounded-xl bg-[#1E293B] text-[#94A3B8] hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="p-5 space-y-3.5 text-xs">
              {/* Order Source Switch */}
              <div>
                <label className="block text-[#94A3B8] font-bold mb-1">Order Source</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewOrderForm({ ...newOrderForm, source: 'SALESMAN' })}
                    className={`py-2 rounded-xl font-bold text-center border transition-all ${
                      newOrderForm.source === 'SALESMAN'
                        ? 'bg-[#2563EB] text-white border-transparent font-black shadow-md shadow-blue-500/10'
                        : 'bg-[#0F172A] text-[#94A3B8] border-[#334155] hover:bg-[#1E293B]'
                    }`}
                  >
                    Salesman (SHIVAM)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewOrderForm({ ...newOrderForm, source: 'CUSTOMER' })}
                    className={`py-2 rounded-xl font-bold text-center border transition-all ${
                      newOrderForm.source === 'CUSTOMER'
                        ? 'bg-[#2563EB] text-white border-transparent font-black shadow-md shadow-blue-500/10'
                        : 'bg-[#0F172A] text-[#94A3B8] border-[#334155] hover:bg-[#1E293B]'
                    }`}
                  >
                    Customer Mobile
                  </button>
                </div>
              </div>

              {/* Salesman Name if Salesman */}
              {newOrderForm.source === 'SALESMAN' && (
                <div>
                  <label className="block text-[#94A3B8] font-bold mb-1">Salesman Name</label>
                  <input
                    type="text"
                    required
                    value={newOrderForm.salesmanName}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, salesmanName: e.target.value.toUpperCase() })}
                    placeholder="e.g. RAMIZ, RIYAZ, ZARIF..."
                    className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-3 py-2 text-[#F8FAFC] font-mono uppercase focus:outline-none focus:border-[#3B82F6]"
                  />
                </div>
              )}

              {/* Shop Name */}
              <div>
                <label className="block text-[#94A3B8] font-bold mb-1">Party / Shop Name</label>
                <input
                  type="text"
                  required
                  value={newOrderForm.shopName}
                  onChange={(e) => setNewOrderForm({ ...newOrderForm, shopName: e.target.value })}
                  placeholder="e.g. BHAVANI NOVELTY, NANDINI BEAUTY..."
                  className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-3 py-2 text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6]"
                />
              </div>

              {/* City Name & Mobile */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#94A3B8] font-bold mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={newOrderForm.cityName}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, cityName: e.target.value })}
                    placeholder="e.g. Surat, Upleta..."
                    className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-3 py-2 text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6]"
                  />
                </div>
                <div>
                  <label className="block text-[#94A3B8] font-bold mb-1">Total Pieces</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={newOrderForm.totalPieces}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, totalPieces: Number(e.target.value) })}
                    className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-3 py-2 text-[#F8FAFC] font-mono font-bold focus:outline-none focus:border-[#3B82F6]"
                  />
                </div>
              </div>

              {/* Note / Remarks */}
              <div>
                <label className="block text-[#94A3B8] font-bold mb-1">Remarks / Note</label>
                <input
                  type="text"
                  value={newOrderForm.notes}
                  onChange={(e) => setNewOrderForm({ ...newOrderForm, notes: e.target.value })}
                  placeholder="e.g. sajde keshod, nail ma box nakhjo..."
                  className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-3 py-2 text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6]"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewOrderModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#1E293B] text-[#94A3B8] border border-[#334155] hover:bg-[#334155] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-black transition-all shadow-md shadow-blue-500/10"
                >
                  Create Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* MODAL 3: DELETE CONFIRMATION */}
      {/* ----------------------------------------------------------------- */}
      {orderToDelete && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1E293B] border border-[#ef4444]/30 rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto">
              <Trash2 size={24} />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-white">Delete Order?</h3>
              <p className="text-xs text-[#94A3B8]">
                Are you sure you want to remove <span className="font-bold text-[#D97706]">{getOrderDisplayTitle(orderToDelete)}</span>?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setOrderToDelete(null)}
                className="py-2 rounded-xl bg-[#1E293B] border border-[#334155] text-[#94A3B8] text-xs font-bold hover:bg-[#334155]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteOrder(orderToDelete.id);
                  setOrderToDelete(null);
                }}
                className="py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-black shadow-lg"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* MODAL 4: MEDIA & CATALOG DRAWER */}
      {/* ----------------------------------------------------------------- */}
      {showCatalogModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1329] border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <ImageIcon size={18} className="text-amber-400" />
                  <span>Showroom 16:9 Multi-Product Photos ({photos.length})</span>
                </h2>
                <p className="text-xs text-slate-400">All wholesale photos displayed in the mobile showroom app.</p>
              </div>
              <button onClick={() => setShowCatalogModal(false)} className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 sm:grid-cols-3 gap-4 custom-scrollbar">
              {photos.map((p: CatalogPhoto) => (
                <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                  <div className="aspect-video w-full relative bg-slate-950">
                    <img src={p.imageUri} alt={p.photoCode} className="w-full h-full object-cover" />
                    <span className="absolute top-2 left-2 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded text-[11px] font-mono font-bold text-amber-300">
                      {p.photoCode}
                    </span>
                  </div>
                    <div className="p-3 text-xs space-y-1">
                    <div className="font-bold text-white truncate">{p.subCategoryName}</div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>{p.customLabels ? p.customLabels.join(', ') : `${p.itemCount} Designs (A-D)`}</span>
                      <span>Default: {p.defaultQuantity} pcs</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* SCREEN: CATEGORY MANAGER (Icon 3) */}
      {/* ----------------------------------------------------------------- */}
      {showInventoryModal && (
        <CategoryManager onClose={() => setShowInventoryModal(false)} />
      )}

      {/* ----------------------------------------------------------------- */}
      {/* MODAL 6: CUSTOMERS & SHOPS DIRECTORY (Icon 4) */}
      {/* ----------------------------------------------------------------- */}
      {showCustomersModal && (
        <CustomerDirectoryModal
          onClose={() => setShowCustomersModal(false)}
          onSelectShopFilter={(shop) => {
            setShopNameFilter(shop);
            setShowCustomersModal(false);
          }}
          onOpenChatWithCustomer={(code) => {
            setSelectedChatCustomerCode(code);
            setShowCustomersModal(false);
            setShowCommunicationPanel(true);
          }}
        />
      )}

      {/* ----------------------------------------------------------------- */}
      {/* SCREEN: COMMUNITY & MEDIA INBOX (WhatsApp-Style Live Photos & Announcements) */}
      {/* ----------------------------------------------------------------- */}
      {showCommunityInbox && (
        <CommunityMediaInbox
          onClose={() => setShowCommunityInbox(false)}
          onOpenChatWithCustomer={(code) => {
            setSelectedChatCustomerCode(code);
            setShowCommunityInbox(false);
            setShowCommunicationPanel(true);
          }}
        />
      )}

      {/* ----------------------------------------------------------------- */}
      {/* SCREEN: HDTV MANAGER */}
      {showHDTVManager && (
        <HDTVManager onClose={() => setShowHDTVManager(false)} />
      )}

      {/* SCREEN: SHOWROOM VIDEO MANAGER (Icon 2) */}
      {/* ----------------------------------------------------------------- */}
      {showVideoManager && (
        <ShowroomVideoManager onClose={() => setShowVideoManager(false)} />
      )}

      {showCommunicationPanel && (
        <CommunicationPanel 
          onClose={() => {
            setShowCommunicationPanel(false);
            setSelectedChatCustomerCode(null);
          }}
          initialCustomerCode={selectedChatCustomerCode || undefined}
        />
      )}

      {/* ----------------------------------------------------------------- */}
      {/* SCREEN: PHOTO UPLOAD, REORDERING & PRODUCT INFORMATION */}
      {/* ----------------------------------------------------------------- */}
      {(showProductUploadScreen || editingProduct) && (
        <ProductUploadEditor
          initialPhoto={editingProduct || undefined}
          onClose={() => {
            setShowProductUploadScreen(false);
            setEditingProduct(null);
          }}
          onSuccess={() => {
            setShowProductUploadScreen(false);
            setEditingProduct(null);
          }}
        />
      )}

      {/* Floating Global Toast Notifications */}
      {localFeedback && (
        <div className="fixed bottom-10 right-6 z-55 bg-[#064E3B] border border-[#059669]/60 text-[#A7F3D0] px-4.5 py-3 rounded-2xl text-xs font-black shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle size={14} className="text-[#34D399]" />
          <span>{localFeedback}</span>
        </div>
      )}

      {/* Dedicated Push Notification Control Hub Drawer */}
      {showNotificationHub && (
        <NotificationHub onClose={() => setShowNotificationHub(false)} />
      )}

    </div>
  );
};
