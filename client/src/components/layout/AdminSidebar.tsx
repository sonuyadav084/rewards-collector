import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileText, UploadCloud, Database, Download, Layers } from 'lucide-react';

export const AdminSidebar: React.FC = () => {
  const navItems = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/submissions', label: 'Submissions', icon: FileText },
    { to: '/admin/templates', label: 'Card Templates', icon: Layers },
    { to: '/admin/import', label: 'Import Coupons', icon: UploadCloud },
    { to: '/admin/coupons', label: 'Registered Catalog', icon: Database },
    { to: '/admin/reports', label: 'Export Reports', icon: Download },
  ];

  return (
    <aside className="w-full md:w-64 bg-white border-r border-slate-200/80 shrink-0 md:min-h-[calc(100vh-4rem)] p-3">
      <div className="px-3 py-3 border-b border-slate-100 hidden md:flex items-center mb-2">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Navigation</span>
      </div>
      <nav className="space-y-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 border border-indigo-200/60 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
};
