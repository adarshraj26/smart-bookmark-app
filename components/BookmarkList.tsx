"use client";

import { supabase } from "@/lib/supabase";
import type { Bookmark, Folder } from "@/lib/types";
import { Listbox, Transition, Dialog } from "@headlessui/react";
import { Fragment, useEffect, useState } from "react";

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

  // ================= STATE =================

  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [newFolderName, setNewFolderName] = useState("");
  const [folderError, setFolderError] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editFolder, setEditFolder] = useState<string | null>(null);
  const [editError, setEditError] = useState("");
  const [showFavorites, setShowFavorites] = useState(false);

  // ✅ FIXED — moved inside component
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);

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
      console.error("Error fetching bookmarks:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBookmarks();

    const channel = supabase
      .channel(`bookmarks:user_id=eq.${userId}`)
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
          } else if (payload.eventType === "DELETE") {
            setBookmarks((prev) =>
              prev.filter((b) => b.id !== (payload.old as Bookmark).id)
            );
          } else if (payload.eventType === "UPDATE") {
            setBookmarks((prev) =>
              prev.map((b) =>
                b.id === (payload.new as Bookmark).id
                  ? (payload.new as Bookmark)
                  : b
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [userId]);

  // ================= FILTER =================

  const filteredBookmarks = bookmarks
    .filter((bookmark) => {
      const matchesQuery =
        bookmark.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bookmark.url.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFavorite = showFavorites ? bookmark.favorite : true;
      const matchesFolder = selectedFolder
        ? bookmark.folder_id === selectedFolder
        : true;

      return matchesQuery && matchesFavorite && matchesFolder;
    })
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return 0;
    });

  // ================= FOLDER DELETE =================

  async function handleDeleteFolderConfirmed() {
    if (!folderToDelete) return;

    try {
      await supabase
        .from("bookmarks")
        .update({ folder_id: null })
        .eq("folder_id", folderToDelete.id);

      const { error } = await supabase
        .from("folders")
        .delete()
        .eq("id", folderToDelete.id);

      if (error) throw error;

      if (selectedFolder === folderToDelete.id) {
        setSelectedFolder(null);
      }

      fetchFolders();
      fetchBookmarks();
      setDeleteModalOpen(false);
      setFolderToDelete(null);
    } catch (error) {
      alert("Failed to delete folder");
      console.error(error);
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
                setFolderToDelete(folder);
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
            className="bg-white/10 p-4 rounded-xl text-white"
          >
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
        ))}
      </div>

      {/* Delete Folder Modal */}
      <Transition appear show={deleteModalOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => setDeleteModalOpen(false)}
        >
          <div className="fixed inset-0 bg-black/40" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="bg-slate-900 p-6 rounded-xl text-white">
              <Dialog.Title className="text-lg font-bold mb-4">
                Delete Folder
              </Dialog.Title>
              <p className="mb-4">
                Are you sure you want to delete{" "}
                <span className="text-red-400 font-bold">
                  {folderToDelete?.name}
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
                  onClick={handleDeleteFolderConfirmed}
                  className="px-4 py-2 bg-red-600 rounded-lg"
                >
                  Delete
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}
