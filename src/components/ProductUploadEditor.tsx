import React, { useState, useRef } from 'react';
import { useAppStore } from '../store';
import { CatalogPhoto, MainCategory, SubCategory } from '../types';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Plus,
  ArrowLeftRight,
  Upload,
  Check,
  Sparkles,
  Layers,
  Heart,
  Edit2
} from 'lucide-react';

interface VariantItem {
  letter: string;
  name: string;
  quantity: number;
}

interface StagedPhoto {
  id: string;
  imageUri: string;
  photoCode: string; // e.g. "CH 1"
  categoryId: string;
  categoryName: string; // e.g. "COSMETIC"
  subCategoryId: string;
  subCategoryName: string; // e.g. "H PERFUME"
  isWishlist: boolean;
  variants: VariantItem[];
  mrpText?: string;
}

interface ProductUploadEditorProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export const ProductUploadEditor: React.FC<ProductUploadEditorProps> = ({ onClose, onSuccess }) => {
  const { categories, subCategories, addMultiplePhotos, addSubCategory } = useAppStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean initial state: no sample photo, waiting for user to upload photo
  const [stagedPhotos, setStagedPhotos] = useState<StagedPhoto[]>([]);

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isEditingCode, setIsEditingCode] = useState(false);
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [isEditingSubCategory, setIsEditingSubCategory] = useState(false);
  const [customSubCategoryInput, setCustomSubCategoryInput] = useState('');

  // Position change state ("upar number badal sake jis se hum jis image ko jahan rakhna ho waha rakh sake")
  const [isChangingPosition, setIsChangingPosition] = useState(false);
  const [targetPositionInput, setTargetPositionInput] = useState('1');

  // Multi-upload configuration modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [batchCategory, setBatchCategory] = useState<string>(MainCategory.COSMETICS);
  const [batchSubCategory, setBatchSubCategory] = useState<string>('H PERFUME');
  const [batchCodePrefix, setBatchCodePrefix] = useState<string>('CH');
  const [batchVariantCount, setBatchVariantCount] = useState<number>(2);
  const [batchVariantStyle, setBatchVariantStyle] = useState<'ALPHA' | 'NUMERIC' | 'CUSTOM'>('ALPHA');
  const [batchCustomLabelsInput, setBatchCustomLabelsInput] = useState<string>('1KG, 2KG, 5KG');
  const [editingVariantIndex, setEditingVariantIndex] = useState<number | null>(null);

  // Notification toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const currentPhoto: StagedPhoto | undefined = stagedPhotos[currentIndex];

  // Navigate photos
  const handlePrev = () => {
    if (stagedPhotos.length <= 1) return;
    setCurrentIndex(prev => (prev === 0 ? stagedPhotos.length - 1 : prev - 1));
  };

  const handleNext = () => {
    if (stagedPhotos.length <= 1) return;
    setCurrentIndex(prev => (prev === stagedPhotos.length - 1 ? 0 : prev + 1));
  };

  // Reordering: move current photo to target position (1-based index)
  const handleApplyPositionChange = () => {
    const target = parseInt(targetPositionInput, 10);
    if (isNaN(target) || target < 1 || target > stagedPhotos.length) {
      showToast(`Please enter a valid number between 1 and ${stagedPhotos.length}`);
      setIsChangingPosition(false);
      return;
    }

    const targetIndex = target - 1;
    if (targetIndex === currentIndex) {
      setIsChangingPosition(false);
      return;
    }

    const updated = [...stagedPhotos];
    const [movedItem] = updated.splice(currentIndex, 1);
    updated.splice(targetIndex, 0, movedItem);

    setStagedPhotos(updated);
    setCurrentIndex(targetIndex);
    setIsChangingPosition(false);
    showToast(`Image moved to position ${target} of ${stagedPhotos.length}`);
  };

  // Swap with next photo
  const handleSwapWithNext = () => {
    if (stagedPhotos.length <= 1) return;
    const nextIdx = (currentIndex + 1) % stagedPhotos.length;
    const updated = [...stagedPhotos];
    const temp = updated[currentIndex];
    updated[currentIndex] = updated[nextIdx];
    updated[nextIdx] = temp;
    setStagedPhotos(updated);
    setCurrentIndex(nextIdx);
    showToast(`Swapped with position ${nextIdx + 1}`);
  };

  // Delete current photo
  const handleDeleteCurrentPhoto = () => {
    if (stagedPhotos.length <= 1) {
      showToast('Cannot delete the only photo. Add another photo first.');
      return;
    }
    const updated = stagedPhotos.filter((_, idx) => idx !== currentIndex);
    setStagedPhotos(updated);
    setCurrentIndex(prev => Math.min(prev, updated.length - 1));
    showToast('Photo removed from staging');
  };

  // Variants management
  const handleAddVariant = () => {
    if (!currentPhoto) return;
    const currentVariants = currentPhoto.variants;
    // If previous variant was numeric (e.g. 1, 2)
    const lastVar = currentVariants[currentVariants.length - 1];
    let nextLabel = '';
    if (lastVar && !isNaN(Number(lastVar.letter))) {
      nextLabel = String(Number(lastVar.letter) + 1);
    } else if (lastVar && lastVar.letter.endsWith('KG')) {
      const num = parseInt(lastVar.letter);
      nextLabel = !isNaN(num) ? `${num + 1}KG` : `${currentVariants.length + 1}KG`;
    } else {
      nextLabel = String.fromCharCode(65 + currentVariants.length); // C, D, etc.
    }

    const newVariant: VariantItem = {
      letter: nextLabel,
      name: `Option ${nextLabel}`,
      quantity: 1
    };

    const updated = stagedPhotos.map((p, idx) => {
      if (idx === currentIndex) {
        return { ...p, variants: [...p.variants, newVariant] };
      }
      return p;
    });
    setStagedPhotos(updated);
  };

  const handleRemoveLastVariant = () => {
    if (!currentPhoto || currentPhoto.variants.length <= 1) {
      showToast('At least 1 variant is required.');
      return;
    }

    const updated = stagedPhotos.map((p, idx) => {
      if (idx === currentIndex) {
        return { ...p, variants: p.variants.slice(0, -1) };
      }
      return p;
    });
    setStagedPhotos(updated);
  };

  const handleRemoveVariantByLetter = (letter: string) => {
    if (!currentPhoto || currentPhoto.variants.length <= 1) {
      showToast('At least 1 variant is required.');
      return;
    }

    const updated = stagedPhotos.map((p, idx) => {
      if (idx === currentIndex) {
        const remaining = p.variants.filter(v => v.letter !== letter);
        return { ...p, variants: remaining };
      }
      return p;
    });
    setStagedPhotos(updated);
  };

  // Update specific variant's label/letter (e.g. change 'A' to '1' or '1KG')
  const handleUpdateVariantLetter = (vIndex: number, newLetter: string) => {
    if (!currentPhoto) return;
    const updatedVariants = currentPhoto.variants.map((v, idx) => {
      if (idx === vIndex) {
        return { ...v, letter: newLetter };
      }
      return v;
    });
    updateCurrentPhoto({ variants: updatedVariants });
  };

  // File selection for multiple photos
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    setPendingFiles(fileList);
    setShowUploadModal(true);
    e.target.value = '';
  };

  // Confirming batch upload from modal
  const handleConfirmBatchUpload = async () => {
    if (pendingFiles.length === 0) {
      setShowUploadModal(false);
      return;
    }

    // Determine variant labels based on selected style
    let customLabelsList: string[] = [];
    if (batchVariantStyle === 'NUMERIC') {
      customLabelsList = Array.from({ length: batchVariantCount }, (_, i) => String(i + 1));
    } else if (batchVariantStyle === 'CUSTOM') {
      const splitList = batchCustomLabelsInput.split(',').map(s => s.trim()).filter(Boolean);
      if (splitList.length > 0) {
        customLabelsList = splitList;
      } else {
        customLabelsList = Array.from({ length: batchVariantCount }, (_, i) => String.fromCharCode(65 + i));
      }
    } else {
      // Default ALPHA (A, B, C, D)
      customLabelsList = Array.from({ length: batchVariantCount }, (_, i) => String.fromCharCode(65 + i));
    }

    const newStagedList: StagedPhoto[] = [];

    for (let i = 0; i < pendingFiles.length; i++) {
      const file = pendingFiles[i];
      const dataUrl = await readFileAsDataUrl(file);

      const variants: VariantItem[] = [];
      const effectiveCount = batchVariantStyle === 'CUSTOM' ? customLabelsList.length : batchVariantCount;
      for (let v = 0; v < effectiveCount; v++) {
        const label = customLabelsList[v] || String.fromCharCode(65 + v);
        variants.push({
          letter: label,
          name: `Variant ${label}`,
          quantity: 1
        });
      }

      const seqNum = stagedPhotos.length + i + 1;
      const code = `${batchCodePrefix} ${seqNum}`;

      // Category display name
      const matchedCat = categories.find(c => c.id === batchCategory);
      const catDisplayName = matchedCat ? matchedCat.displayName.toUpperCase() : 'COSMETIC';

      newStagedList.push({
        id: `staged-${Date.now()}-${i}`,
        imageUri: dataUrl,
        photoCode: code,
        categoryId: batchCategory,
        categoryName: catDisplayName,
        subCategoryId: `sub-${batchSubCategory.toLowerCase().replace(/\s+/g, '-')}`,
        subCategoryName: batchSubCategory,
        isWishlist: false,
        variants,
        mrpText: 'MRP : 999/- (100ml)'
      });
    }

    setStagedPhotos(prev => [...prev, ...newStagedList]);
    setCurrentIndex(stagedPhotos.length); // Jump to the newly added first photo
    setShowUploadModal(false);
    setPendingFiles([]);
    showToast(`Added ${newStagedList.length} photos! Adjust position and details as needed.`);
  };

  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    });
  };

  // Update current photo fields
  const updateCurrentPhoto = (data: Partial<StagedPhoto>) => {
    setStagedPhotos(prev =>
      prev.map((p, idx) => (idx === currentIndex ? { ...p, ...data } : p))
    );
  };

  // "→ Create All Products"
  const handleCreateAllProducts = () => {
    if (stagedPhotos.length === 0) {
      showToast('No photos to upload.');
      return;
    }

    const newCatalogPhotos: CatalogPhoto[] = stagedPhotos.map((sp, idx) => {
      // Register custom subcategory if needed
      const subId = sp.subCategoryId || `sub-${sp.subCategoryName.toLowerCase().replace(/\s+/g, '-')}`;
      const existingSub = subCategories.find(s => s.id === subId);
      if (!existingSub) {
        const newSubCat: SubCategory = {
          id: subId,
          categoryId: sp.categoryId,
          name: sp.subCategoryName,
          iconName: 'sparkles',
          thumbnailUrl: sp.imageUri,
          photoCount: 1,
          sortOrder: 99
        };
        addSubCategory(newSubCat);
      }

      return {
        id: `p-custom-${Date.now()}-${idx}`,
        categoryId: sp.categoryId,
        subCategoryId: subId,
        subCategoryName: sp.subCategoryName,
        photoCode: sp.photoCode,
        imageUri: sp.imageUri,
        itemCount: sp.variants.length,
        aAvailable: sp.variants.length >= 1,
        bAvailable: sp.variants.length >= 2,
        cAvailable: sp.variants.length >= 3,
        dAvailable: sp.variants.length >= 4,
        customLabels: sp.variants.map(v => v.letter),
        defaultQuantity: 12,
        sortOrder: idx + 1,
        description: sp.mrpText || ''
      };
    });

    addMultiplePhotos(newCatalogPhotos);
    showToast(`Successfully created and published ${newCatalogPhotos.length} products to Showroom!`);

    if (onSuccess) {
      setTimeout(() => onSuccess(), 1000);
    } else {
      setTimeout(() => onClose(), 1200);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#060c1c] text-white flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden select-none">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-black px-4 py-2 rounded-xl font-bold text-xs shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <Sparkles size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hidden Multiple File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        multiple
        accept="image/*"
        className="hidden"
      />

      {/* Main Layout Card (Exact Screenshot Composition) */}
      <div className="w-full max-w-[1240px] h-[92vh] max-h-[760px] bg-[#070f23] border border-[#142444] rounded-2xl p-3 sm:p-5 flex flex-col md:flex-row gap-4 sm:gap-6 shadow-2xl relative overflow-hidden">
        
        {/* =============================================================== */}
        {/* LEFT / CENTER STAGE: 16:9 IMAGE PREVIEW CARD WITH CONTROLS     */}
        {/* =============================================================== */}
        <div className="flex-1 flex flex-col items-center justify-between min-w-0 h-full">
          
          {/* Main 16:9 Card Wrapper */}
          <div className="w-full flex-1 flex items-center justify-center relative min-h-0">
            {currentPhoto ? (
              <div className="w-full max-w-[780px] aspect-[16/9] bg-[#030712] rounded-xl border border-slate-800/80 relative overflow-hidden shadow-2xl flex items-center justify-center group">
                {/* Top-Left Red Circular Close (X) Button */}
                <button
                  onClick={handleDeleteCurrentPhoto}
                  title="Remove this photo from staging"
                  className="absolute top-3 left-3 z-30 w-7 h-7 rounded-full bg-[#ef4444] hover:bg-red-600 text-white flex items-center justify-center shadow-lg transition active:scale-90"
                >
                  <X size={16} className="stroke-[2.5]" />
                </button>

                {/* Upload Multiple Photos Quick Action Badge */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload multiple photos from your PC"
                  className="absolute top-3 right-3 z-30 bg-[#0c2444]/90 hover:bg-[#123666] border border-slate-700 text-slate-200 hover:text-white px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 backdrop-blur-sm transition"
                >
                  <Upload size={14} className="text-amber-400" />
                  <span>Upload Photos</span>
                </button>

                {/* Left Carousel Arrow (<) */}
                <button
                  onClick={handlePrev}
                  disabled={stagedPhotos.length <= 1}
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center disabled:opacity-20 transition"
                >
                  <ChevronLeft size={20} />
                </button>

                {/* Right Carousel Arrow (>) */}
                <button
                  onClick={handleNext}
                  disabled={stagedPhotos.length <= 1}
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center disabled:opacity-20 transition"
                >
                  <ChevronRight size={20} />
                </button>

                {/* Bottom-Right Swap / Reorder Button (⇄) */}
                <button
                  onClick={handleSwapWithNext}
                  title="Swap order with next photo"
                  className="absolute bottom-3 right-3 z-30 w-8 h-8 rounded-lg bg-black/70 hover:bg-black text-slate-200 hover:text-white flex items-center justify-center backdrop-blur-sm border border-slate-700 transition active:scale-95"
                >
                  <ArrowLeftRight size={16} />
                </button>

                {/* The Clean 16:9 Image Preview */}
                <div className="w-full h-full relative">
                  <img
                    src={currentPhoto.imageUri}
                    alt={currentPhoto.photoCode}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            ) : (
              /* Completely clean upload area with just upload icon and Upload Photo button */
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full max-w-[780px] aspect-[16/9] bg-[#04091a]/80 hover:bg-[#08122c] border-2 border-dashed border-slate-700/80 hover:border-amber-400/80 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-200 group shadow-2xl p-6"
              >
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-105 group-hover:bg-amber-500/20 group-hover:border-amber-400 transition-all duration-200 shadow-xl mb-4">
                  <Upload size={42} className="stroke-[2.2]" />
                </div>
                <div className="text-center space-y-1.5">
                  <span className="text-base sm:text-lg font-black tracking-wide text-white group-hover:text-amber-300 transition">
                    Upload Photo
                  </span>
                  <p className="text-xs text-slate-400 font-medium">
                    Click here to select photo from your PC
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ----------------------------------------------------------- */}
          {/* BOTTOM NUMBER / POSITION DISPLAY                            */}
          {/* ----------------------------------------------------------- */}
          <div className="py-2 flex flex-col items-center justify-center min-h-[52px]">
            {stagedPhotos.length > 0 ? (
              isChangingPosition ? (
                <div className="flex items-center gap-2 bg-[#0c1a36] px-3 py-1 rounded-xl border border-amber-400/50 shadow-xl animate-in zoom-in-95">
                  <span className="text-xs text-slate-300 font-semibold">Move to position:</span>
                  <input
                    type="number"
                    min={1}
                    max={stagedPhotos.length}
                    value={targetPositionInput}
                    onChange={(e) => setTargetPositionInput(e.target.value)}
                    className="w-14 bg-slate-950 border border-slate-700 text-center font-bold text-amber-300 rounded py-0.5 text-sm"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleApplyPositionChange();
                      if (e.key === 'Escape') setIsChangingPosition(false);
                    }}
                  />
                  <span className="text-xs text-slate-400">of {stagedPhotos.length}</span>
                  <button
                    onClick={handleApplyPositionChange}
                    className="px-2.5 py-0.5 bg-amber-500 text-black text-xs font-bold rounded"
                  >
                    OK
                  </button>
                  <button
                    onClick={() => setIsChangingPosition(false)}
                    className="px-2 py-0.5 bg-slate-800 text-slate-300 text-xs rounded"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setTargetPositionInput(String(currentIndex + 1));
                      setIsChangingPosition(true);
                    }}
                    title="Click to change photo sequence number / position"
                    className="group flex items-center gap-2 text-3xl sm:text-4xl font-light tracking-widest text-white hover:text-amber-400 transition"
                  >
                    <span>{currentIndex + 1}/{stagedPhotos.length}</span>
                    <Edit2 size={16} className="opacity-0 group-hover:opacity-100 text-amber-400 transition-opacity" />
                  </button>
                  <span className="text-[11px] text-slate-400 mt-0.5">
                    Click number to change position in catalog order
                  </span>
                </>
              )
            ) : (
              <span className="text-xs text-slate-500 italic">
                No photos selected yet
              </span>
            )}
          </div>
        </div>

        {/* =============================================================== */}
        {/* RIGHT PANEL: PRODUCT INFORMATION (Exact Screenshot Composition) */}
        {/* =============================================================== */}
        <div className="w-full md:w-[280px] lg:w-[310px] flex flex-col justify-between flex-shrink-0 bg-[#060e22] rounded-xl p-3 sm:p-4 border border-slate-800/80">
          
          <div className="space-y-3.5">
            {/* 1. TOP DASHBOARD BUTTON (Dark Teal) */}
            <button
              onClick={onClose}
              className="w-full h-10 bg-[#0c443c] hover:bg-[#11554c] text-white font-bold text-xs sm:text-sm rounded-lg flex items-center justify-center transition shadow-md active:scale-98"
            >
              Dashboard
            </button>

            {/* 2. PRODUCT INFORMATION TITLE */}
            <div className="text-center">
              <h2 className="text-xs font-black tracking-wider text-slate-200 uppercase">
                PRODUCT INFORMATION
              </h2>
            </div>

            {/* 3. PURPLE PILL BUTTONS */}
            <div className="space-y-2">
              
              {/* (A) Item Code Pill: "CH 1" */}
              <div className="relative">
                {isEditingCode ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={currentPhoto?.photoCode || ''}
                      onChange={(e) => updateCurrentPhoto({ photoCode: e.target.value.toUpperCase() })}
                      className="flex-1 bg-[#5b3d99] text-white font-bold text-xs py-2 px-3 rounded-lg border border-purple-300 focus:outline-none"
                      autoFocus
                    />
                    <button
                      onClick={() => setIsEditingCode(false)}
                      className="p-2 bg-emerald-600 rounded-lg text-white"
                    >
                      <Check size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsEditingCode(true)}
                    title="Click to edit item code"
                    className="w-full bg-[#5b3d99] hover:bg-[#6846ae] text-white font-bold text-xs py-2 px-3 rounded-lg text-center transition shadow"
                  >
                    {currentPhoto?.photoCode || 'CH 1'}
                  </button>
                )}
              </div>

              {/* (B) Category Pill: "COSMETIC" */}
              <div className="relative">
                <button
                  onClick={() => setIsEditingCategory(!isEditingCategory)}
                  title="Click to switch category"
                  className="w-full bg-[#5b3d99] hover:bg-[#6846ae] text-white font-bold text-xs py-2 px-3 rounded-lg text-center uppercase tracking-wide transition shadow"
                >
                  {currentPhoto?.categoryName || 'COSMETIC'}
                </button>

                {isEditingCategory && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[#09152a] border border-slate-700 rounded-lg shadow-2xl py-1 z-50 text-xs">
                    <button
                      onClick={() => {
                        updateCurrentPhoto({
                          categoryId: MainCategory.COSMETICS,
                          categoryName: 'COSMETIC'
                        });
                        setIsEditingCategory(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-purple-900/40 text-slate-200"
                    >
                      COSMETICS
                    </button>
                    <button
                      onClick={() => {
                        updateCurrentPhoto({
                          categoryId: MainCategory.IMITATION,
                          categoryName: 'IMITATION JEWELRY'
                        });
                        setIsEditingCategory(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-purple-900/40 text-slate-200"
                    >
                      IMITATION JEWELRY
                    </button>
                    <button
                      onClick={() => {
                        updateCurrentPhoto({
                          categoryId: MainCategory.HAIR_ACCESSORIES,
                          categoryName: 'HAIR ACCESSORIES'
                        });
                        setIsEditingCategory(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-purple-900/40 text-slate-200"
                    >
                      HAIR ACCESSORIES
                    </button>
                  </div>
                )}
              </div>

              {/* (C) Subcategory Pill: "H PERFUME" */}
              <div className="relative">
                <button
                  onClick={() => setIsEditingSubCategory(!isEditingSubCategory)}
                  title="Click to choose or enter subcategory"
                  className="w-full bg-[#5b3d99] hover:bg-[#6846ae] text-white font-bold text-xs py-2 px-3 rounded-lg text-center uppercase tracking-wide transition shadow"
                >
                  {currentPhoto?.subCategoryName || 'H PERFUME'}
                </button>

                {isEditingSubCategory && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[#09152a] border border-slate-700 rounded-lg shadow-2xl p-2 z-50 text-xs space-y-2">
                    <div className="max-h-32 overflow-y-auto space-y-1 custom-scrollbar">
                      {subCategories
                        .filter(s => s.categoryId === currentPhoto?.categoryId)
                        .map(s => (
                          <button
                            key={s.id}
                            onClick={() => {
                              updateCurrentPhoto({
                                subCategoryId: s.id,
                                subCategoryName: s.name.toUpperCase()
                              });
                              setIsEditingSubCategory(false);
                            }}
                            className="w-full text-left px-2 py-1.5 rounded hover:bg-purple-900/40 text-slate-200 text-xs"
                          >
                            {s.name}
                          </button>
                        ))}
                    </div>

                    <div className="border-t border-slate-800 pt-2 flex items-center gap-1">
                      <input
                        type="text"
                        placeholder="Or type new..."
                        value={customSubCategoryInput}
                        onChange={(e) => setCustomSubCategoryInput(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 px-2 py-1 rounded text-xs text-white"
                      />
                      <button
                        onClick={() => {
                          if (customSubCategoryInput.trim()) {
                            updateCurrentPhoto({
                              subCategoryName: customSubCategoryInput.trim().toUpperCase()
                            });
                            setCustomSubCategoryInput('');
                            setIsEditingSubCategory(false);
                          }
                        }}
                        className="px-2 py-1 bg-amber-500 text-black font-bold rounded text-xs"
                      >
                        Set
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* (D) Wishlist Pill: "Add to wishlist" */}
              <button
                onClick={() => updateCurrentPhoto({ isWishlist: !currentPhoto?.isWishlist })}
                className={`w-full font-bold text-xs py-2 px-3 rounded-lg text-center transition shadow flex items-center justify-center gap-2 ${
                  currentPhoto?.isWishlist
                    ? 'bg-rose-600 text-white'
                    : 'bg-[#5b3d99] hover:bg-[#6846ae] text-white'
                }`}
              >
                <Heart size={14} className={currentPhoto?.isWishlist ? 'fill-white' : ''} />
                <span>{currentPhoto?.isWishlist ? 'In wishlist' : 'Add to wishlist'}</span>
              </button>
            </div>

            {/* 4. ADD/REMOVE VARIANTS HEADER */}
            <div className="pt-2 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">
                Add/Remove Variants
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleRemoveLastVariant}
                  title="Remove variant"
                  className="w-6 h-6 rounded bg-[#ef4444] hover:bg-red-600 text-white flex items-center justify-center font-bold text-xs transition"
                >
                  <X size={13} />
                </button>
                <button
                  onClick={handleAddVariant}
                  title="Add variant (C, D...)"
                  className="w-6 h-6 rounded bg-[#16a34a] hover:bg-emerald-600 text-white flex items-center justify-center font-bold text-xs transition"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* 5. VARIANT ROWS WITH GREEN BADGES */}
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-0.5 custom-scrollbar">
              {currentPhoto && currentPhoto.variants.length > 0 ? (
                currentPhoto.variants.map((v, idx) => (
                  <div
                    key={`${v.letter}-${idx}`}
                    className="flex items-center justify-between bg-[#040816] border border-slate-800/80 px-2.5 py-1.5 rounded-lg text-xs gap-2"
                  >
                    {/* Bright Green Square Indicator */}
                    <div className="w-6 h-6 bg-[#00c950] rounded-sm flex-shrink-0" />

                    {/* Variant Label Input / Display (User can type 1, 1KG, A, 500ML, etc.) */}
                    {editingVariantIndex === idx ? (
                      <div className="flex items-center gap-1 flex-1">
                        <input
                          type="text"
                          value={v.letter}
                          onChange={(e) => handleUpdateVariantLetter(idx, e.target.value.toUpperCase())}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') setEditingVariantIndex(null);
                          }}
                          className="w-full bg-[#1e1338] border border-amber-400/80 rounded px-1.5 py-0.5 text-xs font-bold text-amber-300 focus:outline-none"
                          autoFocus
                        />
                        <button
                          onClick={() => setEditingVariantIndex(null)}
                          className="p-1 bg-emerald-600 rounded text-white hover:bg-emerald-500"
                          title="Done"
                        >
                          <Check size={12} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingVariantIndex(idx)}
                        title="Click to rename variant (e.g., 1, 1KG, 500gm, A)"
                        className="group flex items-center gap-1.5 flex-1 text-left px-1 py-0.5 rounded hover:bg-slate-800/60 transition"
                      >
                        <span className="font-extrabold text-white text-sm tracking-wide">
                          {v.letter}
                        </span>
                        <Edit2 size={11} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    )}

                    {/* Minus / Delete Button */}
                    <button
                      onClick={() => handleRemoveVariantByLetter(v.letter)}
                      title="Delete variant"
                      className="text-red-400 hover:text-red-300 font-bold px-1.5 text-sm"
                    >
                      –
                    </button>

                    {/* Quantity / Count: "1" */}
                    <span className="font-mono font-bold text-white text-xs">
                      {v.quantity}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-xs text-slate-500 italic">
                  Upload a photo to configure variants
                </div>
              )}
            </div>
          </div>

          {/* 6. BOTTOM CREATE BUTTON (Exact Screenshot: "→ Create All Products") */}
          <div className="pt-3">
            <button
              onClick={handleCreateAllProducts}
              disabled={stagedPhotos.length === 0}
              className="w-full py-2.5 bg-[#00c853] hover:bg-[#00b047] disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-black text-xs sm:text-sm rounded-lg flex items-center justify-center gap-2 shadow-lg transition active:scale-98"
            >
              <span>→ Create All Products</span>
            </button>
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* MULTI-PHOTO UPLOAD DIALOG: ASK CATEGORY & SUBCATEGORY UPFRONT     */}
      {/* ================================================================= */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1429] border border-slate-700 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="text-amber-400" size={20} />
                <h3 className="font-bold text-white text-sm">
                  Upload {pendingFiles.length} Selected Photos
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setPendingFiles([]);
                }}
                className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Category */}
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  1. Choose Category for these photos:
                </label>
                <select
                  value={batchCategory}
                  onChange={(e) => setBatchCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-semibold focus:outline-none focus:border-amber-400"
                >
                  <option value={MainCategory.COSMETICS}>Cosmetics</option>
                  <option value={MainCategory.IMITATION}>Imitation Jewelry</option>
                  <option value={MainCategory.HAIR_ACCESSORIES}>Hair Accessories</option>
                </select>
              </div>

              {/* Subcategory */}
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  2. Choose or Type Subcategory:
                </label>
                <input
                  type="text"
                  value={batchSubCategory}
                  onChange={(e) => setBatchSubCategory(e.target.value.toUpperCase())}
                  placeholder="e.g. H PERFUME, EARRINGS, LIPSTICK..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-semibold focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Item Code Prefix & Variant Style */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    3. Code Prefix:
                  </label>
                  <input
                    type="text"
                    value={batchCodePrefix}
                    onChange={(e) => setBatchCodePrefix(e.target.value.toUpperCase())}
                    placeholder="e.g. CH, POSH"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    4. Naming Style:
                  </label>
                  <select
                    value={batchVariantStyle}
                    onChange={(e) => setBatchVariantStyle(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white font-bold"
                  >
                    <option value="ALPHA">Letters (A, B, C...)</option>
                    <option value="NUMERIC">Numbers (1, 2, 3...)</option>
                    <option value="CUSTOM">Custom (1KG, 2KG...)</option>
                  </select>
                </div>
              </div>

              {batchVariantStyle === 'CUSTOM' ? (
                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    Custom Variant Names (comma-separated):
                  </label>
                  <input
                    type="text"
                    value={batchCustomLabelsInput}
                    onChange={(e) => setBatchCustomLabelsInput(e.target.value.toUpperCase())}
                    placeholder="e.g. 1KG, 2KG, 5KG or 100ML, 200ML"
                    className="w-full bg-slate-950 border border-amber-400/70 rounded-lg px-3 py-2 text-amber-300 font-bold"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Har photo ke liye yeh variants banenge (jaise 1KG, 2KG).
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    Variants count per photo:
                  </label>
                  <select
                    value={batchVariantCount}
                    onChange={(e) => setBatchVariantCount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold"
                  >
                    <option value={1}>1 Variant ({batchVariantStyle === 'NUMERIC' ? '1' : 'A'})</option>
                    <option value={2}>2 Variants ({batchVariantStyle === 'NUMERIC' ? '1, 2' : 'A, B'})</option>
                    <option value={3}>3 Variants ({batchVariantStyle === 'NUMERIC' ? '1, 2, 3' : 'A, B, C'})</option>
                    <option value={4}>4 Variants ({batchVariantStyle === 'NUMERIC' ? '1, 2, 3, 4' : 'A, B, C, D'})</option>
                  </select>
                </div>
              )}

              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] text-slate-300 space-y-1">
                <p>• Photos will be ordered sequentially.</p>
                <p>• You can adjust position/number (1/N), variants, and code for each photo individually on the staging screen.</p>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setPendingFiles([]);
                }}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBatchUpload}
                className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs transition"
              >
                Import & Stage Photos
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
