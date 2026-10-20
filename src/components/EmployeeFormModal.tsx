import React, { useState, useEffect } from 'react';
import { X, Save, User, Mail, Phone, Building, Briefcase, Shield, AlertCircle, PlusCircle, Edit, Sparkles } from 'lucide-react';
import { Employee, UserRole } from '../types/inventory.js';
import { api } from '../services/api.js';

interface EmployeeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeToEdit: Employee | null;
  currentUserRole: UserRole;
  onSuccess: (savedEmployee: Employee) => void;
}

export const EmployeeFormModal: React.FC<EmployeeFormModalProps> = ({
  isOpen,
  onClose,
  employeeToEdit,
  currentUserRole,
  onSuccess
}) => {
  const isEditing = !!employeeToEdit;
  const isExecutiveDirector = employeeToEdit?.employeeId === 'EMP-001';

  const [employeeId, setEmployeeId] = useState('');
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('Admin & Finance');
  const [designation, setDesignation] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [officeBranch, setOfficeBranch] = useState('Head Office - Islamabad');
  const [role, setRole] = useState<UserRole>('Employee');
  const [activeStatus, setActiveStatus] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (employeeToEdit) {
      setEmployeeId(employeeToEdit.employeeId);
      setFullName(employeeToEdit.fullName);
      setDepartment(employeeToEdit.department);
      setDesignation(employeeToEdit.designation);
      setEmail(employeeToEdit.email);
      setPhone(employeeToEdit.phone);
      setOfficeBranch(employeeToEdit.officeBranch);
      setRole(employeeToEdit.role || 'Employee');
      setActiveStatus(employeeToEdit.activeStatus);
      setError(null);
    } else {
      setEmployeeId('');
      setFullName('');
      setDepartment('Admin & Finance');
      setDesignation('');
      setEmail('');
      setPhone('');
      setOfficeBranch('Head Office - Islamabad');
      setRole('Employee');
      setActiveStatus(true);
      setError(null);
    }
  }, [employeeToEdit, isOpen]);

  if (!isOpen) return null;

  const handleRoleSelect = (newRole: UserRole) => {
    setRole(newRole);
    if (!designation) {
      if (newRole === 'Inventory & Finance Admin') {
        setDesignation('Manager Admin & Finance');
        setDepartment('Admin & Finance');
      } else if (newRole === 'IT Administrator') {
        setDesignation('IT Systems Administrator');
        setDepartment('IT Department');
      } else if (newRole === 'Super Admin') {
        setDesignation('Executive Director');
        setDepartment('Executive Management');
      }
    }
  };

  const generateNextId = async () => {
    try {
      const emps = await api.getEmployees();
      const highestNum = emps.reduce((max, e) => {
        const match = e.employeeId.match(/\d+/);
        return match ? Math.max(max, parseInt(match[0], 10)) : max;
      }, 0);
      setEmployeeId(`EMP-${String(highestNum + 1).padStart(3, '0')}`);
    } catch {
      setEmployeeId(`EMP-${Math.floor(100 + Math.random() * 900)}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('Full Name is required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const payload: Partial<Employee> = {
      fullName: fullName.trim(),
      department: department.trim(),
      designation: designation.trim() || 'Staff Member',
      email: email.trim(),
      phone: phone.trim(),
      officeBranch,
      role: isExecutiveDirector ? 'Super Admin' : role,
      activeStatus
    };

    if (!isEditing && employeeId.trim()) {
      payload.employeeId = employeeId.trim().toUpperCase();
    }

    try {
      if (isEditing && employeeToEdit) {
        const res = await api.updateEmployee(employeeToEdit.employeeId, payload);
        onSuccess(res.employee);
      } else {
        const res = await api.createEmployee(payload);
        onSuccess(res.employee);
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save employee profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-100">
        {/* Header with WANG brand colors */}
        <div className="flex items-center justify-between border-b border-[#002254] px-6 py-4 bg-[#003279] text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#f1cc11] text-[#003279] flex items-center justify-center font-black shadow-xs">
              {isEditing ? <Edit className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="font-bold text-white text-base">
                {isEditing ? `Edit Staff Profile: ${employeeToEdit?.fullName}` : 'Register New Employee / Admin'}
              </h3>
              <p className="text-xs text-[#f1cc11] font-medium">
                Official Staff Ledger & Role Delegation
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Full Name & Employee ID */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#003279]" />
                Full Name *
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Ayesha Noor"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:bg-white focus:ring-2 focus:ring-[#003279] focus:outline-hidden"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-800">
                  Employee ID
                </label>
                {!isEditing && (
                  <button
                    type="button"
                    onClick={generateNextId}
                    className="text-[10px] text-[#003279] hover:underline font-bold flex items-center gap-0.5"
                  >
                    <Sparkles className="w-2.5 h-2.5 text-[#f1cc11]" />
                    Auto ID
                  </button>
                )}
              </div>
              <input
                type="text"
                disabled={isEditing}
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value.toUpperCase())}
                placeholder="EMP-XXX"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono uppercase focus:bg-white focus:ring-2 focus:ring-[#003279] focus:outline-hidden disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>
          </div>

          {/* Department & Designation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-[#003279]" />
                Department *
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:bg-white focus:ring-2 focus:ring-[#003279] focus:outline-hidden"
              >
                <option value="Admin & Finance">Admin & Finance</option>
                <option value="IT Department">IT Department</option>
                <option value="Executive Management">Executive Management</option>
                <option value="Finance & Compliance">Finance & Compliance</option>
                <option value="Logistics & Field Support">Logistics & Field Support</option>
                <option value="Program Operations">Program Operations</option>
                <option value="Community Outreach">Community Outreach</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-[#003279]" />
                Designation / Job Title *
              </label>
              <input
                type="text"
                required
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="e.g. Manager Admin & Finance"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:bg-white focus:ring-2 focus:ring-[#003279] focus:outline-hidden"
              />
            </div>
          </div>

          {/* Role Delegation (The 3 Admins + General Employee) */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-black text-slate-900 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-[#003279]" />
                System Role & Administrative Privileges *
              </label>
              <span className="text-[10px] font-bold text-[#003279] bg-[#f1cc11] px-2 py-0.5 rounded">
                3 Key Admins Hierarchy
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Super Admin (Executive Director) assigns organizational governance access:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {/* Role 1: Super Admin */}
              <label className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-2.5 ${
                role === 'Super Admin'
                  ? 'bg-amber-50/90 border-[#f1cc11] ring-2 ring-[#f1cc11] shadow-xs'
                  : 'bg-white border-slate-200 hover:bg-slate-100/70'
              }`}>
                <input
                  type="radio"
                  name="systemRole"
                  value="Super Admin"
                  checked={role === 'Super Admin'}
                  disabled={isExecutiveDirector ? false : currentUserRole !== 'Super Admin'}
                  onChange={() => handleRoleSelect('Super Admin')}
                  className="mt-0.5 text-[#003279]"
                />
                <div>
                  <div className="font-bold text-xs text-slate-900 flex items-center gap-1">
                    <span>👑 Super Admin</span>
                  </div>
                  <span className="text-[10px] font-bold text-[#003279] bg-[#f1cc11] px-1.5 py-0.2 rounded inline-block mt-0.5">
                    Executive Director
                  </span>
                  <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                    Full authority: Add/remove staff, assign admin roles, edit/delete all assets, system-wide settings.
                  </p>
                </div>
              </label>

              {/* Role 2: Inventory & Finance Admin */}
              <label className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-2.5 ${
                role === 'Inventory & Finance Admin'
                  ? 'bg-blue-50/90 border-[#003279] ring-2 ring-[#003279] shadow-xs'
                  : 'bg-white border-slate-200 hover:bg-slate-100/70'
              }`}>
                <input
                  type="radio"
                  name="systemRole"
                  value="Inventory & Finance Admin"
                  checked={role === 'Inventory & Finance Admin'}
                  disabled={isExecutiveDirector || currentUserRole !== 'Super Admin'}
                  onChange={() => handleRoleSelect('Inventory & Finance Admin')}
                  className="mt-0.5 text-[#003279]"
                />
                <div>
                  <div className="font-bold text-xs text-slate-900 flex items-center gap-1">
                    <span>💼 Inventory & Finance Admin</span>
                  </div>
                  <span className="text-[10px] font-bold text-white bg-[#003279] px-1.5 py-0.2 rounded inline-block mt-0.5">
                    Manager Admin & Finance
                  </span>
                  <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                    Full asset registry management: Issue/return assets, stock control, consumables, reports & audits.
                  </p>
                </div>
              </label>

              {/* Role 3: IT Administrator */}
              <label className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-2.5 ${
                role === 'IT Administrator'
                  ? 'bg-indigo-50/90 border-indigo-700 ring-2 ring-indigo-700 shadow-xs'
                  : 'bg-white border-slate-200 hover:bg-slate-100/70'
              }`}>
                <input
                  type="radio"
                  name="systemRole"
                  value="IT Administrator"
                  checked={role === 'IT Administrator'}
                  disabled={isExecutiveDirector || currentUserRole !== 'Super Admin'}
                  onChange={() => handleRoleSelect('IT Administrator')}
                  className="mt-0.5 text-[#003279]"
                />
                <div>
                  <div className="font-bold text-xs text-slate-900 flex items-center gap-1">
                    <span>💻 IT Administrator</span>
                  </div>
                  <span className="text-[10px] font-bold text-indigo-900 bg-indigo-100 px-1.5 py-0.2 rounded inline-block mt-0.5">
                    IT Department
                  </span>
                  <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                    Computing hardware, laptops, network devices, barcode scanning, maintenance & technical custody.
                  </p>
                </div>
              </label>

              {/* Role 4: Employee */}
              <label className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-2.5 ${
                role === 'Employee'
                  ? 'bg-slate-100 border-slate-500 ring-2 ring-slate-500 shadow-xs'
                  : 'bg-white border-slate-200 hover:bg-slate-100/70'
              }`}>
                <input
                  type="radio"
                  name="systemRole"
                  value="Employee"
                  checked={role === 'Employee'}
                  disabled={isExecutiveDirector || currentUserRole !== 'Super Admin'}
                  onChange={() => handleRoleSelect('Employee')}
                  className="mt-0.5 text-[#003279]"
                />
                <div>
                  <div className="font-bold text-xs text-slate-900 flex items-center gap-1">
                    <span>👤 Employee (Staff)</span>
                  </div>
                  <span className="text-[10px] font-medium text-slate-600 bg-slate-200 px-1.5 py-0.2 rounded inline-block mt-0.5">
                    General Staff
                  </span>
                  <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                    Personal equipment custody viewing, submit requisition requests, review handover receipts.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Email & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#003279]" />
                Official Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@wang.org.pk"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:bg-white focus:ring-2 focus:ring-[#003279] focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#003279]" />
                Contact Phone Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+92 300 1234567"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:bg-white focus:ring-2 focus:ring-[#003279] focus:outline-hidden"
              />
            </div>
          </div>

          {/* Office Branch */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-[#003279]" />
              Stationed Office Branch *
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

          {/* Active Status Checkbox */}
          <div className="pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={activeStatus}
                onChange={(e) => setActiveStatus(e.target.checked)}
                className="w-4 h-4 text-[#003279] rounded border-slate-300 focus:ring-[#003279]"
              />
              <span className="text-xs font-semibold text-slate-800">
                Active Staff Member (Eligible for equipment custody)
              </span>
            </label>
          </div>

          {/* Footer */}
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
              <span>{isSubmitting ? 'Saving Profile...' : isEditing ? 'Save Changes' : 'Register Employee'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
