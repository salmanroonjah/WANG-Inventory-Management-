import React, { useState, useMemo } from 'react';
import { 
  FolderTree, 
  Boxes, 
  ArrowRight, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  X,
  Code,
  FileText,
  Layers,
  Laptop,
  Zap,
  Camera,
  Shield,
  Wrench,
  Scissors,
  Coffee,
  Radio,
  Tv,
  Flame,
  Activity,
  HardDrive,
  Eye,
  Filter,
  RefreshCcw
} from 'lucide-react';
import { Category, Asset } from '../types/inventory.js';
import { CategoryFormModal } from '../components/CategoryFormModal.js';
import { api } from '../services/api.js';

interface CategoriesViewProps {
  categories: Category[];
  allAssets?: Asset[];
  canManage?: boolean;
  onSelectCategory: (categoryId: string) => void;
  onRefreshData?: () => void;
}

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  FolderTree: FolderTree,
  Laptop: Laptop,
  Zap: Zap,
  Camera: Camera,
  Shield: Shield,
  Wrench: Wrench,
  Scissors: Scissors,
  Coffee: Coffee,
  Boxes: Boxes,
  Radio: Radio,
  Tv: Tv,
  Flame: Flame,
  Activity: Activity,
  HardDrive: HardDrive
};

export const CategoriesView: React.FC<CategoriesViewProps> = ({
  categories,
  allAssets = [],
  canManage = false,
  onSelectCategory,
  onRefreshData
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);

  // Category Assets Preview Modal state
  const [previewCategory, setPreviewCategory] = useState<Category | null>(null);

  // Delete state
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Compute live asset count for each category
  const categoriesWithLiveCount = useMemo(() => {
    return categories.map(cat => {
      const matchCount = allAssets.filter(
        a => a.categoryId?.toUpperCase() === cat.categoryId?.toUpperCase()
      ).length;
      return {
        ...cat,
        liveTotalAssets: Math.max(matchCount, cat.totalAssets || 0)
      };
    });
  }, [categories, allAssets]);

  // Filter categories by search
  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) return categoriesWithLiveCount;
    const q = searchTerm.toLowerCase();
    return categoriesWithLiveCount.filter(
      cat => 
        cat.categoryName.toLowerCase().includes(q) ||
        cat.categoryId.toLowerCase().includes(q) ||
        (cat.description && cat.description.toLowerCase().includes(q))
    );
  }, [categoriesWithLiveCount, searchTerm]);

  // Assets belonging to preview Category
  const previewCategoryAssets = useMemo(() => {
    if (!previewCategory) return [];
    return allAssets.filter(
      a => a.categoryId?.toUpperCase() === previewCategory.categoryId?.toUpperCase()
    );
  }, [allAssets, previewCategory]);

  const handleOpenAddModal = () => {
    setCategoryToEdit(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (cat: Category, e: React.MouseEvent) => {
    e.stopPropagation();
    setCategoryToEdit(cat);
    setIsFormModalOpen(true);
  };

  const handleOpenDeleteConfirm = (cat: Category, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingCategory(cat);
    setDeleteError(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingCategory) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      await api.deleteCategory(deletingCategory.categoryId);
      setSuccessMsg(`Category "${deletingCategory.categoryName}" deleted successfully.`);
      setDeletingCategory(null);
      if (onRefreshData) onRefreshData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setDeleteError(err?.message || 'Failed to delete category.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFormSuccess = () => {
    setSuccessMsg('Category saved successfully.');
    if (onRefreshData) onRefreshData();
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const totalAllAssets = useMemo(() => {
    return categoriesWithLiveCount.reduce((sum, c) => sum + c.liveTotalAssets, 0);
  }, [categoriesWithLiveCount]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#003279]/10 rounded-xl">
              <FolderTree className="w-6 h-6 text-[#003279]" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Inventory Asset Categories
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage item categories, category codes, descriptions, and linked assets in WANG Inventory
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {canManage && (
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2.5 bg-[#003279] hover:bg-[#002357] text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#f1cc11]" />
              <span>Add Category</span>
            </button>
          )}
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-700 rounded-xl">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-slate-900">{categories.length}</div>
            <div className="text-xs font-medium text-slate-500">Total Categories</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-slate-900">{totalAllAssets}</div>
            <div className="text-xs font-medium text-slate-500">Categorized Assets</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-amber-50 text-amber-700 rounded-xl">
            <Code className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-slate-900">Category Codes</div>
            <div className="text-xs font-medium text-slate-500">FUR, MED, IT, etc.</div>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, code (e.g. FUR, MED, IT), or details..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#003279] focus:border-[#003279] text-slate-900"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Showing <span className="font-bold text-slate-800">{filteredCategories.length}</span> of {categories.length} categories
        </div>
      </div>

      {/* Categories Grid */}
      {filteredCategories.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
          <FolderTree className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Categories Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchTerm ? `No category matched "${searchTerm}". Try a different search query.` : 'No categories have been created yet.'}
          </p>
          {canManage && (
            <button
              onClick={handleOpenAddModal}
              className="mt-4 px-4 py-2 bg-[#003279] text-white rounded-xl text-xs font-bold inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4 text-[#f1cc11]" /> Add First Category
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCategories.map((cat) => {
            const CategoryIcon = ICON_MAP[cat.iconName || 'FolderTree'] || FolderTree;

            return (
              <div
                key={cat.categoryId}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-[#003279]/40 hover:shadow-md transition-all flex flex-col justify-between group overflow-hidden"
              >
                {/* Card Top */}
                <div className="p-5">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-slate-100 group-hover:bg-[#003279]/10 rounded-xl transition-colors text-slate-700 group-hover:text-[#003279]">
                        <CategoryIcon className="w-5 h-5" />
                      </div>
                      <span className="font-mono text-xs font-bold text-[#003279] bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                        {cat.categoryId.replace(/^CAT-/, '')}
                      </span>
                    </div>

                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                      cat.liveTotalAssets > 0 
                        ? 'text-emerald-700 bg-emerald-50 border-emerald-200' 
                        : 'text-slate-500 bg-slate-100 border-slate-200'
                    }`}>
                      {cat.liveTotalAssets} asset{cat.liveTotalAssets === 1 ? '' : 's'}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-slate-900 text-base group-hover:text-[#003279] transition-colors leading-snug">
                    {cat.categoryName}
                  </h3>

                  <p className="text-xs text-slate-600 mt-2 leading-relaxed line-clamp-3 min-h-[2.5rem]">
                    {cat.description || <span className="text-slate-400 italic">No description provided for this category.</span>}
                  </p>
                </div>

                {/* Card Actions Footer - Edit and Delete buttons only */}
                <div className="bg-slate-50/80 px-5 py-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    onClick={(e) => handleOpenEditModal(cat, e)}
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-lg transition-all text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    title="Edit Category Details"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Edit</span>
                  </button>

                  <button
                    onClick={(e) => handleOpenDeleteConfirm(cat, e)}
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:border-red-400 hover:bg-red-50 text-slate-700 hover:text-red-600 rounded-lg transition-all text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    title="Delete Category"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Category Modal (Add / Edit) */}
      <CategoryFormModal
        isOpen={isFormModalOpen}
        categoryToEdit={categoryToEdit}
        onClose={() => {
          setIsFormModalOpen(false);
          setCategoryToEdit(null);
        }}
        onSuccess={handleFormSuccess}
      />

      {/* Preview Category Assets Modal */}
      {previewCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
            <div className="bg-[#003279] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl">
                  <Eye className="w-5 h-5 text-[#f1cc11]" />
                </div>
                <div>
                  <h3 className="font-bold text-base">{previewCategory.categoryName}</h3>
                  <p className="text-xs text-slate-200 font-mono">Code: {previewCategory.categoryId.replace(/^CAT-/, '')}</p>
                </div>
              </div>
              <button
                onClick={() => setPreviewCategory(null)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
              <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-800">Description: </span>
                {previewCategory.description || 'No detailed description set for this category.'}
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Linked Assets in Inventory ({previewCategoryAssets.length})</span>
                  <button
                    onClick={() => {
                      const catId = previewCategory.categoryId;
                      setPreviewCategory(null);
                      onSelectCategory(catId);
                    }}
                    className="text-xs text-[#003279] font-bold hover:underline flex items-center gap-1"
                  >
                    <span>View in Main Inventory</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </h4>

                {previewCategoryAssets.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl text-slate-500 text-xs">
                    No active assets are currently assigned to category code <span className="font-mono font-bold">{previewCategory.categoryId.replace(/^CAT-/, '')}</span>.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                    {previewCategoryAssets.map((asset) => (
                      <div key={asset.assetId} className="p-3 bg-white hover:bg-slate-50 flex items-center justify-between gap-3">
                        <div>
                          <div className="font-bold text-xs text-slate-900">{asset.itemName}</div>
                          <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2 mt-0.5">
                            <span>ID: {asset.assetId}</span>
                            <span>•</span>
                            <span>{asset.brand} {asset.model}</span>
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          asset.status === 'Available' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          asset.status === 'Issued' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {asset.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setPreviewCategory(null)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150 p-6">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="p-2.5 bg-red-100 rounded-xl">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Delete Category</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Are you sure you want to delete category <strong className="text-slate-900 font-mono">{deletingCategory.categoryId.replace(/^CAT-/, '')}</strong> ({deletingCategory.categoryName})?
            </p>

            {deleteError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingCategory(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs transition-all flex items-center gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
