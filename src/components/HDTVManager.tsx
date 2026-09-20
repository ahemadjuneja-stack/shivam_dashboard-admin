import React, { useRef, useState } from 'react';
import { useAppStore } from '../store';
import { ShowroomVideo } from '../types';
import { Upload, Trash2, Check, ArrowLeft, Tv, Edit2 } from 'lucide-react';
import { saveLocalVideo, deleteLocalVideo } from '../services/localDB';
import { useVideoSrc } from '../hooks/useVideoSrc';

const VideoPreview = ({ videoUri }: { videoUri?: string }) => {
  const src = useVideoSrc(videoUri);
  return (
    <video
      src={src || undefined}
      className="w-full h-full object-cover"
      autoPlay
      loop
      muted
      playsInline
    />
  );
};

interface HDTVManagerProps {
  onClose: () => void;
}

export const HDTVManager: React.FC<HDTVManagerProps> = ({ onClose }) => {
  const { showroomVideos, addMultipleShowroomVideos, deleteShowroomVideo, updateShowroomVideo } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form states for new video upload
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [orderQuantity, setOrderQuantity] = useState('0');
  
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      if (files[i].size > 100 * 1024 * 1024) {
        alert(`File ${files[i].name} is larger than 100MB.`);
        continue;
      }
      validFiles.push(files[i]);
    }
    
    if (validFiles.length > 0) {
      setStagedFiles(prev => [...prev, ...validFiles]);
    }
    e.target.value = '';
  };

  const handleSaveUploads = async () => {
    if (stagedFiles.length === 0) return;

    const newVideos: ShowroomVideo[] = [];
    for (let i = 0; i < stagedFiles.length; i++) {
      const file = stagedFiles[i];
      const videoId = `vid-${Date.now()}-${i}`;
      
      await saveLocalVideo(videoId, file);

      newVideos.push({
        id: videoId,
        title: file.name,
        videoUri: `indexeddb://${videoId}`,
        fileSizeMb: parseFloat((file.size / (1024 * 1024)).toFixed(2)),
        uploadedAt: Date.now(),
        orderQuantity: orderQuantity.trim() || '0'
      });
    }

    addMultipleShowroomVideos(newVideos);
    showToast(`Successfully saved ${newVideos.length} video(s)`);
    setStagedFiles([]);
    setOrderQuantity('0');
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this video?')) {
      const video = showroomVideos.find(v => v.id === id);
      if (video && video.videoUri.startsWith('indexeddb://')) {
        const localId = video.videoUri.replace('indexeddb://', '');
        await deleteLocalVideo(localId);
      }
      deleteShowroomVideo(id);
      showToast('Video deleted');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#02050f] flex flex-col p-4 md:p-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-black px-4 py-2 rounded-xl font-bold text-xs shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <Check size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* HEADER */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <h1 className="text-2xl font-black tracking-wide text-white flex items-center gap-3">
           <Tv className="text-amber-500" />
           Video Manager
        </h1>
        <button 
          onClick={onClose} 
          className="bg-white text-black hover:bg-slate-200 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition shadow-lg"
        >
          <ArrowLeft size={16} />
          <span>Back to Dashboard</span>
        </button>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row gap-6">
        
        {/* LEFT/TOP: HORIZONTAL VIDEO LIST (PREVIEW) */}
        <div className="flex-1 bg-[#070f23] rounded-2xl border border-slate-800 p-6 flex flex-col min-h-0">
           <h2 className="text-white font-bold mb-4 flex items-center gap-2">
              <Tv className="text-amber-500" size={18} />
              Uploaded Videos (Showing on APK Home Screen)
           </h2>
           <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
             {showroomVideos.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-800 rounded-xl">
                   <Tv size={48} className="mb-4 text-slate-700" />
                   <p className="font-bold">No videos uploaded yet</p>
                </div>
             ) : (
                <div className="flex flex-col gap-6">
                   {showroomVideos.map((video, idx) => (
                      <div key={video.id} className="bg-[#0b1329] border border-slate-800 p-4 rounded-xl flex flex-col xl:flex-row gap-4">
                         
                         {/* 16:9 PREVIEW */}
                         <div className="w-full xl:w-[400px] shrink-0 aspect-video bg-black rounded-lg overflow-hidden relative border border-slate-800">
                           <VideoPreview videoUri={video.videoUri} />
                           <div className="absolute top-2 left-2 bg-black/80 px-2 py-1 rounded text-[10px] text-white font-mono border border-white/20">
                             Video #{idx + 1}
                           </div>
                         </div>
                         
                         {/* DETAILS & ACTIONS */}
                         <div className="flex-1 flex flex-col justify-between">
                            <div>
                               <h3 className="text-white font-bold mb-1 truncate" title={video.title}>{video.title || 'Untitled Video'}</h3>
                               <p className="text-xs text-slate-400 mb-3 truncate max-w-sm">Size: {video.fileSizeMb || 0} MB</p>
                               
                               <div className="bg-[#050a17] p-3 rounded-lg border border-slate-800 inline-block">
                                  <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Quantity & Ordering</span>
                                  {video.orderQuantity && parseInt(video.orderQuantity) > 0 ? (
                                    <div className="flex items-center gap-2">
                                       <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-1 rounded text-sm">
                                         Quantity: {video.orderQuantity}
                                       </span>
                                       <span className="text-[10px] text-slate-400">Customers can add this directly to cart</span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-500 text-sm font-semibold italic">Quantity 0 (Display only in APK)</span>
                                  )}
                               </div>
                            </div>
                            
                            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-slate-800">
                               <button 
                                 onClick={() => {
                                    const qty = window.prompt("Set Quantity (0 = Display only, 1 or more = Add to cart):", video.orderQuantity || '0');
                                    if (qty !== null && updateShowroomVideo) {
                                       updateShowroomVideo(video.id, { orderQuantity: qty.trim() });
                                       showToast("Quantity updated");
                                    }
                                 }}
                                 className="text-amber-400 hover:text-amber-300 text-sm font-bold flex items-center gap-1.5"
                               >
                                 <Edit2 size={14}/> Edit Quantity
                               </button>
                               <button 
                                 onClick={() => handleDelete(video.id)}
                                 className="text-red-400 hover:text-red-300 text-sm font-bold flex items-center gap-1.5 ml-auto"
                               >
                                 <Trash2 size={14}/> Remove
                               </button>
                            </div>
                         </div>
                      </div>
                   ))}
                </div>
             )}
           </div>
        </div>

        {/* RIGHT/BOTTOM: UPLOAD FORM */}
        <div className="w-full lg:w-[360px] xl:w-[420px] bg-[#070f23] rounded-2xl border border-slate-800 p-6 flex flex-col shrink-0">
           <h2 className="text-white font-bold mb-4 flex items-center gap-2">
              <Upload className="text-amber-500" size={18} />
              Upload Video
           </h2>

           <div className="space-y-5">
              {/* Quantity Option */}
              <div>
                 <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide">
                    Quantity <span className="text-slate-500 normal-case">(0 = Display only, 1+ = Add to Cart)</span>
                 </label>
                 <input 
                   type="number"
                   min="0"
                   value={orderQuantity}
                   onChange={e => setOrderQuantity(e.target.value)}
                   placeholder="0"
                   className="w-full bg-[#0b1329] border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 transition"
                 />
                 <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
                   If quantity is 0, the video will only display on the APK home screen. If quantity is 1 or more, customers can directly add it to their cart.
                 </p>
              </div>

              <div className="bg-[#0b1329] border border-slate-800 p-4 rounded-xl mb-2">
                 <p className="text-xs text-slate-400 text-center leading-relaxed">
                    Upload local video files (MP4, WebM, MOV) to display directly on the APK home screen.
                 </p>
              </div>

              {stagedFiles.length > 0 && (
                <div className="bg-[#050a17] border border-slate-800 rounded-xl p-3 mb-4 max-h-32 overflow-y-auto">
                  <p className="text-xs font-bold text-slate-400 mb-2">Selected Files ({stagedFiles.length}):</p>
                  <ul className="space-y-2">
                    {stagedFiles.map((f, i) => (
                      <li key={i} className="flex items-center justify-between text-xs text-slate-300">
                        <span className="truncate w-40" title={f.name}>{f.name}</span>
                        <button onClick={() => setStagedFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-300">
                          <Trash2 size={12} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-2 flex-col sm:flex-row">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2"
                >
                  <Upload size={18} /> Select Video File
                </button>

                {stagedFiles.length > 0 && (
                  <button 
                    onClick={handleSaveUploads}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-black py-3.5 rounded-xl transition flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                  >
                    <Check size={18} /> Upload & Save
                  </button>
                )}
              </div>
              
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                multiple
                accept="video/mp4,video/quicktime,video/webm"
                className="hidden"
              />
           </div>

        </div>

      </div>
    </div>
  );
};
