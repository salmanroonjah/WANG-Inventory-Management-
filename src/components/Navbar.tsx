import React, { useState } from 'react';
import { Camera, ChevronDown, Menu, Download, Shield, LogOut, Mail } from 'lucide-react';
import { UserRole, UserSession } from '../types/inventory.js';
import { api } from '../services/api.js';
import wangLogo from '../assets/wang_logo.png';

interface NavbarProps {
  currentUser: UserSession;
  onSignOut: () => void;
  onOpenScanner: () => void;
  onToggleMobileMenu: () => void;
}

const ROLE_ICON: Partial<Record<UserRole, string>> = {
  'Super Admin': '👑',
  'Inventory & Finance Admin': '💼',
  'Inventory Manager': '💼',
  'IT Administrator': '💻',
  Approver: '✅',
  Auditor: '🔍',
  Employee: '👤'
};

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onSignOut,
  onOpenScanner,
  onToggleMobileMenu
}) => {
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

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
      alert('Backup export failed. Please try again.');
    }
  };

  return (
    <header className="shrink-0 h-14 z-30 bg-[#003279] text-white border-b border-[#002254] shadow-md">
      <div className="px-2.5 sm:px-6 h-14 flex items-center justify-between gap-1.5 sm:gap-3">
        {/* Left: Mobile hamburger & Brand */}
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-1 text-white/80 hover:text-white rounded-md hover:bg-white/10 transition-colors shrink-0"
            aria-label="Toggle Navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 md:gap-3.5 min-w-0">
            {/* Desktop only: Logo with 'Welfare Association for New Generation' underneath */}
            <div className="hidden md:flex flex-col items-start justify-center shrink-0">
              <img 
                src={wangLogo}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = 'https://lh3.googleusercontent.com/d/1-Eu4c2k7m7kO_1F54_QfxB-6vJZCWqSJ';
                }}
                alt="WANG Logo" 
                className="h-7 md:h-8 w-auto object-contain shrink-0 drop-shadow-sm transition-transform hover:scale-105"
              />
              <span className="text-[9px] md:text-[10px] text-white/80 font-medium tracking-tight leading-none mt-0.5">
                Welfare Association for New Generation
              </span>
            </div>

            {/* Clean subtle divider for desktop */}
            <span className="hidden md:inline-block h-6 w-px bg-white/20"></span>

            {/* Mobile: Just 'Inventory Management System' (compact & fully visible) */}
            <div className="flex items-center min-w-0">
              <span className="font-bold text-[10px] xs:text-[11px] sm:text-xs md:text-sm tracking-tight text-white whitespace-nowrap">
                Inventory Management System
              </span>
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

          {/* Backup Database Button (admins only: contains staff contact details) */}
          {['Super Admin', 'Inventory & Finance Admin', 'IT Administrator', 'Inventory Manager'].includes(currentUser.role) && (
          <button
            onClick={handleExportBackup}
            title="Download full database backup (.json)"
            className="hidden sm:flex px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium items-center gap-1.5 transition-colors border border-white/15"
          >
            <Download className="w-3.5 h-3.5 text-[#f1cc11]" />
            <span className="text-[11px]">Backup DB</span>
          </button>
          )}

          {/* Signed-in user menu */}
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
                  <div className="px-3.5 py-2.5 border-b border-slate-100 flex items-start gap-2.5">
                    <span className="text-lg leading-none mt-0.5">{ROLE_ICON[currentUser.role] || '👤'}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#003279] truncate">{currentUser.name}</p>
                      <p className="text-[10px] text-slate-500 flex items-center gap-1 break-all">
                        <Mail className="w-3 h-3 shrink-0" />
                        {currentUser.email}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {currentUser.role}
                        {currentUser.employeeId ? ` · ${currentUser.employeeId}` : ''}
                      </p>
                    </div>
                  </div>
                  <p className="px-3.5 py-2 text-[10px] text-slate-500 leading-snug">
                    Your role comes from your employee record. Ask a Super Admin if it needs to change.
                  </p>
                  <div className="px-2 pt-1">
                    <button
                      onClick={() => {
                        setSigningOut(true);
                        onSignOut();
                      }}
                      disabled={signingOut}
                      className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60 flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      {signingOut ? 'Signing out…' : 'Sign out'}
                    </button>
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
