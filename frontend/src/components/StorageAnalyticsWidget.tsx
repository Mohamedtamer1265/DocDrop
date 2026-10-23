'use client';

import React, { useState } from 'react';
import {
  HardDrive,
  ChevronDown,
  ChevronUp,
  Layers,
  FileText,
  Building2,
  PieChart,
} from 'lucide-react';
import { StorageAnalytics } from '../types';

interface StorageAnalyticsWidgetProps {
  analytics: StorageAnalytics | null;
}

export const StorageAnalyticsWidget: React.FC<StorageAnalyticsWidgetProps> = ({ analytics }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!analytics) return null;

  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const usagePercent = Math.min(
    100,
    Math.max(
      analytics.total_bytes > 0 ? 2 : 0,
      Math.round((analytics.total_bytes / analytics.quota_bytes) * 100)
    )
  );

  const categoryColors: Record<string, string> = {
    'PDF Documents': 'bg-red-500',
    Images: 'bg-emerald-500',
    Spreadsheets: 'bg-green-600',
    'Word Docs': 'bg-blue-600',
    'Text & Code': 'bg-amber-500',
    'Other Files': 'bg-purple-500',
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      {/* Compact Summary Bar */}
      <div className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Repository Storage & Analytics
              </h3>
              <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                {formatSize(analytics.total_bytes)} / {formatSize(analytics.quota_bytes)}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-56 sm:w-72 h-2 bg-slate-100 rounded-full overflow-hidden mt-1.5 flex">
              {analytics.by_type.length > 0 ? (
                analytics.by_type.map((t) => {
                  const pct =
                    analytics.total_bytes > 0
                      ? Math.max(4, Math.round((t.bytes / analytics.total_bytes) * usagePercent))
                      : 0;
                  return (
                    <div
                      key={t.category}
                      style={{ width: `${pct}%` }}
                      className={`${categoryColors[t.category] || 'bg-blue-600'} h-full first:rounded-l-full last:rounded-r-full`}
                      title={`${t.category}: ${formatSize(t.bytes)}`}
                    />
                  );
                })
              ) : (
                <div style={{ width: '0%' }} className="bg-blue-600 h-full rounded-full" />
              )}
            </div>
          </div>
        </div>

        {/* Quick Counters & Expand Button */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-4 text-xs text-slate-600 border-r border-slate-200 pr-4">
            <div className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-500" />
              <span className="font-bold text-slate-900">{analytics.total_documents}</span>
              <span className="text-slate-400">Documents</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              <span className="font-bold text-slate-900">{analytics.total_versions}</span>
              <span className="text-slate-400">Total Revisions</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 bg-slate-50 hover:bg-blue-50/60 px-3 py-1.5 rounded-xl border border-slate-200/80 transition-colors"
          >
            <PieChart className="w-3.5 h-3.5" />
            <span>{isExpanded ? 'Hide Analytics' : 'Storage Breakdown'}</span>
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded Breakdown Panel */}
      {isExpanded && (
        <div className="px-5 py-4 bg-slate-50/70 border-t border-slate-200/80 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {/* Breakdown by Department */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-slate-700 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              Storage by Department
            </h4>
            {analytics.by_department.length > 0 ? (
              <div className="space-y-2">
                {analytics.by_department.map((dept) => {
                  const pct =
                    analytics.total_bytes > 0
                      ? Math.round((dept.bytes / analytics.total_bytes) * 100)
                      : 0;
                  return (
                    <div
                      key={dept.department}
                      className="p-2.5 bg-white rounded-xl border border-slate-200/70 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800">{dept.department}</span>
                        <span className="text-slate-500 font-mono">
                          {dept.count} {dept.count === 1 ? 'doc' : 'docs'} • {formatSize(dept.bytes)} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${Math.max(pct, dept.bytes > 0 ? 4 : 0)}%` }}
                          className="h-full bg-blue-600 rounded-full"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-slate-400">No department usage recorded yet.</p>
            )}
          </div>

          {/* Breakdown by File Format */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-slate-700 flex items-center gap-1.5">
              <PieChart className="w-3.5 h-3.5 text-indigo-600" />
              Storage by File Type (Across All Revisions)
            </h4>
            {analytics.by_type.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {analytics.by_type.map((item) => (
                  <div
                    key={item.category}
                    className="p-2.5 bg-white rounded-xl border border-slate-200/70 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          categoryColors[item.category] || 'bg-blue-600'
                        }`}
                      />
                      <div>
                        <p className="font-semibold text-slate-800">{item.category}</p>
                        <p className="text-[11px] text-slate-400">
                          {item.count} {item.count === 1 ? 'version' : 'versions'}
                        </p>
                      </div>
                    </div>
                    <span className="font-mono font-semibold text-slate-700">
                      {formatSize(item.bytes)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400">No files stored yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

