"use client";

import { supabase } from "@/lib/supabase";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { Folder } from "@/lib/types";

interface AddBookmarkFormProps {
  userId: string;
  onBookmarkAdded?: () => void;
}

export default function AddBookmarkForm({
  userId,
  onBookmarkAdded,
}: AddBookmarkFormProps) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [folders, setFolders] = useState<Folder[]>([]);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [folderLoading, setFolderLoading] = useState(false);
  const [folderError, setFolderError] = useState("");
    // Create a new folder
    async function handleCreateFolder(e: React.FormEvent) {
      e.preventDefault();
      setFolderError("");
      if (!newFolderName.trim()) {
        setFolderError("Folder name required");
        return;
      }
      setFolderLoading(true);
      try {
        const { data, error } = await supabase.from("folders").insert({
          user_id: userId,
          name: newFolderName.trim(),
        }).select();
        if (error) throw error;
        if (data && data[0]) {
          setFolders([data[0], ...folders]);
          setFolderId(data[0].id);
          setNewFolderName("");
        }
      } catch (err) {
        setFolderError("Failed to create folder");
      } finally {
        setFolderLoading(false);
      }
    }
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!url.trim() || !title.trim()) {
      setError("Please fill in both fields");
      return;
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      setError("Please enter a valid URL");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from("bookmarks").insert({
        user_id: userId,
        url: url.trim(),
        title: title.trim(),
        folder_id: folderId || null,
      });

      if (error) throw error;

      setSuccess("Bookmark added successfully!");
      setUrl("");
      setTitle("");
      setFolderId(null);
      onBookmarkAdded?.();

      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      console.error("Error adding bookmark:", error);
      setError("Failed to add bookmark. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white/10 backdrop-blur-xl border border-white/20 p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl shadow-2xl">
      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <div className="p-1.5 sm:p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex-shrink-0">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-white">Add New Bookmark</h2>
      </div>

      {error && (
        <div className="mb-4 p-3 sm:p-4 bg-red-500/20 border border-red-500/50 text-red-200 rounded-lg sm:rounded-xl text-xs sm:text-sm">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 sm:p-4 bg-green-500/20 border border-green-500/50 text-green-200 rounded-lg sm:rounded-xl text-xs sm:text-sm">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>{success}</span>
          </div>
        </div>
      )}

      <div className="space-y-3 sm:space-y-4">
        {/* Folder creation and selection */}
        <div className="mb-2">
          <form onSubmit={handleCreateFolder} className="flex gap-2 mb-2">
            <input
              type="text"
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              placeholder="New folder name"
              className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={folderLoading}
            />
            <button
              type="submit"
              className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition"
              disabled={folderLoading || !newFolderName.trim()}
            >
              {folderLoading ? "Adding..." : "Add Folder"}
            </button>
          </form>
          {folderError && <div className="text-xs text-red-400 mb-1">{folderError}</div>}
          <label className="block text-xs sm:text-sm font-semibold text-gray-100 mb-1.5 sm:mb-2">
            Folder (optional)
          </label>
          <select
            value={folderId || ""}
            onChange={e => setFolderId(e.target.value || null)}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading}
          >
            <option value="">No Folder</option>
            {folders.map(folder => (
              <option key={folder.id} value={folder.id}>{folder.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs sm:text-sm font-semibold text-gray-100 mb-1.5 sm:mb-2">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., My Favorite Blog"
            className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-white/10 border border-white/20 rounded-lg sm:rounded-lg text-sm sm:text-base text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-semibold text-gray-100 mb-1.5 sm:mb-2">
            URL
          </label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="e.g., https://example.com"
            className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-white/10 border border-white/20 rounded-lg sm:rounded-lg text-sm sm:text-base text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-2 sm:py-3 rounded-lg sm:rounded-lg font-semibold text-sm sm:text-base hover:from-blue-700 hover:to-cyan-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>Adding...</span>
            </div>
          ) : (
            "Add Bookmark"
          )}
        </button>
      </div>
    </form>
  );
}
