import React, { useEffect, useState } from 'react';
import { AlertCircle, Loader2, LogOut, RefreshCw, ShieldCheck, UserX } from 'lucide-react';
import { api, AuthState } from '../services/api.js';
import { UserSession } from '../types/inventory.js';
import wangLogo from '../assets/wang_logo.png';

interface AuthGateProps {
  /** Rendered only when the Google account belongs to an active employee. */
  children: (session: UserSession) => React.ReactNode;
}

/** Google "G" mark (inline, so no extra image request). */
const GoogleMark = () => (
  <svg viewBox="0 0 48 48" className="w-5 h-5" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#003279] to-[#001a40] px-4 py-10 font-sans antialiased">
    <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
      <div className="bg-[#003279] px-6 pt-7 pb-5 text-center border-b-4 border-[#f1cc11]">
        <img src={wangLogo} alt="WANG logo" className="h-12 w-auto mx-auto object-contain" />
        <p className="text-[11px] text-white/80 mt-1">Welfare Association for New Generation</p>
        <h1 className="text-white font-bold text-lg mt-3">Inventory Management System</h1>
      </div>
      <div className="px-6 py-6 text-sm text-slate-700">{children}</div>
    </div>
  </div>
);

export const AuthGate: React.FC<AuthGateProps> = ({ children }) => {
  const [state, setState] = useState<AuthState>(() => api.getAuthState());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => api.onAuthChange(setState), []);

  const signIn = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.signIn();
    } catch (e: any) {
      setError(e?.message || 'Google sign-in failed.');
    } finally {
      setBusy(false);
    }
  };

  const recheck = async () => {
    setBusy(true);
    try {
      await api.recheckAccount();
    } finally {
      setBusy(false);
    }
  };

  if (state.status === 'ready' && state.session) return <>{children(state.session)}</>;

  if (state.status === 'loading' || state.status === 'checking') {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 py-6 text-slate-600">
          <Loader2 className="w-7 h-7 animate-spin text-[#003279]" />
          <p>{state.status === 'checking' ? 'Checking your account…' : 'Loading…'}</p>
        </div>
      </Shell>
    );
  }

  const signedInAs = state.email ? (
    <p className="text-xs text-slate-500 mt-3">
      Signed in as <strong className="text-slate-800 break-all">{state.email}</strong>
    </p>
  ) : null;

  const signOutButton = (
    <button
      onClick={() => api.signOut()}
      className="w-full mt-3 px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 flex items-center justify-center gap-2"
    >
      <LogOut className="w-4 h-4" /> Sign out / use another account
    </button>
  );

  if (state.status === 'notRegistered' || state.status === 'inactive') {
    const inactive = state.status === 'inactive';
    return (
      <Shell>
        <div className="flex items-start gap-3">
          <UserX className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h2 className="font-bold text-slate-900">{inactive ? 'Your account is switched off' : 'You are not on the staff list yet'}</h2>
            <p className="mt-1 leading-relaxed">
              {inactive
                ? 'Your employee record is marked inactive, so you cannot use the inventory system. Please ask your admin to re-activate you.'
                : 'This Google account is not linked to any employee. Please ask your admin to add your email address to your employee record, then press "Check again".'}
            </p>
            {signedInAs}
          </div>
        </div>
        <button
          onClick={recheck}
          disabled={busy}
          className="w-full mt-5 px-4 py-2.5 rounded-lg bg-[#003279] hover:bg-[#002254] disabled:opacity-60 text-white font-semibold flex items-center justify-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${busy ? 'animate-spin' : ''}`} /> Check again
        </button>
        {signOutButton}
      </Shell>
    );
  }

  if (state.status === 'error') {
    return (
      <Shell>
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h2 className="font-bold text-slate-900">Could not open the app</h2>
            <p className="mt-1 leading-relaxed">{state.error}</p>
            {signedInAs}
          </div>
        </div>
        <button
          onClick={recheck}
          disabled={busy}
          className="w-full mt-5 px-4 py-2.5 rounded-lg bg-[#003279] hover:bg-[#002254] disabled:opacity-60 text-white font-semibold flex items-center justify-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${busy ? 'animate-spin' : ''}`} /> Try again
        </button>
        {signOutButton}
      </Shell>
    );
  }

  // signedOut
  const shownError = error || state.error;
  return (
    <Shell>
      <h2 className="font-bold text-slate-900 text-base">Sign in</h2>
      <p className="mt-1 text-slate-600 leading-relaxed">
        Use the Google account (Gmail) that your admin registered on your employee record.
      </p>
      {shownError && (
        <div className="mt-4 p-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-800 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{shownError}</span>
        </div>
      )}
      <button
        onClick={signIn}
        disabled={busy}
        className="w-full mt-5 px-4 py-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-60 text-slate-800 font-semibold flex items-center justify-center gap-3 shadow-sm"
      >
        {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <GoogleMark />}
        Sign in with Google
      </button>
      <p className="mt-5 text-[11px] text-slate-500 flex items-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Only registered WANG staff can open this system.
      </p>
    </Shell>
  );
};
