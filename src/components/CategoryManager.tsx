import React, { useState, useRef } from 'react';
import { useAppStore } from '../store';
import { Plus, Edit2, Trash2, ArrowLeft, ChevronDown, Check } from 'lucide-react';
import { getTextColorForBackground } from '../utils';

interface CategoryManagerProps {
  onClose: () => void;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({ onClose }) => {
  const { categories, subCategories, addCategory, updateCategory, deleteCategory, addSubCategory, updateSubCategory, deleteSubCategory } = useAppStore();

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(categories[0]?.id || null);
  const selectedCategory = categories.find(c => c.id === selectedCategoryId);
  
  const relevantSubcategories = subCategories.filter(s => s.categoryId === selectedCategoryId);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(relevantSubcategories[0]?.id || null);
  const selectedSubcategory = relevantSubcategories.find(s => s.id === selectedSubcategoryId);

  // Editing state
  const [editingCategory, setEditingCategory] = useState(false);
  const [catNameInput, setCatNameInput] = useState('');
  const [catColorInput, setCatColorInput] = useState('');

  const [editingSub, setEditingSub] = useState(false);
  const [subNameInput, setSubNameInput] = useState('');

  const catImageRef = useRef<HTMLInputElement>(null);
  const subImageRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (selectedCategoryId) {
      const subs = subCategories.filter(s => s.categoryId === selectedCategoryId);
      if (!subs.some(s => s.id === selectedSubcategoryId)) {
        setSelectedSubcategoryId(subs[0]?.id || null);
      }
    }
  }, [selectedCategoryId, subCategories]);

  // Handlers
  const handleCreateCategory = () => {
    const id = `cat-${Date.now()}`;
    addCategory({
      id,
      displayName: 'New Category',
      thumbnailUrl: 'https://images.unsplash.com/photo-1599643478514-4a410f0a82ef?auto=format&fit=crop&q=80&w=600',
      accentColorHex: '#4f46e5',
      sortOrder: categories.length + 1
    });
    setSelectedCategoryId(id);
  };

  const handleCreateSubcategory = () => {
    if (!selectedCategoryId) return;
    const id = `sub-${Date.now()}`;
    addSubCategory({
      id,
      categoryId: selectedCategoryId,
      name: 'New Subcategory',
      iconName: 'Box',
      thumbnailUrl: 'https://images.unsplash.com/photo-1599643478514-4a410f0a82ef?auto=format&fit=crop&q=80&w=600',
      photoCount: 0,
      sortOrder: relevantSubcategories.length + 1
    });
    setSelectedSubcategoryId(id);
  };

  const handleCatImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedCategoryId) {
      updateCategory(selectedCategoryId, { thumbnailUrl: URL.createObjectURL(file) });
    }
  };

  const handleSubImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedSubcategoryId) {
      updateSubCategory(selectedSubcategoryId, { thumbnailUrl: URL.createObjectURL(file) });
    }
  };

  const startEditCategory = () => {
    if (!selectedCategory) return;
    setCatNameInput(selectedCategory.displayName);
    setCatColorInput(selectedCategory.accentColorHex);
    setEditingCategory(true);
  };

  const saveCategory = () => {
    if (!selectedCategoryId) return;
    updateCategory(selectedCategoryId, { displayName: catNameInput, accentColorHex: catColorInput });
    setEditingCategory(false);
  };

  const startEditSub = () => {
    if (!selectedSubcategory) return;
    setSubNameInput(selectedSubcategory.name);
    setEditingSub(true);
  };

  const saveSub = () => {
    if (!selectedSubcategoryId) return;
    updateSubCategory(selectedSubcategoryId, { name: subNameInput });
    setEditingSub(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0f1523] text-white flex flex-col">
      {/* Top Header */}
      <div className="flex justify-between items-center p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold flex-1 text-center">Category Thumbnails</h1>
        <h1 className="text-xl font-bold flex-1 text-center">Subcategory Thumbnails</h1>
        <div className="absolute right-6 top-6">
          <button onClick={onClose} className="px-4 py-2 bg-slate-900 border border-slate-700 hover:bg-slate-800 rounded-lg text-sm font-bold flex items-center gap-2">
            <ArrowLeft size={16} />
            Back to Dashboard
          </button>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN: Categories */}
        <div className="flex-1 p-8 border-r border-slate-800 flex flex-col items-center overflow-y-auto">
          
          <div className="w-full max-w-md space-y-4">
            {/* Dropdown */}
            <div className="relative">
              <select 
                className="w-full appearance-none font-bold p-4 rounded-lg focus:outline-none cursor-pointer transition-colors shadow-lg"
                style={{ 
                  backgroundColor: selectedCategory?.accentColorHex ? `${selectedCategory.accentColorHex}dd` : '#7c5cdb',
                  color: selectedCategory?.accentColorHex ? getTextColorForBackground(selectedCategory.accentColorHex) : '#ffffff'
                }}
                value={selectedCategoryId || ''}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id} style={{ color: '#000' }}>{c.displayName.toUpperCase()}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: selectedCategory?.accentColorHex ? getTextColorForBackground(selectedCategory.accentColorHex) : '#ffffff' }} />
            </div>

            {/* Selected Info Row */}
            {selectedCategory && (
              <div 
                className="font-bold p-4 rounded-lg flex items-center justify-between transition-colors shadow-lg"
                style={{ 
                  backgroundColor: selectedCategory.accentColorHex || '#a69c73',
                  color: getTextColorForBackground(selectedCategory.accentColorHex || '#a69c73')
                }}
              >
                {editingCategory ? (
                  <div className="flex-1 flex items-center gap-3">
                    <input type="color" value={catColorInput} onChange={e => setCatColorInput(e.target.value)} className="w-8 h-8 rounded border-none cursor-pointer bg-transparent" />
                    <input 
                      type="text" 
                      value={catNameInput} 
                      onChange={e => setCatNameInput(e.target.value)}
                      className="bg-black/10 px-2 py-1 rounded outline-none flex-1"
                    />
                    <button onClick={saveCategory} className="p-1 hover:bg-black/20 rounded"><Check size={18} /></button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full border border-black/30" style={{ backgroundColor: selectedCategory.accentColorHex }} />
                      <span>{selectedCategory.displayName.toUpperCase()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={startEditCategory} className="p-1 hover:bg-black/10 rounded"><Edit2 size={16} /></button>
                      <button onClick={() => deleteCategory(selectedCategory.id)} className="p-1 hover:bg-black/10 rounded text-red-900"><Trash2 size={16} /></button>
                    </div>
                  </>
                )}
              </div>
            )}
            
            <button onClick={handleCreateCategory} className="w-full py-2 border border-slate-700 border-dashed rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-sm font-bold flex justify-center items-center gap-2">
              <Plus size={16} /> Add Category
            </button>

            {/* Thumbnail */}
            {selectedCategory && (
              <div className="mt-12 flex flex-col items-center">
                <div className="bg-[#2a3042] p-8 rounded-2xl w-full aspect-video flex items-center justify-center relative group overflow-hidden">
                  <img src={selectedCategory.thumbnailUrl} alt={selectedCategory.displayName} className="w-full h-full object-cover rounded-xl" />
                  <button 
                    onClick={() => catImageRef.current?.click()}
                    className="absolute top-4 right-4 w-10 h-10 bg-black/60 hover:bg-black rounded-full flex items-center justify-center transition opacity-0 group-hover:opacity-100"
                  >
                    <Plus size={20} />
                  </button>
                  <input type="file" ref={catImageRef} onChange={handleCatImageUpload} accept="image/*" className="hidden" />
                </div>
                <button 
                  onClick={() => catImageRef.current?.click()}
                  className="mt-8 px-6 py-3 bg-[#a855f7] hover:bg-[#9333ea] rounded-lg font-bold text-sm transition"
                >
                  Change Thumbnail
                </button>
              </div>
            )}

          </div>
        </div>

        {/* RIGHT COLUMN: Subcategories */}
        <div className="flex-1 p-8 flex flex-col items-center overflow-y-auto">
          
          <div className="w-full max-w-md space-y-4">
            {/* Dropdown */}
            <div className="relative">
              <select 
                className="w-full appearance-none bg-[#7c5cdb] hover:bg-[#6b4ab5] text-white font-bold p-4 rounded-lg focus:outline-none cursor-pointer"
                value={selectedSubcategoryId || ''}
                onChange={(e) => setSelectedSubcategoryId(e.target.value)}
                disabled={relevantSubcategories.length === 0}
              >
                {relevantSubcategories.length === 0 && <option value="">No subcategories</option>}
                {relevantSubcategories.map(s => (
                  <option key={s.id} value={s.id}>{s.name.toUpperCase()}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Selected Info Row */}
            {selectedSubcategory && (
              <div className="bg-[#7c5cdb] text-white font-bold p-4 rounded-lg flex items-center justify-between">
                {editingSub ? (
                  <div className="flex-1 flex items-center gap-3">
                    <input 
                      type="text" 
                      value={subNameInput} 
                      onChange={e => setSubNameInput(e.target.value)}
                      className="bg-black/20 px-2 py-1 rounded outline-none flex-1"
                    />
                    <button onClick={saveSub} className="p-1 hover:bg-black/20 rounded"><Check size={18} /></button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <span>{selectedSubcategory.name.toUpperCase()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={startEditSub} className="p-1 hover:bg-black/20 rounded"><Edit2 size={16} /></button>
                      <button onClick={() => deleteSubCategory(selectedSubcategory.id)} className="p-1 hover:bg-black/20 rounded text-red-200"><Trash2 size={16} /></button>
                    </div>
                  </>
                )}
              </div>
            )}

            <button 
              onClick={handleCreateSubcategory} 
              disabled={!selectedCategoryId}
              className="w-full py-2 border border-slate-700 border-dashed rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-sm font-bold flex justify-center items-center gap-2 disabled:opacity-50"
            >
              <Plus size={16} /> Add Subcategory
            </button>

            {/* Thumbnail */}
            {selectedSubcategory && (
              <div className="mt-12 flex flex-col items-center">
                <div className="bg-[#2a3042] p-8 rounded-2xl w-full aspect-video flex items-center justify-center relative group overflow-hidden">
                  <img src={selectedSubcategory.thumbnailUrl} alt={selectedSubcategory.name} className="w-full h-full object-cover rounded-xl" />
                  <button 
                    onClick={() => subImageRef.current?.click()}
                    className="absolute top-4 right-4 w-10 h-10 bg-black/60 hover:bg-black rounded-full flex items-center justify-center transition opacity-0 group-hover:opacity-100"
                  >
                    <Plus size={20} />
                  </button>
                  <input type="file" ref={subImageRef} onChange={handleSubImageUpload} accept="image/*" className="hidden" />
                </div>
                <button 
                  onClick={() => subImageRef.current?.click()}
                  className="mt-8 px-6 py-3 bg-[#7c5cdb] hover:bg-[#6b4ab5] rounded-lg font-bold text-sm transition"
                >
                  Change Thumbnail
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
