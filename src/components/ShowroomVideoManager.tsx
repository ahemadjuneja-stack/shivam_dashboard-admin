import React, { useRef, useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { MainCategory, ShowroomVideo } from '../types';
import { Upload, Trash2, Check, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';

interface ShowroomVideoManagerProps {
  onClose: () => void;
}

export const ShowroomVideoManager: React.FC<ShowroomVideoManagerProps> = ({ onClose }) => {
  const { categories, showroomVideos, addMultipleShowroomVideos, deleteShowroomVideo } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(MainCategory.COSMETICS);
  const [currentVideoIdx, setCurrentVideoIdx] = useState(0);

  const activeCategoryVideos = showroomVideos.filter(v => v.categoryId === selectedCategoryId);

  // Reset index when category changes
  useEffect(() => {
    setCurrentVideoIdx(0);
  }, [selectedCategoryId]);

  // Ensure index is within bounds if videos are deleted
  useEffect(() => {
    if (activeCategoryVideos.length > 0 && currentVideoIdx >= activeCategoryVideos.length) {
      setCurrentVideoIdx(Math.max(0, activeCategoryVideos.length - 1));
    }
  }, [activeCategoryVideos.length, currentVideoIdx]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newVideos: ShowroomVideo[] = [];
    const selectedCat = categories.find(c => c.id === selectedCategoryId);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 100 * 1024 * 1024) {
        alert(`File ${file.name} is larger than 100MB.`);
        continue;
      }

      const objectUrl = URL.createObjectURL(file);
      newVideos.push({
        id: `vid-${Date.now()}-${i}`,
        title: file.name,
        videoUri: objectUrl,
        categoryId: selectedCategoryId,
        categoryName: selectedCat ? selectedCat.displayName : 'General',
        fileSizeMb: parseFloat((file.size / (1024 * 1024)).toFixed(2)),
        uploadedAt: Date.now()
      });
    }

    if (newVideos.length > 0) {
      addMultipleShowroomVideos(newVideos);
      showToast(`Successfully uploaded ${newVideos.length} video(s)`);
    }

    e.target.value = '';
  };

  const nextVideo = () => {
    if (activeCategoryVideos.length <= 1) return;
    setCurrentVideoIdx((prev) => (prev + 1) % activeCategoryVideos.length);
  };

  const prevVideo = () => {
    if (activeCategoryVideos.length <= 1) return;
    setCurrentVideoIdx((prev) => (prev - 1 + activeCategoryVideos.length) % activeCategoryVideos.length);
  };

  const handleDelete = () => {
    const videoToDelete = activeCategoryVideos[currentVideoIdx];
    if (videoToDelete) {
      deleteShowroomVideo(videoToDelete.id);
      showToast('Video deleted');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#02050f] flex flex-row p-4 gap-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-black px-4 py-2 rounded-xl font-bold text-xs shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <Check size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* LEFT PANEL: CATEGORIES */}
      <div className="w-[30%] min-w-[280px] max-w-[360px] bg-[#070f23] rounded-xl border border-slate-800 shadow-2xl flex flex-col overflow-hidden">
        
        {/* Title */}
        <div className="py-4 text-center border-b border-slate-800 bg-[#050a17]">
          <h2 className="text-white font-bold text-[15px] tracking-wide">Categories</h2>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          {categories.map(cat => (
            <button
               key={cat.id}
               onClick={() => setSelectedCategoryId(cat.id)}
               className={`group w-full flex flex-col rounded-xl overflow-hidden border-2 transition-all ${
                 selectedCategoryId === cat.id 
                   ? 'border-slate-500 shadow-lg' 
                   : 'border-transparent hover:border-slate-700'
               }`}
            >
              {/* Image */}
              <div className="w-full aspect-[21/9] bg-black relative">
                <img 
                  src={cat.thumbnailUrl} 
                  alt={cat.displayName}
                  className={`w-full h-full object-cover transition-transform duration-500 ${
                    selectedCategoryId === cat.id ? 'scale-105' : 'group-hover:scale-105'
                  }`}
                />
              </div>
              {/* Text footer */}
              <div className="bg-black py-3 text-center border-t border-slate-800">
                <span className={`text-[12px] font-black tracking-widest uppercase transition-colors ${
                  selectedCategoryId === cat.id ? 'text-white' : 'text-slate-400 group-hover:text-white'
                }`}>
                  {cat.displayName}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* RIGHT PANEL: VIDEO */}
      <div className="flex-1 bg-[#0a0a0a] rounded-xl border border-slate-800 shadow-2xl relative overflow-hidden flex items-center justify-center group">
        
        {activeCategoryVideos.length > 0 ? (
          <video
            key={activeCategoryVideos[currentVideoIdx].id}
            src={activeCategoryVideos[currentVideoIdx].videoUri || undefined}
            className="w-full h-full object-contain"
            autoPlay
            loop
            muted
            playsInline
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="text-slate-500 flex flex-col items-center gap-3">
             <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center border border-slate-800">
               <Upload size={24} className="text-slate-600" />
             </div>
             <p className="font-bold text-sm">No videos uploaded for this category</p>
          </div>
        )}

        {/* TOP LEFT BUTTON: Upload Multiple */}
        <div className="absolute top-4 left-4 z-10 flex gap-2">
          <button 
            onClick={() => fileInputRef.current?.click()} 
            className="bg-black/50 hover:bg-black/70 backdrop-blur-md border border-white/20 text-white px-4 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition shadow-lg"
          >
            <Upload size={16} />
            <span>Upload Multiple Videos</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
            accept="video/mp4,video/quicktime,video/webm"
            className="hidden"
          />
        </div>

        {/* TOP RIGHT BUTTON: Back to Dashboard */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 bg-white text-black hover:bg-slate-200 px-4 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition z-10 shadow-lg"
        >
          <ArrowLeft size={16} />
          <span>Back to Dashboard</span>
        </button>

        {/* CONTROLS (Only visible if videos exist) */}
        {activeCategoryVideos.length > 0 && (
          <>
            {/* Arrows */}
            {activeCategoryVideos.length > 1 && (
              <>
                <button 
                  onClick={prevVideo}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 border border-white/20 text-white flex items-center justify-center backdrop-blur-md transition opacity-0 group-hover:opacity-100"
                >
                  <ChevronLeft size={24} />
                </button>
                <button 
                  onClick={nextVideo}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 border border-white/20 text-white flex items-center justify-center backdrop-blur-md transition opacity-0 group-hover:opacity-100"
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}

            {/* Bottom Controls */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between z-10 opacity-0 group-hover:opacity-100 transition-opacity">
              
              {/* Counter */}
              <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/20 text-white font-mono text-xs shadow-lg">
                 {currentVideoIdx + 1} / {activeCategoryVideos.length}
              </div>

              {/* Delete */}
              <button 
                onClick={handleDelete}
                className="bg-red-500/80 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg backdrop-blur-md shadow-lg transition flex items-center gap-2"
              >
                <Trash2 size={16} />
                <span className="text-xs font-bold">Delete</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

