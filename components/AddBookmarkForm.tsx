"use client";

import { supabase } from "@/lib/supabase";
import { useState } from "react";
import type { Folder } from "@/lib/types";

interface AddBookmarkFormProps {
  userId: string;
  folders: Folder[];
  fetchFolders: () => void;
  onBookmarkAdded?: () => void;
}

export default function AddBookmarkForm({
  userId,
  folders,
  fetchFolders,
  onBookmarkAdded,
}: AddBookmarkFormProps) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!url.trim() || !title.trim()) {
      setError("Please fill in both fields");
      return;
    }

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
        folder_id: selectedFolder || null,
      });

      if (error) throw error;

      setSuccess("Bookmark added successfully!");
      setUrl("");
      setTitle("");
      setSelectedFolder(null);
      fetchFolders();
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
    <form
      onSubmit={handleSubmit}
      className="bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-2xl shadow-2xl"
    >
      <h2 className="text-xl font-bold text-white mb-6">
        Add New Bookmark
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 text-red-200 rounded-lg text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 text-green-200 rounded-lg text-sm">
          {success}
        </div>
      )}

      <div className="space-y-4">

        {/* Folder Dropdown */}
        <div>
          <label className="block text-sm font-semibold text-gray-100 mb-2">
            Folder
          </label>

          <select
            value={selectedFolder || ""}
            onChange={(e) => setSelectedFolder(e.target.value || null)}
            disabled={loading}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          >
            <option value="" className="bg-gray-800 text-white">
              No Folder
            </option>

            {folders.map((folder) => (
              <option
                key={folder.id}
                value={folder.id}
                className="bg-gray-800 text-white"
              >
                {folder.name}
              </option>
            ))}
          </select>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-semibold text-gray-100 mb-2">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., My Favorite Blog"
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            disabled={loading}
          />
        </div>

        {/* URL */}
        <div>
          <label className="block text-sm font-semibold text-gray-100 mb-2">
            URL
          </label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            disabled={loading}
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-cyan-700 transition disabled:opacity-50"
        >
          {loading ? "Adding..." : "Add Bookmark"}
        </button>

      </div>
    </form>
  );
}
