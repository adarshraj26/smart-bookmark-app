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
  }

  if (loading) {
    return <div className="text-white">Loading...</div>;
  }

  return (
    <>
      <div className="flex gap-8">
        {/* Sidebar */}
        <aside className="w-64 bg-white/10 rounded-xl p-4 text-white h-fit">
          <div className="font-bold text-lg mb-2">Folders</div>

          <form
            className="flex items-center gap-2 mb-4 bg-white/10 rounded-lg px-2 py-1 backdrop-blur-md"
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
              className="flex-1 px-3 py-2 rounded-lg bg-white/20 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400/40 transition"
              placeholder="New folder"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold text-sm shadow transition"
            >
              Add
            </button>
          </form>

          <button
            onClick={() => setSelectedFolder(null)}
            className={`block w-full text-left px-3 py-2 rounded-lg mb-1 ${
              !selectedFolder ? "bg-blue-600/80" : "hover:bg-white/20"
            }`}
          >
            All Bookmarks
          </button>

          {folders.map((folder) => (
            <div key={folder.id} className="flex items-center mb-1 group">
              <button
                onClick={() => setSelectedFolder(folder.id)}
                className={`flex-1 text-left px-3 py-2 rounded-lg ${
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
                className="ml-2 text-red-400 opacity-0 group-hover:opacity-100"
              >
                ×
              </button>
            </div>
          ))}
        </aside>

        {/* Bookmarks */}
        <div className="flex-1 space-y-4">
          {bookmarks
            .filter(
              (b) =>
                !selectedFolder ||
                b.folder_id === selectedFolder
            )
            .map((bookmark) => (
              <div
                key={bookmark.id}
                className="bg-white/10 p-4 rounded-xl text-white"
              >
                {editingId === bookmark.id ? (
                  <form
                    className="flex-1 flex flex-col gap-4 bg-white/20 backdrop-blur-md rounded-2xl shadow-lg p-6 border border-white/20"
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleUpdate(bookmark);
                    }}
                  >
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-semibold text-white/80 mb-1">Title</label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="px-4 py-2 rounded-xl bg-white/30 text-white placeholder-gray-300 outline-none border border-white/20 focus:ring-2 focus:ring-blue-400/40 transition"
                        placeholder="Bookmark title"
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-semibold text-white/80 mb-1">URL</label>
                      <input
                        type="url"
                        value={editUrl}
                        onChange={(e) => setEditUrl(e.target.value)}
                        className="px-4 py-2 rounded-xl bg-white/30 text-white placeholder-gray-300 outline-none border border-white/20 focus:ring-2 focus:ring-blue-400/40 transition"
                        placeholder="https://example.com"
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-semibold text-white/80 mb-1">Folder</label>
                      <select
                        value={editFolder || ""}
                        onChange={(e) => setEditFolder(e.target.value || null)}
                        className="px-4 py-2 rounded-xl bg-white/30 text-white outline-none border border-white/20 focus:ring-2 focus:ring-blue-400/40 transition"
                      >
                        <option value="">No Folder</option>
                        {folders.map((folder) => (
                          <option key={folder.id} value={folder.id}>{folder.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-3 mt-2">
                      <button
                        type="submit"
                        className="px-5 py-2 bg-green-500/90 hover:bg-green-600 text-white rounded-xl font-semibold text-sm shadow transition"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="px-5 py-2 bg-gray-600/80 hover:bg-gray-700 text-white rounded-xl font-semibold text-sm shadow transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold">
                        {bookmark.title}
                      </h3>
                      <a
                        href={bookmark.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400"
                      >
                        {bookmark.url}
                      </a>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingId(bookmark.id);
                          setEditTitle(bookmark.title);
                          setEditUrl(bookmark.url);
                          setEditFolder(
                            bookmark.folder_id || null
                          );
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
                )}
              </div>
            ))}
        </div>
      </div>

      {/* Delete Modal */}
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

            <p className="mb-6">
              Are you sure you want to delete{" "}
              <span className="text-red-400 font-bold">
                {isBookmark(itemToDelete)
                  ? itemToDelete.title
                  : itemToDelete.name}
              </span>
              ?
            </p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() =>
                  setDeleteModalOpen(false)
                }
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
