import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  User, 
  Boxes, 
  RotateCcw, 
  Send, 
  Clock, 
  AlertCircle, 
  Mail, 
  Phone, 
  Building, 
  Printer, 
  ChevronRight, 
  ArrowLeft, 
  CheckCircle2, 
  PlusCircle, 
  Edit, 
  Trash2, 
  Shield, 
  ShieldAlert, 
  Sparkles, 
  AlertTriangle, 
  UserCheck,
  Award,
  Laptop,
  Briefcase,
  ChevronDown
} from 'lucide-react';
import { Employee, Asset, AssetTransaction, UserRole, UserSession, LocationRecord } from '../types/inventory.js';
import { BarcodeBadge } from '../components/BarcodeBadge.js';
import { EmployeeFormModal } from '../components/EmployeeFormModal.js';
import { ProfileEditModal } from '../components/ProfileEditModal.js';
import { api } from '../services/api.js';

interface EmployeesViewProps {
  employees: Employee[];
  allAssets: Asset[];
  locations?: LocationRecord[];
  userRole: UserRole;
  currentUser: UserSession;
  onOpenIssueForEmployee: (employeeId: string) => void;
  onOpenReturnForAsset: (asset: Asset) => void;
  onPrintVoucher: (asset: Asset, transaction: AssetTransaction) => void;
  onRefreshData?: () => void;
  onUpdateCurrentUser?: (user: UserSession) => void;
  canManage: boolean;
}

export const EmployeesView: React.FC<EmployeesViewProps> = ({
  employees,
  allAssets,
  locations = [],
  userRole,
  currentUser,
  onOpenIssueForEmployee,
  onOpenReturnForAsset,
  onPrintVoucher,
  onRefreshData,
  onUpdateCurrentUser,
  canManage
}) => {
  const isSuperAdmin = userRole === 'Super Admin';

  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('all');
  
  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState<Employee | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  
  // Quick Role Assignment Modal State
  const [roleAssignEmp, setRoleAssignEmp] = useState<Employee | null>(null);
  const [assigningRole, setAssigningRole] = useState(false);

  // Delete confirmation state
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Detail view state
  const [employeeDetails, setEmployeeDetails] = useState<{
    employee: Employee;
    assignedAssets: Asset[];
    history: AssetTransaction[];
  } | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Departments list
  const departments = useMemo(() => {
    return Array.from(new Set(employees.map(e => e.department))).filter(Boolean);
  }, [employees]);

  // Executive Director profile (EMP-001 or designation contains Executive Director)
  const executiveDirector = useMemo(() => {
    return employees.find(e => e.employeeId === 'EMP-001') ||
      employees.find(e => e.designation.toLowerCase().includes('executive director')) ||
      employees.find(e => e.role === 'Super Admin') ||
      employees[0];
  }, [employees]);

  // The 3 Key Admins
  const superAdminUser = useMemo(() => {
    return employees.find(e => e.role === 'Super Admin' || e.employeeId === 'EMP-001');
  }, [employees]);

  const inventoryAdminUser = useMemo(() => {
    return employees.find(e => e.role === 'Inventory & Finance Admin' || (e.role as any) === 'Inventory Manager' || e.employeeId === 'EMP-002');
  }, [employees]);

  const itAdminUser = useMemo(() => {
    return employees.find(e => e.role === 'IT Administrator' || e.employeeId === 'EMP-004');
  }, [employees]);

  // Role Counts
  const roleCounts = useMemo(() => {
    return {
      total: employees.length,
      superAdmin: employees.filter(e => e.role === 'Super Admin').length,
      inventoryAdmin: employees.filter(e => e.role === 'Inventory & Finance Admin' || (e.role as any) === 'Inventory Manager').length,
      itAdmin: employees.filter(e => e.role === 'IT Administrator').length,
      staff: employees.filter(e => !e.role || e.role === 'Employee').length
    };
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const q = search.toLowerCase().trim();
      const matchesSearch = !q || 
        emp.fullName.toLowerCase().includes(q) ||
        emp.employeeId.toLowerCase().includes(q) ||
        emp.designation.toLowerCase().includes(q) ||
        emp.email.toLowerCase().includes(q) ||
        (emp.phone && emp.phone.includes(q));

      const matchesDept = selectedDept === 'all' || emp.department === selectedDept;

      let matchesRole = true;
      if (selectedRoleFilter !== 'all') {
        if (selectedRoleFilter === 'Super Admin') {
          matchesRole = emp.role === 'Super Admin';
        } else if (selectedRoleFilter === 'Inventory & Finance Admin') {
          matchesRole = emp.role === 'Inventory & Finance Admin' || (emp.role as any) === 'Inventory Manager';
        } else if (selectedRoleFilter === 'IT Administrator') {
          matchesRole = emp.role === 'IT Administrator';
        } else if (selectedRoleFilter === 'Employee') {
          matchesRole = !emp.role || emp.role === 'Employee';
        }
      }

      return matchesSearch && matchesDept && matchesRole;
    });
  }, [employees, search, selectedDept, selectedRoleFilter]);

  const handleSelectEmployee = async (empId: string) => {
    setSelectedEmpId(empId);
    setLoadingDetails(true);
    try {
      const data = await api.getEmployeeById(empId);
      setEmployeeDetails(data);
    } catch (err) {
      console.error('Failed to load employee details', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleBackToList = () => {
    setSelectedEmpId(null);
    setEmployeeDetails(null);
  };

  const handleConfirmDelete = async () => {
    if (!employeeToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      await api.deleteEmployee(employeeToDelete.employeeId);
      setFeedbackMsg({ type: 'success', text: `Employee ${employeeToDelete.fullName} (${employeeToDelete.employeeId}) removed successfully.` });
      setTimeout(() => setFeedbackMsg(null), 4000);
      if (onRefreshData) onRefreshData();
      setEmployeeToDelete(null);
      if (selectedEmpId === employeeToDelete.employeeId) {
        handleBackToList();
      }
    } catch (err: any) {
      setDeleteError(err?.message || 'Failed to remove employee');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAssignRole = async (targetRole: UserRole) => {
    if (!roleAssignEmp) return;
    setAssigningRole(true);
    try {
      await api.updateEmployee(roleAssignEmp.employeeId, { role: targetRole });
      setFeedbackMsg({ type: 'success', text: `Assigned role "${targetRole}" to ${roleAssignEmp.fullName}.` });
      setTimeout(() => setFeedbackMsg(null), 4000);
      if (onRefreshData) onRefreshData();
      setRoleAssignEmp(null);
    } catch (err: any) {
      alert(err?.message || 'Failed to assign role.');
    } finally {
      setAssigningRole(false);
    }
  };

  const getRoleBadge = (role?: UserRole) => {
    switch (role) {
      case 'Super Admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-[#f1cc11] text-[#003279] shadow-xs border border-[#ddba09]">
            <Shield className="w-3 h-3 fill-current" />
            Super Admin
          </span>
        );
      case 'Inventory & Finance Admin':
      case 'Inventory Manager' as any:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-[#003279] text-white shadow-xs border border-[#002254]">
            <Shield className="w-3 h-3 text-[#f1cc11]" />
            Inventory & Finance Admin
          </span>
        );
      case 'IT Administrator':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-indigo-800 text-white shadow-xs border border-indigo-900">
            <Laptop className="w-3 h-3 text-indigo-300" />
            IT Administrator
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            Employee (Staff)
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Feedback banner */}
      {feedbackMsg && (
        <div className={`p-3.5 rounded-xl text-xs font-bold flex items-center justify-between shadow-sm animate-in fade-in duration-200 ${
          feedbackMsg.type === 'success' ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-rose-50 text-rose-900 border border-rose-200'
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{feedbackMsg.text}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
        </div>
      )}

      {/* 1. EXECUTIVE DIRECTOR & TOP GOVERNANCE BANNER */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        {/* Navy Header */}
        <div className="bg-[#003279] p-5 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#f1cc11] text-[#003279] flex items-center justify-center font-black text-xl shadow-md">
              <Award className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-black text-white tracking-tight">
                  Staff Directory & Administrative Governance
                </h1>
                <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-[#f1cc11] text-[#003279]">
                  {employees.length} Members
                </span>
              </div>
              <p className="text-xs text-white/80 mt-0.5">
                Executive Director (Super Admin) authority, 3 official administrative roles, role delegation & asset custody.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Executive Director Profile Edit Button */}
            {executiveDirector && (
              <button
                onClick={() => setIsProfileModalOpen(true)}
                className="px-4 py-2 bg-[#f1cc11] hover:bg-[#ddba09] text-[#003279] rounded-lg text-xs font-black flex items-center gap-2 transition-all shadow-sm"
              >
                <Edit className="w-4 h-4 text-[#003279]" />
                <span>Edit Executive Profile</span>
              </button>
            )}

            {/* Add Employee Button (Super Admin only or Authorized Manager) */}
            {canManage && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/25 rounded-lg text-xs font-bold flex items-center gap-2 transition-all shadow-xs"
              >
                <PlusCircle className="w-4 h-4 text-[#f1cc11]" />
                <span>Add Employee / Admin</span>
              </button>
            )}
          </div>
        </div>

        {/* 2. THE 3 OFFICIAL WANG ADMINS CARDS */}
        <div className="p-5 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-[#003279]" />
              Official WANG 3-Admin Architecture
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              Super Admin assigns administrative rights to staff profiles
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* Admin 1: Super Admin (Executive Director) */}
            <div className="bg-white rounded-xl border-2 border-[#f1cc11] p-4 shadow-xs relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-[#f1cc11] text-[#003279] text-[10px] font-black px-2.5 py-0.5 rounded-bl-lg">
                SUPER ADMIN
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 text-[#003279] flex items-center justify-center font-black text-base shrink-0">
                  👑
                </div>
                <div className="flex-1 min-w-0 pr-12">
                  <h3 className="font-bold text-slate-900 text-sm truncate">
                    {executiveDirector?.fullName || 'Dr. Salman Khan'}
                  </h3>
                  <p className="text-xs font-semibold text-[#003279]">
                    {executiveDirector?.designation || 'Executive Director'}
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono mt-1">
                    {executiveDirector?.employeeId || 'EMP-001'} · {executiveDirector?.department || 'Executive Management'}
                  </p>
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-500 font-medium">Full Governance & Role Delegation</span>
                <button
                  onClick={() => setIsProfileModalOpen(true)}
                  className="text-xs font-bold text-[#003279] hover:underline flex items-center gap-1"
                >
                  <Edit className="w-3 h-3" />
                  <span>Edit</span>
                </button>
              </div>
            </div>

            {/* Admin 2: Inventory & Finance Admin */}
            <div className="bg-white rounded-xl border-2 border-[#003279] p-4 shadow-xs relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-[#003279] text-white text-[10px] font-black px-2.5 py-0.5 rounded-bl-lg">
                INVENTORY & FINANCE
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 text-[#003279] flex items-center justify-center font-black text-base shrink-0">
                  💼
                </div>
                <div className="flex-1 min-w-0 pr-16">
                  <h3 className="font-bold text-slate-900 text-sm truncate">
                    {inventoryAdminUser?.fullName || 'Ayesha Noor'}
                  </h3>
                  <p className="text-xs font-semibold text-[#003279]">
                    {inventoryAdminUser?.designation || 'Manager Admin & Finance'}
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono mt-1">
                    {inventoryAdminUser?.employeeId || 'EMP-002'} · {inventoryAdminUser?.department || 'Admin & Finance'}
                  </p>
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-500 font-medium">Asset Register, Issuance & Audits</span>
                {inventoryAdminUser && (
                  <button
                    onClick={() => setEmployeeToEdit(inventoryAdminUser)}
                    className="text-xs font-bold text-[#003279] hover:underline flex items-center gap-1"
                  >
                    <Edit className="w-3 h-3" />
                    <span>Manage</span>
                  </button>
                )}
              </div>
            </div>

            {/* Admin 3: IT Administrator */}
            <div className="bg-white rounded-xl border-2 border-indigo-700 p-4 shadow-xs relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-indigo-700 text-white text-[10px] font-black px-2.5 py-0.5 rounded-bl-lg">
                IT ADMINISTRATOR
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-900 flex items-center justify-center font-black text-base shrink-0">
                  💻
                </div>
                <div className="flex-1 min-w-0 pr-14">
                  <h3 className="font-bold text-slate-900 text-sm truncate">
                    {itAdminUser?.fullName || 'Fatima Zahra'}
                  </h3>
                  <p className="text-xs font-semibold text-indigo-900">
                    {itAdminUser?.designation || 'IT Systems Administrator'}
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono mt-1">
                    {itAdminUser?.employeeId || 'EMP-004'} · {itAdminUser?.department || 'IT Department'}
                  </p>
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-500 font-medium">IT Infrastructure & Hardware Logs</span>
                {itAdminUser && (
                  <button
                    onClick={() => setEmployeeToEdit(itAdminUser)}
                    className="text-xs font-bold text-indigo-900 hover:underline flex items-center gap-1"
                  >
                    <Edit className="w-3 h-3" />
                    <span>Manage</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 3. Quick Role Metric Filters */}
        <div className="p-4 grid grid-cols-2 sm:grid-cols-5 gap-2.5 bg-white">
          <button
            onClick={() => setSelectedRoleFilter('all')}
            className={`p-3 rounded-lg border text-left transition-all ${
              selectedRoleFilter === 'all'
                ? 'bg-[#003279] text-white border-[#003279] shadow-xs'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <div className="text-[11px] font-semibold opacity-85">All Personnel</div>
            <div className={`text-lg font-black ${selectedRoleFilter === 'all' ? 'text-[#f1cc11]' : 'text-slate-900'}`}>
              {roleCounts.total}
            </div>
          </button>

          <button
            onClick={() => setSelectedRoleFilter('Super Admin')}
            className={`p-3 rounded-lg border text-left transition-all ${
              selectedRoleFilter === 'Super Admin'
                ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100/70'
            }`}
          >
            <div className="text-[11px] font-semibold opacity-85">Super Admin</div>
            <div className="text-lg font-black text-amber-800">
              {roleCounts.superAdmin} <span className="text-[10px] font-normal">(Executive Director)</span>
            </div>
          </button>

          <button
            onClick={() => setSelectedRoleFilter('Inventory & Finance Admin')}
            className={`p-3 rounded-lg border text-left transition-all ${
              selectedRoleFilter === 'Inventory & Finance Admin'
                ? 'bg-[#003279] text-white border-[#003279] shadow-xs'
                : 'bg-blue-50 text-[#003279] border-blue-200 hover:bg-blue-100/70'
            }`}
          >
            <div className="text-[11px] font-semibold opacity-85">Inventory & Finance</div>
            <div className="text-lg font-black text-[#003279]">
              {roleCounts.inventoryAdmin}
            </div>
          </button>

          <button
            onClick={() => setSelectedRoleFilter('IT Administrator')}
            className={`p-3 rounded-lg border text-left transition-all ${
              selectedRoleFilter === 'IT Administrator'
                ? 'bg-indigo-700 text-white border-indigo-700 shadow-xs'
                : 'bg-indigo-50 text-indigo-900 border-indigo-200 hover:bg-indigo-100/70'
            }`}
          >
            <div className="text-[11px] font-semibold opacity-85">IT Administrator</div>
            <div className="text-lg font-black text-indigo-800">
              {roleCounts.itAdmin}
            </div>
          </button>

          <button
            onClick={() => setSelectedRoleFilter('Employee')}
            className={`p-3 rounded-lg border text-left transition-all col-span-2 sm:col-span-1 ${
              selectedRoleFilter === 'Employee'
                ? 'bg-slate-800 text-white border-slate-800 shadow-xs'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <div className="text-[11px] font-semibold opacity-85">General Staff</div>
            <div className="text-lg font-black text-slate-800">
              {roleCounts.staff}
            </div>
          </button>
        </div>
      </div>

      {/* DETAIL VIEW: INDIVIDUAL EMPLOYEE CUSTODY ACCOUNT */}
      {selectedEmpId && employeeDetails ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBackToList}
              className="px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Staff Directory</span>
            </button>

            {canManage && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEmployeeToEdit(employeeDetails.employee)}
                  className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
                >
                  <Edit className="w-3.5 h-3.5 text-[#003279]" />
                  <span>Edit Profile & Roles</span>
                </button>

                <button
                  onClick={() => onOpenIssueForEmployee(employeeDetails.employee.employeeId)}
                  className="px-3.5 py-1.5 bg-[#003279] hover:bg-[#002254] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs"
                >
                  <Send className="w-3.5 h-3.5 text-[#f1cc11]" />
                  <span>Issue New Asset</span>
                </button>
              </div>
            )}
          </div>

          {/* Profile Header Card */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-[#003279] text-[#f1cc11] flex items-center justify-center font-black text-xl shadow-xs shrink-0">
                  {employeeDetails.employee.fullName.charAt(0)}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="text-lg font-black text-slate-900">
                      {employeeDetails.employee.fullName}
                    </h2>
                    {getRoleBadge(employeeDetails.employee.role)}
                    <span className="font-mono text-xs text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded">
                      {employeeDetails.employee.employeeId}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 font-medium mt-1">
                    {employeeDetails.employee.designation} · {employeeDetails.employee.department}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      {employeeDetails.employee.email || 'No email registered'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {employeeDetails.employee.phone || 'No phone'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Building className="w-3.5 h-3.5 text-slate-400" />
                      {employeeDetails.employee.officeBranch}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 flex items-center gap-4">
                <div className="text-center px-2">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Assigned Items</span>
                  <span className="text-xl font-black text-[#003279] font-mono">
                    {employeeDetails.assignedAssets.length}
                  </span>
                </div>
                <div className="h-8 w-px bg-slate-200" />
                <div className="text-center px-2">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Total Transactions</span>
                  <span className="text-xl font-black text-slate-800 font-mono">
                    {employeeDetails.history.length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 1: Active Custody Equipment */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 bg-[#003279] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Boxes className="w-4 h-4 text-[#f1cc11]" />
                <h3 className="font-bold text-sm">
                  Currently Assigned Fixed Assets ({employeeDetails.assignedAssets.length})
                </h3>
              </div>
              <span className="text-xs text-white/75 font-mono">
                Active Custody
              </span>
            </div>

            {employeeDetails.assignedAssets.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                <UserCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">No active assets currently in custody.</p>
                <p className="text-slate-400 text-[11px] mt-0.5">Use "Issue New Asset" to check out equipment to this staff member.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {employeeDetails.assignedAssets.map((asset) => {
                  const isOverdue = asset.dueDate && new Date(asset.dueDate) < new Date();
                  return (
                    <div key={asset.assetId} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded bg-blue-50 border border-blue-200 text-[#003279] flex items-center justify-center shrink-0 font-bold">
                          <Boxes className="w-5 h-5 text-[#003279]" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-[#003279]">
                              {asset.assetId}
                            </span>
                            <span className="font-semibold text-slate-900 text-xs">
                              {asset.itemName}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {asset.categoryName} · Serial: <code className="font-mono text-slate-700">{asset.serialNumber || 'N/A'}</code>
                          </p>
                          <div className="flex items-center gap-3 mt-1.5 text-[11px]">
                            <span className="text-slate-600">Location: <strong>{asset.buildingRoom}</strong></span>
                            {asset.dueDate && (
                              <span className={`flex items-center gap-1 font-medium ${isOverdue ? 'text-rose-600 font-bold' : 'text-slate-500'}`}>
                                <Clock className="w-3 h-3" />
                                Return Due: {asset.dueDate} {isOverdue && '(OVERDUE)'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-center">
                        {canManage && (
                          <button
                            onClick={() => onOpenReturnForAsset(asset)}
                            className="px-3 py-1.5 bg-[#f1cc11] hover:bg-[#ddba09] text-[#003279] font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Process Return</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: Custody & Issuance History */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <h3 className="font-bold text-sm text-slate-900">
                  Custody & Transaction History ({employeeDetails.history.length})
                </h3>
              </div>
            </div>

            {employeeDetails.history.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No past transactions recorded for this employee.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 uppercase tracking-wider text-[10px] font-semibold">
                    <tr>
                      <th className="py-2.5 px-4">Transaction ID</th>
                      <th className="py-2.5 px-4">Type</th>
                      <th className="py-2.5 px-4">Asset ID & Name</th>
                      <th className="py-2.5 px-4">Timestamp</th>
                      <th className="py-2.5 px-4">Condition</th>
                      <th className="py-2.5 px-4">Authorized By</th>
                      <th className="py-2.5 px-4">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {employeeDetails.history.map((tx) => (
                      <tr key={tx.transactionId} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-600">{tx.transactionId}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                            tx.transactionType === 'ISSUE' ? 'bg-emerald-100 text-emerald-800' :
                            tx.transactionType === 'RETURN' ? 'bg-blue-100 text-[#003279]' :
                            'bg-slate-100 text-slate-800'
                          }`}>
                            {tx.transactionType}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900 block">{tx.assetName}</span>
                          <span className="font-mono text-slate-500 text-[10px]">{tx.assetId}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {new Date(tx.timestamp).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-slate-700">{tx.condition}</td>
                        <td className="py-3 px-4 text-slate-700">{tx.performedByName}</td>
                        <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{tx.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* DIRECTORY VIEW: ALL EMPLOYEES & ADMINS */
        <div className="space-y-4">
          {/* Search & Department Filters */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search staff by name, employee ID, designation, or email..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-[#003279] focus:outline-hidden"
              />
            </div>

            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-[#003279] focus:outline-hidden"
            >
              <option value="all">All Departments ({departments.length})</option>
              {departments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Directory Grid / Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEmployees.map((emp) => {
              const isExec = emp.employeeId === 'EMP-001' || emp.designation.toLowerCase().includes('executive director');

              return (
                <div
                  key={emp.employeeId}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-400 hover:shadow-md transition-all flex flex-col justify-between group relative"
                >
                  <div>
                    {/* Top Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm shadow-xs ${
                          emp.role === 'Super Admin'
                            ? 'bg-[#f1cc11] text-[#003279]'
                            : emp.role === 'Inventory & Finance Admin'
                              ? 'bg-[#003279] text-white'
                              : emp.role === 'IT Administrator'
                                ? 'bg-indigo-800 text-white'
                                : 'bg-slate-800 text-white'
                        }`}>
                          {emp.fullName.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 
                              onClick={() => handleSelectEmployee(emp.employeeId)}
                              className="font-bold text-slate-900 text-sm group-hover:text-[#003279] transition-colors cursor-pointer"
                            >
                              {emp.fullName}
                            </h3>
                          </div>
                          <span className="font-mono text-[11px] text-slate-500 font-semibold">
                            {emp.employeeId}
                          </span>
                        </div>
                      </div>

                      <div>
                        {getRoleBadge(emp.role)}
                      </div>
                    </div>

                    {/* Department & Designation */}
                    <div className="space-y-1 text-xs text-slate-600 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <div>
                        <span className="text-slate-400 block text-[10px] font-semibold uppercase">Designation & Department:</span>
                        <span className="font-bold text-slate-900">{emp.designation}</span>
                        <span className="text-slate-500 block text-[11px]">{emp.department}</span>
                      </div>
                      <div className="pt-1.5 border-t border-slate-200/60 mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
                        <span>{emp.officeBranch}</span>
                        <span className="font-mono text-slate-400">{emp.phone || emp.email}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Custody Count */}
                  <div>
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <Boxes className="w-4 h-4 text-[#003279]" />
                        <span className="font-bold text-slate-900 font-mono">
                          {emp.assignedAssetCount}
                        </span>
                        <span className="text-slate-500 text-[11px]">in custody</span>
                      </div>

                      <div className="flex items-center gap-1">
                        {/* Super Admin: Quick Assign Admin Role Button */}
                        {isSuperAdmin && !isExec && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRoleAssignEmp(emp);
                            }}
                            title="Assign Administrative Role"
                            className="p-1.5 text-slate-500 hover:text-[#003279] hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-200"
                          >
                            <Shield className="w-3.5 h-3.5 text-[#003279]" />
                          </button>
                        )}

                        {/* Edit Employee / Profile Button */}
                        {canManage && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isExec) {
                                setIsProfileModalOpen(true);
                              } else {
                                setEmployeeToEdit(emp);
                              }
                            }}
                            title={isExec ? "Edit Executive Profile" : "Edit Profile & Role"}
                            className="p-1.5 text-slate-600 hover:text-[#003279] hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Delete Employee Button (Super Admin only, protected for EMP-001) */}
                        {isSuperAdmin && !isExec && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEmployeeToDelete(emp);
                            }}
                            title="Remove Employee"
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* View Custody Link */}
                        <button
                          type="button"
                          onClick={() => handleSelectEmployee(emp.employeeId)}
                          className="px-2.5 py-1 text-[#003279] font-bold text-xs flex items-center gap-1 hover:bg-blue-50 rounded-lg transition-colors ml-1"
                        >
                          <span>Ledger</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL 1: Add / Edit Employee Modal */}
      {(isCreateModalOpen || employeeToEdit) && (
        <EmployeeFormModal
          isOpen={isCreateModalOpen || !!employeeToEdit}
          onClose={() => {
            setIsCreateModalOpen(false);
            setEmployeeToEdit(null);
          }}
          employeeToEdit={employeeToEdit}
          currentUserRole={userRole}
          locations={locations}
          existingDepartments={departments}
          onSuccess={() => {
            if (onRefreshData) onRefreshData();
            if (selectedEmpId) handleSelectEmployee(selectedEmpId);
          }}
        />
      )}

      {/* MODAL 2: Executive Director Profile Modal */}
      {isProfileModalOpen && executiveDirector && (
        <ProfileEditModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          currentUser={currentUser}
          employeeRecord={executiveDirector}
          locations={locations}
          onSuccess={(updatedUser) => {
            if (onUpdateCurrentUser) onUpdateCurrentUser(updatedUser);
            if (onRefreshData) onRefreshData();
          }}
        />
      )}

      {/* MODAL 3: Quick Role Assignment Modal (Super Admin Authority) */}
      {roleAssignEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden p-6 animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#003279] text-[#f1cc11] flex items-center justify-center font-bold">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Assign Administrative Role
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {roleAssignEmp.fullName} ({roleAssignEmp.employeeId})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRoleAssignEmp(null)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-3">
              As <strong>Super Admin (Executive Director)</strong>, select the administrative role to grant to this staff member:
            </p>

            <div className="space-y-2">
              <button
                type="button"
                disabled={assigningRole}
                onClick={() => handleAssignRole('Inventory & Finance Admin')}
                className="w-full text-left p-3 rounded-lg border border-[#003279] hover:bg-blue-50/60 transition-colors flex items-center justify-between group"
              >
                <div>
                  <div className="font-bold text-xs text-[#003279] flex items-center gap-1.5">
                    <span>💼 Inventory & Finance Admin</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Manager Admin & Finance: Issue/return assets, stock control, reports.
                  </p>
                </div>
                {roleAssignEmp.role === 'Inventory & Finance Admin' && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">Current</span>
                )}
              </button>

              <button
                type="button"
                disabled={assigningRole}
                onClick={() => handleAssignRole('IT Administrator')}
                className="w-full text-left p-3 rounded-lg border border-indigo-700 hover:bg-indigo-50/60 transition-colors flex items-center justify-between group"
              >
                <div>
                  <div className="font-bold text-xs text-indigo-900 flex items-center gap-1.5">
                    <span>💻 IT Administrator</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    IT Department: IT hardware, barcode scanning, laptops, network audits.
                  </p>
                </div>
                {roleAssignEmp.role === 'IT Administrator' && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">Current</span>
                )}
              </button>

              <button
                type="button"
                disabled={assigningRole}
                onClick={() => handleAssignRole('Employee')}
                className="w-full text-left p-3 rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors flex items-center justify-between group"
              >
                <div>
                  <div className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <span>👤 Employee (General Staff)</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Standard employee: View personal equipment custody & submit requests.
                  </p>
                </div>
                {(!roleAssignEmp.role || roleAssignEmp.role === 'Employee') && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">Current</span>
                )}
              </button>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setRoleAssignEmp(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Delete Employee Confirmation Modal */}
      {employeeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden p-6 animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 text-base">
                  Remove Employee from Registry?
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Are you sure you want to remove <strong>{employeeToDelete.fullName}</strong> (<code>{employeeToDelete.employeeId}</code>)?
                </p>

                {employeeToDelete.assignedAssetCount > 0 && (
                  <div className="mt-2.5 p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-900 text-xs">
                    ⚠️ <strong>Action Blocked:</strong> This staff member currently has <strong>{employeeToDelete.assignedAssetCount}</strong> item(s) in custody. You must process return or transfer of these assets before removing the employee record.
                  </div>
                )}

                {deleteError && (
                  <div className="mt-2 text-xs text-rose-600 font-semibold">
                    {deleteError}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEmployeeToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting || employeeToDelete.assignedAssetCount > 0}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Removing...' : 'Confirm Remove'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
