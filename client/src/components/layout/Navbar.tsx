import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Ticket,
  History,
  LogOut,
  Smartphone,
  User,
  ChevronDown,
  ShieldCheck,
  KeyRound,
} from 'lucide-react';
import { ChangePasswordModal } from '../admin/ChangePasswordModal';

export const Navbar: React.FC = () => {
  const {
    customerMobile,
    customerName,
    adminUser,
    isCustomerAuthenticated,
    isAdminAuthenticated,
    logoutCustomer,
    logoutAdmin,
  } = useAuth();
  const location = useLocation();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const isAdminSection = location.pathname.startsWith('/admin');

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };

    if (isProfileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileOpen]);

  // Close dropdown on navigation
  useEffect(() => {
    setIsProfileOpen(false);
  }, [location.pathname]);

  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 select-none cursor-default">
              <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-200">
                <Ticket className="w-5 h-5 rotate-45" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full border-2 border-white flex items-center justify-center">
                  <span className="w-1.5 h-1.5 bg-amber-600 rounded-full animate-ping" />
                </div>
              </div>
              <div>
                <span className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-1">
                  Coupon<span className="text-indigo-600">Verify</span>
                </span>
                <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase block -mt-0.5">
                  Secure Validation Hub
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center gap-2 sm:gap-3">
            {!isAdminSection ? (
              isCustomerAuthenticated ? (
                <>
                  <Link
                    to="/"
                    className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
                      location.pathname === '/'
                        ? 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 border border-indigo-200/60 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                    }`}
                  >
                    Submit Coupon
                  </Link>

                  <Link
                    to="/history"
                    className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                      location.pathname === '/history'
                        ? 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 border border-indigo-200/60 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                    }`}
                  >
                    <History className="w-4 h-4 text-indigo-500" />
                    <span>Submission History</span>
                  </Link>

                  {/* User Profile Avatar Icon & Dropdown */}
                  <div className="relative ml-1" ref={profileRef}>
                  <button
                    type="button"
                    onClick={() => setIsProfileOpen((prev) => !prev)}
                    className="relative w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-sm hover:scale-105 active:scale-95 transition-transform ring-2 ring-indigo-100 hover:ring-indigo-300 cursor-pointer"
                    title="User Profile & History"
                  >
                    {customerName ? (
                      <span>{getInitials(customerName)}</span>
                    ) : (
                      <User className="w-5 h-5 text-white" />
                    )}
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                  </button>

                  {/* Dropdown Menu Card */}
                  {isProfileOpen && (
                    <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-2 z-50 animate-fade-in origin-top-right overflow-hidden">
                      {/* Header with User Info */}
                      <div className="px-4 py-3 bg-gradient-to-b from-slate-50/80 to-white border-b border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-indigo-100 shrink-0">
                            {customerName ? getInitials(customerName) : <User className="w-5 h-5 text-white" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-sm font-extrabold text-slate-900 truncate">
                                {customerName || (isCustomerAuthenticated ? 'Customer' : 'Guest User')}
                              </h4>
                              {isCustomerAuthenticated && (
                                <span title="Verified Customer">
                                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                </span>
                              )}
                            </div>
                            {customerMobile ? (
                              <p className="text-xs text-slate-500 font-mono flex items-center gap-1 mt-0.5 truncate">
                                <Smartphone className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{customerMobile}</span>
                              </p>
                            ) : (
                              <p className="text-[11px] text-slate-400 mt-0.5">Not signed in yet</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Logout option when authenticated */}
                      {isCustomerAuthenticated && (
                        <div className="p-1.5">
                          <button
                            onClick={() => {
                              setIsProfileOpen(false);
                              logoutCustomer();
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                              <LogOut className="w-4 h-4" />
                            </div>
                            <div className="flex-1 text-left">
                              <div className="font-bold">Sign Out</div>
                            </div>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : null
            ) : (
              // Admin Section Header View
              isAdminAuthenticated ? (
                <div className="flex items-center gap-3">
                  {/* Admin Profile Chip */}
                  <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-100/80 border border-slate-200/80 shadow-xs">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-slate-900 to-indigo-950 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0 ring-1 ring-slate-800/10">
                      {adminUser?.name ? getInitials(adminUser.name) : 'A'}
                    </div>
                    <div className="text-left hidden sm:block">
                      <div className="text-xs font-bold text-slate-900 leading-none">
                        {adminUser?.name || 'Administrator'}
                      </div>
                      <div className="mt-1 flex items-center gap-1">
                        <span className="text-[9px] uppercase font-extrabold tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-1.5 py-0.5 rounded leading-none">
                          {adminUser?.role || 'Admin'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Change Password Button */}
                  <button
                    onClick={() => setIsChangePasswordOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-indigo-600 bg-slate-100/90 hover:bg-indigo-50/80 border border-slate-200/80 hover:border-indigo-200 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
                    title="Change Admin Password"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="hidden sm:inline">Change Password</span>
                  </button>

                  {/* Sign Out Button */}
                  <button
                    onClick={logoutAdmin}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50/70 hover:bg-rose-100 border border-rose-200/70 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
                    title="Sign Out"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              ) : null
            )}
          </nav>
        </div>
      </div>
    </header>

      {/* Change Admin Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </>
  );
};
export default Navbar;
