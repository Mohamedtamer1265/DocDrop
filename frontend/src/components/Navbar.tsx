'use client';

import React, { useState } from 'react';
import {
  Cloud,
  Search,
  Grid,
  List,
  Upload,
  ChevronDown,
  User as UserIcon,
  Folder,
  ShieldAlert,
} from 'lucide-react';
import { User } from '../types';

interface NavbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedTags: string[];
  onRemoveTag: (tag: string) => void;
  onClearTags: () => void;
  sortBy: 'date' | 'title' | 'size';
  onSortChange: (sort: 'date' | 'title' | 'size') => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (m: 'grid' | 'list') => void;
  users: User[];
  activeUser: User | null;
  onUserChange: (user: User) => void;
  onOpenUpload: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  searchQuery,
  onSearchChange,
  selectedTags,
  onRemoveTag,
  onClearTags,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
  users,
  activeUser,
  onUserChange,
  onOpenUpload,
}) => {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);

  // User initials for avatar
  const initials = activeUser
    ? activeUser.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'DP';

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 px-6 py-3.5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Brand & Breadcrumbs */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center gap-2 cursor-pointer" onClick={onClearTags}>
            <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-300">
              <Cloud className="h-5 w-5 fill-white" />
            </div>
            <span className="font-bold text-lg text-slate-900 tracking-tight">DocDrop</span>
          </div>

          <span className="text-slate-300">/</span>

          {/* Breadcrumbs */}
          <nav className="flex items-center space-x-1 text-sm font-medium">
            <button
              onClick={onClearTags}
              className={`hover:text-blue-600 transition-colors ${
                selectedTags.length === 0 ? 'text-slate-900 font-semibold' : 'text-slate-500'
              }`}
            >
              All Documents
            </button>
            {selectedTags.length > 0 && (
              <>
                <span className="text-slate-400">›</span>
                <div className="flex items-center gap-1 flex-wrap">
                  {selectedTags.map((t) => (
                    <span
                      key={t}
                      className="text-blue-600 font-semibold flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-md text-xs"
                    >
                      <Folder className="w-3 h-3 fill-blue-600 text-blue-600" />
                      {t}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveTag(t);
                        }}
                        className="hover:text-red-500 ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </>
            )}
          </nav>
        </div>

        {/* Middle: Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search documents by title, tag, or uploader..."
            className="w-full pl-10 pr-4 py-2 bg-slate-100 hover:bg-slate-100/80 focus:bg-white text-sm text-slate-900 rounded-full border border-transparent focus:border-blue-500 focus:outline-none transition-all placeholder:text-slate-400"
          />
        </div>

        {/* Right: Controls & User Switcher */}
        <div className="flex items-center space-x-3 self-end md:self-auto">
          {/* Sort By Dropdown */}
          <div className="relative">
            <button
              onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
              className="flex items-center space-x-1 text-sm font-medium text-slate-700 hover:text-slate-900 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
            >
              <span className="text-slate-500">Sort by:</span>
              <span className="capitalize font-semibold">{sortBy}</span>
              <ChevronDown className="h-4 w-4 text-slate-500" />
            </button>

            {sortDropdownOpen && (
              <div
                className="absolute right-0 mt-1.5 w-40 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 z-40 text-sm"
                onMouseLeave={() => setSortDropdownOpen(false)}
              >
                {(
                  [
                    { key: 'date', label: 'Latest Modified' },
                    { key: 'title', label: 'File Name (A–Z)' },
                    { key: 'size', label: 'File Size' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => {
                      onSortChange(opt.key);
                      setSortDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-1.5 hover:bg-slate-50 ${
                      sortBy === opt.key ? 'text-blue-600 font-semibold bg-blue-50/50' : 'text-slate-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => onViewModeChange('grid')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Grid view"
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => onViewModeChange('list')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          {/* User/Department Switcher (Simulates RBAC) */}
          <div className="relative">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center space-x-2 pl-2 pr-3 py-1 bg-slate-100 hover:bg-slate-200/70 rounded-full transition-colors border border-slate-200 text-left"
              title="Switch user to test department permissions"
            >
              <div className="h-7 w-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                {initials}
              </div>
              <div className="hidden sm:block text-xs">
                <p className="font-semibold text-slate-800 leading-tight">
                  {activeUser ? activeUser.full_name : 'Guest'}
                </p>
                <p className="text-[10px] text-slate-500">
                  {activeUser?.department_name || 'All Access'}
                </p>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>

            {userDropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-100 p-2 z-40 text-xs"
                onMouseLeave={() => setUserDropdownOpen(false)}
              >
                <div className="px-3 py-1.5 text-slate-400 font-medium border-b border-slate-100">
                  Select Active Employee (Access Control)
                </div>
                {users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      onUserChange(u);
                      setUserDropdownOpen(false);
                    }}
                    className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left transition-colors ${
                      activeUser?.id === u.id
                        ? 'bg-blue-50 text-blue-700 font-semibold'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="h-6 w-6 rounded-full bg-slate-200 text-slate-700 font-semibold text-[10px] flex items-center justify-center">
                      {u.full_name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </div>
                    <div>
                      <p className="leading-tight">{u.full_name}</p>
                      <p className="text-[10px] text-slate-500 font-normal">
                        Dept: {u.department_name || 'Unassigned'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Upload Button */}
          <button
            onClick={onOpenUpload}
            className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-sm shadow-blue-500/25 transition-all active:scale-95"
          >
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Upload</span>
          </button>
        </div>
      </div>
    </header>
  );
};
