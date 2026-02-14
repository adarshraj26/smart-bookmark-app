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
  const [showFavorites, setShowFavorites] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [loading, setLoading] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editFolder, setEditFolder] = useState<string | null>(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] =
    useState<Bookmark | Folder | null>(null);

  async function fetchBookmarks() {
    setLoading(true);
    const { data } = await supabase
      .from("bookmarks")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    setBookmarks(data || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchBookmarks();
  }, [userId]);

  async function handleUpdate(bookmark: Bookmark) {
    await supabase
      .from("bookmarks")
      .update({
        title: editTitle.trim(),
        url: editUrl.trim(),
        folder_id: editFolder || null,
      })
      .eq("id", bookmark.id);

    setBookmarks((prev) =>
      prev.map((b) =>
        b.id === bookmark.id
          ? {
              ...b,
              title: editTitle.trim(),
              url: editUrl.trim(),
              folder_id: editFolder || null,
            }
          : b
      )
    );

    setEditingId(null);
  }

  async function handleDeleteConfirmed() {
    if (!itemToDelete) return;

    if ("url" in itemToDelete) {
      await supabase.from("bookmarks").delete().eq("id", itemToDelete.id);
      setBookmarks((prev) =>
        prev.filter((b) => b.id !== itemToDelete.id)
      );
    } else {
      await supabase
        .from("bookmarks")
        .update({ folder_id: null })
        .eq("folder_id", itemToDelete.id);

      await supabase
        .from("folders")
        .delete()
        .eq("id", itemToDelete.id);

      fetchFolders();
      fetchBookmarks();
    }

    setDeleteModalOpen(false);
    setItemToDelete(null);
  }

  if (loading) {
    return <div className="text-white text-center py-10">Loading...</div>;
  }

  const filteredBookmarks = bookmarks
    .filter((b) => {
      if (showFavorites) return b.favorite;
      if (!selectedFolder) return true;
      return b.folder_id === selectedFolder;
    })
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return 0;
    });

  return (
    <>
      <div className="flex flex-col lg:flex-row gap-6">

        {/* ================= SIDEBAR ================= */}
        <aside className="w-full lg:w-64 bg-white/10 rounded-xl p-4 text-white">
          <div className="font-bold text-lg mb-3">Folders</div>

          <form
            className="flex gap-2 mb-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!newFolderName.trim()) return;

              await supabase.from("folders").insert([
                { name: newFolderName.trim(), user_id: userId },
              ]);

              setNewFolderName("");
              fetchFolders();
            }}
          >
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="New folder"
              className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-white/20 text-white text-sm"
            />
            <button
              type="submit"
              className="px-3 py-2 bg-green-500 hover:bg-green-600 rounded-lg text-sm"
            >
              Add
            </button>
          </form>

          <button
            onClick={() => {
              setSelectedFolder(null);
              setShowFavorites(false);
            }}
            className="block w-full text-left px-3 py-2 rounded-lg mb-1 hover:bg-white/20"
          >
            All Bookmarks
          </button>

          <button
            onClick={() => {
              setShowFavorites(true);
              setSelectedFolder(null);
            }}
            className="block w-full text-left px-3 py-2 rounded-lg mb-1 hover:bg-white/20"
          >
            ⭐ Favorites
          </button>

          {folders.map((folder) => (
            <div key={folder.id} className="flex items-center group">
              <button
                onClick={() => {
                  setSelectedFolder(folder.id);
                  setShowFavorites(false);
                }}
                className="flex-1 text-left px-3 py-2 rounded-lg hover:bg-white/20"
              >
                {folder.name}
              </button>

              <button
                onClick={() => {
                  setItemToDelete(folder);
                  setDeleteModalOpen(true);
                }}
                className="ml-2 text-red-400 opacity-0 group-hover:opacity-100"
              >
                ×
              </button>
            </div>
          ))}
        </aside>

        {/* ================= BOOKMARKS ================= */}
        <div className="flex-1 space-y-4">
          {filteredBookmarks.map((bookmark) => (
            <div
              key={bookmark.id}
              className="bg-white/10 p-4 rounded-xl text-white flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4"
            >
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">
                  {bookmark.title}
                </h3>
                <a
                  href={bookmark.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 text-sm break-all"
                >
                  {bookmark.url}
                </a>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={async () => {
                    await supabase
                      .from("bookmarks")
                      .update({ pinned: !bookmark.pinned })
                      .eq("id", bookmark.id);

                    setBookmarks((prev) =>
                      prev.map((b) =>
                        b.id === bookmark.id
                          ? { ...b, pinned: !bookmark.pinned }
                          : b
                      )
                    );
                  }}
                  className={`px-2 py-1 rounded text-sm ${
                    bookmark.pinned
                      ? "bg-yellow-500 text-black"
                      : "bg-white/20"
                  }`}
                >
                  📌
                </button>

                <button
                  onClick={async () => {
                    await supabase
                      .from("bookmarks")
                      .update({ favorite: !bookmark.favorite })
                      .eq("id", bookmark.id);

                    setBookmarks((prev) =>
                      prev.map((b) =>
                        b.id === bookmark.id
                          ? { ...b, favorite: !bookmark.favorite }
                          : b
                      )
                    );
                  }}
                  className={`px-2 py-1 rounded text-sm ${
                    bookmark.favorite
                      ? "bg-pink-500"
                      : "bg-white/20"
                  }`}
                >
                  {bookmark.favorite ? "★" : "☆"}
                </button>

                <button
                  onClick={() => {
                    setEditingId(bookmark.id);
                    setEditTitle(bookmark.title);
                    setEditUrl(bookmark.url);
                    setEditFolder(bookmark.folder_id || null);
                  }}
                  className="px-3 py-1 bg-blue-600 rounded-lg text-xs"
                >
                  Edit
                </button>

                <button
                  onClick={() => {
                    setItemToDelete(bookmark);
                    setDeleteModalOpen(true);
                  }}
                  className="px-3 py-1 bg-red-600 rounded-lg text-xs"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ================= DELETE MODAL ================= */}
      {deleteModalOpen && itemToDelete && (
        <Dialog
          open={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center"
        >
          <div className="fixed inset-0 bg-black/40" />
          <div className="relative bg-slate-900 p-6 rounded-xl text-white w-[90%] max-w-md">
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

            <div className="flex gap-3 justify-end">
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
    </>
  );
}
