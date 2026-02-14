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
  const [search, setSearch] = useState("");
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
      if (search && !b.title.toLowerCase().includes(search.toLowerCase()))
        return false;
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

        {/* MOBILE SIDEBAR TOGGLE */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          {sidebarOpen ? "Close Folders" : "Open Folders"}
        </button>

        {/* SIDEBAR */}
        <aside
          className={`${
            sidebarOpen ? "block" : "hidden"
          } lg:block w-full lg:w-64 bg-white/10 rounded-xl p-4 text-white`}
        >
          <div className="font-bold text-lg mb-3">Folders</div>

          {/* Create Folder */}
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
              className="flex-1 px-2 py-2 rounded bg-white/20"
            />
            <button className="px-3 bg-green-600 rounded">
              Add
            </button>
          </form>

          <button
            onClick={() => {
              setSelectedFolder(null);
              setShowFavorites(false);
            }}
            className="block w-full text-left px-3 py-2 rounded hover:bg-white/20"
          >
            All
          </button>

          <button
            onClick={() => {
              setShowFavorites(true);
              setSelectedFolder(null);
            }}
            className="block w-full text-left px-3 py-2 rounded hover:bg-white/20"
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
                className="flex-1 text-left px-3 py-2 rounded hover:bg-white/20"
              >
                {folder.name}
              </button>
              <button
                onClick={() => {
                  setItemToDelete(folder);
                  setDeleteModalOpen(true);
                }}
                className="text-red-400 opacity-0 group-hover:opacity-100"
              >
                ×
              </button>
            </div>
          ))}
        </aside>

        {/* BOOKMARK AREA */}
        <div className="flex-1 space-y-4">

          {/* SEARCH BAR */}
          <input
            type="text"
            placeholder="Search bookmarks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-white/20 text-white"
          />

          {filteredBookmarks.map((bookmark) => (
            <div
              key={bookmark.id}
              className="relative bg-white/10 p-4 rounded-xl text-white transition-all duration-300 hover:scale-[1.01]"
            >
              {editingId === bookmark.id ? (
                <form
                  className="flex flex-col gap-3 animate-fade-in"
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
                  <div className="flex gap-2">
                    <button className="px-3 py-2 bg-green-600 rounded">
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="px-3 py-2 bg-gray-600 rounded"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{bookmark.title}</h3>
                    <a
                      href={bookmark.url}
                      target="_blank"
                      className="text-blue-400 text-sm break-all"
                    >
                      {bookmark.url}
                    </a>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={async () => {
                        await supabase
                          .from("bookmarks")
                          .update({ pinned: !bookmark.pinned })
                          .eq("id", bookmark.id);
                        fetchBookmarks();
                      }}
                      className="px-2 py-1 bg-white/20 rounded"
                    >
                      📌
                    </button>

                    <button
                      onClick={async () => {
                        await supabase
                          .from("bookmarks")
                          .update({ favorite: !bookmark.favorite })
                          .eq("id", bookmark.id);
                        fetchBookmarks();
                      }}
                      className="px-2 py-1 bg-white/20 rounded"
                    >
                      {bookmark.favorite ? "★" : "☆"}
                    </button>

                    <button
                      onClick={() => {
                        setEditingId(bookmark.id);
                        setEditTitle(bookmark.title);
                        setEditUrl(bookmark.url);
                      }}
                      className="px-3 py-1 bg-blue-600 rounded"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => {
                        setItemToDelete(bookmark);
                        setDeleteModalOpen(true);
                      }}
                      className="px-3 py-1 bg-red-600 rounded"
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

      {/* DELETE MODAL */}
      {deleteModalOpen && itemToDelete && (
        <Dialog
          open={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          className="fixed inset-0 flex items-center justify-center z-50"
        >
          <div className="fixed inset-0 bg-black/50" />
          <div className="relative bg-slate-900 p-6 rounded-xl text-white">
            <h3 className="mb-4 font-bold">
              Delete {isBookmark(itemToDelete) ? "Bookmark" : "Folder"}
            </h3>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 bg-gray-600 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirmed}
                className="px-4 py-2 bg-red-600 rounded"
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

function isBookmark(item: Bookmark | Folder): item is Bookmark {
  return (item as Bookmark).url !== undefined;
}
