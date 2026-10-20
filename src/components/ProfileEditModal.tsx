import React, { useState, useEffect } from 'react';
import { X, Save, User, Mail, Phone, Building, Briefcase, AlertCircle, Shield, CheckCircle2 } from 'lucide-react';
import { UserSession, Employee } from '../types/inventory.js';
import { api } from '../services/api.js';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserSession;
  employeeRecord?: Employee | null;
  onSuccess: (updatedUser: UserSession) => void;
}

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  employeeRecord,
  onSuccess
}) => {
  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email);
  const [phone, setPhone] = useState(employeeRecord?.phone || '+92 300 8765432');
  const [designation, setDesignation] = useState(employeeRecord?.designation || 'Executive Director');
  const [officeBranch, setOfficeBranch] = useState(currentUser.officeBranch || employeeRecord?.officeBranch || 'Head Office - Islamabad');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name);
      setEmail(currentUser.email);
      setOfficeBranch(currentUser.officeBranch || employeeRecord?.officeBranch || 'Head Office - Islamabad');
    }
    if (employeeRecord) {
      if (employeeRecord.phone) setPhone(employeeRecord.phone);
      if (employeeRecord.designation) setDesignation(employeeRecord.designation);
      if (employeeRecord.fullName) setName(employeeRecord.fullName);
      if (employeeRecord.email) setEmail(employeeRecord.email);
    }
    setError(null);
    setSuccessMsg(null);
  }, [currentUser, employeeRecord, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Full name is required.');
      return;
    }
    if (!email.trim()) {
      setError('Email address is required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const updatedUser = await api.updateUserProfile({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        designation: designation.trim(),
        officeBranch
      });

      // Also ensure employee record EMP-001 is updated directly
      if (employeeRecord?.employeeId) {
        await api.updateEmployee(employeeRecord.employeeId, {
          fullName: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          designation: designation.trim(),
          officeBranch
        });
      }

      setSuccessMsg('Profile successfully updated!');
      setTimeout(() => {
        onSuccess(updatedUser);
        onClose();
      }, 500);
    } catch (err: any) {
      setError(err?.message || 'Failed to update profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100">
        {/* Header with WANG brand colors */}
        <div className="flex items-center justify-between border-b border-[#002254] px-6 py-4 bg-[#003279] text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#f1cc11] text-[#003279] flex items-center justify-center font-black shadow-sm">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Executive Director Profile Settings</h3>
              <p className="text-xs text-[#f1cc11] font-mono flex items-center gap-1.5 font-bold">
                <Shield className="w-3.5 h-3.5 fill-current" />
                Super Admin · {employeeRecord?.employeeId || currentUser.employeeId || 'EMP-001'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Role Indicator Banner */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#003279]" />
              <span className="text-xs font-semibold text-slate-700">Official Role:</span>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-black bg-[#f1cc11] text-[#003279] shadow-xs">
              👑 Super Admin (Executive Director)
            </span>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#003279]" />
              Full Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dr. Salman Khan"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:bg-white focus:ring-2 focus:ring-[#003279] focus:outline-hidden"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-[#003279]" />
              Official Email Address *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="salmankhanroonjha123@gmail.com"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:bg-white focus:ring-2 focus:ring-[#003279] focus:outline-hidden"
            />
          </div>

          {/* Designation & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-[#003279]" />
                Designation / Title
              </label>
              <input
                type="text"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="Executive Director"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:bg-white focus:ring-2 focus:ring-[#003279] focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#003279]" />
                Contact Phone
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+92 300 8765432"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:bg-white focus:ring-2 focus:ring-[#003279] focus:outline-hidden"
              />
            </div>
          </div>

          {/* Office Branch */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-[#003279]" />
              Primary Office Branch
            </label>
            <select
              value={officeBranch}
              onChange={(e) => setOfficeBranch(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:bg-white focus:ring-2 focus:ring-[#003279] focus:outline-hidden"
            >
              <option value="Head Office - Islamabad">Head Office - Islamabad</option>
              <option value="Field Office - Quetta">Field Office - Quetta</option>
              <option value="Field Office - Lasbela">Field Office - Lasbela</option>
              <option value="Regional Office - Karachi">Regional Office - Karachi</option>
            </select>
          </div>

          {/* Footer Buttons */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-[#003279] hover:bg-[#002254] disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Save className="w-4 h-4 text-[#f1cc11]" />
              <span>{isSubmitting ? 'Saving Changes...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
