"use client";

import { supabase } from "@/lib/supabase";
import type { Bookmark, Folder } from "@/lib/types";
import { useEffect, useState, useRef } from "react";


interface BookmarkListProps {
  userId: string;
}

export default function BookmarkList({ userId }: BookmarkListProps) {

// Helper: Convert bookmarks to CSV
function bookmarksToCSV(bookmarks: any[]) {
  const header = ["title", "url", "created_at"];
  const rows = bookmarks.map(b => [b.title, b.url, b.created_at]);
  return [header.join(","), ...rows.map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(","))].join("\n");
}

// Helper: Parse CSV to bookmarks
function csvToBookmarks(csv: string) {
  const [header, ...lines] = csv.trim().split(/\r?\n/);
  const keys = header.split(",").map(k => k.replace(/"/g, ""));
  return lines.map(line => {
    const values = line.match(/("[^"]*"|[^,]+)/g)?.map(v => v.replace(/^"|"$/g, "").replace(/""/g, '"')) || [];
    const obj: any = {};
    keys.forEach((k, i) => obj[k] = values[i]);
    return obj;
  });
}

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
    // Export bookmarks as CSV
    function handleExportCSV() {
      const csv = bookmarksToCSV(bookmarks);
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "bookmarks.csv";
      a.click();
      URL.revokeObjectURL(url);
    }

    // Export bookmarks as JSON
    function handleExportJSON() {
      const blob = new Blob([JSON.stringify(bookmarks, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "bookmarks.json";
      a.click();
      URL.revokeObjectURL(url);
    }

    // Import bookmarks from file
    async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
      const file = e.target.files?.[0];
      if (!file) return;
      const ext = file.name.split('.').pop()?.toLowerCase();
      const text = await file.text();
      let imported: any[] = [];
      try {
        if (ext === "json") {
          imported = JSON.parse(text);
        } else if (ext === "csv") {
          imported = csvToBookmarks(text);
        } else {
          alert("Unsupported file type. Use CSV or JSON.");
          return;
        }
        // Insert bookmarks (ignore missing title/url)
        const toInsert = imported.filter(b => b.title && b.url).map(b => ({
          user_id: userId,
          title: b.title,
          url: b.url,
        }));
        if (toInsert.length) {
          const { error } = await supabase.from("bookmarks").insert(toInsert);
          if (error) throw error;
          fetchBookmarks();
          alert(`Imported ${toInsert.length} bookmarks!`);
        } else {
          alert("No valid bookmarks found in file.");
        }
      } catch (err) {
        alert("Failed to import bookmarks: " + err);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    }
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editError, setEditError] = useState("");
  const [showFavorites, setShowFavorites] = useState(false);

  // Fetch folders for user
  useEffect(() => {
    async function fetchFolders() {
      const { data, error } = await supabase
        .from("folders")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (!error && data) setFolders(data);
    }
    fetchFolders();
  }, [userId]);

  // Filter bookmarks by folder and search query
  const filteredBookmarks = bookmarks.filter((bookmark) => {
    const matchesFolder = selectedFolder ? bookmark.folder_id === selectedFolder : true;
    const matchesQuery = bookmark.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bookmark.url.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFavorite = showFavorites ? bookmark.favorite : true;
    return matchesFolder && matchesQuery && matchesFavorite;
  });
  // Toggle favorite status
  async function toggleFavorite(bookmark: Bookmark) {
    const { error } = await supabase
      .from("bookmarks")
      .update({ favorite: !bookmark.favorite })
      .eq("id", bookmark.id);
    if (!error) {
      setBookmarks((prev) => prev.map((b) => b.id === bookmark.id ? { ...b, favorite: !bookmark.favorite } : b));
    }
  }

  useEffect(() => {
    // Fetch initial bookmarks
    fetchBookmarks();

    // Subscribe to real-time changes
    const channel = supabase
      .channel(`bookmarks:user_id=eq.${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookmarks",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setBookmarks((prev) => [payload.new as Bookmark, ...prev]);
          } else if (payload.eventType === "DELETE") {
            setBookmarks((prev) =>
              prev.filter((b) => b.id !== (payload.old as Bookmark).id)
            );
          } else if (payload.eventType === "UPDATE") {
            setBookmarks((prev) =>
              prev.map((b) => (b.id === (payload.new as Bookmark).id ? (payload.new as Bookmark) : b))
            );
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [userId]);

  async function fetchBookmarks() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("bookmarks")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBookmarks(data || []);
    } catch (error) {
      console.error("Error fetching bookmarks:", error);
    } finally {
      setLoading(false);
    }
  }

  async function deleteBookmark(id: string) {
    try {
      // Optimistically remove from UI
      setBookmarks((prev) => prev.filter((b) => b.id !== id));
      
      const { error } = await supabase.from("bookmarks").delete().eq("id", id);
      if (error) throw error;
    } catch (error) {
      console.error("Error deleting bookmark:", error);
      // Refetch bookmarks if delete failed
      fetchBookmarks();
    }
  }

  async function updateBookmark(id: string) {
    try {
      setEditError("");

      if (!editTitle.trim() || !editUrl.trim()) {
        setEditError("Please fill in both fields");
        return;
      }

      // Validate URL
      try {
        new URL(editUrl);
      } catch {
        setEditError("Please enter a valid URL");
        return;
      }

      const { error } = await supabase
        .from("bookmarks")
        .update({
          title: editTitle.trim(),
          url: editUrl.trim(),
        })
        .eq("id", id);

      if (error) throw error;

      // Update local state
      setBookmarks((prev) =>
        prev.map((b) =>
          b.id === id
            ? { ...b, title: editTitle.trim(), url: editUrl.trim() }
            : b
        )
      );

      setEditingId(null);
      setEditTitle("");
      setEditUrl("");
    } catch (error) {
      console.error("Error updating bookmark:", error);
      setEditError("Failed to update bookmark");
    }
  }

  function startEdit(bookmark: Bookmark) {
    setEditingId(bookmark.id);
    setEditTitle(bookmark.title);
    setEditUrl(bookmark.url);
    setEditError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditTitle("");
    setEditUrl("");
    setEditError("");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 sm:py-12">
        <div className="text-center">
          <div className="inline-block p-2 sm:p-3 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-full mb-3 sm:mb-4">
            <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-300 text-sm sm:text-base">Loading your bookmarks...</p>
        </div>
      </div>
    );
  }

  if (bookmarks.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 sm:py-16">
        <div className="text-center px-4">
          <svg className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-3 sm:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          <p className="text-gray-300 text-base sm:text-lg font-semibold">No bookmarks yet</p>
          <p className="text-gray-400 text-xs sm:text-sm">Create your first bookmark to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4">
      {/* Folders Sidebar */}
      <div className="hidden sm:block w-48 flex-shrink-0">
        <div className="bg-white/10 border border-white/20 rounded-xl p-3 mb-4">
          <div className="font-bold text-white text-sm mb-2">Folders</div>
          <button
            className={`block w-full text-left px-2 py-1 rounded mb-1 text-xs font-semibold ${!selectedFolder ? 'bg-blue-600/60 text-white' : 'text-gray-200 hover:bg-white/10'}`}
            onClick={() => setSelectedFolder(null)}
          >
            All Bookmarks
          </button>
          {folders.map(folder => (
            <button
              key={folder.id}
              className={`block w-full text-left px-2 py-1 rounded mb-1 text-xs font-semibold ${selectedFolder === folder.id ? 'bg-blue-600/60 text-white' : 'text-gray-200 hover:bg-white/10'}`}
              onClick={() => setSelectedFolder(folder.id)}
            >
              {folder.name}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 space-y-4 sm:space-y-5">
      {/* Removed import/export & favorites controls */}
        </label>
      </div>
      {/* Search Bar */}
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-3 sm:p-4 rounded-lg sm:rounded-xl">
        <div className="flex items-center gap-2 sm:gap-3">
          <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search bookmarks..."
            className="flex-1 bg-transparent text-sm sm:text-base text-white placeholder-gray-400 outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              title="Clear search"
              aria-label="Clear search query"
              className="p-1 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 hover:text-gray-200" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
        {searchQuery && (
          <p className="text-xs sm:text-sm text-gray-400 mt-2">
            Found {filteredBookmarks.length} result{filteredBookmarks.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Bookmarks List */}
      {filteredBookmarks.length === 0 ? (
        <div className="flex items-center justify-center py-8 sm:py-12">
          <div className="text-center">
            <svg className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-2 sm:mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-300 text-sm sm:text-base">No bookmarks match "{searchQuery}"</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {filteredBookmarks.map((bookmark) => (
        <div key={bookmark.id}>
          {editingId === bookmark.id ? (
            // Edit Form
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-4 sm:p-5 rounded-lg sm:rounded-xl">
              <div className="mb-3 sm:mb-4">
                <label className="block text-xs sm:text-sm font-semibold text-gray-100 mb-1 sm:mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Bookmark title"
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-white/10 border border-white/20 rounded-lg text-sm sm:text-base text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
              <div className="mb-3 sm:mb-4">
                <label className="block text-xs sm:text-sm font-semibold text-gray-100 mb-1 sm:mb-2">
                  URL
                </label>
                <input
                  type="text"
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-white/10 border border-white/20 rounded-lg text-sm sm:text-base text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
              {editError && (
                <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-red-500/20 border border-red-500/50 text-red-200 rounded-lg text-xs sm:text-sm">
                  {editError}
                </div>
              )}
              <div className="flex gap-2 sm:gap-3">
                <button
                  onClick={() => updateBookmark(bookmark.id)}
                  className="flex-1 px-3 sm:px-4 py-2 sm:py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg text-xs sm:text-sm font-semibold hover:from-green-700 hover:to-emerald-700 transition-all duration-200"
                >
                  Save
                </button>
                <button
                  onClick={cancelEdit}
                  className="flex-1 px-3 sm:px-4 py-2 sm:py-2 bg-gray-500/20 text-gray-300 border border-gray-500/30 rounded-lg text-xs sm:text-sm font-semibold hover:bg-gray-500/40 transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            // Display Bookmark
            <div className="group bg-white/10 backdrop-blur-xl border border-white/20 p-4 sm:p-5 rounded-lg sm:rounded-xl hover:bg-white/20 transition-all duration-300 hover:border-white/40 hover:shadow-xl">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex-shrink-0 mt-0.5 sm:mt-1">
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM9 12a6 6 0 11-12 0 6 6 0 0112 0z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm sm:text-base text-white truncate group-hover:text-blue-300 transition">
                        {bookmark.title}
                      </h3>
                      <a
                        href={bookmark.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs sm:text-sm text-blue-400 hover:text-blue-300 truncate block mt-1 break-all"
                      >
                        {bookmark.url}
                      </a>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0 w-full sm:w-auto items-center">
                  {/* Favorite/Star toggle */}
                  <button
                    onClick={() => toggleFavorite(bookmark)}
                    title={bookmark.favorite ? "Unstar" : "Star"}
                    className={`p-2 rounded-full border transition ${bookmark.favorite ? 'bg-yellow-400/90 text-yellow-900 border-yellow-400' : 'bg-white/10 text-yellow-300 border-yellow-400/40 hover:bg-yellow-400/20'}`}
                  >
                    <svg className="w-4 h-4" fill={bookmark.favorite ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l2.036 6.29a1 1 0 00.95.69h6.6c.969 0 1.371 1.24.588 1.81l-5.347 3.89a1 1 0 00-.364 1.118l2.036 6.29c.3.921-.755 1.688-1.54 1.118l-5.347-3.89a1 1 0 00-1.176 0l-5.347 3.89c-.784.57-1.838-.197-1.54-1.118l2.036-6.29a1 1 0 00-.364-1.118l-5.347-3.89c-.783-.57-.38-1.81.588-1.81h6.6a1 1 0 00.95-.69l2.036-6.29z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => startEdit(bookmark)}
                    className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-blue-600/50 text-blue-200 hover:bg-blue-600/70 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 border border-blue-600/60 hover:border-blue-600/80 flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span className="hidden sm:inline">Edit</span>
                  </button>
                  <button
                    onClick={() => deleteBookmark(bookmark.id)}
                    className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-red-600/50 text-red-200 hover:bg-red-600/70 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 border border-red-600/60 hover:border-red-600/80 flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span className="hidden sm:inline">Delete</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
        </div>
      )}
      </div>
    </div>
  );
}
