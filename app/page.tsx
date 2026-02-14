"use client";

import AddBookmarkForm from "@/components/AddBookmarkForm";
import AuthForm from "@/components/AuthForm";
import BookmarkList from "@/components/BookmarkList";
import LoadingScreen from "@/components/LoadingScreen";
import UserMenu from "@/components/UserMenu";
import { supabase } from "@/lib/supabase";
import type { Folder, User } from "@/lib/types";
import { useEffect, useState } from "react";

export const dynamic = "force-dynamic";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [folders, setFolders] = useState<Folder[]>([]);

  async function fetchFolders(userId?: string) {
    if (!userId && !user?.id) return;

    try {
      const { data, error } = await supabase
        .from("folders")
        .select("*")
        .eq("user_id", userId || user?.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setFolders(data || []);
    } catch (error) {
      console.error("Error fetching folders:", error);
    }
  }

  useEffect(() => {
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

  useEffect(() => {
    if (user?.id) {
      fetchFolders(user.id);
    }
  }, [user, refreshKey]);

  if (loading) return <LoadingScreen />;

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-block mb-4 p-4 bg-white/20 backdrop-blur-lg rounded-full">
              <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
              </svg>
            </div>

            <h1 className="text-4xl font-black text-white mb-2">
              Smart Bookmark
            </h1>

            <p className="text-indigo-100 text-lg">
              Save and sync your favorite links
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-2xl">
            <AuthForm />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col">

      {/* ================= HEADER ================= */}
      <header className="bg-white/5 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
              </svg>
            </div>

            <h1 className="text-2xl font-black bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Smart Bookmark
            </h1>
          </div>

          <UserMenu user={user} />
        </div>
      </header>

      {/* ================= MAIN ================= */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        <AddBookmarkForm
          userId={user.id}
          folders={folders}
          fetchFolders={() => fetchFolders(user.id)}
          onBookmarkAdded={() => setRefreshKey((prev) => prev + 1)}
        />

        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
              </svg>
            </div>

            <h2 className="text-2xl font-bold text-white">
              Your Bookmarks
            </h2>
          </div>

          <BookmarkList
            key={refreshKey}
            userId={user.id}
            fetchFolders={() => fetchFolders(user.id)}
            folders={folders}
          />
        </div>

      </main>
    </div>
  );
}
