"use client";

import { supabase } from "@/lib/supabase";
import type { Bookmark, Folder } from "@/lib/types";
import { Dialog } from "@headlessui/react";
import { useEffect, useState, useRef } from "react";

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
      <div className="flex flex-col lg:flex-row gap-6">

        {/* ================= SIDEBAR ================= */}
        <aside className="lg:w-64 w-full bg-white/10 rounded-xl p-4 text-white">
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
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="New folder"
              className="flex-1 px-3 py-2 rounded-lg bg-white/20 text-white text-sm"
            />
            <button className="px-3 py-2 bg-green-500 rounded-lg text-sm">
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
            All
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
            <button
              key={folder.id}
              onClick={() => {
                setSelectedFolder(folder.id);
                setShowFavorites(false);
              }}
              className="block w-full text-left px-3 py-2 rounded-lg hover:bg-white/20"
            >
              {folder.name}
            </button>
          ))}
        </aside>

        {/* ================= BOOKMARKS ================= */}
        <div className="flex-1 space-y-4">
          {filteredBookmarks.map((bookmark) => (
            <SwipeableCard
              key={bookmark.id}
              bookmark={bookmark}
              editingId={editingId}
              setEditingId={setEditingId}
              editTitle={editTitle}
              setEditTitle={setEditTitle}
              editUrl={editUrl}
              setEditUrl={setEditUrl}
              editFolder={editFolder}
              setEditFolder={setEditFolder}
              folders={folders}
              handleUpdate={handleUpdate}
              setItemToDelete={setItemToDelete}
              setDeleteModalOpen={setDeleteModalOpen}
              setBookmarks={setBookmarks}
            />
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
            <h3 className="text-lg font-bold mb-4">Delete?</h3>
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

/* ================= Swipe Card Component ================= */

function SwipeableCard({
  bookmark,
  editingId,
  setEditingId,
  editTitle,
  setEditTitle,
  editUrl,
  setEditUrl,
  editFolder,
  setEditFolder,
  folders,
  handleUpdate,
  setItemToDelete,
  setDeleteModalOpen,
  setBookmarks,
}: any) {
  const [translateX, setTranslateX] = useState(0);
  const startX = useRef(0);

  function onTouchStart(e: any) {
    startX.current = e.touches[0].clientX;
  }

  function onTouchMove(e: any) {
    const delta = e.touches[0].clientX - startX.current;
    if (delta < 0) setTranslateX(delta);
  }

  function onTouchEnd() {
    if (translateX < -100) {
      setItemToDelete(bookmark);
      setDeleteModalOpen(true);
    }
    setTranslateX(0);
  }

  return (
    <div
      className="relative overflow-hidden"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div
        style={{ transform: `translateX(${translateX}px)` }}
        className="transition-transform duration-200 bg-white/10 p-4 rounded-xl text-white flex justify-between items-center"
      >
        {editingId === bookmark.id ? (
          <form
            className="w-full flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              handleUpdate(bookmark);
            }}
          >
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="px-3 py-2 rounded bg-white/20"
            />
            <input
              value={editUrl}
              onChange={(e) => setEditUrl(e.target.value)}
              className="px-3 py-2 rounded bg-white/20"
            />
            <select
              value={editFolder || ""}
              onChange={(e) => setEditFolder(e.target.value || null)}
              className="px-3 py-2 rounded bg-white/20"
            >
              <option value="">No Folder</option>
              {folders.map((folder: Folder) => (
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
          <>
            <div>
              <h3 className="font-semibold">
                {bookmark.pinned && "📌 "} {bookmark.title}
              </h3>
              <a
                href={bookmark.url}
                target="_blank"
                className="text-blue-400 text-sm"
              >
                {bookmark.url}
              </a>
            </div>

            {/* Icon-only compact mode on mobile */}
            <div className="flex gap-2">
              <button className="bg-white/20 px-2 py-1 rounded sm:px-3 sm:text-xs">
                📌
              </button>
              <button className="bg-white/20 px-2 py-1 rounded sm:px-3 sm:text-xs">
                {bookmark.favorite ? "★" : "☆"}
              </button>
              <button
                onClick={() => {
                  setEditingId(bookmark.id);
                  setEditTitle(bookmark.title);
                  setEditUrl(bookmark.url);
                  setEditFolder(bookmark.folder_id || null);
                }}
                className="bg-blue-600 px-2 py-1 rounded sm:px-3 sm:text-xs"
              >
                ✏
              </button>
              <button
                onClick={() => {
                  setItemToDelete(bookmark);
                  setDeleteModalOpen(true);
                }}
                className="bg-red-600 px-2 py-1 rounded sm:px-3 sm:text-xs"
              >
                🗑
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function isBookmark(item: Bookmark | Folder): item is Bookmark {
  return (item as Bookmark).url !== undefined;
}
