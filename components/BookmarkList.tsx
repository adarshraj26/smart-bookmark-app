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

  // ================= FETCH =================

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

  // ================= UPDATE =================

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

  // ================= DELETE =================

  async function handleDeleteConfirmed() {
    if (!itemToDelete) return;

    if (isBookmark(itemToDelete)) {
      await supabase
        .from("bookmarks")
        .delete()
        .eq("id", itemToDelete.id);

      setBookmarks((prev) =>
        prev.filter((b) => b.id !== itemToDelete.id)
      );
    } else {
      // Remove folder reference from bookmarks
      await supabase
        .from("bookmarks")
        .update({ folder_id: null })
        .eq("folder_id", itemToDelete.id);

      // Delete folder
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
  }

  if (loading) return <div className="text-white">Loading...</div>;

  // ================= FILTER =================

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
      <div className="flex flex-col md:flex-row gap-6">

        {/* ================= SIDEBAR ================= */}
        <aside className="w-full md:w-64 bg-white/10 rounded-xl p-4 text-white">

          <div className="font-bold text-lg mb-3">Folders</div>

          {/* Create Folder */}
          <form
            className="flex items-center gap-2 mb-4"
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
              className="flex-1 px-3 py-2 rounded-lg bg-white/20 text-white placeholder-white/60 focus:outline-none"
            />
            <button
              type="submit"
              className="px-3 py-2 bg-green-500 hover:bg-green-600 rounded-lg text-sm font-semibold"
            >
              Add
            </button>
          </form>

          {/* All */}
          <button
            onClick={() => {
              setSelectedFolder(null);
              setShowFavorites(false);
            }}
            className={`block w-full text-left px-3 py-2 rounded-lg mb-1 ${
              !selectedFolder && !showFavorites
                ? "bg-blue-600/80"
                : "hover:bg-white/20"
            }`}
          >
            All Bookmarks
          </button>

          {/* Favorites */}
          <button
            onClick={() => {
              setShowFavorites(true);
              setSelectedFolder(null);
            }}
            className={`block w-full text-left px-3 py-2 rounded-lg mb-1 ${
              showFavorites
                ? "bg-pink-600/80"
                : "hover:bg-white/20"
            }`}
          >
            ⭐ Favorites
          </button>

          {/* Folder List */}
          {folders.map((folder) => (
            <div
              key={folder.id}
              className="flex items-center justify-between group"
            >
              <button
                onClick={() => {
                  setSelectedFolder(folder.id);
                  setShowFavorites(false);
                }}
                className={`flex-1 text-left px-3 py-2 rounded-lg truncate ${
                  selectedFolder === folder.id
                    ? "bg-blue-600/80"
                    : "hover:bg-white/20"
                }`}
              >
                {folder.name}
              </button>

              <button
                onClick={() => {
                  setItemToDelete(folder);
                  setDeleteModalOpen(true);
                }}
                className="
                  ml-2 px-2 py-1 text-red-400
                  opacity-100
                  sm:opacity-0 sm:group-hover:opacity-100
                  transition
                "
              >
                🗑
              </button>
            </div>
          ))}
        </aside>

        {/* ================= BOOKMARKS ================= */}
        <div className="flex-1 space-y-4">

          {filteredBookmarks.map((bookmark) => (
            <div
              key={bookmark.id}
              className="bg-white/10 p-4 rounded-xl text-white"
            >

              {editingId === bookmark.id ? (
                <form
                  className="flex flex-col gap-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleUpdate(bookmark);
                  }}
                >
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="px-3 py-2 rounded bg-white/20"
                    required
                  />

                  <input
                    value={editUrl}
                    onChange={(e) => setEditUrl(e.target.value)}
                    className="px-3 py-2 rounded bg-white/20"
                    required
                  />

                  <select
                    value={editFolder || ""}
                    onChange={(e) =>
                      setEditFolder(e.target.value || null)
                    }
                    className="px-3 py-2 rounded bg-white/20"
                  >
                    <option value="">No Folder</option>
                    {folders.map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        {folder.name}
                      </option>
                    ))}
                  </select>

                  <div className="flex gap-2">
                    <button className="px-3 py-1 bg-green-600 rounded-lg text-xs">
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1 bg-gray-600 rounded-lg text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">

                  <div>
                    <h3 className="font-semibold">{bookmark.title}</h3>
                    <a
                      href={bookmark.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 break-all"
                    >
                      {bookmark.url}
                    </a>
                  </div>

                  <div className="flex gap-2 flex-wrap">

                    {/* Pin */}
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
                      className={`px-2 py-1 rounded ${
                        bookmark.pinned
                          ? "bg-yellow-500 text-black"
                          : "bg-white/20"
                      }`}
                    >
                      📌
                    </button>

                    {/* Favorite */}
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
                      className={`px-2 py-1 rounded ${
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
                      ✏️
                    </button>

                    <button
                      onClick={() => {
                        setItemToDelete(bookmark);
                        setDeleteModalOpen(true);
                      }}
                      className="px-3 py-1 bg-red-600 rounded-lg text-xs"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              )}
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
          <div className="relative bg-slate-900 p-6 rounded-xl text-white">
            <h3 className="text-lg font-bold mb-4">
              {isBookmark(itemToDelete)
                ? "Delete Bookmark"
                : "Delete Folder"}
            </h3>

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

function isBookmark(
  item: Bookmark | Folder
): item is Bookmark {
  return (item as Bookmark).url !== undefined;
}
