'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  ShieldCheck,
  Search,
  Users,
  CheckCircle2,
  Eye,
  Lock,
  Building2,
  Mail,
} from 'lucide-react';
import { User } from '../types';

interface AdminAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  updatingUserId: string | null;
  onUpdatePermission: (userId: string, canUpload: boolean, canView: boolean) => Promise<void>;
}

export const AdminAccessModal: React.FC<AdminAccessModalProps> = ({
  isOpen,
  onClose,
  users,
  updatingUserId,
  onUpdatePermission,
}) => {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'full' | 'view' | 'none'>('all');

  const employees = useMemo(() => users.filter((u) => !u.is_admin), [users]);

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchesSearch =
        !search.trim() ||
        emp.full_name.toLowerCase().includes(search.toLowerCase()) ||
        emp.email.toLowerCase().includes(search.toLowerCase()) ||
        (emp.department_name || '').toLowerCase().includes(search.toLowerCase());

      if (!matchesSearch) return false;

      const isUploadAndView = emp.can_upload !== false && emp.can_view !== false;
      const isViewOnly = emp.can_upload === false && emp.can_view !== false;
      const isNoAccess = emp.can_view === false;

      if (roleFilter === 'full') return isUploadAndView;
      if (roleFilter === 'view') return isViewOnly;
      if (roleFilter === 'none') return isNoAccess;
      return true;
    });
  }, [employees, search, roleFilter]);

  if (!isOpen) return null;

  const fullCount = employees.filter((e) => e.can_upload !== false && e.can_view !== false).length;
  const viewOnlyCount = employees.filter((e) => e.can_upload === false && e.can_view !== false).length;
  const noAccessCount = employees.filter((e) => e.can_view === false).length;

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-sm">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg text-white">
                  Employee Access & Role Management
                </h3>
                <span className="text-[10px] font-bold bg-indigo-600 text-white px-2.5 py-0.5 rounded-full">
                  EEMW Admin
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Control who can upload, preview, or access documents across all departments
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary Counters & Search Bar */}
        <div className="p-6 pb-4 border-b border-slate-100 space-y-4 bg-slate-50/60">
          {/* Role Filter Pills / Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              type="button"
              onClick={() => setRoleFilter('all')}
              className={`p-3 rounded-2xl border text-left transition-all ${
                roleFilter === 'all'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              <p className={`text-[11px] font-medium ${roleFilter === 'all' ? 'text-slate-300' : 'text-slate-400'}`}>
                Total Employees
              </p>
              <p className="text-lg font-bold mt-0.5">{employees.length}</p>
            </button>

            <button
              type="button"
              onClick={() => setRoleFilter('full')}
              className={`p-3 rounded-2xl border text-left transition-all ${
                roleFilter === 'full'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'
              }`}
            >
              <p className={`text-[11px] font-medium ${roleFilter === 'full' ? 'text-emerald-100' : 'text-emerald-600'}`}>
                Upload & View
              </p>
              <p className="text-lg font-bold mt-0.5">{fullCount}</p>
            </button>

            <button
              type="button"
              onClick={() => setRoleFilter('view')}
              className={`p-3 rounded-2xl border text-left transition-all ${
                roleFilter === 'view'
                  ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300'
              }`}
            >
              <p className={`text-[11px] font-medium ${roleFilter === 'view' ? 'text-amber-100' : 'text-amber-600'}`}>
                View Only
              </p>
              <p className="text-lg font-bold mt-0.5">{viewOnlyCount}</p>
            </button>

            <button
              type="button"
              onClick={() => setRoleFilter('none')}
              className={`p-3 rounded-2xl border text-left transition-all ${
                roleFilter === 'none'
                  ? 'bg-red-600 text-white border-red-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-red-300'
              }`}
            >
              <p className={`text-[11px] font-medium ${roleFilter === 'none' ? 'text-red-100' : 'text-red-600'}`}>
                No Access
              </p>
              <p className="text-lg font-bold mt-0.5">{noAccessCount}</p>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employees by name, email, or department..."
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-white rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Scrollable Employee Table */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Current Status</th>
                  <th className="py-3 px-4 text-right">Assign Access Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredEmployees.length > 0 ? (
                  filteredEmployees.map((emp) => {
                    const isUploadAndView = emp.can_upload !== false && emp.can_view !== false;
                    const isViewOnly = emp.can_upload === false && emp.can_view !== false;
                    const isNoAccess = emp.can_view === false;
                    const isBusy = updatingUserId === emp.id;

                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-full text-white font-bold text-xs flex items-center justify-center flex-shrink-0 ${
                                isNoAccess
                                  ? 'bg-red-600'
                                  : isViewOnly
                                  ? 'bg-amber-600'
                                  : 'bg-blue-600'
                              }`}
                            >
                              {emp.full_name
                                .split(' ')
                                .map((n) => n[0])
                                .join('')}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{emp.full_name}</p>
                              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {emp.email}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            {emp.department_name || 'General'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                              isNoAccess
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : isViewOnly
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            {isNoAccess ? (
                              <>
                                <Lock className="w-3 h-3" />
                                No Access
                              </>
                            ) : isViewOnly ? (
                              <>
                                <Eye className="w-3 h-3" />
                                View Only
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-3 h-3" />
                                Upload & View
                              </>
                            )}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => onUpdatePermission(emp.id, true, true)}
                              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                                isUploadAndView
                                  ? 'bg-emerald-600 text-white shadow-sm'
                                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                              }`}
                            >
                              Upload & View
                            </button>

                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => onUpdatePermission(emp.id, false, true)}
                              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                                isViewOnly
                                  ? 'bg-amber-500 text-white shadow-sm'
                                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                              }`}
                            >
                              View Only
                            </button>

                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => onUpdatePermission(emp.id, false, false)}
                              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                                isNoAccess
                                  ? 'bg-red-600 text-white shadow-sm'
                                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                              }`}
                            >
                              No Access
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      No employees match your search criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Changes are saved immediately to PostgreSQL.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

