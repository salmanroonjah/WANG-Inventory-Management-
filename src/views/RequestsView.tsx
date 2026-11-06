import React, { useState } from 'react';
import { ClipboardList, PlusCircle, CheckCircle2, XCircle, Clock, Check } from 'lucide-react';
import { AssetRequest, Employee, UserRole, UserSession } from '../types/inventory.js';
import { api, APPROVER_ROLES, MANAGER_ROLES } from '../services/api.js';

interface RequestsViewProps {
  requests: AssetRequest[];
  employees: Employee[];
  currentUser: UserSession;
  userRole: UserRole;
  onRefresh: () => void;
}

const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const RequestsView: React.FC<RequestsViewProps> = ({
  requests,
  employees,
  currentUser,
  userRole,
  onRefresh
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [itemType, setItemType] = useState<'Fixed Asset' | 'Consumable'>('Fixed Asset');
  const [itemDescription, setItemDescription] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [businessJustification, setBusinessJustification] = useState('');
  const [requiredDate, setRequiredDate] = useState(localToday());
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const canApprove = APPROVER_ROLES.includes(userRole);
  // Managers/approvers can file on behalf of staff; everyone else files for themselves.
  const canFileForOthers = canApprove || MANAGER_ROLES.includes(userRole);
  // Staff see only their own requests; managers/approvers see all.
  const visibleRequests = canFileForOthers
    ? requests
    : requests.filter((r) => r.requestingEmployeeId === currentUser.employeeId);
  const requestableEmployees = canFileForOthers
    ? employees.filter((e) => e.activeStatus)
    : employees.filter((e) => e.employeeId === currentUser.employeeId);

  const openForm = () => {
    setSelectedEmpId(currentUser.employeeId && employees.some((e) => e.employeeId === currentUser.employeeId) ? currentUser.employeeId : '');
    setItemType('Fixed Asset');
    setItemDescription('');
    setQuantity(1);
    setBusinessJustification('');
    setRequiredDate(localToday());
    setFormError(null);
    setIsCreating(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpId) {
      setFormError('Select the staff member making the request.');
      return;
    }
    setIsSubmitting(true);
    setFormError(null);
    try {
      await api.createRequest({
        requestingEmployeeId: selectedEmpId,
        itemType,
        itemDescription,
        quantity,
        businessJustification,
        requiredDate
      });
      setIsCreating(false);
      onRefresh();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to submit request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (requestId: string, status: 'Approved' | 'Rejected' | 'Fulfilled') => {
    let rejectionReason: string | undefined;
    if (status === 'Rejected') {
      const reason = window.prompt('Reason for rejecting this request:');
      if (reason === null) return;
      rejectionReason = reason.trim() || undefined;
    }
    setBusyId(requestId);
    setActionError(null);
    try {
      await api.updateRequestStatus(requestId, status, { rejectionReason });
      onRefresh();
    } catch (err: any) {
      setActionError(err?.message || 'Failed to update request.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-slate-800" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Asset & Supplies Requisition Workflow
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Submit equipment requisitions, review business justifications, and route for managerial approval.
          </p>
        </div>

        <button
          onClick={openForm}
          className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
        >
          <PlusCircle className="w-4 h-4" />
          Submit New Request
        </button>
      </div>

      {/* New Request Modal */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 p-6 w-full max-w-lg">
            <h3 className="font-bold text-slate-900 text-sm pb-2 border-b border-slate-100 mb-4">
              Submit Equipment Requisition
            </h3>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Requesting Staff Member *</label>
                <select
                  required
                  value={selectedEmpId}
                  onChange={(e) => setSelectedEmpId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900"
                >
                  <option value="">-- Select Staff Member --</option>
                  {requestableEmployees.map(e => (
                    <option key={e.employeeId} value={e.employeeId}>{e.fullName} ({e.designation})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Item Classification *</label>
                  <select
                    value={itemType}
                    onChange={(e) => setItemType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="Fixed Asset">Fixed Asset (Tagged Equipment)</option>
                    <option value="Consumable">Consumable (Office Supplies)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Quantity Required *</label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Item Description & Specifications *</label>
                <input
                  type="text"
                  required
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                  placeholder="e.g. Dell 27 Monitor for GIS data map alignment"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Required By *</label>
                <input
                  type="date"
                  required
                  min={localToday()}
                  value={requiredDate}
                  onChange={(e) => setRequiredDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Business Justification *</label>
                <textarea
                  rows={2}
                  required
                  value={businessJustification}
                  onChange={(e) => setBusinessJustification(e.target.value)}
                  placeholder="Explain why this equipment is needed for project execution..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {formError && <p className="p-2 rounded bg-rose-50 border border-rose-200 text-rose-800">{formError}</p>}

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-semibold rounded-lg shadow-xs"
                >
                  {isSubmitting ? 'Submitting…' : 'Submit For Approval'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {actionError && (
        <div className="p-3 rounded-lg border border-rose-300 bg-rose-50 text-rose-900 text-xs">{actionError}</div>
      )}

      {/* Requests Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 uppercase tracking-wider text-[10px] font-semibold">
              <tr>
                <th className="py-2.5 px-4">Req #</th>
                <th className="py-2.5 px-4">Item & Qty</th>
                <th className="py-2.5 px-4">Requesting Staff</th>
                <th className="py-2.5 px-4">Department</th>
                <th className="py-2.5 px-4">Justification</th>
                <th className="py-2.5 px-4">Status</th>
                {canApprove && <th className="py-2.5 px-4 text-right">Approval Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {visibleRequests.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">No requests yet.</td>
                </tr>
              )}
              {visibleRequests.map((r) => (
                <tr key={r.requestId} className="hover:bg-slate-50">
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{r.requestNumber}</td>
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-slate-900 block">{r.itemDescription}</span>
                    <span className="text-[11px] text-slate-500 font-mono">Qty: {r.quantity} · {r.itemType}</span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-800 font-medium">{r.requestingEmployeeName}</td>
                  <td className="py-3.5 px-4 text-slate-600">{r.department}</td>
                  <td className="py-3.5 px-4 text-slate-600 max-w-xs">{r.businessJustification}</td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                      r.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                      r.status === 'Pending' ? 'bg-amber-100 text-amber-800' :
                      r.status === 'Fulfilled' ? 'bg-blue-100 text-blue-800' :
                      'bg-rose-100 text-rose-800'
                    }`}>
                      {r.status}
                    </span>
                    {r.approverName && (
                      <span className="block text-[10px] text-slate-500 mt-1">by {r.approverName}</span>
                    )}
                    {r.rejectionReason && (
                      <span className="block text-[10px] text-rose-700 mt-0.5 max-w-[160px] whitespace-normal">{r.rejectionReason}</span>
                    )}
                  </td>
                  {canApprove && (
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {r.status === 'Pending' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            disabled={busyId === r.requestId}
                            onClick={() => handleUpdateStatus(r.requestId, 'Approved')}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded text-[11px] flex items-center gap-1 shadow-xs"
                          >
                            <Check className="w-3 h-3" /> Approve
                          </button>
                          <button
                            disabled={busyId === r.requestId}
                            onClick={() => handleUpdateStatus(r.requestId, 'Rejected')}
                            className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 font-semibold rounded text-[11px]"
                          >
                            Reject
                          </button>
                        </div>
                      ) : r.status === 'Approved' ? (
                        <button
                          disabled={busyId === r.requestId}
                          onClick={() => handleUpdateStatus(r.requestId, 'Fulfilled')}
                          className="px-2.5 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 font-semibold rounded text-[11px]"
                        >
                          Mark Handed Over
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400">Finalized</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
