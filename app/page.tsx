"use client";

import AddBookmarkForm from "@/components/AddBookmarkForm";
import AuthForm from "@/components/AuthForm";
import BookmarkList from "@/components/BookmarkList";
import UserMenu from "@/components/UserMenu";
import { supabase } from "@/lib/supabase";
import type { User } from "@/lib/types";
import { useEffect, useState } from "react";

// This page requires runtime rendering (client-side auth)
export const dynamic = "force-dynamic";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    // Check initial auth state
    async function checkAuth() {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) {
          setUser({
            id: data.session.user.id,
            email: data.session.user.email || "",
            user_metadata: data.session.user.user_metadata,
          });
        }
      } catch (error) {
        console.error("Error checking auth:", error);
      } finally {
        setLoading(false);
      }
    }

    checkAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || "",
          user_metadata: session.user.user_metadata,
        });
      } else {
        setUser(null);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-center">
          <div className="inline-block p-3 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-full mb-4">
            <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
          </div>
          <p className="text-white text-sm sm:text-base">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center p-3 sm:p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-6 sm:mb-8">
            <div className="inline-block mb-3 sm:mb-4 p-2 sm:p-4 bg-white/20 backdrop-blur-lg rounded-full">
              <svg className="w-10 h-10 sm:w-12 sm:h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
              </svg>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-white mb-2 sm:mb-3">
              Smart Bookmark
            </h1>
            <p className="text-indigo-100 text-base sm:text-lg">
              Save and sync your favorite links across all devices
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 sm:p-8 border border-white/20 shadow-2xl">
            <AuthForm />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col">
      <header className="bg-white/5 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
        <div className="w-full px-3 sm:px-4 md:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            {/* Logo - Left Side */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="p-1.5 sm:p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex-shrink-0">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                </svg>
              </div>
              <h1 className="text-lg sm:text-2xl font-black bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent truncate">Smart Bookmark</h1>
            </div>
            
            {/* Profile Menu - Right Side */}
            <div className="flex-shrink-0">
              <UserMenu user={user} />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-8 sm:py-12 w-full">
        <div className="space-y-6 sm:space-y-8">
          <AddBookmarkForm
            userId={user.id}
            onBookmarkAdded={() => setRefreshKey((prev) => prev + 1)}
          />
          <div>
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6 flex-wrap">
              <div className="p-1.5 sm:p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex-shrink-0">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                </svg>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                Your Bookmarks
              </h2>
            </div>
            <BookmarkList key={refreshKey} userId={user.id} />
          </div>
        </div>
      </main>
    </div>
  );
}
