import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { Customer, DeviceSession } from '../types';
import { syncCustomerToFirebase, deleteCustomerFromFirebase } from '../services/firebaseSync';
import { 
  Users, 
  Search, 
  Plus, 
  X, 
  Filter, 
  MessageSquare, 
  Store, 
  Trash2, 
  CheckCircle2, 
  Lock, 
  Check, 
  Clock, 
  Shield, 
  Layers, 
  Compass, 
  Copy, 
  CheckSquare, 
  Square,
  AlertTriangle,
  RefreshCw,
  Smartphone
} from 'lucide-react';

interface CustomerDirectoryModalProps {
  onClose: () => void;
  onSelectShopFilter: (shopName: string) => void;
  onOpenChatWithCustomer: (customerCode: string) => void;
}

export const CustomerDirectoryModal: React.FC<CustomerDirectoryModalProps> = ({
  onClose,
  onSelectShopFilter,
  onOpenChatWithCustomer
}) => {
  const { customers, orders, categories, subCategories, addCustomer, updateCustomer, deleteCustomer } = useAppStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [locationFilter, setLocationFilter] = useState<string>('ALL');
  const [selectedCustomerForModal, setSelectedCustomerForModal] = useState<Customer | null>(null);
  const [isAddMode, setIsAddMode] = useState(false);
  const [showCopyFeedback, setShowCopyFeedback] = useState(false);

  // Modal Form State (Left Column)
  const [modalShopName, setModalShopName] = useState('');
  const [modalContactPerson, setModalContactPerson] = useState('');
  const [modalMobileNumber, setModalMobileNumber] = useState('');
  const [modalCityName, setModalCityName] = useState('');
  const [modalAddress, setModalAddress] = useState('');
  const [modalGpsLocation, setModalGpsLocation] = useState('');
  const [modalResolvedAddress, setModalResolvedAddress] = useState('');

  // Modal Security & Permissions State (Right Column)
  const [modalCustomerCode, setModalCustomerCode] = useState('');
  const [modalPin, setModalPin] = useState('1111');
  const [modalStatus, setModalStatus] = useState<'Verified' | 'Pending'>('Pending');
  const [modalAllowedCategories, setModalAllowedCategories] = useState<string[]>([]);
  const [modalAllowedSubCategories, setModalAllowedSubCategories] = useState<string[]>([]);
  const [modalRole, setModalRole] = useState('User');
  const [modalStaffCategory, setModalStaffCategory] = useState('');
  const [modalHasAllowedLocation, setModalHasAllowedLocation] = useState(false);
  const [modalMaxAllowedDevices, setModalMaxAllowedDevices] = useState(1);
  const [modalActiveSessions, setModalActiveSessions] = useState<DeviceSession[]>([]);

  const [validationError, setValidationError] = useState('');

  // 5-minute recurring reminder effect for customers without location access
  useEffect(() => {
    const timer = setInterval(() => {
      const pendingLocationCustomers = customers.filter(c => !c.hasAllowedLocation);
      if (pendingLocationCustomers.length > 0) {
        const randomCust = pendingLocationCustomers[Math.floor(Math.random() * pendingLocationCustomers.length)];
        setToastMessage(`5-Min Reminder sent to ${randomCust.shopName} (${randomCust.mobileNumber}) to allow location access!`);
        setTimeout(() => setToastMessage(null), 4000);
      }
    }, 300000); // 5 minutes

    return () => clearInterval(timer);
  }, [customers]);

  // Delete Confirmation & Toast State
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 1. Live status calculation helper
  const checkIsOnline = (c: Customer) => {
    if (c.isOnline) return true;
    if (c.lastActive && (Date.now() - c.lastActive) < 120000) return true; // < 2m
    return false;
  };

  // 2. Relative time calculation
  const getRelativeTime = (timestamp?: number) => {
    if (!timestamp) return 'Inactive';
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // 3. Filter and Sort customers
  const filteredCustomers = customers.filter(c => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = (
      c.shopName.toLowerCase().includes(q) ||
      c.cityName.toLowerCase().includes(q) ||
      (c.contactPerson || '').toLowerCase().includes(q) ||
      c.mobileNumber.includes(q) ||
      c.customerCode.toLowerCase().includes(q)
    );

    const isVerified = c.status === 'Verified' || c.isVerified === true;
    const matchesStatus = statusFilter === 'ALL' || (statusFilter === 'Verified' ? isVerified : !isVerified);
    const matchesRole = roleFilter === 'ALL' || (c.role || 'User').toLowerCase() === roleFilter.toLowerCase();
    const matchesLocation = locationFilter === 'ALL' || (locationFilter === 'Allowed' ? c.hasAllowedLocation : !c.hasAllowedLocation);

    return matchesSearch && matchesStatus && matchesRole && matchesLocation;
  });

  // Ensure Pending registrations appear at top of table
  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    const statusA = a.status || 'Pending';
    const statusB = b.status || 'Pending';
    
    if (statusA === 'Pending' && statusB !== 'Pending') return -1;
    if (statusA !== 'Pending' && statusB === 'Pending') return 1;

    // Secondary sort: online state
    const onlineA = checkIsOnline(a) ? 1 : 0;
    const onlineB = checkIsOnline(b) ? 1 : 0;
    if (onlineA !== onlineB) return onlineB - onlineA;

    // Tertiary sort: last active timestamp
    return (b.lastActive || 0) - (a.lastActive || 0);
  });

  // Calculate order count for specific customer code / shop name
  const getOrderCountForCustomer = (shopName: string, customerCode: string) => {
    return orders.filter(
      o => (o.shopName && o.shopName.toLowerCase() === shopName.toLowerCase()) || 
           o.customerCode === customerCode
    ).length;
  };

  // Copy Customer ID Helper
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setShowCopyFeedback(true);
    setTimeout(() => setShowCopyFeedback(false), 2000);
  };

  // 7-character code generator
  const generate7CharUID = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 7; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `C-${result}`;
  };

  // Start edit flow / Open two-column modal
  const handleOpenEditModal = (customer: Customer) => {
    setSelectedCustomerForModal(customer);
    setIsAddMode(false);
    setValidationError('');

    // Load Left Panel State
    setModalShopName(customer.shopName);
    setModalContactPerson(customer.contactPerson || '');
    setModalMobileNumber(customer.mobileNumber);
    setModalCityName(customer.cityName);
    setModalAddress(customer.address || '');
    setModalGpsLocation(customer.gpsLocation || '');
    setModalResolvedAddress(customer.resolvedAddress || '');

    // Load Right Panel State
    setModalCustomerCode(customer.customerCode);
    setModalPin(customer.pin || '1111');
    setModalStatus(customer.status || 'Pending');
    setModalRole(customer.role || 'User');
    setModalStaffCategory(customer.staffCategory || '');
    setModalHasAllowedLocation(customer.hasAllowedLocation || false);
    setModalMaxAllowedDevices(customer.maxAllowedDevices || 1);
    setModalActiveSessions(customer.activeSessions || []);

    // Checked by default logic: if not defined, give full access
    const allowedCats = customer.allowedCategories && customer.allowedCategories.length > 0 
      ? customer.allowedCategories 
      : categories.map(c => c.id);
    const allowedSubs = customer.allowedSubCategories && customer.allowedSubCategories.length > 0 
      ? customer.allowedSubCategories 
      : subCategories.map(s => s.id);

    setModalAllowedCategories(allowedCats);
    setModalAllowedSubCategories(allowedSubs);
  };

  // Start add flow
  const handleOpenAddModal = () => {
    setIsAddMode(true);
    setSelectedCustomerForModal({} as Customer);
    setValidationError('');

    const newCode = generate7CharUID();
    setModalCustomerCode(newCode);

    setModalShopName('');
    setModalContactPerson('');
    setModalMobileNumber('');
    setModalCityName('');
    setModalAddress('');
    setModalGpsLocation('');
    setModalResolvedAddress('');
    setModalPin('1111');
    setModalStatus('Pending');
    setModalRole('User');
    setModalStaffCategory('');
    setModalHasAllowedLocation(false);
    setModalMaxAllowedDevices(1);
    setModalActiveSessions([]);

    // Checked by default
    setModalAllowedCategories(categories.map(c => c.id));
    setModalAllowedSubCategories(subCategories.map(s => s.id));
  };

  // Save/Update handler
  const handleSaveCustomer = async () => {
    if (!modalShopName.trim()) {
      setValidationError('Shop Name is required.');
      return;
    }
    if (!modalCityName.trim()) {
      setValidationError('City Name is required.');
      return;
    }
    if (!modalMobileNumber.trim()) {
      setValidationError('Mobile Number is required.');
      return;
    }

    const pinPattern = /^\d{4}$/;
    if (!pinPattern.test(modalPin)) {
      setValidationError('Security PIN must be exactly 4 digits.');
      return;
    }

    const updatedCustomer: Customer = {
      customerCode: modalCustomerCode,
      shopName: modalShopName.trim(),
      contactPerson: modalContactPerson.trim(),
      mobileNumber: modalMobileNumber.trim(),
      cityName: modalCityName.trim(),
      address: modalAddress.trim(),
      status: modalStatus,
      isVerified: modalStatus === 'Verified',
      pin: modalPin,
      allowedCategories: modalAllowedCategories,
      allowedSubCategories: modalAllowedSubCategories,
      role: modalRole,
      staffCategory: modalRole === 'Shivam Staff' ? modalStaffCategory : undefined,
      gpsLocation: modalGpsLocation || undefined,
      resolvedAddress: modalResolvedAddress || undefined,
      hasAllowedLocation: modalHasAllowedLocation,
      maxAllowedDevices: modalMaxAllowedDevices,
      activeSessions: modalActiveSessions,
      // Keep online / active status if editing
      isOnline: isAddMode ? false : (selectedCustomerForModal?.isOnline ?? false),
      lastActive: isAddMode ? Date.now() : (selectedCustomerForModal?.lastActive ?? Date.now())
    };

    if (isAddMode) {
      addCustomer(updatedCustomer);
      await syncCustomerToFirebase(updatedCustomer);
      setToastMessage(`New customer "${updatedCustomer.shopName}" registered successfully.`);
    } else {
      updateCustomer(modalCustomerCode, updatedCustomer);
      await syncCustomerToFirebase(updatedCustomer);
      setToastMessage(`Customer "${updatedCustomer.shopName}" profile updated successfully.`);
    }

    setTimeout(() => setToastMessage(null), 3000);
    setSelectedCustomerForModal(null);
  };

  // Real-time Delete Handler with Firestore sync
  const handleConfirmDeleteCustomer = async () => {
    if (!customerToDelete) return;
    setIsDeleting(true);
    try {
      const code = customerToDelete.customerCode;
      const name = customerToDelete.shopName;
      
      // Delete from Zustand local store
      deleteCustomer(code);
      
      // Delete document from Firestore real-time collection
      await deleteCustomerFromFirebase(code);
      
      setToastMessage(`Customer "${name}" (${code}) was permanently deleted.`);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      console.error('Failed to delete customer from Firestore:', err);
      setToastMessage('Error deleting customer from database.');
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setIsDeleting(false);
      setCustomerToDelete(null);
    }
  };

  // Quick Approve/Verify handler directly from directory list
  const handleQuickVerifyCustomer = async (e: React.MouseEvent, customer: Customer) => {
    e.stopPropagation();
    const updatedCustomer: Customer = {
      ...customer,
      status: 'Verified',
      isVerified: true
    };
    updateCustomer(customer.customerCode, updatedCustomer);
    await syncCustomerToFirebase(updatedCustomer);
    setToastMessage(`Customer "${customer.shopName}" (${customer.customerCode}) verified successfully!`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Tree permissions: Category Toggle Helper
  const handleCategoryPermissionToggle = (catId: string) => {
    const isSelected = modalAllowedCategories.includes(catId);
    let newCats = [...modalAllowedCategories];
    let newSubs = [...modalAllowedSubCategories];

    if (isSelected) {
      // Uncheck category & remove all children subcategories
      newCats = newCats.filter(id => id !== catId);
      const childSubIds = subCategories.filter(s => s.categoryId === catId).map(s => s.id);
      newSubs = newSubs.filter(id => !childSubIds.includes(id));
    } else {
      // Check category & add all children subcategories
      newCats.push(catId);
      const childSubIds = subCategories.filter(s => s.categoryId === catId).map(s => s.id);
      childSubIds.forEach(id => {
        if (!newSubs.includes(id)) {
          newSubs.push(id);
        }
      });
    }

    setModalAllowedCategories(newCats);
    setModalAllowedSubCategories(newSubs);
  };

  // Tree permissions: SubCategory Toggle Helper
  const handleSubCategoryPermissionToggle = (subId: string, catId: string) => {
    const isSelected = modalAllowedSubCategories.includes(subId);
    let newSubs = [...modalAllowedSubCategories];
    let newCats = [...modalAllowedCategories];

    if (isSelected) {
      newSubs = newSubs.filter(id => id !== subId);
      // Optional: If all subcategories of a category are unchecked, we can keep category checked or uncheck it.
      // Let's keep parent category checked unless we want to toggle it.
    } else {
      newSubs.push(subId);
      // Auto-check parent category if a subcategory is selected
      if (!newCats.includes(catId)) {
        newCats.push(catId);
      }
    }

    setModalAllowedCategories(newCats);
    setModalAllowedSubCategories(newSubs);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
      <div className="bg-[#1E293B] border border-[#334155] rounded-3xl w-[96vw] max-w-[1550px] h-[94vh] max-h-[94vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Top Header Panel */}
        <div className="px-6 py-4 bg-[#0B1120] border-b border-[#334155]/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2563EB]/10 border border-[#2563EB]/20 flex items-center justify-center text-[#3B82F6]">
              <Users size={20} />
            </div>
            <div>
              <h2 className="text-base font-medium text-[#F1F5F9] flex items-center gap-2 tracking-tight">
                <span>Access Control & Customer Directory</span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#1E293B] text-[#94A3B8] text-[10px] font-mono font-bold border border-[#334155]/60">
                  {customers.length} Registered
                </span>
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs flex items-center gap-2 transition-all active:scale-95 shadow-md shadow-blue-500/10"
            >
              <Plus size={15} />
              <span>Register New Shop</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-[#1E293B] text-[#94A3B8] hover:text-white hover:bg-[#334155] transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Filter / Search Bar */}
        <div className="px-6 py-4 border-b border-[#334155]/40 bg-[#0B1120]/30 flex flex-wrap items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B]" />
            <input
              type="text"
              placeholder="Filter by shop, owner, mobile, city, system ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#0F172A] border border-[#334155] rounded-xl text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#3B82F6]/80 transition-all shadow-inner font-semibold"
            />
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-[#0F172A] border border-[#334155] rounded-xl text-xs text-[#F8FAFC] font-bold focus:outline-none focus:border-[#3B82F6] shadow-sm"
            >
              <option value="ALL">Status: All</option>
              <option value="Verified">Verified Only</option>
              <option value="Pending">Pending Only</option>
            </select>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 bg-[#0F172A] border border-[#334155] rounded-xl text-xs text-[#F8FAFC] font-bold focus:outline-none focus:border-[#3B82F6] shadow-sm"
            >
              <option value="ALL">Role: All</option>
              <option value="Staff">Staff Only</option>
              <option value="User">User Only</option>
            </select>

            {/* Location Access Filter */}
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="px-3 py-2 bg-[#0F172A] border border-[#334155] rounded-xl text-xs text-[#F8FAFC] font-bold focus:outline-none focus:border-[#3B82F6] shadow-sm"
            >
              <option value="ALL">Location: All</option>
              <option value="Allowed">Location Allowed</option>
              <option value="Denied">Location Denied</option>
            </select>
          </div>
        </div>

        {/* Directory Table Area */}
        <div className="flex-1 overflow-auto p-6 custom-scrollbar bg-[#0F172A]/40">
          {sortedCustomers.length === 0 ? (
            <div className="py-24 text-center text-[#64748B] space-y-3">
              <Store size={44} className="mx-auto text-[#2563EB]/40" />
              <p className="text-sm font-bold text-[#94A3B8]">No matching clients found</p>
              <p className="text-xs text-[#64748B] max-w-sm mx-auto">
                No active or pending shops found matching "{searchQuery}". Register a new shop or clear search filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto min-w-full">
              <div className="min-w-[1100px] space-y-3">
                
                {/* Header Grid */}
                <div className="grid grid-cols-[150px_130px_1.8fr_1.1fr_120px_110px_1.5fr_70px_90px] gap-4 px-5 py-3 text-[10px] font-mono font-bold tracking-wider text-[#94A3B8] uppercase border-b border-[#334155]/30">
                  <div>Status</div>
                  <div>City</div>
                  <div>Shop Name</div>
                  <div>Owner / Name</div>
                  <div>Mobile Number</div>
                  <div>Active Status</div>
                  <div>Location</div>
                  <div>Role</div>
                  <div className="text-right pr-2">Actions</div>
                </div>

                {/* Body Rows */}
                {sortedCustomers.map((customer, index) => {
                  const isOnline = checkIsOnline(customer);
                  const orderCount = getOrderCountForCustomer(customer.shopName, customer.customerCode);
                  const isVerified = customer.status === 'Verified' || customer.isVerified === true;

                  // Alternating modern dark-graphite slate row cards
                  const rowBg = index % 2 === 0 ? 'bg-[#0F172A]' : 'bg-[#1E293B]/70';

                  return (
                    <div
                      key={customer.customerCode}
                      onClick={() => handleOpenEditModal(customer)}
                      className={`grid grid-cols-[150px_130px_1.8fr_1.1fr_120px_110px_1.5fr_70px_90px] gap-4 px-5 py-5 items-center ${rowBg} border border-[#334155]/40 hover:border-[#3B82F6]/60 rounded-2xl shadow-lg transition duration-150 cursor-pointer group`}
                    >
                      {/* STATUS & QUICK VERIFY TOGGLE */}
                      <div>
                        {isVerified ? (
                          <span className="bg-[#064E3B]/90 text-[#34D399] border border-[#059669]/40 text-xs font-extrabold px-3 py-1.5 rounded-full flex items-center justify-center gap-1.5 w-fit uppercase tracking-wide shadow-sm">
                            <CheckCircle2 size={13} className="text-[#34D399]" />
                            <span>Verified</span>
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <span className="bg-[#78350F]/90 text-[#FDE68A] border border-[#D97706]/40 text-xs font-extrabold px-2.5 py-1 rounded-full flex items-center justify-center gap-1.5 w-fit uppercase tracking-wide animate-pulse shadow-sm">
                              <Clock size={12} className="text-[#FDE68A]" />
                              <span>Pending</span>
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleQuickVerifyCustomer(e, customer)}
                              className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center gap-1 transition shadow-md active:scale-95"
                              title="Approve & Verify this customer"
                            >
                              <Check size={13} />
                              <span>Approve</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* CITY */}
                      <div className="text-[#38BDF8] font-black text-sm uppercase tracking-wide truncate drop-shadow-sm">
                        {(customer.cityName || '').toUpperCase()}
                      </div>

                      {/* SHOP NAME */}
                      <div className="truncate pr-2">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-black text-sm group-hover:text-[#60A5FA] transition truncate uppercase tracking-wide bg-blue-500/15 px-3 py-1.5 rounded-xl border border-blue-500/30 shadow-sm">
                            {(customer.shopName || '').toUpperCase()}
                          </span>
                          {orderCount > 0 && (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#2563EB]/20 text-[#60A5FA] border border-[#2563EB]/30 flex-shrink-0">
                              {orderCount} {orderCount === 1 ? 'order' : 'orders'}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#94A3B8] font-mono mt-1 font-bold">
                          ID: {customer.customerCode}
                        </div>
                      </div>

                      {/* NAME */}
                      <div className="text-[#E2E8F0] text-xs font-bold truncate pr-2">
                        {customer.contactPerson || 'Proprietor'}
                      </div>

                      {/* MOBILE NUMBER */}
                      <div className="text-[#F8FAFC] font-mono text-xs font-bold tracking-wide">
                        {customer.mobileNumber}
                      </div>

                      {/* ACTIVE STATUS */}
                      <div>
                        {isOnline ? (
                          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#064E3B]/60 text-[#34D399] font-bold text-[10px] border border-[#059669]/30 w-fit">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#34D399] opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#34D399]"></span>
                            </span>
                            <span>Online</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#334155]/40 text-[#94A3B8] font-bold text-[10px] border border-[#475569]/30 w-fit">
                            <span>{getRelativeTime(customer.lastActive)}</span>
                          </span>
                        )}
                      </div>

                      {/* LOCATION */}
                      <div className="text-xs truncate pr-2">
                        {customer.hasAllowedLocation ? (
                          <span className="text-[#34D399] font-medium flex items-center gap-1">
                            <Compass size={12} className="text-[#34D399] animate-pulse" />
                            <span className="truncate">{customer.resolvedAddress || customer.gpsLocation || 'Live GPS Active'}</span>
                          </span>
                        ) : (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-amber-400 font-bold text-[10px] flex items-center gap-1">
                              <AlertTriangle size={11} />
                              <span>Location Access Denied</span>
                            </span>
                            <span className="text-[9px] text-[#64748B] italic">5m Reminder Active</span>
                          </div>
                        )}
                      </div>

                      {/* ROLE */}
                      <div>
                        {(() => {
                          const isStaff = (customer.role || '').toLowerCase().includes('staff') || (customer.staffCategory && customer.staffCategory.trim().length > 0);
                          return (
                            <span className={`inline-block text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${
                              isStaff 
                                ? 'bg-[#78350F]/60 text-[#FDE68A] border-[#D97706]/50 shadow-sm' 
                                : 'bg-[#1E1B4B] text-[#C7D2FE] border-[#312E81]'
                            }`}>
                              {isStaff ? 'STAFF' : (customer.role || 'User')}
                            </span>
                          );
                        })()}
                      </div>

                      {/* ACTIONS */}
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        
                        {/* Filter */}
                        <button
                          onClick={() => {
                            onSelectShopFilter(customer.shopName);
                            onClose();
                          }}
                          className="p-1.5 rounded-xl bg-[#1E293B] hover:bg-[#334155] border border-[#334155] text-[#94A3B8] transition-colors"
                          title="Filter orders in dashboard"
                        >
                          <Filter size={13} />
                        </button>

                        {/* Chat */}
                        <button
                          onClick={() => {
                            onOpenChatWithCustomer(customer.customerCode);
                            onClose();
                          }}
                          className="p-1.5 rounded-xl bg-[#064E3B]/40 hover:bg-[#064E3B]/70 border border-[#059669]/30 text-[#34D399] transition-colors"
                          title="Open Chat"
                        >
                          <MessageSquare size={13} />
                        </button>

                        {/* Delete with Confirmation Modal */}
                        <button
                          onClick={() => setCustomerToDelete(customer)}
                          className="p-1.5 rounded-xl bg-[#7F1D1D]/20 hover:bg-[#7F1D1D]/40 border border-[#EF4444]/20 text-[#FCA5A5] transition-colors"
                          title="Delete customer account"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                    </div>
                  );
                })}

              </div>
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* TWO-COLUMN DETAILS & SECURITY/PERMISSIONS MODAL POPUP */}
        {/* ------------------------------------------------------------- */}
        {selectedCustomerForModal && (
          <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
            <div className="bg-[#1E293B] border border-[#334155] rounded-3xl w-[92vw] max-w-5xl h-[90vh] max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              
              {/* Modal Header */}
              <div className="px-6 py-4 bg-[#0B1120] border-b border-[#334155]/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#2563EB]/10 border border-[#2563EB]/20 flex items-center justify-center text-[#3B82F6]">
                    <Shield size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-[#F1F5F9] flex items-center gap-2">
                      <span>{isAddMode ? 'Add Wholesale Customer Account' : 'Security Settings & Client Profile'}</span>
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCustomerForModal(null)}
                  className="p-1.5 rounded-lg bg-[#1E293B] text-[#94A3B8] hover:text-white transition"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Body (Two-Column Layout) */}
              <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6 custom-scrollbar text-xs">
                
                {/* ----------------- LEFT PANEL: Biodata & Activity ----------------- */}
                <div className="space-y-4 pr-1">
                  <h4 className="text-xs font-bold font-mono text-[#3B82F6] tracking-wider uppercase border-b border-[#334155]/60 pb-1.5 flex items-center gap-1.5">
                    <Store size={14} />
                    <span>Client Biodata & Logs</span>
                  </h4>

                  {validationError && (
                    <div className="p-3 rounded-xl bg-red-950/70 border border-red-800/60 text-red-200 text-xs leading-relaxed">
                      {validationError}
                    </div>
                  )}

                  {/* Shop Name */}
                  <div className="space-y-1">
                    <label className="block font-bold text-[#94A3B8]">Shop / Wholesale Business Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Radhe Novelty & Cosmetics"
                      value={modalShopName}
                      onChange={(e) => setModalShopName(e.target.value)}
                      className="w-full px-3 py-2.5 bg-[#0F172A] border border-[#334155] rounded-xl text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#3B82F6]/80 focus:ring-1 focus:ring-[#3B82F6]/40 transition-all shadow-inner"
                    />
                  </div>

                  {/* Owner Full Name */}
                  <div className="space-y-1">
                    <label className="block font-bold text-[#94A3B8]">Owner Full Name (Contact Person)</label>
                    <input
                      type="text"
                      placeholder="e.g. Jayesh Bhai Patel"
                      value={modalContactPerson}
                      onChange={(e) => setModalContactPerson(e.target.value)}
                      className="w-full px-3 py-2.5 bg-[#0F172A] border border-[#334155] rounded-xl text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#3B82F6]/80 focus:ring-1 focus:ring-[#3B82F6]/40 transition-all shadow-inner"
                    />
                  </div>

                  {/* Mobile Number & City Name */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block font-bold text-[#94A3B8]">Mobile Number *</label>
                      <input
                        type="tel"
                        placeholder="e.g. 9825011223"
                        value={modalMobileNumber}
                        onChange={(e) => setModalMobileNumber(e.target.value)}
                        className="w-full px-3 py-2.5 bg-[#0F172A] border border-[#334155] rounded-xl text-[#F8FAFC] font-mono placeholder-[#64748B] focus:outline-none focus:border-[#3B82F6]/80 focus:ring-1 focus:ring-[#3B82F6]/40 transition-all shadow-inner"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block font-bold text-[#94A3B8]">City *</label>
                      <input
                        type="text"
                        placeholder="e.g. Rajkot"
                        value={modalCityName}
                        onChange={(e) => setModalCityName(e.target.value)}
                        className="w-full px-3 py-2.5 bg-[#0F172A] border border-[#334155] rounded-xl text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#3B82F6]/80 focus:ring-1 focus:ring-[#3B82F6]/40 transition-all shadow-inner"
                      />
                    </div>
                  </div>

                  {/* Address */}
                  <div className="space-y-1">
                    <label className="block font-bold text-[#94A3B8]">Full Address & Landmarks</label>
                    <textarea
                      placeholder="e.g. Shop 42, Golden Plaza, Soni Bazar Road"
                      rows={2}
                      value={modalAddress}
                      onChange={(e) => setModalAddress(e.target.value)}
                      className="w-full px-3 py-2.5 bg-[#0F172A] border border-[#334155] rounded-xl text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#3B82F6]/80 focus:ring-1 focus:ring-[#3B82F6]/40 transition-all shadow-inner resize-none"
                    />
                  </div>

                  {/* GPS & Activity Logs Block */}
                  <div className="p-4 bg-[#0F172A] border border-[#334155]/60 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between text-[11px] text-[#94A3B8] font-semibold border-b border-[#334155]/40 pb-1.5">
                      <div className="flex items-center gap-1">
                        <Compass size={13} className="text-[#3B82F6] animate-spin-slow" />
                        <span>Telemetry & Location Log</span>
                      </div>
                      <span className="font-mono text-[#64748B]">REALTIME GPS</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-[11px]">
                      <div>
                        <span className="text-[#64748B] block">Detected GPS Coordinates:</span>
                        <input 
                          type="text"
                          placeholder="e.g. 22.3039° N, 70.8022° E"
                          value={modalGpsLocation}
                          onChange={(e) => setModalGpsLocation(e.target.value)}
                          className="w-full mt-0.5 bg-transparent border-none p-0 text-[#94A3B8] font-mono font-bold focus:ring-0 focus:outline-none"
                        />
                      </div>
                      <div>
                        <span className="text-[#64748B] block">Exact Last Active Timestamp:</span>
                        <span className="font-bold font-mono text-[#94A3B8] block mt-1 flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${isAddMode ? 'bg-[#64748B]' : (checkIsOnline(selectedCustomerForModal) ? 'bg-emerald-500 animate-pulse' : 'bg-red-500')}`}></span>
                          {isAddMode ? 'Not logged' : (selectedCustomerForModal?.lastActive ? new Date(selectedCustomerForModal.lastActive).toLocaleString() : 'Never')}
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px]">
                      <span className="text-[#64748B] block">Resolved Address State:</span>
                      <input 
                        type="text"
                        placeholder="e.g. Soni Bazar, Rajkot, Gujarat, India"
                        value={modalResolvedAddress}
                        onChange={(e) => setModalResolvedAddress(e.target.value)}
                        className="w-full mt-0.5 bg-transparent border-none p-0 text-[#94A3B8] font-bold focus:ring-0 focus:outline-none"
                      />
                    </div>

                  {/* Active Devices Monitoring */}
                  {!isAddMode && (
                    <div className="p-4 bg-[#0F172A] border border-[#334155]/60 rounded-2xl space-y-3 mt-4">
                      <div className="flex items-center justify-between text-[11px] text-[#94A3B8] font-semibold border-b border-[#334155]/40 pb-1.5">
                        <div className="flex items-center gap-1">
                          <Smartphone size={13} className="text-[#3B82F6]" />
                          <span>Active Devices ({modalActiveSessions.length}/{modalMaxAllowedDevices})</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {modalActiveSessions.map((session, index) => (
                          <div key={session.deviceId} className="flex items-center justify-between p-2 bg-[#1E293B] rounded-lg text-xs">
                            <div>
                              <div className="font-bold text-[#F1F5F9]">Device {index + 1}</div>
                              <div className="text-[10px] text-[#94A3B8]">{session.deviceName || 'Unknown Device'} • {session.locationName || 'Unknown Loc'}</div>
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${session.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
                                <span className="text-[10px] text-[#64748B]">{session.isOnline ? 'Online' : 'Offline'}</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setModalActiveSessions(modalActiveSessions.filter(s => s.deviceId !== session.deviceId));
                              }}
                              className="px-2 py-1 bg-red-900/20 text-red-400 rounded hover:bg-red-900/40 transition"
                            >
                              Revoke
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Device Limit Toggle */}
                  <div className="p-4 bg-[#0F172A] border border-[#334155]/60 rounded-2xl mt-4">
                    <label className="block font-bold text-[#94A3B8] mb-2 text-xs">Device Access Limit</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setModalMaxAllowedDevices(1)}
                        className={`p-3 rounded-xl border text-xs font-bold transition ${modalMaxAllowedDevices === 1 ? 'bg-[#3B82F6] text-white border-[#3B82F6]' : 'bg-[#1E293B] text-[#94A3B8] border-[#334155]'}`}
                      >
                        Single Device
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalMaxAllowedDevices(2)}
                        className={`p-3 rounded-xl border text-xs font-bold transition ${modalMaxAllowedDevices === 2 ? 'bg-[#3B82F6] text-white border-[#3B82F6]' : 'bg-[#1E293B] text-[#94A3B8] border-[#334155]'}`}
                      >
                        Dual Device
                      </button>
                    </div>
                  </div>

                  {/* Location Access Toggle */}
                    <div className="flex items-center justify-between pt-3 border-t border-[#334155]/40 mt-3">
                      <div>
                        <span className="text-[#F1F5F9] font-bold block text-xs">Live Location Access</span>
                        <span className="text-[10px] text-[#64748B]">Customer permitted GPS tracking & location sharing</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setModalHasAllowedLocation(!modalHasAllowedLocation)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                          modalHasAllowedLocation 
                            ? 'bg-emerald-600 text-white shadow-sm' 
                            : 'bg-amber-600/20 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {modalHasAllowedLocation ? <Check size={13} /> : <AlertTriangle size={13} />}
                        <span>{modalHasAllowedLocation ? 'Allowed' : 'Denied (5m Reminder)'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Activity Stats: Orders */}
                  {!isAddMode && (
                    <div className="flex items-center justify-between p-3.5 bg-[#2563EB]/10 border border-[#2563EB]/20 rounded-2xl">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-[#2563EB]/10 text-[#3B82F6] flex items-center justify-center">
                          <Layers size={15} />
                        </div>
                        <div>
                          <span className="text-[11px] text-[#94A3B8] block font-medium">Activity History</span>
                          <span className="text-[#F1F5F9] font-black text-xs">Total Orders Placed</span>
                        </div>
                      </div>
                      <div className="px-3.5 py-1.5 bg-[#2563EB]/20 text-[#3B82F6] border border-[#2563EB]/30 text-sm font-black rounded-xl">
                        {getOrderCountForCustomer(modalShopName, modalCustomerCode)}
                      </div>
                    </div>
                  )}

                </div>

                {/* ----------------- RIGHT PANEL: Security & Catalog Permissions ----------------- */}
                <div className="space-y-4 border-t md:border-t-0 md:border-l border-[#334155]/60 pt-4 md:pt-0 md:pl-6 flex flex-col justify-between">
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold font-mono text-[#3B82F6] tracking-wider uppercase border-b border-[#334155]/60 pb-1.5 flex items-center gap-1.5">
                      <Lock size={14} />
                      <span>Security & Catalog Permissions</span>
                    </h4>

                    {/* System User ID Prominent */}
                    <div className="p-4 bg-[#0F172A] border border-[#334155] rounded-2xl flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-[#64748B] font-mono block uppercase">Wholesale System ID</span>
                        <span className="text-base font-black font-mono text-[#F1F5F9] mt-1 block tracking-wider">
                          {modalCustomerCode}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyCode(modalCustomerCode)}
                        className="px-3 py-1.5 rounded-xl bg-[#1E293B] border border-[#334155] hover:border-[#64748B] text-[#94A3B8] font-bold flex items-center gap-1.5 transition active:scale-95"
                      >
                        {showCopyFeedback ? (
                          <>
                            <Check size={12} className="text-emerald-400" />
                            <span className="text-[10px] text-emerald-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={12} />
                            <span className="text-[10px]">Copy ID</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Reset ID & Force Logout Option (for existing customers) */}
                    {!isAddMode && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (window.confirm(`Are you sure you want to reset ID for "${modalShopName}" (${modalCustomerCode}) and instantly force logout their session?`)) {
                            const newCode = `CUST-${Math.floor(1000 + Math.random() * 9000)}`;
                            const updatedCustomer: Customer = {
                              customerCode: newCode,
                              shopName: modalShopName.trim(),
                              contactPerson: modalContactPerson.trim(),
                              mobileNumber: modalMobileNumber.trim(),
                              cityName: modalCityName.trim(),
                              address: modalAddress.trim(),
                              status: modalStatus,
                              isVerified: modalStatus === 'Verified',
                              pin: modalPin,
                              allowedCategories: modalAllowedCategories,
                              allowedSubCategories: modalAllowedSubCategories,
                              gpsLocation: modalGpsLocation.trim(),
                              resolvedAddress: modalResolvedAddress.trim(),
                              staffCategory: modalRole === 'Shivam Staff' ? modalStaffCategory.trim() : undefined,
                              role: modalRole,
                              lastActive: Date.now()
                            };

                            // Delete old record and add new record with new ID
                            deleteCustomer(modalCustomerCode);
                            await deleteCustomerFromFirebase(modalCustomerCode);

                            addCustomer(updatedCustomer);
                            await syncCustomerToFirebase(updatedCustomer);

                            // Force logout locally if currently logged in customer matches
                            const currentCust = useAppStore.getState().currentCustomer;
                            if (currentCust && currentCust.customerCode.toLowerCase() === modalCustomerCode.toLowerCase()) {
                              useAppStore.getState().setCurrentCustomer(null);
                            }

                            setToastMessage(`Customer ID reset to ${newCode}. Session force logged out.`);
                            setTimeout(() => setToastMessage(null), 4000);
                            setSelectedCustomerForModal(null);
                          }
                        }}
                        className="w-full py-2.5 px-3 rounded-2xl bg-red-600/15 hover:bg-red-600/25 border border-red-500/30 text-red-400 font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 shadow-sm"
                      >
                        <RefreshCw size={14} />
                        <span>Reset ID & Force Logout</span>
                      </button>
                    )}

                    {/* Security PIN & Status Toggle */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block font-bold text-[#94A3B8]">4-Digit Security PIN</label>
                        <input
                          type="text"
                          maxLength={4}
                          value={modalPin}
                          onChange={(e) => setModalPin(e.target.value.replace(/\D/g, ''))}
                          className="w-full px-3 py-2.5 bg-[#0F172A] border border-[#334155] rounded-xl text-[#F8FAFC] font-mono text-center tracking-widest text-sm focus:outline-none focus:border-[#3B82F6] transition"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block font-bold text-[#94A3B8]">Verification Status</label>
                        <select
                          value={modalStatus}
                          onChange={(e) => setModalStatus(e.target.value as 'Verified' | 'Pending')}
                          className="w-full px-3 py-2.5 bg-[#0F172A] border border-[#334155] rounded-xl text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6] transition"
                        >
                          <option value="Pending">Pending Validation</option>
                          <option value="Verified">Verified Retailer</option>
                        </select>
                      </div>
                    </div>

                    {/* Role Selection & Staff Department Assignment */}
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="block font-bold text-[#94A3B8]">System Role</label>
                        <select
                          value={modalRole}
                          onChange={(e) => setModalRole(e.target.value)}
                          className="w-full px-3 py-2.5 bg-[#0F172A] border border-[#334155] rounded-xl text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6] transition"
                        >
                          <option value="User">User (Default)</option>
                          <option value="Shivam Staff">Shivam Staff</option>
                        </select>
                      </div>

                      {modalRole === 'Shivam Staff' && (
                        <div className="p-3 bg-[#1E293B] border border-[#334155] rounded-2xl space-y-2 animate-in fade-in duration-200">
                          <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider">
                            Assign Staff Department / Category
                          </label>
                          <div className="space-y-1.5 max-h-[140px] overflow-y-auto custom-scrollbar pr-1">
                            {categories.map((cat) => {
                              const currentSelected = modalStaffCategory
                                ? modalStaffCategory.split(',').map(s => s.trim()).filter(Boolean)
                                : [];
                              const isAssigned = currentSelected.includes(cat.id);
                              
                              return (
                                <label key={cat.id} className="flex items-center gap-2 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={isAssigned}
                                    onChange={(e) => {
                                      let updatedList = [...currentSelected];
                                      if (e.target.checked) {
                                        updatedList.push(cat.id);
                                      } else {
                                        updatedList = updatedList.filter(id => id !== cat.id);
                                      }
                                      setModalStaffCategory(updatedList.join(', '));
                                    }}
                                    className="rounded border-[#334155] text-[#3B82F6] focus:ring-[#3B82F6] bg-[#0F172A]"
                                  />
                                  <span className="text-xs font-bold text-[#F1F5F9] flex items-center gap-1.5">
                                    <span 
                                      className="w-2 h-2 rounded-full inline-block" 
                                      style={{ backgroundColor: cat.accentColorHex || '#F59E0B' }}
                                    />
                                    {cat.displayName}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Catalog Category & Subcategory Permissions checklist tree */}
                    <div className="space-y-1.5">
                      <label className="block font-bold text-[#94A3B8]">Catalog Access & Visibility Tree</label>

                      <div className="bg-[#0F172A] p-4 rounded-2xl border border-[#334155]/60 max-h-[220px] overflow-y-auto space-y-3 custom-scrollbar">
                        {categories.map((cat) => {
                          const isCatChecked = modalAllowedCategories.includes(cat.id);
                          const catSubs = subCategories.filter(s => s.categoryId === cat.id);

                          return (
                            <div key={cat.id} className="space-y-1">
                              {/* Category Header */}
                              <div className="flex items-center gap-2 py-1.5 border-b border-[#334155]/20">
                                <button
                                  type="button"
                                  onClick={() => handleCategoryPermissionToggle(cat.id)}
                                  className="text-[#64748B] hover:text-white transition"
                                >
                                  {isCatChecked ? (
                                    <CheckSquare size={16} className="text-[#3B82F6]" />
                                  ) : (
                                    <Square size={16} className="text-[#334155]" />
                                  )}
                                </button>
                                <span className="font-bold text-[#F1F5F9] text-xs flex items-center gap-1.5">
                                  <span 
                                    className="w-2.5 h-2.5 rounded-full inline-block" 
                                    style={{ backgroundColor: cat.accentColorHex || '#F59E0B' }}
                                  />
                                  <span>{cat.displayName}</span>
                                </span>
                              </div>

                              {/* Nested Subcategories */}
                              <div className="pl-6 space-y-1 pt-1.5 pb-1">
                                {catSubs.map((sub) => {
                                  const isSubChecked = modalAllowedSubCategories.includes(sub.id);
                                  return (
                                    <div key={sub.id} className="flex items-center gap-2 py-0.5">
                                      <button
                                        type="button"
                                        onClick={() => handleSubCategoryPermissionToggle(sub.id, cat.id)}
                                        className="text-[#64748B] hover:text-white transition"
                                      >
                                        {isSubChecked ? (
                                          <CheckSquare size={14} className="text-[#3B82F6]/80" />
                                        ) : (
                                          <Square size={14} className="text-[#334155]" />
                                        )}
                                      </button>
                                      <span className="text-[#94A3B8] font-medium text-[11px]">
                                        {sub.name}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons inside right panel footer */}
                  <div className="pt-4 border-t border-[#334155]/60 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setSelectedCustomerForModal(null)}
                      className="px-4 py-2 rounded-xl bg-[#0F172A] border border-[#334155] hover:bg-[#1E293B] text-[#94A3B8] font-bold transition active:scale-95"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveCustomer}
                      className="px-5 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold transition active:scale-95 shadow-lg shadow-blue-500/10 flex items-center gap-1.5"
                    >
                      <span>Save Changes</span>
                    </button>
                  </div>

                </div>

              </div>

            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* CUSTOM DELETE CONFIRMATION MODAL */}
        {/* ------------------------------------------------------------- */}
        {customerToDelete && (
          <div className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#1E293B] border border-red-500/40 rounded-3xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 space-y-5 text-center">
              <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 flex items-center justify-center mx-auto">
                <AlertTriangle size={28} />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-black text-white">Delete Customer Account</h3>
                <p className="text-xs text-slate-300 leading-relaxed px-2">
                  Are you sure you want to delete this customer? This action will permanently remove their access and immediately log them out.
                </p>
              </div>

              {/* Customer summary pill */}
              <div className="p-3.5 bg-[#0F172A] border border-[#334155] rounded-2xl text-left text-xs space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-white text-sm">{customerToDelete.shopName}</span>
                  <span className="font-mono text-[10px] text-blue-400 font-bold px-2 py-0.5 bg-blue-500/10 rounded-lg border border-blue-500/20">{customerToDelete.customerCode}</span>
                </div>
                <div className="text-slate-400">{customerToDelete.contactPerson || 'Proprietor'} • {customerToDelete.cityName}</div>
                <div className="text-slate-500 font-mono text-[11px]">{customerToDelete.mobileNumber}</div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setCustomerToDelete(null)}
                  className="py-2.5 rounded-xl bg-[#0F172A] border border-[#334155] hover:bg-[#334155] text-slate-300 text-xs font-bold transition active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDeleteCustomer}
                  className="py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 disabled:opacity-50"
                >
                  {isDeleting ? (
                    <span>Deleting...</span>
                  ) : (
                    <>
                      <Trash2 size={14} />
                      <span>Yes, Delete Customer</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast Feedback */}
        {toastMessage && (
          <div className="fixed top-6 right-6 z-[200] bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-2xl font-bold text-xs flex items-center gap-2 border border-emerald-400 animate-in slide-in-from-top-4">
            <CheckCircle2 size={18} />
            <span>{toastMessage}</span>
          </div>
        )}

      </div>
    </div>
  );
};
