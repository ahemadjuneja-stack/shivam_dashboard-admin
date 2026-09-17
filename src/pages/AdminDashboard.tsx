import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store';
import { WholesaleOrder, MainCategory, OrderCartItem, CatalogPhoto, CategoryItem, Customer } from '../types';
import { ProductUploadEditor } from '../components/ProductUploadEditor';
import {
  Trash2,
  Plus,
  Image as ImageIcon,
  Package,
  Users,
  Power,
  ChevronDown,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Printer,
  X,
  AlertCircle
} from 'lucide-react';

// Vintage/muted background palette matching the exact screenshot design
const ROW_COLORS = [
  { bg: 'bg-[#284f4a]', text: 'text-slate-100', subtext: 'text-slate-300' }, // Teal / dark pine
  { bg: 'bg-[#bba372]', text: 'text-stone-950', subtext: 'text-stone-800' }, // Warm tan / brass
  { bg: 'bg-[#957d90]', text: 'text-neutral-950', subtext: 'text-neutral-800' }, // Dusty mauve
  { bg: 'bg-[#466155]', text: 'text-slate-100', subtext: 'text-slate-300' }, // Forest olive
  { bg: 'bg-[#5b7b85]', text: 'text-slate-950', subtext: 'text-slate-800' }, // Steel cyan
  { bg: 'bg-[#b29d6d]', text: 'text-amber-950', subtext: 'text-amber-900' }, // Khaki gold
  { bg: 'bg-[#3c564b]', text: 'text-emerald-50', subtext: 'text-emerald-100' }, // Deep moss
  { bg: 'bg-[#9c8497]', text: 'text-purple-950', subtext: 'text-purple-900' }, // Dusty rose
  { bg: 'bg-[#567a84]', text: 'text-cyan-950', subtext: 'text-cyan-900' }, // Muted blue
  { bg: 'bg-[#425d52]', text: 'text-slate-100', subtext: 'text-slate-300' }, // Pine green
];

export const AdminDashboard: React.FC = () => {
  const {
    orders,
    deleteOrder,
    toggleOrderStatus,
    updateOrderNotes,
    addOrder,
    customers,
    photos,
    categories,
    resetToDefaults
  } = useAppStore();

  // Filter States
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'YESTERDAY'>('ALL');
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'SALESMAN' | 'CUSTOMER' | 'PENDING' | 'DONE'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Dropdown open states
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Modals
  const [selectedOrder, setSelectedOrder] = useState<WholesaleOrder | null>(null);
  const [showProductUploadScreen, setShowProductUploadScreen] = useState(false);
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [showCustomersModal, setShowCustomersModal] = useState(false);
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
    return orders.filter((order: WholesaleOrder) => {
      // Date Filter
      const orderDate = new Date(order.createdAt);
      const now = new Date();
      const isToday =
        orderDate.getDate() === now.getDate() &&
        orderDate.getMonth() === now.getMonth() &&
        orderDate.getFullYear() === now.getFullYear();

      const yesterday = new Date();
      yesterday.setDate(now.getDate() - 1);
      const isYesterday =
        orderDate.getDate() === yesterday.getDate() &&
        orderDate.getMonth() === yesterday.getMonth() &&
        orderDate.getFullYear() === yesterday.getFullYear();

      if (dateFilter === 'TODAY' && !isToday && !order.dateFormatted?.includes('16-09')) return false;
      if (dateFilter === 'YESTERDAY' && !isYesterday && !order.dateFormatted?.includes('15-09')) return false;

      // Source / Status Filter
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

      // Category Filter
      if (categoryFilter !== 'ALL') {
        const hasCat = order.items.some((i: OrderCartItem) => i.categoryId === categoryFilter);
        if (!hasCat && order.items.length > 0) return false;
      }

      return true;
    });
  }, [orders, dateFilter, sourceFilter, categoryFilter]);

  // Paginated Orders
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredOrders.slice(startIndex, startIndex + pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  // Handle Note Save
  const handleSaveNote = (orderId: string) => {
    updateOrderNotes(orderId, editNoteText);
    setEditingNoteOrderId(null);
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

  return (
    <div className="w-screen h-screen flex bg-[#050813] text-white font-sans overflow-hidden select-none">
      
      {/* ----------------------------------------------------------------- */}
      {/* MAIN CONTENT AREA */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* TOP HEADER BAR (Exact Screenshot Alignment) */}
        <header className="h-14 bg-[#050813] border-b border-slate-900 px-4 flex items-center justify-between flex-shrink-0 z-30">
          
          {/* Left: ORDERS title + Date Filter Pills */}
          <div className="flex items-center gap-4 sm:gap-6">
            <h1 className="text-base sm:text-lg font-black tracking-wider text-white uppercase">
              ORDERS
            </h1>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => setDateFilter('ALL')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  dateFilter === 'ALL'
                    ? 'bg-[#f59e0b] text-black font-extrabold shadow-sm'
                    : 'bg-[#0c2444] text-white hover:bg-[#11315c]'
                }`}
              >
                ALL
              </button>
              <button
                onClick={() => setDateFilter('TODAY')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  dateFilter === 'TODAY'
                    ? 'bg-[#f59e0b] text-black font-extrabold shadow-sm'
                    : 'bg-[#0c2444] text-white hover:bg-[#11315c]'
                }`}
              >
                TODAY
              </button>
              <button
                onClick={() => setDateFilter('YESTERDAY')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  dateFilter === 'YESTERDAY'
                    ? 'bg-[#f59e0b] text-black font-extrabold shadow-sm'
                    : 'bg-[#0c2444] text-white hover:bg-[#11315c]'
                }`}
              >
                YESTERDAY
              </button>
            </div>
          </div>

          {/* Right: Dropdowns + Brand Multi-Color "SHIVAM" */}
          <div className="flex items-center gap-3">
            
            {/* Filter Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowFilterDropdown(!showFilterDropdown);
                  setShowCategoryDropdown(false);
                }}
                className="bg-[#0c2444] hover:bg-[#11315c] text-white px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition"
              >
                <span>
                  {sourceFilter === 'ALL' && 'ALL'}
                  {sourceFilter === 'SALESMAN' && 'SALESMEN'}
                  {sourceFilter === 'CUSTOMER' && 'CUSTOMERS'}
                  {sourceFilter === 'PENDING' && 'PENDING'}
                  {sourceFilter === 'DONE' && 'DONE'}
                </span>
                <ChevronDown size={14} className="text-slate-300" />
              </button>

              {showFilterDropdown && (
                <div className="absolute right-0 mt-1 w-48 bg-[#09152a] border border-slate-700 rounded-lg shadow-2xl py-1 z-50 text-xs">
                  <button
                    onClick={() => { setSourceFilter('ALL'); setShowFilterDropdown(false); }}
                    className={`w-full text-left px-3 py-2 hover:bg-slate-800 ${sourceFilter === 'ALL' ? 'text-amber-400 font-bold' : 'text-slate-200'}`}
                  >
                    All Orders
                  </button>
                  <button
                    onClick={() => { setSourceFilter('SALESMAN'); setShowFilterDropdown(false); }}
                    className={`w-full text-left px-3 py-2 hover:bg-slate-800 ${sourceFilter === 'SALESMAN' ? 'text-amber-400 font-bold' : 'text-slate-200'}`}
                  >
                    Salesmen Only (SHIVAM)
                  </button>
                  <button
                    onClick={() => { setSourceFilter('CUSTOMER'); setShowFilterDropdown(false); }}
                    className={`w-full text-left px-3 py-2 hover:bg-slate-800 ${sourceFilter === 'CUSTOMER' ? 'text-amber-400 font-bold' : 'text-slate-200'}`}
                  >
                    Customer Mobile Only
                  </button>
                  <div className="border-t border-slate-800 my-1" />
                  <button
                    onClick={() => { setSourceFilter('PENDING'); setShowFilterDropdown(false); }}
                    className={`w-full text-left px-3 py-2 hover:bg-slate-800 ${sourceFilter === 'PENDING' ? 'text-amber-400 font-bold' : 'text-slate-200'}`}
                  >
                    Pending Orders Only
                  </button>
                  <button
                    onClick={() => { setSourceFilter('DONE'); setShowFilterDropdown(false); }}
                    className={`w-full text-left px-3 py-2 hover:bg-slate-800 ${sourceFilter === 'DONE' ? 'text-amber-400 font-bold' : 'text-slate-200'}`}
                  >
                    Done Orders Only
                  </button>
                </div>
              )}
            </div>

            {/* Categories Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowCategoryDropdown(!showCategoryDropdown);
                  setShowFilterDropdown(false);
                }}
                className="bg-[#0c2444] hover:bg-[#11315c] text-white px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition uppercase"
              >
                <span>
                  {categoryFilter === 'ALL' ? 'CATEGORIES' : categoryFilter}
                </span>
                <ChevronDown size={14} className="text-slate-300" />
              </button>

              {showCategoryDropdown && (
                <div className="absolute right-0 mt-1 w-52 bg-[#09152a] border border-slate-700 rounded-lg shadow-2xl py-1 z-50 text-xs">
                  <button
                    onClick={() => { setCategoryFilter('ALL'); setShowCategoryDropdown(false); }}
                    className={`w-full text-left px-3 py-2 hover:bg-slate-800 ${categoryFilter === 'ALL' ? 'text-amber-400 font-bold' : 'text-slate-200'}`}
                  >
                    All Categories
                  </button>
                  <button
                    onClick={() => { setCategoryFilter(MainCategory.IMITATION); setShowCategoryDropdown(false); }}
                    className={`w-full text-left px-3 py-2 hover:bg-slate-800 ${categoryFilter === MainCategory.IMITATION ? 'text-amber-400 font-bold' : 'text-slate-200'}`}
                  >
                    Imitation Jewelry
                  </button>
                  <button
                    onClick={() => { setCategoryFilter(MainCategory.COSMETICS); setShowCategoryDropdown(false); }}
                    className={`w-full text-left px-3 py-2 hover:bg-slate-800 ${categoryFilter === MainCategory.COSMETICS ? 'text-amber-400 font-bold' : 'text-slate-200'}`}
                  >
                    Cosmetics
                  </button>
                  <button
                    onClick={() => { setCategoryFilter(MainCategory.HAIR_ACCESSORIES); setShowCategoryDropdown(false); }}
                    className={`w-full text-left px-3 py-2 hover:bg-slate-800 ${categoryFilter === MainCategory.HAIR_ACCESSORIES ? 'text-amber-400 font-bold' : 'text-slate-200'}`}
                  >
                    Hair Accessories
                  </button>
                </div>
              )}
            </div>

            {/* Brand Logo: Multi-Color "SHIVAM" as in screenshot */}
            <div className="ml-3 font-black text-xl sm:text-2xl tracking-[0.2em] select-none flex items-center">
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
        {/* ORDERS LIST CONTAINER: CLEAN ONE-LINE ROWS (Screenshot Faithful) */}
        {/* --------------------------------------------------------------- */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1.5 custom-scrollbar">
          {paginatedOrders.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 space-y-3">
              <AlertCircle size={36} className="text-slate-500" />
              <p className="text-sm font-semibold">No orders found for the selected filter.</p>
              <button
                onClick={() => { setDateFilter('ALL'); setSourceFilter('ALL'); setCategoryFilter('ALL'); }}
                className="px-4 py-1.5 rounded-lg bg-amber-500 text-black font-bold text-xs"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            paginatedOrders.map((order: WholesaleOrder, index: number) => {
              const colorTheme = ROW_COLORS[index % ROW_COLORS.length];
              const dateStr = getOrderDate(order);
              const titleStr = getOrderDisplayTitle(order);
              const isDone = order.overallStatus === 'DONE' || order.overallStatus === 'READY_TO_SHIP';

              return (
                <div
                  key={order.id}
                  className={`w-full h-11 ${colorTheme.bg} ${colorTheme.text} rounded flex items-center justify-between transition-all hover:brightness-105 shadow-sm overflow-hidden group`}
                >
                  {/* Clickable Row Area to Open Breakdown */}
                  <div
                    onClick={() => setSelectedOrder(order)}
                    className="flex-1 h-full flex items-center cursor-pointer min-w-0"
                  >
                    {/* 1. Date Column */}
                    <div className="w-28 sm:w-32 flex-shrink-0 px-3 font-bold text-xs sm:text-sm tracking-tight select-none">
                      {dateStr}
                    </div>

                    {/* 2. Order Title / Salesman / Customer Column */}
                    <div className="w-1/3 min-w-[200px] flex-shrink-0 px-2 flex items-center justify-center font-black text-xs sm:text-sm uppercase tracking-wide truncate select-none">
                      {titleStr}
                    </div>

                    {/* 3. Note / Remarks Column */}
                    <div className="flex-1 min-w-[120px] px-3 flex items-center justify-center text-xs font-medium truncate text-center select-none">
                      {order.notes && order.notes.trim() ? (
                        <span className={`${colorTheme.subtext} truncate`}>
                          {order.notes}
                        </span>
                      ) : (
                        <span className="opacity-40 italic">No Note</span>
                      )}
                    </div>
                  </div>

                  {/* 4. Status Toggle Button (Crisp White Pill) */}
                  <div className="w-24 sm:w-28 flex-shrink-0 px-2 flex items-center justify-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleOrderStatus(order.id);
                      }}
                      title="Click to toggle status"
                      className={`font-black text-[11px] px-3.5 py-1 rounded shadow-md uppercase tracking-wider transition-all transform active:scale-95 ${
                        isDone
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 hover:bg-emerald-200'
                          : 'bg-white text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      {isDone ? 'DONE' : 'PENDING'}
                    </button>
                  </div>

                  {/* 5. Delete Action (Bright Red Square) */}
                  <div className="w-11 h-full flex-shrink-0 flex items-center justify-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOrderToDelete(order);
                      }}
                      title="Delete Order"
                      className="w-full h-full bg-[#ef4444] hover:bg-red-600 text-white flex items-center justify-center transition-colors active:scale-90"
                    >
                      <Trash2 size={16} />
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
        <footer className="h-10 bg-[#050813] border-t border-slate-900 px-4 flex items-center justify-between text-xs text-slate-400 flex-shrink-0 z-20">
          
          {/* Left: Counter info */}
          <div className="font-semibold text-slate-300 text-xs">
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
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* RIGHT VERTICAL SIDEBAR (Screenshot Faithful with Red Left Border) */}
      {/* ----------------------------------------------------------------- */}
      <aside className="w-14 bg-[#050813] border-l-2 border-[#ef4444] h-full flex flex-col items-center justify-between py-4 z-40 flex-shrink-0">
        
        {/* Top Action Icons */}
        <div className="flex flex-col items-center gap-4">
          
          {/* 1. PLUS ICON: Upload Photos & Product Information (User requested screen) */}
          <button
            onClick={() => setShowProductUploadScreen(true)}
            title="Upload Photos & Products (Product Information)"
            className="w-10 h-10 rounded-lg flex items-center justify-center text-white hover:bg-slate-800/80 active:scale-95 transition"
          >
            <Plus size={22} className="stroke-[2.5]" />
          </button>

          {/* 2. IMAGE ICON: Photos & Media */}
          <button
            onClick={() => setShowCatalogModal(true)}
            title="Product Photos & Media"
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
            title="Customers & Salesmen Accounts"
            className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800/80 active:scale-95 transition"
          >
            <Users size={20} />
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1329] border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold">
                    {selectedOrder.orderNumber}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    {selectedOrder.source === 'SALESMAN' ? `Salesman: ${selectedOrder.salesmanName || 'RAMIZ'}` : 'Customer Mobile Order'}
                  </span>
                </div>
                <h2 className="text-lg font-black text-white mt-1">
                  {getOrderDisplayTitle(selectedOrder)}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition"
                  title="Print Delivery Slip"
                >
                  <Printer size={14} />
                  <span>Print Slip</span>
                </button>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-sm custom-scrollbar">
              
              {/* Order Meta Info Card */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
                <div>
                  <span className="text-[11px] text-slate-400 font-semibold block">Date</span>
                  <span className="font-bold text-white text-xs">{getOrderDate(selectedOrder)}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-semibold block">City & Shop</span>
                  <span className="font-bold text-white text-xs truncate block">{selectedOrder.cityName} - {selectedOrder.shopName}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-semibold block">Mobile</span>
                  <span className="font-bold text-white text-xs">{selectedOrder.mobileNumber || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-semibold block">Overall Status</span>
                  <button
                    onClick={() => {
                      toggleOrderStatus(selectedOrder.id);
                      setSelectedOrder(prev => prev ? {
                        ...prev,
                        overallStatus: (prev.overallStatus === 'DONE' || prev.overallStatus === 'READY_TO_SHIP') ? 'PENDING' : 'DONE'
                      } : null);
                    }}
                    className={`mt-0.5 px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                      (selectedOrder.overallStatus === 'DONE' || selectedOrder.overallStatus === 'READY_TO_SHIP')
                        ? 'bg-emerald-500 text-black'
                        : 'bg-amber-500 text-black'
                    }`}
                  >
                    {(selectedOrder.overallStatus === 'DONE' || selectedOrder.overallStatus === 'READY_TO_SHIP') ? 'DONE' : 'PENDING'}
                  </button>
                </div>
              </div>

              {/* Remarks / Order Notes with Inline Edit */}
              <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">Order Note / Transport Instructions</span>
                  {editingNoteOrderId !== selectedOrder.id && (
                    <button
                      onClick={() => {
                        setEditingNoteOrderId(selectedOrder.id);
                        setEditNoteText(selectedOrder.notes || '');
                      }}
                      className="text-xs text-amber-400 hover:underline font-semibold"
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
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                      rows={2}
                      placeholder="e.g. nail and lipstick ma box nakhjo..."
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingNoteOrderId(null)}
                        className="px-2.5 py-1 rounded bg-slate-800 text-xs text-slate-300"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          handleSaveNote(selectedOrder.id);
                          setSelectedOrder(prev => prev ? { ...prev, notes: editNoteText } : null);
                        }}
                        className="px-3 py-1 rounded bg-amber-500 text-xs font-bold text-black"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-200 bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/80 italic">
                    {selectedOrder.notes || 'No Note entered for this order.'}
                  </p>
                )}
              </div>

              {/* Department Station Statuses */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg text-center">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Imitation</span>
                  <span className="text-xs font-bold text-white mt-1 inline-block">
                    {selectedOrder.imitationStatus}
                  </span>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg text-center">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Cosmetics</span>
                  <span className="text-xs font-bold text-white mt-1 inline-block">
                    {selectedOrder.cosmeticsStatus}
                  </span>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg text-center">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Hair Access.</span>
                  <span className="text-xs font-bold text-white mt-1 inline-block">
                    {selectedOrder.hairStatus}
                  </span>
                </div>
              </div>

              {/* Order Items List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Ordered Items ({selectedOrder.items.length} designs, {selectedOrder.totalItemsCount} pieces)
                  </h3>
                </div>

                {selectedOrder.items.length === 0 ? (
                  <div className="p-4 bg-slate-900/40 rounded-lg border border-slate-800 text-center text-xs text-slate-400">
                    Direct bulk order logged ({selectedOrder.totalItemsCount} total pieces).
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {selectedOrder.items.map((item: OrderCartItem, idx: number) => (
                      <div
                        key={idx}
                        className="bg-slate-900/80 border border-slate-800 p-2 rounded-lg flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={item.imageUri}
                            alt={item.photoCode}
                            className="w-12 h-9 object-cover rounded bg-slate-950 flex-shrink-0"
                          />
                          <div>
                            <div className="font-bold text-white font-mono">{item.photoCode}</div>
                            <div className="text-[11px] text-slate-400">{item.subCategoryName}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono font-bold text-amber-300 text-xs">
                            Option {item.optionLetter}
                          </span>
                          <span className="font-mono font-extrabold text-white text-sm">
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
            <div className="px-6 py-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
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

              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* MODAL 2: QUICK CREATE NEW ORDER (Plus Button in Sidebar) */}
      {/* ----------------------------------------------------------------- */}
      {showNewOrderModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1329] border border-slate-700 rounded-2xl w-full max-w-md flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            <div className="px-5 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Plus size={18} className="text-amber-400" />
                <span>Add Wholesale Order</span>
              </h2>
              <button
                onClick={() => setShowNewOrderModal(false)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="p-5 space-y-3.5 text-xs">
              {/* Order Source Switch */}
              <div>
                <label className="block text-slate-300 font-bold mb-1">Order Source</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewOrderForm({ ...newOrderForm, source: 'SALESMAN' })}
                    className={`py-2 rounded-lg font-bold text-center border transition ${
                      newOrderForm.source === 'SALESMAN'
                        ? 'bg-amber-500 text-black border-amber-400 font-black'
                        : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    Salesman (SHIVAM)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewOrderForm({ ...newOrderForm, source: 'CUSTOMER' })}
                    className={`py-2 rounded-lg font-bold text-center border transition ${
                      newOrderForm.source === 'CUSTOMER'
                        ? 'bg-amber-500 text-black border-amber-400 font-black'
                        : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    Customer Mobile
                  </button>
                </div>
              </div>

              {/* Salesman Name if Salesman */}
              {newOrderForm.source === 'SALESMAN' && (
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Salesman Name</label>
                  <input
                    type="text"
                    required
                    value={newOrderForm.salesmanName}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, salesmanName: e.target.value.toUpperCase() })}
                    placeholder="e.g. RAMIZ, RIYAZ, ZARIF..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono uppercase focus:outline-none focus:border-amber-400"
                  />
                </div>
              )}

              {/* Shop Name */}
              <div>
                <label className="block text-slate-300 font-bold mb-1">Party / Shop Name</label>
                <input
                  type="text"
                  required
                  value={newOrderForm.shopName}
                  onChange={(e) => setNewOrderForm({ ...newOrderForm, shopName: e.target.value })}
                  placeholder="e.g. BHAVANI NOVELTY, NANDINI BEAUTY..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* City Name & Mobile */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={newOrderForm.cityName}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, cityName: e.target.value })}
                    placeholder="e.g. Surat, Upleta..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Total Pieces</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={newOrderForm.totalPieces}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, totalPieces: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Note / Remarks */}
              <div>
                <label className="block text-slate-300 font-bold mb-1">Remarks / Note</label>
                <input
                  type="text"
                  value={newOrderForm.notes}
                  onChange={(e) => setNewOrderForm({ ...newOrderForm, notes: e.target.value })}
                  placeholder="e.g. sajde keshod, nail ma box nakhjo..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewOrderModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-black transition"
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1329] border border-red-500/50 rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto">
              <Trash2 size={24} />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-white">Delete Order?</h3>
              <p className="text-xs text-slate-300">
                Are you sure you want to remove <span className="font-bold text-amber-300">{getOrderDisplayTitle(orderToDelete)}</span>?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setOrderToDelete(null)}
                className="py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700"
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
      {/* MODAL 5: CATEGORIES & STOCK DRAWER */}
      {/* ----------------------------------------------------------------- */}
      {showInventoryModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1329] border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Package size={18} className="text-amber-400" />
                <span>Categories & Department Master</span>
              </h2>
              <button onClick={() => setShowInventoryModal(false)} className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
              {categories.map((cat: CategoryItem) => (
                <div key={cat.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold text-sm">
                      {cat.displayName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">{cat.displayName}</h4>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-slate-800 text-amber-300">
                    Active
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* MODAL 6: CUSTOMERS & SALESMEN DIRECTORY */}
      {/* ----------------------------------------------------------------- */}
      {showCustomersModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1329] border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Users size={18} className="text-amber-400" />
                  <span>Customers & Salesmen Accounts ({customers.length})</span>
                </h2>
                <p className="text-xs text-slate-400">Wholesale buyer accounts authorized for mobile showroom ordering.</p>
              </div>
              <button onClick={() => setShowCustomersModal(false)} className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-2.5 custom-scrollbar">
              {customers.map((c: Customer) => (
                <div key={c.customerCode} className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-amber-400">{c.customerCode}</span>
                      <span className="font-bold text-white">{c.shopName}</span>
                    </div>
                    <div className="text-slate-400 mt-0.5">
                      {c.cityName} • {c.contactPerson} • Ph: {c.mobileNumber}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[11px]">
                    Authorized
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* SCREEN: PHOTO UPLOAD, REORDERING & PRODUCT INFORMATION (Matches User Screenshot) */}
      {/* ----------------------------------------------------------------- */}
      {showProductUploadScreen && (
        <ProductUploadEditor
          onClose={() => setShowProductUploadScreen(false)}
          onSuccess={() => setShowProductUploadScreen(false)}
        />
      )}

    </div>
  );
};
