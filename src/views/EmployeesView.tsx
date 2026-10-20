import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  User, 
  Boxes, 
  RotateCcw, 
  Send, 
  Clock, 
  AlertCircle, 
  Calendar, 
  Mail, 
  Phone, 
  Building,
  Printer,
  ChevronRight,
  ArrowLeft,
  CheckCircle2
} from 'lucide-react';
import { Employee, Asset, AssetTransaction, UserRole } from '../types/inventory.js';
import { BarcodeBadge } from '../components/BarcodeBadge.js';
import { api } from '../services/api.js';

interface EmployeesViewProps {
  employees: Employee[];
  allAssets: Asset[];
  userRole: UserRole;
  onOpenIssueForEmployee: (employeeId: string) => void;
  onOpenReturnForAsset: (asset: Asset) => void;
  onPrintVoucher: (asset: Asset, transaction: AssetTransaction) => void;
  canManage: boolean;
}

export const EmployeesView: React.FC<EmployeesViewProps> = ({
  employees,
  allAssets,
  userRole,
  onOpenIssueForEmployee,
  onOpenReturnForAsset,
  onPrintVoucher,
  canManage
}) => {
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [employeeDetails, setEmployeeDetails] = useState<{
    employee: Employee;
    assignedAssets: Asset[];
    history: AssetTransaction[];
  } | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Departments list
  const departments = Array.from(new Set(employees.map(e => e.department)));

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = 
      emp.fullName.toLowerCase().includes(search.toLowerCase()) ||
      emp.employeeId.toLowerCase().includes(search.toLowerCase()) ||
      emp.designation.toLowerCase().includes(search.toLowerCase()) ||
      emp.email.toLowerCase().includes(search.toLowerCase());
    const matchesDept = selectedDept === 'all' || emp.department === selectedDept;
    return matchesSearch && matchesDept;
  });

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

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-800" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Employee Asset Accounts & Custody
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Individual custody ledgers, currently assigned items, return logs, and outstanding equipment.
          </p>
        </div>

        {selectedEmpId && (
          <button
            onClick={handleBackToList}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to All Employees
          </button>
        )}
      </div>

      {/* View: Individual Employee Account */}
      {selectedEmpId && employeeDetails ? (
        <div className="space-y-6">
          {/* Profile Header */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xl shadow-xs shrink-0">
                  {employeeDetails.employee.fullName.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-lg font-bold text-slate-900">
                      {employeeDetails.employee.fullName}
                    </h2>
                    <span className="font-mono text-xs px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-semibold border border-slate-200">
                      {employeeDetails.employee.employeeId}
                    </span>
                    <span className="text-xs font-medium px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded border border-emerald-200">
                      {employeeDetails.employee.activeStatus ? 'Active Staff' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium mt-0.5">
                    {employeeDetails.employee.designation} · {employeeDetails.employee.department}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5" />
                      {employeeDetails.employee.email}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" />
                      {employeeDetails.employee.phone}
                    </span>
                    <span className="flex items-center gap-1">
                      <Building className="w-3.5 h-3.5" />
                      {employeeDetails.employee.officeBranch}
                    </span>
                  </div>
                </div>
              </div>

              {canManage && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <button
                    onClick={() => onOpenIssueForEmployee(employeeDetails.employee.employeeId)}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Issue Asset to Employee
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Section 1: Currently Assigned Assets */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Boxes className="w-4 h-4 text-emerald-700" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Currently Assigned Assets ({employeeDetails.assignedAssets.length})
                </h3>
              </div>
              <span className="text-xs text-slate-500">
                Official Custody Register
              </span>
            </div>

            {employeeDetails.assignedAssets.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No active assets currently assigned to this employee.
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {employeeDetails.assignedAssets.map((asset) => {
                  const isOverdue = asset.dueDate && new Date(asset.dueDate) < new Date();
                  return (
                    <div key={asset.assetId} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-start gap-4">
                        <BarcodeBadge value={asset.assetId} height={38} width={1.4} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">{asset.itemName}</span>
                            <span className="font-mono text-xs text-slate-500">({asset.assetId})</span>
                            <span className="text-[11px] px-2 py-0.5 rounded font-medium bg-blue-50 text-blue-800 border border-blue-200">
                              Issued
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-0.5">
                            {asset.categoryName} · {asset.brand} {asset.model} (Serial: {asset.serialNumber || 'N/A'})
                          </p>
                          <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-slate-500">
                            <span>Condition: <strong>{asset.condition}</strong></span>
                            <span>·</span>
                            <span>Location: {asset.officeBranch} ({asset.buildingRoom})</span>
                            {asset.dueDate && (
                              <>
                                <span>·</span>
                                <span className={isOverdue ? 'font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded' : 'text-slate-600'}>
                                  Due: {asset.dueDate} {isOverdue && '(OVERDUE)'}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {canManage && (
                        <div className="flex items-center gap-2 self-end md:self-center">
                          <button
                            onClick={() => onOpenReturnForAsset(asset)}
                            className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Return Asset
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: Complete Employee Transaction History */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-700" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Historical Issue & Return Audit Trail ({employeeDetails.history.length})
                </h3>
              </div>
              <span className="text-xs text-slate-500">
                Immutable Custody Ledger
              </span>
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
                            tx.transactionType === 'RETURN' ? 'bg-blue-100 text-blue-800' :
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
        /* View: All Employees Directory Table */
        <div className="space-y-4">
          {/* Search & Department Filters */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search employee by name, ID, designation, or email..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-slate-900"
            >
              <option value="all">All Departments</option>
              {departments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Directory Grid / Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEmployees.map((emp) => {
              return (
                <div
                  key={emp.employeeId}
                  onClick={() => handleSelectEmployee(emp.employeeId)}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                          {emp.fullName.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm group-hover:text-emerald-700 transition-colors">
                            {emp.fullName}
                          </h3>
                          <span className="font-mono text-[11px] text-slate-500">
                            {emp.employeeId}
                          </span>
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {emp.department}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600 mb-4">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Designation:</span>
                        <span className="font-medium text-slate-800">{emp.designation}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Office / Branch:</span>
                        <span>{emp.officeBranch}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <Boxes className="w-4 h-4 text-slate-400" />
                      <span className="font-semibold text-slate-900">
                        {emp.assignedAssetCount}
                      </span>
                      <span className="text-slate-500 text-[11px]">assigned asset{emp.assignedAssetCount === 1 ? '' : 's'}</span>
                    </div>

                    <span className="text-emerald-700 font-semibold text-xs flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      View Account
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
