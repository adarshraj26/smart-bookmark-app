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

  // ================= PIN =================

  async function togglePin(bookmark: Bookmark) {
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
  }

  // ================= FAVORITE =================

  async function toggleFavorite(bookmark: Bookmark) {
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
  }

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
        {/* ================= SIDEBAR ================= */}
        <aside className="w-64 bg-white/10 rounded-xl p-4 text-white h-fit backdrop-blur-xl border border-white/20">
          <div className="font-bold text-lg mb-3">Folders</div>

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
              className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-white/20 text-white"
            />

            <button
              type="submit"
              className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold text-sm rounded-lg"
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
            <button
              key={folder.id}
              onClick={() => setSelectedFolder(folder.id)}
              className={`block w-full text-left px-3 py-2 rounded-lg mb-1 ${
                selectedFolder === folder.id
                  ? "bg-blue-600/80"
                  : "hover:bg-white/20"
              }`}
            >
              {folder.name}
            </button>
          ))}
        </aside>

        {/* ================= BOOKMARKS ================= */}
        <div className="flex-1 space-y-4">
          {bookmarks
            .filter(
              (b) =>
                !selectedFolder || b.folder_id === selectedFolder
            )
            .sort((a, b) => {
              if (a.pinned && !b.pinned) return -1;
              if (!a.pinned && b.pinned) return 1;
              return 0;
            })
            .map((bookmark) => (
              <div
                key={bookmark.id}
                className="bg-white/10 p-4 rounded-xl text-white border border-white/20"
              >
                <div className="flex justify-between items-start">
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

                  <div className="flex gap-3 items-center">
                    {/* Pin */}
                    <button
                      onClick={() => togglePin(bookmark)}
                      title="Pin"
                      className={`text-yellow-400 ${
                        bookmark.pinned ? "" : "opacity-50"
                      }`}
                    >
                      📌
                    </button>

                    {/* Favorite */}
                    <button
                      onClick={() => toggleFavorite(bookmark)}
                      title="Favorite"
                      className={`text-pink-400 ${
                        bookmark.favorite ? "" : "opacity-50"
                      }`}
                    >
                      ⭐
                    </button>

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
              Delete Bookmark?
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
