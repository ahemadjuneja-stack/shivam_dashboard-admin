export enum MainCategory {
  IMITATION = 'imitation',
  COSMETICS = 'cosmetics',
  HAIR_ACCESSORIES = 'hair_accessories'
}

export interface CategoryItem {
  id: string;
  displayName: string;
  thumbnailUrl: string;
  accentColorHex: string;
  sortOrder: number;
}

export interface SubCategory {
  id: string;
  categoryId: string;
  name: string;
  iconName: string;
  thumbnailUrl: string;
  photoCount: number;
  sortOrder: number;
}

export interface CatalogPhoto {
  id: string;
  categoryId: string;
  subCategoryId: string;
  subCategoryName: string;
  photoCode: string;
  imageUri: string;
  videoUri?: string; // Optional showcase video
  itemCount: number; // 2, 3, or 4
  aAvailable: boolean;
  bAvailable: boolean;
  cAvailable: boolean;
  dAvailable: boolean;
  defaultQuantity: number;
  sortOrder: number;
  description: string;
  customLabels?: string[]; // e.g. ['1', '2'] or ['1KG', '2KG'] or ['A', 'B']
}

export interface Customer {
  customerCode: string;
  shopName: string;
  cityName: string;
  mobileNumber: string;
  contactPerson: string;
  address: string;
}

export interface OrderCartItem {
  photoId: string;
  photoCode: string;
  imageUri: string;
  categoryId: string;
  subCategoryName: string;
  optionLetter: string;
  customLabel?: string; // custom variant name e.g. '1KG'
  quantity: number;
}

export interface WholesaleOrder {
  id: string;
  orderNumber: string;
  customerCode: string;
  shopName: string;
  cityName: string;
  mobileNumber: string;
  items: OrderCartItem[];
  totalItemsCount: number;
  imitationStatus: string; // PENDING, DONE, NOT_APPLICABLE
  cosmeticsStatus: string;
  hairStatus: string;
  overallStatus: string; // PENDING, DONE, RECEIVED, PARTIALLY_PACKED, READY_TO_SHIP, DISPATCHED
  notes: string;
  voiceNoteUrl?: string; // Voice recording URL from mobile application
  createdAt: number;
  source?: 'SALESMAN' | 'CUSTOMER';
  salesmanName?: string; // e.g. 'RAMIZ', 'RIYAZ', 'ZARIF'
  displayTitle?: string;
  dateFormatted?: string; // e.g. '16-09-2026'
}

export interface ShowroomVideo {
  id: string;
  title: string;
  videoUri: string;
  thumbnailUri?: string;
  categoryId?: string; // Target category when clicking video
  categoryName?: string;
  fileSizeMb?: number;
  uploadedAt: number;
}

export interface ChatMessage {
  id: string;
  customerCode: string;
  sender: 'CUSTOMER' | 'ADMIN';
  type: 'TEXT' | 'IMAGE' | 'VOICE';
  content: string; // text content, or URL for image/voice
  timestamp: number;
  isRead: boolean;
}
