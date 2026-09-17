import { useState } from 'react';
import { useAppStore } from '../store';
import { Store, ExternalLink } from 'lucide-react';

export function ShowroomPreviewTab() {
  const categories = useAppStore(state => state.categories);
  const subCategories = useAppStore(state => state.subCategories);
  const photos = useAppStore(state => state.photos);

  const [selectedCatId, setSelectedCatId] = useState(categories[0]?.id || '');
  const [selectedSubId, setSelectedSubId] = useState(
    subCategories.find(s => s.categoryId === (categories[0]?.id || ''))?.id || ''
  );
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  const filteredSubs = subCategories.filter(s => s.categoryId === selectedCatId);
  const filteredPhotos = photos.filter(p => p.subCategoryId === selectedSubId);
  const activePhoto = filteredPhotos[selectedPhotoIndex] || filteredPhotos[0];

  return (
    <div className="space-y-4">
      
      {/* Top Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div>
          <h3 className="font-black text-white text-base flex items-center gap-2">
            <Store className="text-amber-400" size={18} />
            <span>HDTV 16:9 Showroom Display Simulator</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Preview how wholesale retail buyers view your 16:9 catalog photos & videos on showroom TV / tablets.
          </p>
        </div>

        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs transition shadow active:scale-95"
        >
          <span>Open Full Showroom in New Tab</span>
          <ExternalLink size={13} />
        </a>
      </div>

      {/* Simulator Controls & Display */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        
        {/* Left Side: Department & Subcategory picker */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Select Department:
            </label>
            <div className="space-y-1.5">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCatId(cat.id);
                    const firstSub = subCategories.find(s => s.categoryId === cat.id);
                    if (firstSub) {
                      setSelectedSubId(firstSub.id);
                      setSelectedPhotoIndex(0);
                    }
                  }}
                  className={`w-full p-2.5 rounded-xl text-left text-xs font-bold transition flex items-center justify-between ${
                    selectedCatId === cat.id
                      ? 'bg-amber-500 text-black font-black'
                      : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
                  }`}
                >
                  <span>{cat.displayName}</span>
                  <span className="text-[10px] opacity-70">
                    {subCategories.filter(s => s.categoryId === cat.id).length} sub
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Subcategory:
            </label>
            <div className="space-y-1 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
              {filteredSubs.map(sub => (
                <button
                  key={sub.id}
                  onClick={() => {
                    setSelectedSubId(sub.id);
                    setSelectedPhotoIndex(0);
                  }}
                  className={`w-full p-2 rounded-lg text-left text-xs transition flex items-center justify-between ${
                    selectedSubId === sub.id
                      ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                      : 'bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800/60'
                  }`}
                >
                  <span className="truncate">{sub.name}</span>
                  <span className="text-[10px] font-mono opacity-80">
                    {photos.filter(p => p.subCategoryId === sub.id).length}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: 16:9 Display Preview Stage */}
        <div className="lg:col-span-3 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-4">
          
          {activePhoto ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-amber-400 text-sm bg-black/60 px-2.5 py-1 rounded-lg border border-slate-800">
                    {activePhoto.photoCode}
                  </span>
                  <span className="text-slate-300 font-bold">{activePhoto.subCategoryName}</span>
                </div>
                <span className="text-slate-400 text-xs">
                  Default Batch: <strong className="text-white">{activePhoto.defaultQuantity} pcs</strong>
                </span>
              </div>

              {/* 16:9 Screen Frame */}
              <div className="w-full aspect-video bg-black rounded-2xl overflow-hidden border-2 border-slate-700 shadow-2xl relative flex items-center justify-center">
                <img
                  src={activePhoto.imageUri}
                  alt={activePhoto.photoCode}
                  className="w-full h-full object-contain"
                />

                {/* Overlaid Option Buttons (Customizable: 1, 1KG, A, etc.) */}
                <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/80 backdrop-blur-md p-1.5 rounded-xl border border-white/10">
                  {Array.from({ length: activePhoto.itemCount }).map((_, optIdx) => {
                    const defaultLetters = ['A', 'B', 'C', 'D'];
                    const defaultLetter = defaultLetters[optIdx] || String(optIdx + 1);
                    const label = (activePhoto.customLabels && activePhoto.customLabels[optIdx])
                      ? activePhoto.customLabels[optIdx]
                      : defaultLetter;
                    const isAvail = optIdx === 0 ? activePhoto.aAvailable :
                                    optIdx === 1 ? activePhoto.bAvailable :
                                    optIdx === 2 ? activePhoto.cAvailable :
                                    activePhoto.dAvailable;
                    return (
                      <div
                        key={optIdx}
                        className={`min-w-[32px] h-8 px-2 rounded-lg flex items-center justify-center font-mono font-black text-xs border ${
                          isAvail
                            ? 'bg-amber-500 text-black border-amber-400'
                            : 'bg-rose-500/20 text-rose-400 border-rose-500/30 line-through'
                        }`}
                      >
                        {label}
                      </div>
                    );
                  })}
                </div>

                <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-lg text-xs font-mono font-black text-amber-400 border border-white/10">
                  16:9 MULTI-ITEM PHOTOGRAPHY
                </div>
              </div>

              {/* Carousel Strip for other photos in this subcategory */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {filteredPhotos.map((photo, idx) => (
                  <button
                    key={photo.id}
                    onClick={() => setSelectedPhotoIndex(idx)}
                    className={`flex-shrink-0 w-28 aspect-video rounded-lg overflow-hidden border-2 transition relative ${
                      selectedPhotoIndex === idx
                        ? 'border-amber-400 ring-2 ring-amber-400/30'
                        : 'border-slate-800 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={photo.imageUri} alt={photo.photoCode} className="w-full h-full object-cover" />
                    <span className="absolute bottom-0 inset-x-0 bg-black/80 text-[9px] font-mono font-bold text-amber-300 text-center py-0.5">
                      {photo.photoCode}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-20 text-slate-500">
              No photos found in this subcategory
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
