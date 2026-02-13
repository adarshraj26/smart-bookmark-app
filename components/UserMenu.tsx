"use client";

import { supabase } from "@/lib/supabase";
import type { User } from "@/lib/types";

interface UserMenuProps {
  user: User | null;
}

export default function UserMenu({ user }: UserMenuProps) {
  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  if (!user) return null;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
      <div className="text-right">
        <p className="font-semibold text-xs sm:text-sm text-gray-100 truncate">
          {user.user_metadata?.name || user.email}
        </p>
        <p className="text-gray-400 text-xs hidden sm:block">
          {user.email}
        </p>
      </div>
      <button
        onClick={handleSignOut}
        className="px-3 sm:px-4 py-2 bg-red-500/20 text-red-300 border border-red-500/30 rounded-lg text-xs sm:text-sm font-medium hover:bg-red-500/40 hover:border-red-500/60 transition-all duration-200 w-full sm:w-auto"
      >
        Sign Out
      </button>
    </div>
  );
}
