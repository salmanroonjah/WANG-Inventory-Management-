import React, { useState } from 'react';
import { Camera, User, ChevronDown, RefreshCw, Shield, Menu } from 'lucide-react';
import { UserRole, UserSession } from '../types/inventory.js';

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

  return (
    <header className="sticky top-0 z-30 bg-slate-900 text-white border-b border-slate-800 shadow-xs">
      <div className="px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Left: Mobile hamburger & Brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-1.5 text-slate-300 hover:text-white rounded-md hover:bg-slate-800 transition-colors"
            aria-label="Toggle Navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-emerald-600 flex items-center justify-center font-black text-white text-xs tracking-wider shadow-inner">
              WANG
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-tight text-white">
                  WANG Inventory
                </span>
                <span className="hidden sm:inline-block text-[10px] text-emerald-400 font-mono uppercase bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800">
                  v2.6 Live
                </span>
              </div>
              <p className="hidden md:block text-[10px] text-slate-400 leading-none">
                Welfare Association for New Generation
              </p>
            </div>
          </div>
        </div>

        {/* Right: Actions & User Role Switcher */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Prominent Quick Scan Button */}
          <button
            onClick={onOpenScanner}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Camera className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Scan Barcode</span>
            <span className="sm:hidden">Scan</span>
          </button>

          {/* Reset Demo Data Button */}
          <button
            onClick={onResetDemo}
            title="Reset to default seed data"
            className="hidden lg:flex p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors text-xs items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="text-[11px]">Reset Data</span>
          </button>

          {/* Role Switcher Dropdown (Essential for testing permissions) */}
          <div className="relative">
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs flex items-center gap-2 transition-colors border border-slate-700"
            >
              <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-200">
                {currentUser.name.charAt(0)}
              </div>
              <div className="text-left hidden sm:block">
                <span className="text-[11px] font-medium block leading-tight text-slate-200">
                  {currentUser.name}
                </span>
                <span className="text-[10px] text-emerald-400 block leading-none">
                  {currentUser.role}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showRoleMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white text-slate-900 rounded-lg shadow-xl border border-slate-200 py-1.5 z-50">
                <div className="px-3 py-1.5 border-b border-slate-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Switch Test Persona / Role
                  </span>
                  <span className="text-xs font-semibold text-slate-800 block">
                    {currentUser.name}
                  </span>
                </div>
                {roles.map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      onSwitchRole(r);
                      setShowRoleMenu(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                      currentUser.role === r ? 'font-bold text-emerald-700 bg-emerald-50/50' : 'text-slate-700'
                    }`}
                  >
                    <span>{r}</span>
                    {currentUser.role === r && (
                      <span className="text-[10px] font-mono text-emerald-600 bg-emerald-100 px-1 rounded">Active</span>
                    )}
                  </button>
                ))}
                <div className="border-t border-slate-100 mt-1 pt-1 px-3 py-1">
                  <span className="text-[10px] text-slate-500 block leading-tight">
                    Simulates organizational role-based access control.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
