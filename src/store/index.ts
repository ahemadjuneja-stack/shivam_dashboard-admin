import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MainCategory, CategoryItem, SubCategory, CatalogPhoto, Customer, OrderCartItem, WholesaleOrder, ShowroomVideo } from '../types';

interface AppState {
  // Catalog Data
  categories: CategoryItem[];
  subCategories: SubCategory[];
  photos: CatalogPhoto[];
  showroomVideos: ShowroomVideo[];
  customers: Customer[];
  orders: WholesaleOrder[];
  
  // Navigation & Selection in Landscape Mode
  activeCategoryId: string;
  activeSubCategoryId: string;
  activePhotoId: string;
  showroomScreenMode: 'home' | 'subcategories' | 'gallery' | 'fullimage';

  // Cart & Customer State
  cart: OrderCartItem[];
  currentCustomer: Customer | null;
  isCartOpen: boolean;

  // Chat State
  chatMessages: import('../types').ChatMessage[];
  sendMessage: (msg: import('../types').ChatMessage) => void;
  markMessagesAsRead: (customerCode: string) => void;

  // Actions
  setShowroomScreenMode: (mode: 'home' | 'subcategories' | 'gallery' | 'fullimage') => void;
  setActiveCategory: (categoryId: string) => void;
  setActiveSubCategory: (subCategoryId: string) => void;
  setActivePhoto: (photoId: string) => void;
  setIsCartOpen: (open: boolean) => void;

  addToCart: (item: OrderCartItem) => void;
  setItemQuantity: (photo: CatalogPhoto, optionLetter: string, quantity: number) => void;
  updateCartItemQuantity: (index: number, quantity: number) => void;
  removeFromCart: (index: number) => void;
  clearCart: () => void;
  setCurrentCustomer: (customer: Customer | null) => void;
  placeOrder: () => void;
  
  // Admin Actions
  addCustomer: (customer: Customer) => void;
  updateCustomer: (customerCode: string, data: Partial<Customer>) => void;
  deleteCustomer: (customerCode: string) => void;
  addOrder: (order: WholesaleOrder) => void;
  toggleOrderStatus: (orderId: string) => void;
  updateOrderNotes: (orderId: string, notes: string) => void;
  updateOrderStatus: (orderId: string, department: 'imitation' | 'cosmetics' | 'hair', status: string) => void;
  updateOverallOrderStatus: (orderId: string, status: string) => void;
  packAllDepartments: (orderId: string) => void;
  deleteOrder: (orderId: string) => void;
  addPhoto: (photo: CatalogPhoto) => void;
  addMultiplePhotos: (photos: CatalogPhoto[]) => void;
  reorderPhotos: (orderedPhotos: CatalogPhoto[]) => void;
  addSubCategory: (subCat: SubCategory) => void;
  addCategory: (category: CategoryItem) => void;
  updateCategory: (categoryId: string, data: Partial<CategoryItem>) => void;
  deleteCategory: (categoryId: string) => void;
  updateSubCategory: (subCategoryId: string, data: Partial<SubCategory>) => void;
  deleteSubCategory: (subCategoryId: string) => void;
  updatePhoto: (photoId: string, data: Partial<CatalogPhoto>) => void;
  deletePhoto: (photoId: string) => void;
  batchSetStock: (photoId: string, available: boolean) => void;
  addShowroomVideo: (video: ShowroomVideo) => void;
  addMultipleShowroomVideos: (videos: ShowroomVideo[]) => void;
  deleteShowroomVideo: (videoId: string) => void;
  reorderShowroomVideos: (videos: ShowroomVideo[]) => void;
  resetToDefaults: () => void;
}

const defaultCategories: CategoryItem[] = [
  { 
    id: MainCategory.IMITATION, 
    displayName: 'Imitation Jewelry', 
    thumbnailUrl: 'https://images.unsplash.com/photo-1599643478514-4a410f0a82ef?auto=format&fit=crop&q=80&w=600', 
    accentColorHex: '#F59E0B', 
    sortOrder: 1 
  },
  { 
    id: MainCategory.COSMETICS, 
    displayName: 'Cosmetics', 
    thumbnailUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&q=80&w=600', 
    accentColorHex: '#EC4899', 
    sortOrder: 2 
  },
  { 
    id: MainCategory.HAIR_ACCESSORIES, 
    displayName: 'Hair Accessories', 
    thumbnailUrl: 'https://images.unsplash.com/photo-1606214532675-80277bd28bd9?auto=format&fit=crop&q=80&w=600', 
    accentColorHex: '#38BDF8', 
    sortOrder: 3 
  }
];

const defaultSubCategories: SubCategory[] = [
  // Imitation
  { id: 'sub-earrings', categoryId: MainCategory.IMITATION, name: 'Earrings & Jhumkas', iconName: 'sparkles', thumbnailUrl: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&q=80&w=600', photoCount: 3, sortOrder: 1 },
  { id: 'sub-bangles', categoryId: MainCategory.IMITATION, name: 'Bangles & Kadas', iconName: 'circle', thumbnailUrl: 'https://images.unsplash.com/photo-1611591475806-03f13f1737be?auto=format&fit=crop&q=80&w=600', photoCount: 2, sortOrder: 2 },
  { id: 'sub-necklaces', categoryId: MainCategory.IMITATION, name: 'Choker & Necklace Sets', iconName: 'gem', thumbnailUrl: 'https://images.unsplash.com/photo-1599643478514-4a410f0a82ef?auto=format&fit=crop&q=80&w=600', photoCount: 1, sortOrder: 3 },
  
  // Cosmetics
  { id: 'sub-lipsticks', categoryId: MainCategory.COSMETICS, name: 'Matte & Liquid Lipsticks', iconName: 'heart', thumbnailUrl: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&q=80&w=600', photoCount: 2, sortOrder: 1 },
  { id: 'sub-nailpolish', categoryId: MainCategory.COSMETICS, name: 'Nail Lacquer & Gel Polish', iconName: 'sparkles', thumbnailUrl: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&q=80&w=600', photoCount: 1, sortOrder: 2 },
  { id: 'sub-eyemakeup', categoryId: MainCategory.COSMETICS, name: 'Kajal & Liquid Liner', iconName: 'eye', thumbnailUrl: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&q=80&w=600', photoCount: 1, sortOrder: 3 },

  // Hair Accessories
  { id: 'sub-clawclips', categoryId: MainCategory.HAIR_ACCESSORIES, name: 'Korean Claw Clips', iconName: 'scissors', thumbnailUrl: 'https://images.unsplash.com/photo-1606214532675-80277bd28bd9?auto=format&fit=crop&q=80&w=600', photoCount: 2, sortOrder: 1 },
  { id: 'sub-scrunchies', categoryId: MainCategory.HAIR_ACCESSORIES, name: 'Silk Scrunchies & Bands', iconName: 'circle-dot', thumbnailUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&q=80&w=600', photoCount: 1, sortOrder: 2 }
];

export const defaultShowroomVideos: ShowroomVideo[] = [
  {
    id: 'vid-1',
    title: 'Bridal Jewelry Collection Teaser',
    videoUri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnailUri: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=1280&h=720&q=80',
    categoryId: MainCategory.IMITATION,
    categoryName: 'Imitation Jewelry',
    fileSizeMb: 14.5,
    uploadedAt: Date.now() - 1000 * 60 * 60 * 24 * 3
  },
  {
    id: 'vid-2',
    title: 'Matte Lipsticks & Cosmetics Promo',
    videoUri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    thumbnailUri: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=1280&h=720&q=80',
    categoryId: MainCategory.COSMETICS,
    categoryName: 'Cosmetics',
    fileSizeMb: 18.2,
    uploadedAt: Date.now() - 1000 * 60 * 60 * 24 * 2
  },
  {
    id: 'vid-3',
    title: 'Korean Hair Accessories Showcase',
    videoUri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    thumbnailUri: 'https://images.unsplash.com/photo-1606214532675-80277bd28bd9?auto=format&fit=crop&w=1280&h=720&q=80',
    categoryId: MainCategory.HAIR_ACCESSORIES,
    categoryName: 'Hair Accessories',
    fileSizeMb: 12.0,
    uploadedAt: Date.now() - 1000 * 60 * 60 * 24
  }
];

const defaultPhotos: CatalogPhoto[] = [
  // Imitation - Earrings
  {
    id: 'p-er-101',
    categoryId: MainCategory.IMITATION,
    subCategoryId: 'sub-earrings',
    subCategoryName: 'Earrings & Jhumkas',
    photoCode: 'ER-101',
    imageUri: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=1280&h=720&q=80',
    videoUri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    itemCount: 4,
    aAvailable: true,
    bAvailable: true,
    cAvailable: true,
    dAvailable: true,
    defaultQuantity: 12,
    sortOrder: 1,
    description: ''
  },
  {
    id: 'p-er-102',
    categoryId: MainCategory.IMITATION,
    subCategoryId: 'sub-earrings',
    subCategoryName: 'Earrings & Jhumkas',
    photoCode: 'ER-102',
    imageUri: 'https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=1280&h=720&q=80',
    videoUri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    itemCount: 4,
    aAvailable: true,
    bAvailable: true,
    cAvailable: true,
    dAvailable: false,
    defaultQuantity: 12,
    sortOrder: 2,
    description: ''
  },
  {
    id: 'p-er-103',
    categoryId: MainCategory.IMITATION,
    subCategoryId: 'sub-earrings',
    subCategoryName: 'Earrings & Jhumkas',
    photoCode: 'ER-103',
    imageUri: 'https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?auto=format&fit=crop&w=1280&h=720&q=80',
    videoUri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    itemCount: 4,
    aAvailable: true,
    bAvailable: true,
    cAvailable: false,
    dAvailable: true,
    defaultQuantity: 12,
    sortOrder: 3,
    description: ''
  },

  // Bangles
  {
    id: 'p-bg-201',
    categoryId: MainCategory.IMITATION,
    subCategoryId: 'sub-bangles',
    subCategoryName: 'Bangles & Kadas',
    photoCode: 'BG-201',
    imageUri: 'https://images.unsplash.com/photo-1611591475806-03f13f1737be?auto=format&fit=crop&w=1280&h=720&q=80',
    videoUri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    itemCount: 4,
    aAvailable: true,
    bAvailable: true,
    cAvailable: true,
    dAvailable: true,
    defaultQuantity: 24,
    sortOrder: 1,
    description: ''
  },
  {
    id: 'p-bg-202',
    categoryId: MainCategory.IMITATION,
    subCategoryId: 'sub-bangles',
    subCategoryName: 'Bangles & Kadas',
    photoCode: 'BG-202',
    imageUri: 'https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?auto=format&fit=crop&w=1280&h=720&q=80',
    videoUri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
    itemCount: 3,
    aAvailable: true,
    bAvailable: true,
    cAvailable: true,
    dAvailable: false,
    defaultQuantity: 12,
    sortOrder: 2,
    description: ''
  },

  // Necklaces
  {
    id: 'p-nk-301',
    categoryId: MainCategory.IMITATION,
    subCategoryId: 'sub-necklaces',
    subCategoryName: 'Choker & Necklace Sets',
    photoCode: 'NK-301',
    imageUri: 'https://images.unsplash.com/photo-1599643478514-4a410f0a82ef?auto=format&fit=crop&w=1280&h=720&q=80',
    videoUri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
    itemCount: 2,
    aAvailable: true,
    bAvailable: true,
    cAvailable: false,
    dAvailable: false,
    defaultQuantity: 6,
    sortOrder: 1,
    description: ''
  },

  // Cosmetics - Lipsticks
  {
    id: 'p-lp-101',
    categoryId: MainCategory.COSMETICS,
    subCategoryId: 'sub-lipsticks',
    subCategoryName: 'Matte & Liquid Lipsticks',
    photoCode: 'LP-101',
    imageUri: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=1280&h=720&q=80',
    videoUri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    itemCount: 4,
    aAvailable: true,
    bAvailable: true,
    cAvailable: true,
    dAvailable: true,
    defaultQuantity: 24,
    sortOrder: 1,
    description: ''
  },
  {
    id: 'p-lp-102',
    categoryId: MainCategory.COSMETICS,
    subCategoryId: 'sub-lipsticks',
    subCategoryName: 'Matte & Liquid Lipsticks',
    photoCode: 'LP-102',
    imageUri: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1280&h=720&q=80',
    videoUri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    itemCount: 4,
    aAvailable: true,
    bAvailable: true,
    cAvailable: true,
    dAvailable: true,
    defaultQuantity: 12,
    sortOrder: 2,
    description: ''
  },

  // Cosmetics - Nail Polish
  {
    id: 'p-np-201',
    categoryId: MainCategory.COSMETICS,
    subCategoryId: 'sub-nailpolish',
    subCategoryName: 'Nail Lacquer & Gel Polish',
    photoCode: 'NP-201',
    imageUri: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=1280&h=720&q=80',
    videoUri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    itemCount: 4,
    aAvailable: true,
    bAvailable: true,
    cAvailable: true,
    dAvailable: true,
    defaultQuantity: 36,
    sortOrder: 1,
    description: ''
  },

  // Cosmetics - Eye Makeup
  {
    id: 'p-em-301',
    categoryId: MainCategory.COSMETICS,
    subCategoryId: 'sub-eyemakeup',
    subCategoryName: 'Kajal & Liquid Liner',
    photoCode: 'EM-301',
    imageUri: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=1280&h=720&q=80',
    videoUri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
    itemCount: 3,
    aAvailable: true,
    bAvailable: true,
    cAvailable: true,
    dAvailable: false,
    defaultQuantity: 24,
    sortOrder: 1,
    description: ''
  },

  // Hair Accessories - Claw Clips
  {
    id: 'p-cc-101',
    categoryId: MainCategory.HAIR_ACCESSORIES,
    subCategoryId: 'sub-clawclips',
    subCategoryName: 'Korean Claw Clips',
    photoCode: 'CC-101',
    imageUri: 'https://images.unsplash.com/photo-1606214532675-80277bd28bd9?auto=format&fit=crop&w=1280&h=720&q=80',
    videoUri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    itemCount: 4,
    aAvailable: true,
    bAvailable: true,
    cAvailable: true,
    dAvailable: true,
    defaultQuantity: 24,
    sortOrder: 1,
    description: ''
  },
  {
    id: 'p-cc-102',
    categoryId: MainCategory.HAIR_ACCESSORIES,
    subCategoryId: 'sub-clawclips',
    subCategoryName: 'Korean Claw Clips',
    photoCode: 'CC-102',
    imageUri: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=1280&h=720&q=80',
    videoUri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    itemCount: 3,
    aAvailable: true,
    bAvailable: true,
    cAvailable: true,
    dAvailable: false,
    defaultQuantity: 24,
    sortOrder: 2,
    description: ''
  },

  // Hair Accessories - Scrunchies
  {
    id: 'p-sc-201',
    categoryId: MainCategory.HAIR_ACCESSORIES,
    subCategoryId: 'sub-scrunchies',
    subCategoryName: 'Silk Scrunchies & Bands',
    photoCode: 'SC-201',
    imageUri: 'https://images.unsplash.com/photo-1620656798579-1984d9e87dfa?auto=format&fit=crop&w=1280&h=720&q=80',
    videoUri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
    itemCount: 4,
    aAvailable: true,
    bAvailable: true,
    cAvailable: true,
    dAvailable: true,
    defaultQuantity: 36,
    sortOrder: 1,
    description: ''
  }
];

const defaultOrders: WholesaleOrder[] = [
  {
    id: 'ord-201',
    orderNumber: 'ORD-5501',
    customerCode: 'CUST-RAMIZ-1',
    shopName: 'sajde keshod',
    cityName: 'Keshod',
    mobileNumber: '9898011223',
    source: 'SALESMAN',
    salesmanName: 'RAMIZ',
    dateFormatted: '16-09-2026',
    notes: 'sajde keshod',
    imitationStatus: 'PENDING',
    cosmeticsStatus: 'PENDING',
    hairStatus: 'NOT_APPLICABLE',
    overallStatus: 'PENDING',
    items: [
      {
        photoId: 'p-er-101',
        photoCode: 'ER-101',
        imageUri: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=1280&h=720&q=80',
        categoryId: MainCategory.IMITATION,
        subCategoryName: 'Earrings & Jhumkas',
        optionLetter: 'A',
        quantity: 36
      }
    ],
    totalItemsCount: 36,
    createdAt: Date.now() - 1000 * 60 * 10
  },
  {
    id: 'ord-202',
    orderNumber: 'ORD-5502',
    customerCode: 'CUST-RIYAZ-1',
    shopName: 'BHAVANI NOVELTY',
    cityName: 'RAJPARDl',
    mobileNumber: '9824055667',
    source: 'SALESMAN',
    salesmanName: 'RIYAZ',
    dateFormatted: '16-09-2026',
    notes: 'RAJPARDl... BHAVANI NOVELTY',
    imitationStatus: 'PENDING',
    cosmeticsStatus: 'PENDING',
    hairStatus: 'NOT_APPLICABLE',
    overallStatus: 'PENDING',
    items: [
      {
        photoId: 'p-er-102',
        photoCode: 'ER-102',
        imageUri: 'https://images.unsplash.com/photo-1598560917505-59a3ad559071?auto=format&fit=crop&w=1280&h=720&q=80',
        categoryId: MainCategory.IMITATION,
        subCategoryName: 'Earrings & Jhumkas',
        optionLetter: 'B',
        quantity: 24
      }
    ],
    totalItemsCount: 24,
    createdAt: Date.now() - 1000 * 60 * 25
  },
  {
    id: 'ord-203',
    orderNumber: 'ORD-5503',
    customerCode: 'CUST-RIYAZ-2',
    shopName: 'BHAVANI NOVELTY',
    cityName: 'RAJPARDl',
    mobileNumber: '9824055667',
    source: 'SALESMAN',
    salesmanName: 'RIYAZ',
    dateFormatted: '16-09-2026',
    notes: 'RAJPARDl... BHAVANI NOVELTY',
    imitationStatus: 'PENDING',
    cosmeticsStatus: 'PENDING',
    hairStatus: 'NOT_APPLICABLE',
    overallStatus: 'PENDING',
    items: [
      {
        photoId: 'p-bg-201',
        photoCode: 'BG-201',
        imageUri: 'https://images.unsplash.com/photo-1611591475806-03f13f1737be?auto=format&fit=crop&w=1280&h=720&q=80',
        categoryId: MainCategory.IMITATION,
        subCategoryName: 'Bangles & Kadas',
        optionLetter: 'A',
        quantity: 48
      }
    ],
    totalItemsCount: 48,
    createdAt: Date.now() - 1000 * 60 * 40
  },
  {
    id: 'ord-204',
    orderNumber: 'ORD-5504',
    customerCode: 'CUST-RIYAZ-3',
    shopName: 'BHAVANI NOVELTY',
    cityName: 'RAJPARDl',
    mobileNumber: '9824055667',
    source: 'SALESMAN',
    salesmanName: 'RIYAZ',
    dateFormatted: '16-09-2026',
    notes: 'RAJPARDl... BHAVANI NOVELTY',
    imitationStatus: 'PENDING',
    cosmeticsStatus: 'NOT_APPLICABLE',
    hairStatus: 'NOT_APPLICABLE',
    overallStatus: 'PENDING',
    items: [],
    totalItemsCount: 24,
    createdAt: Date.now() - 1000 * 60 * 55
  },
  {
    id: 'ord-205',
    orderNumber: 'ORD-5505',
    customerCode: 'CUST-ZARIF-1',
    shopName: 'NAYRAH PHOTO ITEMS',
    cityName: 'DWARKA',
    mobileNumber: '9909012345',
    source: 'SALESMAN',
    salesmanName: 'ZARIF',
    dateFormatted: '16-09-2026',
    notes: 'DWARKA NAYRAH PHOTO ITEMS ...',
    imitationStatus: 'PENDING',
    cosmeticsStatus: 'PENDING',
    hairStatus: 'NOT_APPLICABLE',
    overallStatus: 'PENDING',
    items: [],
    totalItemsCount: 60,
    createdAt: Date.now() - 1000 * 60 * 70
  },
  {
    id: 'ord-206',
    orderNumber: 'ORD-5506',
    customerCode: 'CUST-ZARIF-2',
    shopName: 'NAYRAH PHOTO ITEMS',
    cityName: 'DWARKA',
    mobileNumber: '9909012345',
    source: 'SALESMAN',
    salesmanName: 'ZARIF',
    dateFormatted: '16-09-2026',
    notes: 'DWARKA NAYRAH PHOTO ITEMS ...',
    imitationStatus: 'PENDING',
    cosmeticsStatus: 'PENDING',
    hairStatus: 'NOT_APPLICABLE',
    overallStatus: 'PENDING',
    items: [],
    totalItemsCount: 36,
    createdAt: Date.now() - 1000 * 60 * 85
  },
  {
    id: 'ord-207',
    orderNumber: 'ORD-5507',
    customerCode: 'CUST-ZARIF-3',
    shopName: 'NAYRAH PHOTO ITEMS',
    cityName: 'DWARKA',
    mobileNumber: '9909012345',
    source: 'SALESMAN',
    salesmanName: 'ZARIF',
    dateFormatted: '16-09-2026',
    notes: 'DWARKA NAYRAH PHOTO ITEMS ...',
    imitationStatus: 'PENDING',
    cosmeticsStatus: 'PENDING',
    hairStatus: 'NOT_APPLICABLE',
    overallStatus: 'PENDING',
    items: [],
    totalItemsCount: 48,
    createdAt: Date.now() - 1000 * 60 * 100
  },
  {
    id: 'ord-208',
    orderNumber: 'ORD-5508',
    customerCode: 'CUST-RIYAZ-4',
    shopName: 'NANDINI BEAUTY',
    cityName: 'BUARUCH',
    mobileNumber: '9723044556',
    source: 'SALESMAN',
    salesmanName: 'RIYAZ',
    dateFormatted: '16-09-2026',
    notes: 'BUARUCH.. NANDINI BEAUTY',
    imitationStatus: 'PENDING',
    cosmeticsStatus: 'PENDING',
    hairStatus: 'NOT_APPLICABLE',
    overallStatus: 'PENDING',
    items: [],
    totalItemsCount: 72,
    createdAt: Date.now() - 1000 * 60 * 115
  },
  {
    id: 'ord-209',
    orderNumber: 'ORD-5509',
    customerCode: 'CUST-RIYAZ-5',
    shopName: 'NANDINI BEAUTY',
    cityName: 'BUARUCH',
    mobileNumber: '9723044556',
    source: 'SALESMAN',
    salesmanName: 'RIYAZ',
    dateFormatted: '16-09-2026',
    notes: 'BUARUCH.. NANDINI BEAUTY',
    imitationStatus: 'PENDING',
    cosmeticsStatus: 'PENDING',
    hairStatus: 'NOT_APPLICABLE',
    overallStatus: 'PENDING',
    items: [],
    totalItemsCount: 48,
    createdAt: Date.now() - 1000 * 60 * 130
  },
  {
    id: 'ord-210',
    orderNumber: 'ORD-5510',
    customerCode: 'CUST-RIYAZ-6',
    shopName: 'NANDINI BEAUTY',
    cityName: 'BUARUCH',
    mobileNumber: '9723044556',
    source: 'SALESMAN',
    salesmanName: 'RIYAZ',
    dateFormatted: '16-09-2026',
    notes: 'BUARUCH.. NANDINI BEAUTY',
    imitationStatus: 'PENDING',
    cosmeticsStatus: 'PENDING',
    hairStatus: 'NOT_APPLICABLE',
    overallStatus: 'PENDING',
    items: [],
    totalItemsCount: 36,
    createdAt: Date.now() - 1000 * 60 * 145
  },
  // Customer mobile orders:
  {
    id: 'ord-211',
    orderNumber: 'ORD-5511',
    customerCode: 'CUST-VIVAH',
    shopName: 'Vivah Novelty',
    cityName: 'Upleta',
    mobileNumber: '9825599887',
    source: 'CUSTOMER',
    dateFormatted: '15-09-2026',
    notes: 'No Note',
    imitationStatus: 'PENDING',
    cosmeticsStatus: 'PENDING',
    hairStatus: 'PENDING',
    overallStatus: 'PENDING',
    items: [],
    totalItemsCount: 96,
    createdAt: Date.now() - 1000 * 60 * 60 * 24
  },
  {
    id: 'ord-212',
    orderNumber: 'ORD-5512',
    customerCode: 'CUST-RUPKALA',
    shopName: 'RUPKALA NOVELTY',
    cityName: 'PORBANDAR',
    mobileNumber: '9979011223',
    source: 'CUSTOMER',
    dateFormatted: '15-09-2026',
    notes: 'nail and lipstick ma box nakhjo',
    imitationStatus: 'DONE',
    cosmeticsStatus: 'DONE',
    hairStatus: 'NOT_APPLICABLE',
    overallStatus: 'DONE',
    items: [],
    totalItemsCount: 144,
    createdAt: Date.now() - 1000 * 60 * 60 * 26
  },
  {
    id: 'ord-213',
    orderNumber: 'ORD-5513',
    customerCode: 'CUST-RUPKALA-2',
    shopName: 'RUPKALA NOVELTY',
    cityName: 'PORBANDAR',
    mobileNumber: '9979011223',
    source: 'CUSTOMER',
    dateFormatted: '15-09-2026',
    notes: '.B.B nail 4/7/18/26/39/48/67/70/ h...',
    imitationStatus: 'PENDING',
    cosmeticsStatus: 'PENDING',
    hairStatus: 'NOT_APPLICABLE',
    overallStatus: 'PENDING',
    items: [],
    totalItemsCount: 72,
    createdAt: Date.now() - 1000 * 60 * 60 * 28
  },
  {
    id: 'ord-214',
    orderNumber: 'ORD-5514',
    customerCode: 'CUST-RIYAZ-7',
    shopName: 'RIYAZ DIRECT',
    cityName: 'Surat',
    mobileNumber: '9824055667',
    source: 'SALESMAN',
    salesmanName: 'RIYAZ',
    dateFormatted: '15-09-2026',
    notes: 'No Note',
    imitationStatus: 'DONE',
    cosmeticsStatus: 'DONE',
    hairStatus: 'DONE',
    overallStatus: 'DONE',
    items: [],
    totalItemsCount: 60,
    createdAt: Date.now() - 1000 * 60 * 60 * 30
  },
  {
    id: 'ord-215',
    orderNumber: 'ORD-5515',
    customerCode: 'CUST-RIYAZ-8',
    shopName: 'RIYAZ DIRECT',
    cityName: 'Surat',
    mobileNumber: '9824055667',
    source: 'SALESMAN',
    salesmanName: 'RIYAZ',
    dateFormatted: '15-09-2026',
    notes: 'No Note',
    imitationStatus: 'DONE',
    cosmeticsStatus: 'DONE',
    hairStatus: 'DONE',
    overallStatus: 'DONE',
    items: [],
    totalItemsCount: 48,
    createdAt: Date.now() - 1000 * 60 * 60 * 32
  },
  {
    id: 'ord-216',
    orderNumber: 'ORD-5516',
    customerCode: 'CUST-RIYAZ-9',
    shopName: 'RIYAZ DIRECT',
    cityName: 'Surat',
    mobileNumber: '9824055667',
    source: 'SALESMAN',
    salesmanName: 'RIYAZ',
    dateFormatted: '15-09-2026',
    notes: 'No Note',
    imitationStatus: 'DONE',
    cosmeticsStatus: 'DONE',
    hairStatus: 'DONE',
    overallStatus: 'DONE',
    items: [],
    totalItemsCount: 84,
    createdAt: Date.now() - 1000 * 60 * 60 * 34
  },
  {
    id: 'ord-217',
    orderNumber: 'ORD-5517',
    customerCode: 'CUST-AMBIKA-1',
    shopName: 'Ambika Novelty',
    cityName: 'Rajpipla',
    mobileNumber: '9426011223',
    source: 'CUSTOMER',
    dateFormatted: '15-09-2026',
    notes: 'No Note',
    imitationStatus: 'DONE',
    cosmeticsStatus: 'DONE',
    hairStatus: 'DONE',
    overallStatus: 'DONE',
    items: [],
    totalItemsCount: 120,
    createdAt: Date.now() - 1000 * 60 * 60 * 36
  },
  {
    id: 'ord-218',
    orderNumber: 'ORD-5518',
    customerCode: 'CUST-AMBIKA-2',
    shopName: 'Ambika Novelty',
    cityName: 'Rajpipla',
    mobileNumber: '9426011223',
    source: 'CUSTOMER',
    dateFormatted: '15-09-2026',
    notes: 'No Note',
    imitationStatus: 'DONE',
    cosmeticsStatus: 'DONE',
    hairStatus: 'DONE',
    overallStatus: 'DONE',
    items: [],
    totalItemsCount: 96,
    createdAt: Date.now() - 1000 * 60 * 60 * 38
  },
  {
    id: 'ord-219',
    orderNumber: 'ORD-5519',
    customerCode: 'CUST-AMBIKA-3',
    shopName: 'Ambika Novelty',
    cityName: 'Rajpipla',
    mobileNumber: '9426011223',
    source: 'CUSTOMER',
    dateFormatted: '15-09-2026',
    notes: 'No Note',
    imitationStatus: 'DONE',
    cosmeticsStatus: 'DONE',
    hairStatus: 'DONE',
    overallStatus: 'DONE',
    items: [],
    totalItemsCount: 72,
    createdAt: Date.now() - 1000 * 60 * 60 * 40
  }
];

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      categories: defaultCategories,
      subCategories: defaultSubCategories,
      photos: defaultPhotos,
      showroomVideos: defaultShowroomVideos,
      customers: [
        { customerCode: 'CUST-101', shopName: 'Pooja Novelty Store', cityName: 'Mumbai', mobileNumber: '9876543210', contactPerson: 'Rajesh Bhai', address: 'Shop 14, Dadar Market' },
        { customerCode: 'CUST-102', shopName: 'Shrinath Cosmetics', cityName: 'Ahmedabad', mobileNumber: '9825012345', contactPerson: 'Ketan Patel', address: 'Ratanpole Wholesale Market' },
        { customerCode: 'CUST-103', shopName: 'Radhe Fashion Jewelry', cityName: 'Surat', mobileNumber: '9712345678', contactPerson: 'Amit Shah', address: 'Bhagal Main Road' }
      ],
      orders: defaultOrders,
      
      activeCategoryId: MainCategory.IMITATION,
      activeSubCategoryId: 'sub-earrings',
      activePhotoId: 'p-er-101',
      showroomScreenMode: 'home',

      cart: [],
      currentCustomer: { customerCode: 'CUST-101', shopName: 'Pooja Novelty Store', cityName: 'Mumbai', mobileNumber: '9876543210', contactPerson: 'Rajesh Bhai', address: 'Shop 14, Dadar Market' },
      isCartOpen: false,

      // Initial Chat State
      chatMessages: [
        {
          id: 'msg-1',
          customerCode: 'CUST-001',
          sender: 'CUSTOMER',
          type: 'TEXT',
          content: 'Hello, please process my order quickly.',
          timestamp: Date.now() - 3600000,
          isRead: false
        }
      ],

      sendMessage: (msg) => set((state) => ({
        chatMessages: [...state.chatMessages, msg]
      })),

      markMessagesAsRead: (customerCode) => set((state) => ({
        chatMessages: state.chatMessages.map(m => 
          m.customerCode === customerCode && m.sender === 'CUSTOMER' ? { ...m, isRead: true } : m
        )
      })),

      setShowroomScreenMode: (mode) => set({ showroomScreenMode: mode }),

      setActiveCategory: (categoryId) => set((state) => {
        const firstSub = state.subCategories.find(s => s.categoryId === categoryId);
        const subId = firstSub ? firstSub.id : '';
        const firstPhoto = state.photos.find(p => p.subCategoryId === subId);
        return {
          activeCategoryId: categoryId,
          activeSubCategoryId: subId,
          activePhotoId: firstPhoto ? firstPhoto.id : ''
        };
      }),

      setActiveSubCategory: (subCategoryId) => set((state) => {
        const firstPhoto = state.photos.find(p => p.subCategoryId === subCategoryId);
        return {
          activeSubCategoryId: subCategoryId,
          activePhotoId: firstPhoto ? firstPhoto.id : ''
        };
      }),

      setActivePhoto: (photoId) => set({ activePhotoId: photoId }),

      setIsCartOpen: (open) => set({ isCartOpen: open }),

      addToCart: (item) => set((state) => ({ cart: [...state.cart, item] })),
      setItemQuantity: (photo, optionLetter, quantity) => set((state) => {
        const existingIdx = state.cart.findIndex(
          i => i.photoId === photo.id && i.optionLetter === optionLetter
        );
        if (quantity <= 0) {
          if (existingIdx !== -1) {
            const updated = [...state.cart];
            updated.splice(existingIdx, 1);
            return { cart: updated };
          }
          return state;
        }

        if (existingIdx !== -1) {
          const updated = [...state.cart];
          updated[existingIdx] = {
            ...updated[existingIdx],
            quantity
          };
          return { cart: updated };
        } else {
          const newItem: OrderCartItem = {
            photoId: photo.id,
            photoCode: photo.photoCode,
            imageUri: photo.imageUri,
            categoryId: photo.categoryId,
            subCategoryName: photo.subCategoryName,
            optionLetter,
            quantity
          };
          return { cart: [...state.cart, newItem] };
        }
      }),
      updateCartItemQuantity: (index, quantity) => set((state) => {
        if (index < 0 || index >= state.cart.length) return state;
        if (quantity <= 0) {
          const newCart = [...state.cart];
          newCart.splice(index, 1);
          return { cart: newCart };
        }
        const newCart = [...state.cart];
        newCart[index] = { ...newCart[index], quantity };
        return { cart: newCart };
      }),
      removeFromCart: (index) => set((state) => {
        const newCart = [...state.cart];
        newCart.splice(index, 1);
        return { cart: newCart };
      }),
      clearCart: () => set({ cart: [] }),
      setCurrentCustomer: (customer) => set({ currentCustomer: customer }),

      placeOrder: () => set((state) => {
        if (!state.currentCustomer || state.cart.length === 0) return state;
        
        const hasImitation = state.cart.some(item => item.categoryId === MainCategory.IMITATION);
        const hasCosmetics = state.cart.some(item => item.categoryId === MainCategory.COSMETICS);
        const hasHair = state.cart.some(item => item.categoryId === MainCategory.HAIR_ACCESSORIES);

        const today = new Date();
        const d = String(today.getDate()).padStart(2, '0');
        const m = String(today.getMonth() + 1).padStart(2, '0');
        const y = today.getFullYear();
        const dateFormatted = `${d}-${m}-${y}`;

        const newOrder: WholesaleOrder = {
          id: Date.now().toString(),
          orderNumber: `ORD-${Math.floor(Math.random() * 90000) + 10000}`,
          customerCode: state.currentCustomer.customerCode,
          shopName: state.currentCustomer.shopName,
          cityName: state.currentCustomer.cityName,
          mobileNumber: state.currentCustomer.mobileNumber,
          items: [...state.cart],
          totalItemsCount: state.cart.reduce((sum, item) => sum + item.quantity, 0),
          imitationStatus: hasImitation ? 'PENDING' : 'NOT_APPLICABLE',
          cosmeticsStatus: hasCosmetics ? 'PENDING' : 'NOT_APPLICABLE',
          hairStatus: hasHair ? 'PENDING' : 'NOT_APPLICABLE',
          overallStatus: 'PENDING',
          notes: 'No Note',
          createdAt: Date.now(),
          source: 'CUSTOMER',
          dateFormatted
        };

        return {
          orders: [newOrder, ...state.orders],
          cart: [],
          isCartOpen: false
        };
      }),

      addOrder: (newOrder) => set((state) => ({
        orders: [newOrder, ...state.orders]
      })),

      toggleOrderStatus: (orderId) => set((state) => ({
        orders: state.orders.map(o => {
          if (o.id !== orderId) return o;
          const nextStatus = (o.overallStatus === 'DONE' || o.overallStatus === 'READY_TO_SHIP') ? 'PENDING' : 'DONE';
          return {
            ...o,
            overallStatus: nextStatus,
            imitationStatus: o.imitationStatus !== 'NOT_APPLICABLE' ? nextStatus : 'NOT_APPLICABLE',
            cosmeticsStatus: o.cosmeticsStatus !== 'NOT_APPLICABLE' ? nextStatus : 'NOT_APPLICABLE',
            hairStatus: o.hairStatus !== 'NOT_APPLICABLE' ? nextStatus : 'NOT_APPLICABLE'
          };
        })
      })),

      updateOrderNotes: (orderId, notes) => set((state) => ({
        orders: state.orders.map(o => o.id === orderId ? { ...o, notes } : o)
      })),

      addCustomer: (customer) => set((state) => ({ customers: [...state.customers, customer] })),

      updateCustomer: (customerCode, data) => set((state) => ({
        customers: state.customers.map(c => c.customerCode === customerCode ? { ...c, ...data } : c)
      })),

      deleteCustomer: (customerCode) => set((state) => ({
        customers: state.customers.filter(c => c.customerCode !== customerCode)
      })),
      
      updateOrderStatus: (orderId, department, status) => set((state) => {
        const newOrders = state.orders.map(order => {
          if (order.id !== orderId) return order;
          const updated = { ...order };
          if (department === 'imitation') updated.imitationStatus = status;
          if (department === 'cosmetics') updated.cosmeticsStatus = status;
          if (department === 'hair') updated.hairStatus = status;
          
          const statuses = [updated.imitationStatus, updated.cosmeticsStatus, updated.hairStatus].filter(s => s !== 'NOT_APPLICABLE');
          if (statuses.every(s => s === 'DONE')) {
            updated.overallStatus = 'DONE';
          } else if (statuses.some(s => s === 'DONE')) {
            updated.overallStatus = 'PARTIALLY_PACKED';
          } else {
            updated.overallStatus = 'PENDING';
          }
          return updated;
        });
        return { orders: newOrders };
      }),

      updateOverallOrderStatus: (orderId, status) => set((state) => ({
        orders: state.orders.map(o => o.id === orderId ? { ...o, overallStatus: status } : o)
      })),

      packAllDepartments: (orderId) => set((state) => ({
        orders: state.orders.map(order => {
          if (order.id !== orderId) return order;
          return {
            ...order,
            imitationStatus: order.imitationStatus !== 'NOT_APPLICABLE' ? 'DONE' : 'NOT_APPLICABLE',
            cosmeticsStatus: order.cosmeticsStatus !== 'NOT_APPLICABLE' ? 'DONE' : 'NOT_APPLICABLE',
            hairStatus: order.hairStatus !== 'NOT_APPLICABLE' ? 'DONE' : 'NOT_APPLICABLE',
            overallStatus: 'DONE'
          };
        })
      })),

      deleteOrder: (orderId) => set((state) => ({
        orders: state.orders.filter(o => o.id !== orderId)
      })),

      addPhoto: (photo) => set((state) => ({ photos: [...state.photos, photo] })),

      addMultiplePhotos: (newPhotos) => set((state) => ({
        photos: [...state.photos, ...newPhotos]
      })),

      reorderPhotos: (orderedPhotos) => set({ photos: orderedPhotos }),

      addSubCategory: (subCat) => set((state) => {
        if (state.subCategories.some(s => s.id === subCat.id)) return state;
        return { subCategories: [...state.subCategories, subCat] };
      }),
      addCategory: (category) => set((state) => ({
        categories: [...state.categories, category]
      })),
      updateCategory: (categoryId, data) => set((state) => ({
        categories: state.categories.map(c => c.id === categoryId ? { ...c, ...data } : c)
      })),
      deleteCategory: (categoryId) => set((state) => ({
        categories: state.categories.filter(c => c.id !== categoryId)
      })),
      updateSubCategory: (subCategoryId, data) => set((state) => ({
        subCategories: state.subCategories.map(s => s.id === subCategoryId ? { ...s, ...data } : s)
      })),
      deleteSubCategory: (subCategoryId) => set((state) => ({
        subCategories: state.subCategories.filter(s => s.id !== subCategoryId)
      })),

      updatePhoto: (photoId, data) => set((state) => ({
        photos: state.photos.map(p => p.id === photoId ? { ...p, ...data } : p)
      })),

      deletePhoto: (photoId) => set((state) => ({
        photos: state.photos.filter(p => p.id !== photoId)
      })),

      batchSetStock: (photoId, available) => set((state) => ({
        photos: state.photos.map(p => {
          if (p.id !== photoId) return p;
          return {
            ...p,
            aAvailable: available,
            bAvailable: available,
            cAvailable: available,
            dAvailable: available
          };
        })
      })),

      addShowroomVideo: (video) => set((state) => ({
        showroomVideos: [...(state.showroomVideos || []), video]
      })),

      addMultipleShowroomVideos: (newVideos) => set((state) => ({
        showroomVideos: [...(state.showroomVideos || []), ...newVideos]
      })),

      deleteShowroomVideo: (videoId) => set((state) => ({
        showroomVideos: (state.showroomVideos || []).filter(v => v.id !== videoId)
      })),

      reorderShowroomVideos: (reordered) => set({
        showroomVideos: reordered
      }),

      resetToDefaults: () => set({
        categories: defaultCategories,
        subCategories: defaultSubCategories,
        photos: defaultPhotos,
        showroomVideos: defaultShowroomVideos,
        orders: defaultOrders,
        activeCategoryId: MainCategory.IMITATION,
        activeSubCategoryId: 'sub-earrings',
        activePhotoId: 'p-er-101'
      })
    }),
    {
      name: 'shivam-wholesale-pc-v7',
      version: 7,
    }
  )
);

