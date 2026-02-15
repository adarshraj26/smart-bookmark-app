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

  async function fetchBookmarks() {
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

  useEffect(() => {

    const channel = supabase
      .channel(`bookmarks-user-${userId}`)
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
            setBookmarks(prev => [payload.new as Bookmark, ...prev]);
          }

          if (payload.eventType === "UPDATE") {
            setBookmarks(prev =>
              prev.map(b =>
                b.id === (payload.new as Bookmark).id
                  ? payload.new as Bookmark
                  : b
              )
            );
          }

          if (payload.eventType === "DELETE") {
            setBookmarks(prev =>
              prev.filter(
                b => b.id !== (payload.old as Bookmark).id
              )
            );
          }

        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };

  }, [userId]);

  async function handleUpdate(bookmark: Bookmark) {

    const { data } = await supabase
      .from("bookmarks")
      .update({
        title: editTitle.trim(),
        url: editUrl.trim(),
        folder_id: editFolder || null,
      })
      .eq("id", bookmark.id)
      .select()
      .single();

    if (data) {
      setBookmarks(prev =>
        prev.map(b => b.id === data.id ? data : b)
      );
    }

    setEditingId(null);
  }

  async function handleDeleteConfirmed() {

    if (!itemToDelete) return;

    if (isBookmark(itemToDelete)) {

      await supabase
        .from("bookmarks")
        .delete()
        .eq("id", itemToDelete.id);

      setBookmarks(prev =>
        prev.filter(b => b.id !== itemToDelete.id)
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

  const filteredBookmarks = bookmarks.filter(b => {

    const matchesSearch =
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.url.toLowerCase().includes(searchQuery.toLowerCase());

    if (showFavorites) return b.favorite && matchesSearch;

    if (!selectedFolder) return matchesSearch;

    return b.folder_id === selectedFolder && matchesSearch;

  });

  return (
    <>

      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden mb-3 px-4 py-2 bg-purple-600 rounded-lg text-white"
      >
        Folders
      </button>

      <div className="flex flex-col lg:flex-row gap-6">

        {/* SIDEBAR */}
        <aside
          className={`w-full lg:w-64 box-border overflow-hidden bg-white/10 rounded-xl p-4 text-white ${
            sidebarOpen ? "block" : "hidden lg:block"
          }`}
        >
          <div className="font-bold text-lg mb-3">Folders</div>

          <form
            className="flex w-full items-center gap-2 mb-4"
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
              onChange={(e) =>
                setNewFolderName(e.target.value)
              }
              placeholder="New folder"
              className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-white/20"
            />

            <button
              type="submit"
              className="shrink-0 px-3 py-2 bg-green-500 rounded-lg"
            >
              Add
            </button>

          </form>

          <button
            onClick={() => {
              setSelectedFolder(null);
              setShowFavorites(false);
            }}
            className="block w-full text-left px-3 py-2 rounded-lg mb-1 bg-blue-600/80"
          >
            All
          </button>

          <button
            onClick={() => {
              setShowFavorites(true);
              setSelectedFolder(null);
            }}
            className="block w-full text-left px-3 py-2 rounded-lg mb-1 bg-pink-600/80"
          >
            ⭐ Favorites
          </button>

          {folders.map(folder => (
            <div key={folder.id} className="flex items-center">
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

        {/* BOOKMARKS */}
        <div className="flex-1 space-y-4">

          <input
            placeholder="Search bookmarks..."
            value={searchQuery}
            onChange={(e) =>
              setSearchQuery(e.target.value)
            }
            className="w-full px-4 py-2 rounded-lg bg-white/10 text-white"
          />

          {filteredBookmarks.map(bookmark => (

            <div
              key={bookmark.id}
              className="bg-white/10 p-4 rounded-xl text-white"
            >

              {editingId === bookmark.id ? (

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleUpdate(bookmark);
                  }}
                  className="space-y-2"
                >

                  <input
                    value={editTitle}
                    onChange={(e) =>
                      setEditTitle(e.target.value)
                    }
                    className="w-full px-3 py-2 rounded bg-white/20"
                  />

                  <input
                    value={editUrl}
                    onChange={(e) =>
                      setEditUrl(e.target.value)
                    }
                    className="w-full px-3 py-2 rounded bg-white/20"
                  />

                  <select
                    value={editFolder || ""}
                    onChange={(e) =>
                      setEditFolder(e.target.value || null)
                    }
                    className="w-full px-3 py-2 rounded bg-white/20"
                  >
                    <option value="">No Folder</option>
                    {folders.map(folder => (
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

                <div className="flex justify-between items-center">

                  <div>
                    <h3 className="font-semibold">{bookmark.title}</h3>
                    <a
                      href={bookmark.url}
                      target="_blank"
                      className="text-blue-400 break-all"
                    >
                      {bookmark.url}
                    </a>
                  </div>

                  <div className="flex gap-2">

                    {/* PIN */}
                    <button
                      onClick={async () => {
                        const { data } = await supabase
                          .from("bookmarks")
                          .update({ pinned: !bookmark.pinned })
                          .eq("id", bookmark.id)
                          .select()
                          .single();

                        if (data) {
                          setBookmarks(prev =>
                            prev.map(b =>
                              b.id === data.id ? data : b
                            )
                          );
                        }
                      }}
                      className={`px-2 py-1 rounded ${
                        bookmark.pinned
                          ? "bg-yellow-500 text-black"
                          : "bg-white/20"
                      }`}
                    >
                      📌
                    </button>

                    {/* FAVORITE unchanged */}
                    <button
                      onClick={async () => {
                        const { data } = await supabase
                          .from("bookmarks")
                          .update({ favorite: !bookmark.favorite })
                          .eq("id", bookmark.id)
                          .select()
                          .single();

                        if (data) {
                          setBookmarks(prev =>
                            prev.map(b =>
                              b.id === data.id ? data : b
                            )
                          );
                        }
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
                      className="px-2 py-1 bg-blue-600 rounded-lg"
                    >
                      ✏️
                    </button>

                    {/* DELETE */}
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

      {/* DELETE MODAL */}

      {deleteModalOpen && itemToDelete && (
        <Dialog open={deleteModalOpen} onClose={() => setDeleteModalOpen(false)}>
          <div className="fixed inset-0 bg-black/40" />
          <div className="fixed inset-0 flex items-center justify-center">
            <div className="bg-slate-900 p-6 rounded-xl text-white">

              <h3 className="mb-4">
                Delete {isBookmark(itemToDelete) ? "Bookmark" : "Folder"}?
              </h3>

              <div className="flex gap-3">

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
          </div>
        </Dialog>
      )}

    </>
  );
}

function isBookmark(item: Bookmark | Folder): item is Bookmark {
  return (item as Bookmark).url !== undefined;
}
