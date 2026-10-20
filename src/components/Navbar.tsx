import React, { useState } from 'react';
import { Camera, ChevronDown, RefreshCw, Menu, Download } from 'lucide-react';
import { UserRole, UserSession } from '../types/inventory.js';
import { api } from '../services/api.js';

interface NavbarProps {
  currentUser: UserSession;
  onSwitchRole: (role: UserRole) => void;
  onOpenScanner: () => void;
  onResetDemo: () => void;
  onToggleMobileMenu: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onSwitchRole,
  onOpenScanner,
  onResetDemo,
  onToggleMobileMenu
}) => {
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  const roles: UserRole[] = [
    'Super Admin',
    'Inventory Manager',
    'Approver',
    'Employee',
    'Auditor'
  ];

  const handleExportBackup = () => {
    try {
      const dataStr = api.exportFullBackup();
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `WANG_Inventory_Backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Backup export failed', e);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-[#003279] text-white border-b border-[#002254] shadow-md">
      <div className="px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Left: Mobile hamburger & Brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-1.5 text-white/80 hover:text-white rounded-md hover:bg-white/10 transition-colors"
            aria-label="Toggle Navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-[#f1cc11] text-[#003279] flex items-center justify-center font-black text-xs tracking-wider shadow-sm">
              WANG
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-tight text-white">
                  WANG Inventory
                </span>
                <span className="hidden sm:inline-block text-[10px] text-[#003279] font-bold uppercase bg-[#f1cc11] px-1.5 py-0.5 rounded shadow-xs">
                  Official
                </span>
              </div>
              <p className="hidden md:block text-[10px] text-white/80 leading-none">
                Welfare Association for New Generation
              </p>
            </div>
          </div>
        </div>

        {/* Right: Actions & User Role Switcher */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Scan Button with Gold accent */}
          <button
            onClick={onOpenScanner}
            className="px-3 py-1.5 bg-[#f1cc11] hover:bg-[#ddba09] text-[#003279] font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Camera className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden sm:inline">Scan Barcode</span>
            <span className="sm:hidden">Scan</span>
          </button>

          {/* Backup Database Button */}
          <button
            onClick={handleExportBackup}
            title="Download full database backup (.json)"
            className="hidden sm:flex px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium items-center gap-1.5 transition-colors border border-white/15"
          >
            <Download className="w-3.5 h-3.5 text-[#f1cc11]" />
            <span className="text-[11px]">Backup DB</span>
          </button>

          {/* Reset Demo Data Button */}
          <button
            onClick={onResetDemo}
            title="Reset to default seed data"
            className="hidden lg:flex p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors text-xs items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="text-[11px]">Reset</span>
          </button>

          {/* Role Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="px-2.5 py-1.5 bg-[#002254] hover:bg-[#001a40] rounded-lg text-xs flex items-center gap-2 transition-colors border border-white/20 shadow-xs"
            >
              <div className="w-5 h-5 rounded-full bg-[#f1cc11] flex items-center justify-center text-[10px] font-bold text-[#003279]">
                {currentUser.name.charAt(0)}
              </div>
              <div className="text-left hidden sm:block">
                <span className="text-[11px] font-medium block leading-tight text-white">
                  {currentUser.name}
                </span>
                <span className="text-[10px] text-[#f1cc11] font-semibold block leading-none">
                  {currentUser.role}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-white/70" />
            </button>

            {showRoleMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowRoleMenu(false)} 
                />
                <div className="absolute right-0 mt-2 w-56 bg-white text-slate-900 rounded-lg shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-[11px] font-semibold text-[#003279] uppercase tracking-wider">
                      Switch Role Simulation
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Test permissions for WANG staff
                    </p>
                  </div>
                  {roles.map((r) => (
                    <button
                      key={r}
                      onClick={() => {
                        onSwitchRole(r);
                        setShowRoleMenu(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                        currentUser.role === r ? 'font-bold text-[#003279] bg-slate-50' : 'text-slate-700'
                      }`}
                    >
                      <span>{r}</span>
                      {currentUser.role === r && (
                        <span className="text-[10px] font-bold text-[#003279] bg-[#f1cc11] px-1.5 py-0.5 rounded">Active</span>
                      )}
                    </button>
                  ))}
                  <div className="border-t border-slate-100 mt-1 pt-1 px-3 py-1">
                    <span className="text-[10px] text-slate-500 block leading-tight">
                      Simulates organizational role-based access control.
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
