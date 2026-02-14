"use client";

import { supabase } from "@/lib/supabase";
import type { Bookmark, Folder } from "@/lib/types";
import { useEffect, useState, Fragment } from "react";
import { Listbox, Transition } from "@headlessui/react";


interface BookmarkListProps {
  userId: string;
  folders: Folder[];
  fetchFolders: () => void;
}

export default function BookmarkList({ userId, folders, fetchFolders }: BookmarkListProps) {

  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [newFolderName, setNewFolderName] = useState("");
  const [folderError, setFolderError] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editFolder, setEditFolder] = useState<string | null>(null);
  const [editError, setEditError] = useState("");
  const [showFavorites, setShowFavorites] = useState(false);

  // Remove local folders state and fetchFolders

  async function handleCreateFolder(e: React.FormEvent) {
    e.preventDefault();
    setFolderError("");
    if (!newFolderName.trim()) {
      setFolderError("Folder name required");
      return;
    }
    try {
      const { data, error } = await supabase
        .from("folders")
        .insert({ user_id: userId, name: newFolderName.trim() })
        .select();
      if (error) throw error;
      setNewFolderName("");
      fetchFolders();
    } catch (error) {
      setFolderError("Failed to create folder");
      console.error("Error creating folder:", error);
    }
  }

  // Filter bookmarks by search, favorites, and folder, then sort pinned to top
  const filteredBookmarks = bookmarks
    .filter((bookmark) => {
      const matchesQuery = bookmark.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bookmark.url.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFavorite = showFavorites ? bookmark.favorite : true;
      const matchesFolder = selectedFolder ? bookmark.folder_id === selectedFolder : true;
      return matchesQuery && matchesFavorite && matchesFolder;
    })
    .sort((a, b) => {
      // Pinned bookmarks always at top
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return 0;
    });
    // Pin/unpin logic
    async function togglePin(bookmark: Bookmark) {
      const { error } = await supabase
        .from("bookmarks")
        .update({ pinned: !bookmark.pinned })
        .eq("id", bookmark.id);
      if (!error) {
        setBookmarks((prev) => prev.map((b) => b.id === bookmark.id ? { ...b, pinned: !bookmark.pinned } : b));
      }
    }
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
          folder_id: editFolder || null,
        })
        .eq("id", id);

      if (error) throw error;

      // Update local state
      setBookmarks((prev) =>
        prev.map((b) =>
          b.id === id
            ? { ...b, title: editTitle.trim(), url: editUrl.trim(), folder_id: editFolder || null }
            : b
        )
      );

      setEditingId(null);
      setEditTitle("");
      setEditUrl("");
      setEditFolder(null);
    } catch (error) {
      console.error("Error updating bookmark:", error);
      setEditError("Failed to update bookmark");
    }
  }

  function startEdit(bookmark: Bookmark) {
    setEditingId(bookmark.id);
    setEditTitle(bookmark.title);
    setEditUrl(bookmark.url);
    setEditFolder(bookmark.folder_id || null);
    setEditError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditTitle("");
    setEditUrl("");
    setEditFolder(null);
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

  // Main return block
  // Delete folder and set folder_id to null for bookmarks in that folder
  async function handleDeleteFolder(folderId: string) {
    if (!window.confirm("Delete this folder? Bookmarks will not be deleted, just unassigned.")) return;
    try {
      // Set folder_id to null for bookmarks in this folder
      await supabase.from("bookmarks").update({ folder_id: null }).eq("folder_id", folderId);
      // Delete the folder
      const { error } = await supabase.from("folders").delete().eq("id", folderId);
      if (error) throw error;
      if (selectedFolder === folderId) setSelectedFolder(null);
      fetchFolders();
      fetchBookmarks();
    } catch (error) {
      alert("Failed to delete folder");
      console.error("Error deleting folder:", error);
    }
  }

  return (
    <div className="flex gap-4">
      {/* Folder Sidebar */}
      <aside className="w-48 hidden sm:block">
        <div className="mb-6">
          <form onSubmit={handleCreateFolder} className="flex gap-2 mb-2">
            <input
              type="text"
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              placeholder="New folder"
              className="flex-1 px-2 py-1 rounded-lg text-xs bg-white/10 border border-white/20 text-white placeholder-gray-400 outline-none"
            />
            <button type="submit" className="px-2 py-1 bg-blue-500 text-white rounded-lg text-xs font-semibold hover:bg-blue-600 transition">Create</button>
          </form>
          {folderError && <div className="text-xs text-red-400 mb-2">{folderError}</div>}
        </div>
        <nav className="space-y-1">
          <button
            className={`block w-full text-left px-3 py-2 rounded-lg text-sm font-semibold transition ${selectedFolder === null ? 'bg-blue-500/80 text-white' : 'text-blue-300 hover:bg-blue-500/20'}`}
            onClick={() => setSelectedFolder(null)}
          >
            All Bookmarks
          </button>
          {folders.map(folder => (
            <div key={folder.id} className="flex items-center group">
              <button
                className={`flex-1 block text-left px-3 py-2 rounded-lg text-sm transition ${selectedFolder === folder.id ? 'bg-blue-400/80 text-white font-semibold' : 'text-blue-200 hover:bg-blue-400/20'}`}
                onClick={() => setSelectedFolder(folder.id)}
              >
                {folder.name}
              </button>
              <button
                className="ml-1 px-2 py-1 text-xs text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition"
                title="Delete folder"
                onClick={() => handleDeleteFolder(folder.id)}
              >
                &#10005;
              </button>
            </div>
          ))}
        </nav>
      </aside>
      <div className="flex-1 space-y-4 sm:space-y-5">
      {/* Favorites Toggle */}
      <div className="flex items-center justify-end mb-2">
        <button
          onClick={() => setShowFavorites((prev) => !prev)}
          className={`px-3 py-1 rounded-lg text-xs font-semibold border transition ${showFavorites ? 'bg-yellow-400/90 text-yellow-900 border-yellow-400' : 'bg-white/10 text-yellow-300 border-yellow-400/40 hover:bg-yellow-400/20'}`}
        >
          {showFavorites ? 'Showing Favorites' : 'Show Favorites'}
        </button>
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
              <div className="mb-3 sm:mb-4">
                <label className="block text-xs sm:text-sm font-semibold text-gray-100 mb-1 sm:mb-2">
                  Folder
                </label>
                <Listbox value={editFolder || ""} onChange={val => setEditFolder(val || null)}>
                  <div className="relative">
                    <Listbox.Button className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-white/10 border border-white/20 rounded-lg text-sm sm:text-base text-white text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition backdrop-blur-xl shadow-lg">
                      {(() => {
                        if (!editFolder) return <span className="text-gray-300">No Folder</span>;
                        const folder = folders.find(f => f.id === editFolder);
                        return folder ? folder.name : <span className="text-gray-300">No Folder</span>;
                      })()}
                    </Listbox.Button>
                    <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                      <Listbox.Options className="absolute z-10 mt-1 w-full max-h-60 overflow-auto rounded-lg bg-white/20 backdrop-blur-xl border border-white/30 shadow-xl focus:outline-none">
                        <Listbox.Option value="" className={({ active }) => `cursor-pointer select-none relative py-2 px-4 rounded-lg ${active ? 'bg-blue-500/80 text-white' : 'text-gray-100'}`}>
                          No Folder
                        </Listbox.Option>
                        {folders.map(folder => (
                          <Listbox.Option
                            key={folder.id}
                            value={folder.id}
                            className={({ active }) => `cursor-pointer select-none relative py-2 px-4 rounded-lg ${active ? 'bg-blue-400/80 text-white' : 'text-gray-100'}`}
                          >
                            {folder.name}
                          </Listbox.Option>
                        ))}
                      </Listbox.Options>
                    </Transition>
                  </div>
                </Listbox>
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
                  {/* Pin toggle */}
                  <button
                    onClick={() => togglePin(bookmark)}
                    title={bookmark.pinned ? "Unpin" : "Pin"}
                    className={`p-2 rounded-full border transition ${bookmark.pinned ? 'bg-blue-400/90 text-blue-900 border-blue-400' : 'bg-white/10 text-blue-300 border-blue-400/40 hover:bg-blue-400/20'}`}
                  >
                    <svg className="w-4 h-4" fill={bookmark.pinned ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657l-1.414-1.414A8 8 0 014 4V2a1 1 0 112 0v2a6 6 0 006 6h2a1 1 0 110 2h-2a8 8 0 01-8-8V2a1 1 0 112 0v2a10 10 0 0010 10l1.414 1.414a1 1 0 010 1.414l-2.828 2.828a1 1 0 01-1.414 0l-2.828-2.828a1 1 0 010-1.414z" />
                    </svg>
                  </button>
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
