"use client";

import { supabase } from "@/lib/supabase";
import type { User } from "@/lib/types";
import { useEffect, useRef, useState } from "react";

interface UserMenuProps {
  user: User | null;
}

export default function UserMenu({ user }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  async function handleSignOut() {
    await supabase.auth.signOut();
    setIsOpen(false);
  }

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) return null;

  // Get initials from name or email
  const displayName = user.user_metadata?.name || user.email || "User";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Get avatar URL from user metadata
  const avatarUrl = user.user_metadata?.avatar_url;

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-2 sm:p-2.5 rounded-lg hover:bg-white/10 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
        aria-label="User menu"
        title="Click to open profile menu"
      >
        {/* Profile Icon */}
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center border-2 border-purple-400 shadow-lg hover:shadow-purple-500/50 shadow-purple-500/30">
          <svg className="w-6 h-6 sm:w-6 sm:h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        </div>
        <svg
          className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-300 transition-transform duration-200 hidden sm:block ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M7 10l5 5 5-5z" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-slate-800/95 backdrop-blur-lg border border-purple-500/50 rounded-xl shadow-2xl z-50 overflow-hidden animate-fadeInUp">
          {/* Profile Header */}
          <div className="bg-gradient-to-r from-purple-700/80 to-pink-700/80 p-4 border-b border-purple-500/40">
            <div className="flex items-center gap-3">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-12 h-12 rounded-full object-cover border-2 border-purple-400"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center border-2 border-purple-400">
                  <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white text-sm truncate">{displayName}</p>
                <p className="text-gray-300 text-xs truncate">{user.email}</p>
              </div>
            </div>
          </div>

          {/* Profile Info */}
          <div className="p-4 space-y-3">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-300 uppercase tracking-wide">Account</p>
              <div className="bg-slate-700/50 rounded-lg p-3 space-y-2 border border-slate-600/50">
                <div>
                  <p className="text-xs text-gray-400">Email</p>
                  <p className="text-sm text-white break-all">{user.email}</p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-300 uppercase tracking-wide">Status</p>
                <div className="bg-slate-700/50 rounded-lg p-3 text-center border border-slate-600/50">
                  <p className="text-sm font-bold text-green-400">Active</p>
                </div>
            </div>
          </div>

          {/* Sign Out Button */}
          <div className="border-t border-purple-500/30 p-3">
            <button
              onClick={handleSignOut}
              className="w-full px-4 py-2.5 bg-red-500/20 text-red-300 border border-red-500/30 rounded-lg text-sm font-medium hover:bg-red-500/40 hover:border-red-500/60 transition-all duration-200 flex items-center justify-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
