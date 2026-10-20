import React, { useState } from 'react';
import { Camera, ChevronDown, RefreshCw, Menu, Download, Shield, User } from 'lucide-react';
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

  // The 3 official WANG Admin Roles + Employee
  const roleOptions: { role: UserRole; title: string; subtitle: string; icon: string }[] = [
    {
      role: 'Super Admin',
      title: 'Super Admin',
      subtitle: 'Executive Director (Full Authority)',
      icon: '👑'
    },
    {
      role: 'Inventory & Finance Admin',
      title: 'Inventory & Finance Admin',
      subtitle: 'Manager Admin & Finance',
      icon: '💼'
    },
    {
      role: 'IT Administrator',
      title: 'IT Administrator',
      subtitle: 'IT Department (Hardware & Systems)',
      icon: '💻'
    },
    {
      role: 'Employee',
      title: 'Employee',
      subtitle: 'General Staff Member',
      icon: '👤'
    }
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

          {/* Role Switcher Dropdown (The 3 WANG Admins) */}
          <div className="relative">
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="px-2.5 py-1.5 bg-[#002254] hover:bg-[#001a40] rounded-lg text-xs flex items-center gap-2 transition-colors border border-white/20 shadow-xs"
            >
              <div className="w-6 h-6 rounded-full bg-[#f1cc11] flex items-center justify-center text-[11px] font-black text-[#003279] shadow-2xs">
                {currentUser.name ? currentUser.name.charAt(0) : 'U'}
              </div>
              <div className="text-left hidden sm:block">
                <span className="text-[11px] font-bold block leading-tight text-white max-w-[120px] truncate">
                  {currentUser.name}
                </span>
                <span className="text-[10px] text-[#f1cc11] font-semibold block leading-none flex items-center gap-1">
                  <Shield className="w-2.5 h-2.5 fill-current" />
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
                <div className="absolute right-0 mt-2 w-72 bg-white text-slate-900 rounded-xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3.5 py-2 border-b border-slate-100">
                    <p className="text-[11px] font-black text-[#003279] uppercase tracking-wider flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-[#f1cc11] fill-current" />
                      WANG Administrative Roles
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Switch active administrator view or staff persona
                    </p>
                  </div>

                  <div className="p-1 space-y-1">
                    {roleOptions.map((opt) => {
                      const isActive = currentUser.role === opt.role || 
                        (opt.role === 'Inventory & Finance Admin' && (currentUser.role as any) === 'Inventory Manager');

                      return (
                        <button
                          key={opt.role}
                          onClick={() => {
                            onSwitchRole(opt.role);
                            setShowRoleMenu(false);
                          }}
                          className={`w-full text-left p-2.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                            isActive 
                              ? 'bg-blue-50 border border-blue-200' 
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-base">{opt.icon}</span>
                            <div>
                              <div className={`font-bold ${isActive ? 'text-[#003279]' : 'text-slate-800'}`}>
                                {opt.title}
                              </div>
                              <div className="text-[10px] text-slate-500 leading-tight">
                                {opt.subtitle}
                              </div>
                            </div>
                          </div>
                          {isActive && (
                            <span className="text-[10px] font-black text-[#003279] bg-[#f1cc11] px-2 py-0.5 rounded shadow-2xs">
                              Active
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="border-t border-slate-100 mt-1 pt-2 px-3 pb-1">
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                      <User className="w-3 h-3 text-[#003279]" />
                      <span>Executive Director has Super Admin authority.</span>
                    </div>
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
