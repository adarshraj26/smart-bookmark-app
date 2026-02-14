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

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editFolder, setEditFolder] = useState<string | null>(null);

  // ================= FETCH =================

  async function fetchBookmarks() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("bookmarks")
        .select("*")
        .eq("user_id", userId);

      if (error) throw error;
      setBookmarks(data || []);
    } catch (err) {
      alert("Failed to fetch bookmarks");
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchBookmarks();
  }, [userId]);

  // ================= DELETE =================

  async function handleDeleteConfirmed() {
    if (!itemToDelete) return;

    try {
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
    } catch (error) {
      alert("Failed to delete");
    }
  }

  if (loading) {
    return <div className="text-white">Loading...</div>;
  }

  return (
    <>
      <div className="flex-1 space-y-4">
        {bookmarks
          .filter(
            (b) => !selectedFolder || b.folder_id === selectedFolder
          )
          .map((bookmark) => (
            <div
              key={bookmark.id}
              className="bg-white/10 p-4 rounded-xl text-white flex items-center justify-between"
            >
              {editingId === bookmark.id ? (
                <form
                  className="flex-1 flex flex-col gap-2"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    try {
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
                    } catch {
                      alert("Failed to update bookmark");
                    }
                  }}
                >
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) =>
                      setEditTitle(e.target.value)
                    }
                    className="px-2 py-1 rounded bg-white/20 text-white"
                    required
                  />

                  <input
                    type="url"
                    value={editUrl}
                    onChange={(e) =>
                      setEditUrl(e.target.value)
                    }
                    className="px-2 py-1 rounded bg-white/20 text-white"
                    required
                  />

                  <select
                    value={editFolder || ""}
                    onChange={(e) =>
                      setEditFolder(
                        e.target.value || null
                      )
                    }
                    className="px-2 py-1 rounded bg-white/20 text-white"
                  >
                    <option value="">
                      No Folder
                    </option>
                    {folders.map((folder) => (
                      <option
                        key={folder.id}
                        value={folder.id}
                      >
                        {folder.name}
                      </option>
                    ))}
                  </select>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="px-3 py-1 bg-green-600 rounded-lg text-xs"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setEditingId(null)
                      }
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

                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => {
                        setEditingId(bookmark.id);
                        setEditTitle(bookmark.title);
                        setEditUrl(bookmark.url);
                        setEditFolder(
                          bookmark.folder_id ||
                            null
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
                </>
              )}
            </div>
          ))}
      </div>

      {/* Delete Modal */}
      {deleteModalOpen && itemToDelete && (
        <Dialog
          open={deleteModalOpen}
          onClose={() =>
            setDeleteModalOpen(false)
          }
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

// Type Guard
function isBookmark(
  item: Bookmark | Folder
): item is Bookmark {
  return (item as Bookmark).url !== undefined;
}
