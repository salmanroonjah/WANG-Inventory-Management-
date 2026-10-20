import React from 'react';
import { FolderTree, Boxes, ArrowRight } from 'lucide-react';
import { Category } from '../types/inventory.js';

interface CategoriesViewProps {
  categories: Category[];
  onSelectCategory: (categoryId: string) => void;
}

export const CategoriesView: React.FC<CategoriesViewProps> = ({
  categories,
  onSelectCategory
}) => {
  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <FolderTree className="w-5 h-5 text-slate-800" />
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Inventory Asset Categories
          </h1>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          Corresponds to the "Categories" tab in the WANG inventory workbook.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.map((cat) => (
          <div
            key={cat.categoryId}
            onClick={() => onSelectCategory(cat.categoryId)}
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {cat.categoryId}
                </span>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  {cat.totalAssets} asset{cat.totalAssets === 1 ? '' : 's'}
                </span>
              </div>
              <h3 className="font-bold text-slate-900 text-base group-hover:text-emerald-700 transition-colors">
                {cat.categoryName}
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {cat.description}
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between text-xs text-emerald-700 font-semibold">
              <span>View Filtered Assets</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
