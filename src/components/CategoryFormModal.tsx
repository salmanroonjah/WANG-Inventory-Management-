import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  FolderTree, 
  Code, 
  FileText, 
  AlertCircle, 
  PlusCircle, 
  Edit3, 
  Sparkles,
  Tag,
  Laptop,
  Zap,
  Camera,
  Shield,
  Wrench,
  Scissors,
  Coffee,
  Boxes,
  Radio,
  Tv,
  Flame,
  Activity,
  HardDrive
} from 'lucide-react';
import { Category } from '../types/inventory.js';
import { api } from '../services/api.js';

interface CategoryFormModalProps {
  isOpen: boolean;
  categoryToEdit?: Category | null;
  onClose: () => void;
  onSuccess: () => void;
}

const ICON_OPTIONS = [
  { name: 'FolderTree', label: 'Folder Tree', icon: FolderTree },
  { name: 'Laptop', label: 'Computers & IT', icon: Laptop },
  { name: 'Zap', label: 'Power & Electrical', icon: Zap },
  { name: 'Camera', label: 'Media & Production', icon: Camera },
  { name: 'Shield', label: 'CCTV & Security', icon: Shield },
  { name: 'Wrench', label: 'Tools & Maintenance', icon: Wrench },
  { name: 'Scissors', label: 'Vocational & Stitching', icon: Scissors },
  { name: 'Coffee', label: 'Kitchen & Pantry', icon: Coffee },
  { name: 'Boxes', label: 'Furniture & Storage', icon: Boxes },
  { name: 'Radio', label: 'Communication Gear', icon: Radio },
  { name: 'Tv', label: 'Displays & Automation', icon: Tv },
  { name: 'Flame', label: 'Safety & Protection', icon: Flame },
  { name: 'Activity', label: 'Medical & First Aid', icon: Activity },
  { name: 'HardDrive', label: 'Hardware & Infrastructure', icon: HardDrive }
];

export const CategoryFormModal: React.FC<CategoryFormModalProps> = ({
  isOpen,
  categoryToEdit,
  onClose,
  onSuccess
}) => {
  const isEditing = Boolean(categoryToEdit);

  const [categoryName, setCategoryName] = useState('');
  const [categoryCodeInput, setCategoryCodeInput] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('FolderTree');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (categoryToEdit) {
      setCategoryName(categoryToEdit.categoryName || '');
      // Display clean code, e.g. CAT-FUR -> FUR or CAT-FUR
      const code = categoryToEdit.categoryId ? categoryToEdit.categoryId.replace(/^CAT-/, '') : '';
      setCategoryCodeInput(code || 'GEN');
      setDescription(categoryToEdit.description || '');
      setSelectedIcon(categoryToEdit.iconName || 'FolderTree');
    } else {
      setCategoryName('');
      setCategoryCodeInput('');
      setDescription('');
      setSelectedIcon('FolderTree');
    }
    setError(null);
  }, [categoryToEdit, isOpen]);

  // Auto-generate Category Code from Name if adding new category and input is empty or auto
  const handleNameChange = (val: string) => {
    setCategoryName(val);
    if (!isEditing && (!categoryCodeInput || categoryCodeInput.length <= 4)) {
      const clean = val.trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 4);
      setCategoryCodeInput(clean || '');
    }
  };

  // Clean code prefix extracted from user input (e.g. "FUR" or "CAT-FUR" -> "FUR")
  const derivedCodePrefix = (categoryCodeInput.trim().toUpperCase().replace(/^CAT-/, '') || 'GEN').replace(/[^A-Z0-9_-]/g, '');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) {
      setError('Category Name is required.');
      return;
    }

    const cleanCode = derivedCodePrefix || 'GEN';
    const finalFullCategoryId = cleanCode;

    setIsSubmitting(true);
    setError(null);

    try {
      if (isEditing && categoryToEdit) {
        await api.updateCategory(categoryToEdit.categoryId, {
          categoryId: finalFullCategoryId,
          categoryName: categoryName.trim(),
          description: description.trim(),
          iconName: selectedIcon
        });
      } else {
        await api.createCategory({
          categoryId: finalFullCategoryId,
          categoryName: categoryName.trim(),
          description: description.trim(),
          iconName: selectedIcon
        });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save category. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
        {/* Header */}
        <div className="bg-[#003279] text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl">
              {isEditing ? <Edit3 className="w-5 h-5 text-[#f1cc11]" /> : <PlusCircle className="w-5 h-5 text-[#f1cc11]" />}
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">
                {isEditing ? 'Edit Category & Code' : 'Add New Category'}
              </h2>
              <p className="text-xs text-slate-200 mt-0.5">
                {isEditing ? 'Modify category title, short code, and asset label format' : 'Create a new classification and set custom asset code'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Category Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Category Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <FolderTree className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={categoryName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Furniture or Solar Power"
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#003279] focus:border-[#003279] transition-all text-slate-900 font-medium"
              />
            </div>
          </div>

          {/* Category Short Code Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Category Code (e.g. FUR, ELE, ITC, SOLAR) <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                <Sparkles className="w-3.5 h-3.5 text-[#003279]" /> Code: {derivedCodePrefix}
              </span>
            </div>
            <div className="relative">
              <Code className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={categoryCodeInput}
                onChange={(e) => setCategoryCodeInput(e.target.value.toUpperCase())}
                placeholder="e.g. FUR"
                className="w-full pl-9 pr-3 py-2.5 text-sm font-mono font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#003279] focus:border-[#003279] transition-all text-slate-900 bg-slate-50/50"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Set any short code like <strong className="text-slate-800 font-mono">FUR</strong>, <strong className="text-slate-800 font-mono">ELE</strong>, or <strong className="text-slate-800 font-mono">SOLAR</strong>.
            </p>
          </div>

          {/* Live Asset Barcode Label Format Preview */}
          <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl">
            <div className="flex items-center gap-2 text-xs font-bold text-[#003279] mb-1.5">
              <Tag className="w-4 h-4 text-[#f1cc11]" />
              <span>Auto-Generated Asset Label Format Preview:</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap font-mono text-xs">
              <span className="px-2.5 py-1 bg-white border border-blue-300 rounded-lg shadow-2xs font-extrabold text-slate-900">
                WANG-{derivedCodePrefix}-001
              </span>
              <span className="px-2.5 py-1 bg-white border border-blue-300 rounded-lg shadow-2xs font-extrabold text-slate-900">
                WANG-{derivedCodePrefix}-002
              </span>
              <span className="px-2.5 py-1 bg-white border border-blue-300 rounded-lg shadow-2xs font-extrabold text-slate-900">
                WANG-{derivedCodePrefix}-003
              </span>
            </div>
            <p className="text-[10px] text-slate-600 mt-1.5 leading-normal">
              When adding new assets in this category, the Asset ID barcode will automatically format as <strong className="font-mono">WANG-{derivedCodePrefix}-001</strong>, <strong className="font-mono">WANG-{derivedCodePrefix}-002</strong>, etc.
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Description & Items Included
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what items and equipment fall under this category..."
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#003279] focus:border-[#003279] transition-all text-slate-900"
              />
            </div>
          </div>

          {/* Category Icon */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Select Category Icon
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 max-h-32 overflow-y-auto p-1.5 border border-slate-200 rounded-xl bg-slate-50">
              {ICON_OPTIONS.map((opt) => {
                const IconComp = opt.icon;
                const isSel = selectedIcon === opt.name;
                return (
                  <button
                    key={opt.name}
                    type="button"
                    onClick={() => setSelectedIcon(opt.name)}
                    title={opt.label}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg border text-xs transition-all cursor-pointer ${
                      isSel 
                        ? 'bg-[#003279] text-white border-[#003279] shadow-xs scale-105' 
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <IconComp className="w-5 h-5 mb-1" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs font-bold text-white bg-[#003279] hover:bg-[#002357] rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-[#f1cc11]" />
                  <span>{isEditing ? 'Save Code & Details' : 'Create Category'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
