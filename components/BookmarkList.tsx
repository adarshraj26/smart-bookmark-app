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
  const [searchQuery, setSearchQuery] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

    const channel = supabase
      .channel("realtime-bookmarks")
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
          }
          if (payload.eventType === "UPDATE") {
            setBookmarks((prev) =>
              prev.map((b) =>
                b.id === (payload.new as Bookmark).id
                  ? (payload.new as Bookmark)
                  : b
              )
            );
          }
          if (payload.eventType === "DELETE") {
            setBookmarks((prev) =>
              prev.filter((b) => b.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
    }

    setDeleteModalOpen(false);
    setItemToDelete(null);
  }

  if (loading) return <div className="text-white">Loading...</div>;

  // ================= FILTER =================

  const filteredBookmarks = bookmarks
    .filter((b) => {
      const matchesSearch =
        b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.url.toLowerCase().includes(searchQuery.toLowerCase());

      if (showFavorites) return b.favorite && matchesSearch;
      if (!selectedFolder) return matchesSearch;

      return b.folder_id === selectedFolder && matchesSearch;
    })
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return 0;
    });

  return (
    <>
      <div className="flex flex-col lg:flex-row gap-6">

        {/* ================= MOBILE TOGGLE BUTTON ================= */}
        <button
          className="lg:hidden bg-white/10 p-2 rounded-lg text-white"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          📂 Folders
        </button>

        {/* ================= SIDEBAR ================= */}
        <aside
          className={`${
            sidebarOpen ? "block" : "hidden"
          } lg:block w-full lg:w-64 bg-white/10 rounded-xl p-4 text-white`}
        >
          <div className="font-bold text-lg mb-3">Folders</div>

          {/* Create Folder */}
          <form
            className="flex items-center gap-2 mb-4 w-full"
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
              className="px-3 py-2 bg-green-500 rounded-lg text-sm font-semibold"
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
            className="block w-full text-left px-3 py-2 rounded-lg mb-1 hover:bg-white/20"
          >
            All
          </button>

          {/* Favorites */}
          <button
            onClick={() => {
              setShowFavorites(true);
              setSelectedFolder(null);
            }}
            className="block w-full text-left px-3 py-2 rounded-lg mb-1 hover:bg-white/20"
          >
            ⭐ Favorites
          </button>

          {/* Folder List */}
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
                className="ml-2 text-red-400"
              >
                ×
              </button>
            </div>
          ))}
        </aside>

        {/* ================= BOOKMARKS ================= */}
        <div className="flex-1 space-y-4">

          {/* Search */}
          <input
            type="text"
            placeholder="Search bookmarks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-white/10 text-white placeholder-white/50"
          />

          {filteredBookmarks.map((bookmark) => (
            <div
              key={bookmark.id}
              className="bg-white/10 p-4 rounded-xl text-white flex justify-between items-center"
            >
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
                  }}
                  className={`px-2 py-1 rounded ${
                    bookmark.favorite
                      ? "bg-pink-500"
                      : "bg-white/20"
                  }`}
                >
                  {bookmark.favorite ? "★" : "☆"}
                </button>

                {/* Edit */}
                <button
                  onClick={() => {
                    setEditingId(bookmark.id);
                    setEditTitle(bookmark.title);
                    setEditUrl(bookmark.url);
                    setEditFolder(bookmark.folder_id || null);
                  }}
                  className="px-3 py-1 bg-blue-600 rounded-lg text-xs"
                >
                  ✏
                </button>

                {/* Delete */}
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
