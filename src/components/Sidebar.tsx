import React from 'react';
import { 
  LayoutDashboard, 
  Camera, 
  Send, 
  RotateCcw, 
  Boxes, 
  PackageCheck, 
  AlertTriangle, 
  Users, 
  FolderTree, 
  MapPin, 
  ClipboardList, 
  Wrench, 
  ShieldCheck, 
  FileSpreadsheet, 
  History, 
  Sheet,
  X
} from 'lucide-react';
import { UserRole } from '../types/inventory.js';

export type ViewTab = 
  | 'dashboard'
  | 'scan'
  | 'issue'
  | 'return'
  | 'inventory'
  | 'consumables'
  | 'missing-lost'
  | 'employees'
  | 'categories'
  | 'locations'
  | 'requests'
  | 'maintenance'
  | 'audits'
  | 'reports'
  | 'activity'
  | 'sheets';

interface SidebarProps {
  currentTab: ViewTab;
  onSelectTab: (tab: ViewTab) => void;
  userRole: UserRole;
  counts?: {
    overdue?: number;
    lowStock?: number;
    pendingRequests?: number;
    missingLost?: number;
  };
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  userRole,
  counts,
  isOpenMobile,
  onCloseMobile
}) => {
  const isEmployee = userRole === 'Employee';

  const navItems: {
    id: ViewTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    badgeColor?: string;
    employeeAllowed?: boolean;
    section?: string;
  }[] = [
    // Core
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, employeeAllowed: true, section: 'Overview' },
    { id: 'scan', label: 'Scan Asset Barcode', icon: Camera, employeeAllowed: true, section: 'Overview' },
    
    // Core Operational Workflows
    { id: 'issue', label: 'Issue Asset', icon: Send, employeeAllowed: false, section: 'Operations' },
    { id: 'return', label: 'Return Asset', icon: RotateCcw, employeeAllowed: false, section: 'Operations' },
    { 
      id: 'missing-lost', 
      label: 'Missing & Overdue', 
      icon: AlertTriangle, 
      badge: (counts?.missingLost || 0) + (counts?.overdue || 0),
      badgeColor: 'bg-rose-500 text-white',
      employeeAllowed: false, 
      section: 'Operations' 
    },

    // Inventory & Catalog
    { id: 'inventory', label: 'Master Assets Register', icon: Boxes, employeeAllowed: true, section: 'Inventory & Stock' },
    { 
      id: 'consumables', 
      label: 'Consumable Stock', 
      icon: PackageCheck, 
      badge: counts?.lowStock,
      badgeColor: 'bg-[#f1cc11] text-[#003279] font-bold',
      employeeAllowed: true, 
      section: 'Inventory & Stock' 
    },
    { id: 'categories', label: 'Categories', icon: FolderTree, employeeAllowed: true, section: 'Inventory & Stock' },

    // People & Places
    { id: 'employees', label: 'Employees & Asset Accounts', icon: Users, employeeAllowed: true, section: 'Organization' },
    { id: 'locations', label: 'Offices & Rooms', icon: MapPin, employeeAllowed: true, section: 'Organization' },
    { 
      id: 'requests', 
      label: 'Asset Requests', 
      icon: ClipboardList, 
      badge: counts?.pendingRequests,
      badgeColor: 'bg-blue-400 text-[#003279] font-bold',
      employeeAllowed: true, 
      section: 'Organization' 
    },

    // Assurance & Audit
    { id: 'maintenance', label: 'Maintenance & Repairs', icon: Wrench, employeeAllowed: false, section: 'Governance & Audits' },
    { id: 'audits', label: 'Physical Stock Audits', icon: ShieldCheck, employeeAllowed: false, section: 'Governance & Audits' },
    { id: 'reports', label: 'Reports & Exports', icon: FileSpreadsheet, employeeAllowed: true, section: 'Governance & Audits' },
    { id: 'activity', label: 'Activity Logs & Audit Trail', icon: History, employeeAllowed: false, section: 'Governance & Audits' },
    { id: 'sheets', label: 'Google Sheets Sync', icon: Sheet, employeeAllowed: false, section: 'Governance & Audits' }
  ];

  const handleItemClick = (id: ViewTab) => {
    onSelectTab(id);
    if (onCloseMobile) onCloseMobile();
  };

  const visibleItems = isEmployee 
    ? navItems.filter(item => item.employeeAllowed)
    : navItems;

  const sections = Array.from(new Set(visibleItems.map(i => i.section)));

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#001e48] text-slate-200">
      {/* Mobile Header */}
      <div className="p-4 border-b border-[#002e6b] flex md:hidden items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white text-sm tracking-tight">Inventory Management System</span>
        </div>
        <button
          onClick={onCloseMobile}
          className="p-1 text-white/70 hover:text-white rounded"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 overscroll-contain touch-pan-y scrollbar-thin scrollbar-thumb-white/10">
        {sections.map((sectionName) => (
          <div key={sectionName}>
            <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#f1cc11]/90 block mb-1.5">
              {sectionName}
            </span>
            <div className="space-y-1">
              {visibleItems
                .filter(item => item.section === sectionName)
                .map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#003279] text-white font-bold border-l-4 border-[#f1cc11] shadow-sm'
                          : 'text-slate-300 hover:bg-white/10 hover:text-white font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#f1cc11]' : 'text-slate-400'}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && item.badge > 0 ? (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${item.badgeColor || 'bg-white/20 text-white'}`}>
                          {item.badge}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-[#002e6b] bg-[#001738] text-[11px] text-slate-300 shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-white/70">Role:</span>
          <span className="font-bold text-[#f1cc11]">{userRole}</span>
        </div>
        <p className="text-[10px] text-white/50 mt-1">
          WANG Asset Management System
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-[#002e6b] h-full z-20">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex animate-in fade-in duration-200">
          <div 
            className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs transition-opacity" 
            onClick={onCloseMobile} 
          />
          <div className="relative w-72 max-w-[85vw] h-full z-50 shadow-2xl flex flex-col animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
