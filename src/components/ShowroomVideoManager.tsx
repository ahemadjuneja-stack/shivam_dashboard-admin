import React, { useState } from 'react';
import { useAppStore } from '../store';
import { ArrowLeft, ImageIcon, X, Image as ImageIcon2, Edit3, ArrowUp, ArrowDown, GripVertical, Eye, EyeOff, Trash2 } from 'lucide-react';
import { syncSubCategoryToFirebase, syncPhotoToFirebase, syncCategoryToFirebase, toggleProductHideInFirebase, deletePhotoFromFirebase } from '../services/firebaseSync';
import { ProductUploadEditor } from './ProductUploadEditor';
import { CatalogPhoto } from '../types';

interface ShowroomVideoManagerProps {
  onClose: () => void;
}

type ViewState = 'CATEGORIES' | 'SUBCATEGORIES' | 'PRODUCTS';

export const ShowroomVideoManager: React.FC<ShowroomVideoManagerProps> = ({ onClose }) => {
  const { categories, subCategories, photos, setCategories, setSubCategories, setPhotos, updatePhoto, deletePhoto } = useAppStore();
  
  const [viewState, setViewState] = useState<ViewState>('CATEGORIES');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [editingPhoto, setEditingPhoto] = useState<CatalogPhoto | null>(null);

  // Edit / Reorder Mode State
  const [isEditMode, setIsEditMode] = useState(false);

  // Drag and Drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.effectAllowed = 'move';
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDropCategory = (e: React.DragEvent, targetIndex: number, filteredCats: typeof categories) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const list = [...filteredCats];
    const [moved] = list.splice(draggedIndex, 1);
    list.splice(targetIndex, 0, moved);

    const updatedList = list.map((item, i) => ({
      ...item,
      orderIndex: i,
      sortOrder: i
    }));

    const updatedAll = categories.map(c => {
      const found = updatedList.find(uc => uc.id === c.id);
      return found ? found : c;
    });

    setCategories(updatedAll);
    updatedList.forEach(c => syncCategoryToFirebase(c));

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDropSubCategory = (e: React.DragEvent, targetIndex: number, catSubs: typeof subCategories) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const list = [...catSubs];
    const [moved] = list.splice(draggedIndex, 1);
    list.splice(targetIndex, 0, moved);

    const updatedList = list.map((item, i) => ({
      ...item,
      orderIndex: i,
      sortOrder: i
    }));

    const updatedAll = subCategories.map(s => {
      const found = updatedList.find(us => us.id === s.id);
      return found ? found : s;
    });

    setSubCategories(updatedAll);
    updatedList.forEach(s => syncSubCategoryToFirebase(s));

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDropProduct = (e: React.DragEvent, targetIndex: number, subPhotos: CatalogPhoto[]) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const list = [...subPhotos];
    const [moved] = list.splice(draggedIndex, 1);
    list.splice(targetIndex, 0, moved);

    const updatedList = list.map((item, i) => ({
      ...item,
      orderIndex: i,
      sortOrder: i
    }));

    const updatedAll = photos.map(p => {
      const found = updatedList.find(up => up.id === p.id);
      return found ? found : p;
    });

    setPhotos(updatedAll);
    updatedList.forEach(p => syncPhotoToFirebase(p));

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleToggleEditMode = () => {
    if (isEditMode) {
      // Save sequence batch on Done
      if (viewState === 'CATEGORIES') {
        const activeCats = [...categories].map((c, idx) => ({
          ...c,
          orderIndex: c.orderIndex !== undefined ? c.orderIndex : idx
        }));
        activeCats.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
        activeCats.forEach((c, i) => {
          syncCategoryToFirebase({ ...c, orderIndex: i, sortOrder: i });
        });
      } else if (viewState === 'SUBCATEGORIES' && selectedCategoryId) {
        const catSubs = subCategories.filter(s => s.categoryId === selectedCategoryId).map((s, idx) => ({
          ...s,
          orderIndex: s.orderIndex !== undefined ? s.orderIndex : idx
        }));
        catSubs.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
        catSubs.forEach((s, i) => {
          syncSubCategoryToFirebase({ ...s, orderIndex: i, sortOrder: i });
        });
      } else if (viewState === 'PRODUCTS' && selectedSubId) {
        const subPhotos = photos.filter(p => p.subCategoryId === selectedSubId).map((p, idx) => ({
          ...p,
          orderIndex: p.orderIndex !== undefined ? p.orderIndex : idx
        }));
        subPhotos.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
        subPhotos.forEach((p, i) => {
          syncPhotoToFirebase({ ...p, orderIndex: i, sortOrder: i });
        });
      }
    }
    setIsEditMode(!isEditMode);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Handlers for moving up/down in list
  const handleMoveCategory = (index: number, direction: 'UP' | 'DOWN') => {
    const activeCats = categories.map((c, idx) => ({ ...c, orderIndex: c.orderIndex !== undefined ? c.orderIndex : idx }));
    activeCats.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

    const targetIdx = direction === 'UP' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= activeCats.length) return;

    const temp = activeCats[index].orderIndex;
    activeCats[index].orderIndex = activeCats[targetIdx].orderIndex;
    activeCats[targetIdx].orderIndex = temp;

    if (activeCats[index].orderIndex === activeCats[targetIdx].orderIndex) {
      if (direction === 'UP') {
        activeCats[index].orderIndex = (activeCats[targetIdx].orderIndex ?? 0) - 1;
      } else {
        activeCats[index].orderIndex = (activeCats[targetIdx].orderIndex ?? 0) + 1;
      }
    }

    activeCats.forEach(c => syncCategoryToFirebase(c));
    setCategories([...activeCats]);
  };

  const handleMoveSubCategory = (subId: string, direction: 'UP' | 'DOWN') => {
    const catSubs = subCategories.filter(s => s.categoryId === selectedCategoryId);
    catSubs.forEach((s, idx) => { if (s.orderIndex === undefined) s.orderIndex = idx; });
    catSubs.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

    const index = catSubs.findIndex(s => s.id === subId);
    const targetIdx = direction === 'UP' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= catSubs.length) return;

    const temp = catSubs[index].orderIndex;
    catSubs[index].orderIndex = catSubs[targetIdx].orderIndex;
    catSubs[targetIdx].orderIndex = temp;

    if (catSubs[index].orderIndex === catSubs[targetIdx].orderIndex) {
      if (direction === 'UP') {
        catSubs[index].orderIndex = (catSubs[targetIdx].orderIndex ?? 0) - 1;
      } else {
        catSubs[index].orderIndex = (catSubs[targetIdx].orderIndex ?? 0) + 1;
      }
    }

    catSubs.forEach(s => syncSubCategoryToFirebase(s));
    const updatedAllSubs = subCategories.map(s => {
      const found = catSubs.find(cs => cs.id === s.id);
      return found ? { ...s, orderIndex: found.orderIndex } : s;
    });
    setSubCategories(updatedAllSubs);
  };

  const handleMoveProduct = (photoId: string, direction: 'UP' | 'DOWN') => {
    const subPhotos = photos.filter(p => p.subCategoryId === selectedSubId);
    subPhotos.forEach((p, idx) => { if (p.orderIndex === undefined) p.orderIndex = idx; });
    subPhotos.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

    const index = subPhotos.findIndex(p => p.id === photoId);
    const targetIdx = direction === 'UP' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= subPhotos.length) return;

    const temp = subPhotos[index].orderIndex;
    subPhotos[index].orderIndex = subPhotos[targetIdx].orderIndex;
    subPhotos[targetIdx].orderIndex = temp;

    if (subPhotos[index].orderIndex === subPhotos[targetIdx].orderIndex) {
      if (direction === 'UP') {
        subPhotos[index].orderIndex = (subPhotos[targetIdx].orderIndex ?? 0) - 1;
      } else {
        subPhotos[index].orderIndex = (subPhotos[targetIdx].orderIndex ?? 0) + 1;
      }
    }

    subPhotos.forEach(p => syncPhotoToFirebase(p));
    const updatedAllPhotos = photos.map(p => {
      const found = subPhotos.find(sp => sp.id === p.id);
      return found ? { ...p, orderIndex: found.orderIndex } : p;
    });
    setPhotos(updatedAllPhotos);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#02050f] flex flex-col p-4 md:p-8">
      {/* HEADER GLOBALS */}
      {viewState === 'CATEGORIES' && (
        <div className="flex items-center justify-between mb-6 shrink-0">
          <div className="flex items-center gap-4">
             <h1 className="text-2xl font-black tracking-wide text-white flex items-center gap-3">
                <ImageIcon2 className="text-emerald-500" />
                Catalog Gallery
             </h1>
             <button
               onClick={handleToggleEditMode}
               className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition shadow-lg ${
                 isEditMode ? 'bg-emerald-500 text-black shadow-emerald-500/30' : 'bg-slate-800 text-white hover:bg-slate-700'
               }`}
             >
               <Edit3 size={16} />
               <span>{isEditMode ? 'Done Reordering' : 'Edit Sequence'}</span>
             </button>
          </div>
          <button 
            onClick={onClose} 
            className="bg-white text-black hover:bg-slate-200 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition shadow-lg"
          >
            <ArrowLeft size={16} />
            <span>Back to Dashboard</span>
          </button>
        </div>
      )}

      {/* VIEW: CATEGORIES */}
      {viewState === 'CATEGORIES' && (
        <div className="flex-1 overflow-y-auto custom-scrollbar">
           {(() => {
              const activeCategories = [...categories].map((c, idx) => ({ ...c, orderIndex: c.orderIndex !== undefined ? c.orderIndex : idx }));
              activeCategories.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

              const filteredCats = activeCategories.filter(cat => {
                 const catSubs = subCategories.filter(s => s.categoryId === cat.id);
                 return catSubs.some(s => photos.some(p => p.subCategoryId === s.id)) || photos.some(p => p.categoryId === cat.id);
              });

              if (filteredCats.length === 0) {
                 return (
                    <div className="text-slate-500 text-center py-20 bg-slate-900/50 rounded-2xl border border-slate-800 border-dashed">
                       No active categories with products found.
                    </div>
                 );
              }

              return (
                 <div className="standard-catalog-grid">
                    {filteredCats.map((cat, idx) => {
                       const catSubs = subCategories.filter(s => s.categoryId === cat.id && photos.some(p => p.subCategoryId === s.id));
                       return (
                          <div
                             key={cat.id}
                             draggable={isEditMode}
                             onDragStart={(e) => isEditMode && handleDragStart(e, idx)}
                             onDragOver={(e) => isEditMode && handleDragOver(e, idx)}
                             onDragEnd={handleDragEnd}
                             onDrop={(e) => isEditMode && handleDropCategory(e, idx, filteredCats)}
                             className={`group bg-[#070f23] rounded-2xl overflow-hidden border transition-all text-left flex flex-col h-full relative ${
                               isEditMode
                                 ? 'border-2 border-dashed border-emerald-500/80 shadow-xl shadow-emerald-500/10 cursor-grab active:cursor-grabbing'
                                 : 'border-slate-800 hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/20'
                             } ${draggedIndex === idx ? 'opacity-40 scale-95' : ''} ${
                               dragOverIndex === idx && draggedIndex !== idx ? 'border-amber-400 bg-amber-500/20 scale-[1.02]' : ''
                             }`}
                          >
                             {isEditMode && (
                               <div className="absolute top-2 left-2 z-20 flex items-center gap-1.5 bg-emerald-500 text-black px-2 py-1 rounded-xl font-black text-[10px] tracking-wider uppercase shadow-xl border border-emerald-300 pointer-events-none">
                                 <GripVertical size={14} className="shrink-0" />
                                 <span>DRAG</span>
                               </div>
                             )}
                             {isEditMode && (
                               <div className="absolute top-2 right-2 z-20 flex items-center gap-1 bg-black/90 backdrop-blur-md p-1 rounded-xl border border-white/10 shadow-xl">
                                 <button
                                   type="button"
                                   onClick={(e) => { e.stopPropagation(); handleMoveCategory(idx, 'UP'); }}
                                   disabled={idx === 0}
                                   className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-emerald-500 hover:text-black text-white flex items-center justify-center disabled:opacity-30 transition"
                                   title="Move Up"
                                 >
                                   <ArrowUp size={14} />
                                 </button>
                                 <button
                                   type="button"
                                   onClick={(e) => { e.stopPropagation(); handleMoveCategory(idx, 'DOWN'); }}
                                   disabled={idx === filteredCats.length - 1}
                                   className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-emerald-500 hover:text-black text-white flex items-center justify-center disabled:opacity-30 transition"
                                   title="Move Down"
                                 >
                                   <ArrowDown size={14} />
                                 </button>
                               </div>
                             )}

                             <button
                               onClick={() => {
                                 if (!isEditMode) {
                                   setSelectedCategoryId(cat.id);
                                   setViewState('SUBCATEGORIES');
                                   setIsEditMode(false);
                                 }
                               }}
                               className="flex flex-col flex-1 text-left w-full"
                             >
                                <div className="standard-thumbnail-container">
                                   <img 
                                      src={cat.thumbnailUrl} 
                                      alt={cat.displayName} 
                                      className="standard-thumbnail-img group-hover:scale-105 transition-transform duration-500"
                                   />
                                </div>
                                <div className="p-4 flex flex-col items-center flex-1 justify-center">
                                   <span className="font-black text-sm uppercase tracking-wider text-white text-center mb-1">
                                      {cat.displayName}
                                   </span>
                                   <span className="text-[10px] text-slate-400 font-semibold bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800">
                                      {catSubs.length} Subcategories {isEditMode && '(Reorder Active)'}
                                   </span>
                                </div>
                             </button>
                          </div>
                       );
                    })}
                 </div>
              );
           })()}
        </div>
      )}

      {/* VIEW: SUBCATEGORIES */}
      {viewState === 'SUBCATEGORIES' && selectedCategoryId && (
        <div className="flex-1 flex flex-col bg-[#070f23] rounded-2xl border border-slate-800 shadow-2xl overflow-hidden relative">
           
           {/* Sub Header */}
           <div className="h-16 px-6 bg-[#050a17] border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                 <button 
                   onClick={() => {
                      setViewState('CATEGORIES');
                      setSelectedCategoryId(null);
                      setIsEditMode(false);
                   }}
                   className="w-8 h-8 rounded-full bg-slate-800 hover:bg-emerald-500 hover:text-black text-white flex items-center justify-center transition"
                 >
                   <ArrowLeft size={16} />
                 </button>
                 <h2 className="text-lg font-black text-white tracking-widest uppercase">
                    {categories.find(c => c.id === selectedCategoryId)?.displayName}
                 </h2>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleToggleEditMode}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition shadow-lg ${
                    isEditMode ? 'bg-emerald-500 text-black shadow-emerald-500/30' : 'bg-slate-800 text-white hover:bg-slate-700'
                  }`}
                >
                  <Edit3 size={14} />
                  <span>{isEditMode ? 'Done' : 'Edit Sequence'}</span>
                </button>
                <button onClick={onClose} className="p-2 text-slate-400 hover:text-white transition">
                   <X size={20} />
                </button>
              </div>
           </div>

           <div className="flex-1 overflow-y-auto p-6 space-y-10 custom-scrollbar">
              {/* SUBCATEGORIES GRID */}
              <div>
                 {(() => {
                    const catSubs = subCategories.filter(s => s.categoryId === selectedCategoryId && photos.some(p => p.subCategoryId === s.id));
                    catSubs.forEach((s, idx) => { if (s.orderIndex === undefined) s.orderIndex = idx; });
                    catSubs.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

                    if (catSubs.length === 0) {
                       return <div className="text-slate-500 text-center py-10 bg-slate-900/50 rounded-2xl border border-slate-800 border-dashed">No active subcategories with products found.</div>;
                    }
                    return (
                       <div className="standard-catalog-grid">
                          {catSubs.map((sub, idx) => {
                             const subPhotos = photos.filter(p => p.subCategoryId === sub.id);
                             return (
                                <div
                                   key={sub.id}
                                   draggable={isEditMode}
                                   onDragStart={(e) => isEditMode && handleDragStart(e, idx)}
                                   onDragOver={(e) => isEditMode && handleDragOver(e, idx)}
                                   onDragEnd={handleDragEnd}
                                   onDrop={(e) => isEditMode && handleDropSubCategory(e, idx, catSubs)}
                                   className={`group bg-[#0b1329] rounded-2xl overflow-hidden border transition-all text-left flex flex-col h-full relative ${
                                     isEditMode
                                       ? 'border-2 border-dashed border-emerald-500/80 shadow-xl shadow-emerald-500/10 cursor-grab active:cursor-grabbing'
                                       : 'border-slate-800 hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/20'
                                   } ${draggedIndex === idx ? 'opacity-40 scale-95' : ''} ${
                                     dragOverIndex === idx && draggedIndex !== idx ? 'border-amber-400 bg-amber-500/20 scale-[1.02]' : ''
                                   }`}
                                >
                                   {isEditMode && (
                                     <div className="absolute top-2 left-2 z-20 flex items-center gap-1.5 bg-emerald-500 text-black px-2 py-1 rounded-xl font-black text-[10px] tracking-wider uppercase shadow-xl border border-emerald-300 pointer-events-none">
                                       <GripVertical size={14} className="shrink-0" />
                                       <span>DRAG</span>
                                     </div>
                                   )}
                                   {isEditMode && (
                                     <div className="absolute top-2 right-2 z-20 flex items-center gap-1 bg-black/90 backdrop-blur-md p-1 rounded-xl border border-white/10 shadow-xl">
                                       <button
                                         type="button"
                                         onClick={(e) => { e.stopPropagation(); handleMoveSubCategory(sub.id, 'UP'); }}
                                         disabled={idx === 0}
                                         className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-emerald-500 hover:text-black text-white flex items-center justify-center disabled:opacity-30 transition"
                                         title="Move Up"
                                       >
                                         <ArrowUp size={12} />
                                       </button>
                                       <button
                                         type="button"
                                         onClick={(e) => { e.stopPropagation(); handleMoveSubCategory(sub.id, 'DOWN'); }}
                                         disabled={idx === catSubs.length - 1}
                                         className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-emerald-500 hover:text-black text-white flex items-center justify-center disabled:opacity-30 transition"
                                         title="Move Down"
                                       >
                                         <ArrowDown size={12} />
                                       </button>
                                     </div>
                                   )}

                                   <button
                                      onClick={() => {
                                         if (!isEditMode) {
                                           setSelectedSubId(sub.id);
                                           setViewState('PRODUCTS');
                                           setIsEditMode(false);
                                         }
                                      }}
                                      className="flex flex-col flex-1 text-left w-full"
                                   >
                                      <div className="w-full aspect-video bg-slate-900 relative">
                                         <img src={sub.thumbnailUrl} alt={sub.name} className="standard-thumbnail-img group-hover:scale-105 transition-transform duration-500" />
                                         <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-sm px-2 py-1 rounded-lg text-[10px] font-bold text-white border border-white/10 flex items-center gap-1">
                                            <ImageIcon size={10} className="text-emerald-400" />
                                            {subPhotos.length}
                                         </div>
                                      </div>
                                      <div className="p-2.5 text-center bg-[#070f23] flex-1 flex items-center justify-center">
                                         <span className="font-black text-[11px] md:text-xs uppercase tracking-widest text-white leading-tight">
                                            {sub.name}
                                         </span>
                                      </div>
                                   </button>
                                </div>
                             );
                          })}
                       </div>
                    );
                 })()}
              </div>
           </div>
        </div>
      )}

      {/* VIEW: PRODUCTS */}
      {viewState === 'PRODUCTS' && selectedSubId && (
        <div className="flex-1 flex flex-col bg-[#070f23] rounded-2xl border border-slate-800 shadow-2xl overflow-hidden relative">
           
           {/* Sub Header */}
           <div className="h-16 px-6 bg-[#050a17] border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                 <button 
                   onClick={() => {
                      setViewState('SUBCATEGORIES');
                      setSelectedSubId(null);
                      setIsEditMode(false);
                   }}
                   className="w-8 h-8 rounded-full bg-slate-800 hover:bg-emerald-500 hover:text-black text-white flex items-center justify-center transition"
                 >
                   <ArrowLeft size={16} />
                 </button>
                 <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">
                       {categories.find(c => c.id === selectedCategoryId)?.displayName}
                    </span>
                    <h2 className="text-lg font-black text-emerald-400 tracking-widest uppercase leading-none">
                       {subCategories.find(s => s.id === selectedSubId)?.name}
                    </h2>
                 </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleToggleEditMode}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition shadow-lg ${
                    isEditMode ? 'bg-emerald-500 text-black shadow-emerald-500/30' : 'bg-slate-800 text-white hover:bg-slate-700'
                  }`}
                >
                  <Edit3 size={14} />
                  <span>{isEditMode ? 'Done' : 'Edit Sequence'}</span>
                </button>
                <button onClick={onClose} className="p-2 text-slate-400 hover:text-white transition">
                   <X size={20} />
                </button>
              </div>
           </div>

           <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-[#02050f]">
              {(() => {
                 const subPhotos = photos.filter(p => p.subCategoryId === selectedSubId);
                 subPhotos.forEach((p, idx) => { if (p.orderIndex === undefined) p.orderIndex = idx; });
                 subPhotos.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

                 if (subPhotos.length === 0) {
                    return <div className="text-slate-500 text-center py-20 bg-slate-900/30 rounded-2xl border border-slate-800 border-dashed">No products uploaded in this subcategory.</div>;
                 }
                 return (
                    <div className="standard-catalog-grid">
                       {subPhotos.map((photo, idx) => (
                          <div
                              key={photo.id}
                              draggable={isEditMode}
                              onDragStart={(e) => isEditMode && handleDragStart(e, idx)}
                              onDragOver={(e) => isEditMode && handleDragOver(e, idx)}
                              onDragEnd={handleDragEnd}
                              onDrop={(e) => isEditMode && handleDropProduct(e, idx, subPhotos)}
                              onClick={() => { if (!isEditMode) setEditingPhoto(photo); }}
                              className={`bg-[#070f23] rounded-2xl overflow-hidden border relative group flex flex-col cursor-pointer transition-all ${
                                isEditMode
                                  ? 'border-2 border-dashed border-emerald-500/80 shadow-xl shadow-emerald-500/10 cursor-grab active:cursor-grabbing'
                                  : 'border-slate-800 hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/20'
                              } ${draggedIndex === idx ? 'opacity-40 scale-95' : ''} ${
                                dragOverIndex === idx && draggedIndex !== idx ? 'border-amber-400 bg-amber-500/20 scale-[1.02]' : ''
                              }`}
                          >
                             {isEditMode && (
                               <div className="absolute top-2 left-2 z-20 flex items-center gap-1.5 bg-emerald-500 text-black px-2 py-1 rounded-xl font-black text-[10px] tracking-wider uppercase shadow-xl border border-emerald-300 pointer-events-none">
                                 <GripVertical size={14} className="shrink-0" />
                                 <span>DRAG</span>
                               </div>
                             )}
                             {isEditMode && (
                               <div className="absolute top-2 right-2 z-20 flex items-center gap-1 bg-black/90 backdrop-blur-md p-1 rounded-xl border border-white/10 shadow-xl">
                                 <button
                                   type="button"
                                   onClick={(e) => { e.stopPropagation(); handleMoveProduct(photo.id, 'UP'); }}
                                   disabled={idx === 0}
                                   className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-emerald-500 hover:text-black text-white flex items-center justify-center disabled:opacity-30 transition"
                                   title="Move Up"
                                 >
                                   <ArrowUp size={12} />
                                 </button>
                                 <button
                                   type="button"
                                   onClick={(e) => { e.stopPropagation(); handleMoveProduct(photo.id, 'DOWN'); }}
                                   disabled={idx === subPhotos.length - 1}
                                   className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-emerald-500 hover:text-black text-white flex items-center justify-center disabled:opacity-30 transition"
                                   title="Move Down"
                                 >
                                   <ArrowDown size={12} />
                                 </button>
                               </div>
                             )}

                             <div className="standard-thumbnail-container relative">
                                <img src={photo.imageUri} alt={photo.photoCode} className={`standard-thumbnail-img group-hover:scale-105 transition-transform duration-500 ${photo.isHidden ? 'filter blur-sm opacity-50 grayscale' : ''}`} />
                                
                                {/* Action Buttons Overlay: Hide/Unhide & Delete */}
                                <div className="absolute top-2 right-2 z-20 flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition">
                                   <button
                                      type="button"
                                      onClick={(e) => {
                                         e.stopPropagation();
                                         const newHide = !photo.isHidden;
                                         updatePhoto(photo.id, { isHidden: newHide, isVisible: !newHide, status: newHide ? 'hidden' : 'active' });
                                         toggleProductHideInFirebase(photo.id, newHide);
                                      }}
                                      className={`p-1.5 rounded-lg text-white backdrop-blur-md shadow-lg border transition ${
                                         photo.isHidden
                                            ? 'bg-amber-500/90 border-amber-300 hover:bg-amber-400'
                                            : 'bg-black/80 border-slate-700 hover:bg-slate-800'
                                      }`}
                                      title={photo.isHidden ? 'Show Product in APK' : 'Hide Product in APK'}
                                   >
                                      {photo.isHidden ? <Eye size={14} className="text-black font-bold" /> : <EyeOff size={14} className="text-slate-300" />}
                                   </button>
                                   <button
                                      type="button"
                                      onClick={(e) => {
                                         e.stopPropagation();
                                         if (window.confirm(`Delete product [${photo.photoCode}]?`)) {
                                            deletePhoto(photo.id);
                                            deletePhotoFromFirebase(photo.id);
                                         }
                                      }}
                                      className="p-1.5 rounded-lg bg-red-600/90 border border-red-400 text-white backdrop-blur-md shadow-lg hover:bg-red-500 transition"
                                      title="Delete Product"
                                   >
                                      <Trash2 size={14} />
                                   </button>
                                </div>

                                {photo.isHidden && (
                                   <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10 pointer-events-none">
                                      <span className="bg-red-600 text-white font-black text-[10px] px-2.5 py-1 rounded-xl uppercase tracking-wider shadow-xl border border-red-400">
                                         Hidden (Stock)
                                      </span>
                                   </div>
                                )}
                                {(photo.variants?.length || 0) > 0 && !photo.isHidden && (
                                   <div className="absolute top-2 left-2 bg-emerald-500 text-black text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg border border-emerald-400">
                                      {photo.variants?.length} Opts
                                   </div>
                                )}
                             </div>
                             <div className="p-3 text-center bg-[#070f23] border-t border-slate-800">
                                <span className="text-xs font-mono font-bold text-white tracking-widest">{photo.photoCode}</span>
                             </div>
                          </div>
                       ))}
                    </div>
                 );
              })()}
           </div>
        </div>
      )}

       {/* SPLIT-SCREEN NATIVE PRODUCT EDITOR */}
       {editingPhoto && (
          <ProductUploadEditor
             initialPhoto={editingPhoto}
             onClose={() => setEditingPhoto(null)}
             onSuccess={() => setEditingPhoto(null)}
          />
       )}
    </div>
  );
};
