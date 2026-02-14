"use client";

import { supabase } from "@/lib/supabase";
import { useState, useEffect, useRef } from "react";
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
  const [isOpen, setIsOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
      onBookmarkAdded?.();

      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      console.error("Error adding bookmark:", error);
      setError("Failed to add bookmark. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const selectedFolderName = selectedFolder
    ? folders.find((f) => f.id === selectedFolder)?.name
    : "No Folder";

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

        {/* Custom Folder Dropdown */}
        <div ref={dropdownRef}>
          <label className="block text-sm font-semibold text-gray-100 mb-2">
            Folder
          </label>

          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="w-full px-4 py-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-lg text-white flex justify-between items-center hover:bg-white/20 transition"
          >
            <span>{selectedFolderName}</span>

            <svg
              className={`w-4 h-4 transition-transform duration-200 ${
                isOpen ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {isOpen && (
            <div className="absolute z-50 mt-2 w-full bg-gradient-to-br from-purple-900 to-indigo-900 border border-white/20 rounded-lg shadow-2xl overflow-hidden">
              <div
                onClick={() => {
                  setSelectedFolder(null);
                  setIsOpen(false);
                }}
                className="px-4 py-2 text-white hover:bg-purple-600/40 cursor-pointer transition"
              >
                No Folder
              </div>

              {folders.map((folder) => (
                <div
                  key={folder.id}
                  onClick={() => {
                    setSelectedFolder(folder.id);
                    setIsOpen(false);
                  }}
                  className="px-4 py-2 text-white hover:bg-purple-600/40 cursor-pointer transition"
                >
                  {folder.name}
                </div>
              ))}
            </div>
          )}
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

        {/* Submit Button */}
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
