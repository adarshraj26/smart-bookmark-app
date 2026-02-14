"use client";

import { supabase } from "@/lib/supabase";
import type { Bookmark, Folder } from "@/lib/types";
import { Dialog } from "@headlessui/react";
import { useEffect, useState } from "react";

interface BookmarkListProps {
  userId: string;
  folders: Folder[];
  fetchFolders: () => void;
}

export default function BookmarkList({
  userId,
  folders,
  fetchFolders,
}: BookmarkListProps) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] =
    useState<Bookmark | Folder | null>(null);

  // ================= FETCH =================

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
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBookmarks();
  }, [userId]);

  // ================= FILTER =================

  const filteredBookmarks = bookmarks.filter((bookmark) =>
    selectedFolder ? bookmark.folder_id === selectedFolder : true
  );

  // ================= DELETE HANDLER =================

  async function handleDeleteConfirmed() {
    if (!itemToDelete) return;

    try {
      if ("url" in itemToDelete) {
        // Bookmark delete
        await supabase
          .from("bookmarks")
          .delete()
          .eq("id", itemToDelete.id);

        setBookmarks((prev) =>
          prev.filter((b) => b.id !== itemToDelete.id)
        );
      } else {
        // Folder delete
        await supabase
          .from("bookmarks")
          .update({ folder_id: null })
          .eq("folder_id", itemToDelete.id);

        await supabase
          .from("folders")
          .delete()
          .eq("id", itemToDelete.id);

        if (selectedFolder === itemToDelete.id) {
          setSelectedFolder(null);
        }

        fetchFolders();
        fetchBookmarks();
      }

      setDeleteModalOpen(false);
      setItemToDelete(null);
    } catch (error) {
      alert("Failed to delete");
    }
  }

  // ================= UI =================

  if (loading) {
    return <div className="text-white">Loading...</div>;
  }

  return (
    <div className="flex gap-4">
      {/* Sidebar */}
      <aside className="w-48 hidden sm:block">
        <button
          onClick={() => setSelectedFolder(null)}
          className="block w-full text-left px-3 py-2 rounded-lg text-sm font-semibold text-blue-300 hover:bg-blue-500/20"
        >
          All Bookmarks
        </button>

        {folders.map((folder) => (
          <div key={folder.id} className="flex items-center group">
            <button
              onClick={() => setSelectedFolder(folder.id)}
              className="flex-1 text-left px-3 py-2 text-sm text-blue-200 hover:bg-blue-400/20 rounded-lg"
            >
              {folder.name}
            </button>

            <button
              onClick={() => {
                setItemToDelete(folder);
                setDeleteModalOpen(true);
              }}
              className="ml-1 text-red-400 opacity-0 group-hover:opacity-100"
            >
              ×
            </button>
          </div>
        ))}
      </aside>

      {/* Bookmarks */}
      <div className="flex-1 space-y-4">
        {filteredBookmarks.map((bookmark) => (
          <div
            key={bookmark.id}
            className="bg-white/10 p-4 rounded-xl text-white flex items-center justify-between"
          >
            <div>
              <h3 className="font-semibold">{bookmark.title}</h3>
              <a
                href={bookmark.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400"
              >
                {bookmark.url}
              </a>
            </div>

            <button
              onClick={() => {
                setItemToDelete(bookmark);
                setDeleteModalOpen(true);
              }}
              className="px-3 py-1 bg-red-600/80 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition"
            >
              Delete
            </button>
          </div>
        ))}
      </div>

      {/* SINGLE DELETE MODAL */}
      {deleteModalOpen && itemToDelete && (
        <Dialog
          open={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center"
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />

          <div className="relative bg-slate-900 p-6 rounded-xl text-white max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">
              {"url" in itemToDelete
                ? "Delete Bookmark"
                : "Delete Folder"}
            </h3>

            <p className="mb-6">
              Are you sure you want to delete{" "}
              <span className="text-red-400 font-bold">
                {"url" in itemToDelete
                  ? itemToDelete.title
                  : itemToDelete.name}
              </span>
              ?
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 bg-gray-600 rounded-lg"
              >
                Cancel
              </button>

              <button
                onClick={handleDeleteConfirmed}
                className="px-4 py-2 bg-red-600 rounded-lg"
              >
                Delete
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
