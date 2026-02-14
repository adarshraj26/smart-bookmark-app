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
  const [creatingFolder, setCreatingFolder] = useState(false);
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
    try {
      const { data, error } = await supabase
        .from("bookmarks")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBookmarks(data || []);
    } catch (error) {
      alert("Failed to fetch bookmarks");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBookmarks();
  }, [userId]);

  // ================= UPDATE =================

  async function handleUpdate(bookmark: Bookmark) {
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
  }

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
    } catch {
      alert("Failed to delete");
    }
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

          {/* Folder creation form */}
          <form
            className="flex gap-2 mb-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!newFolderName.trim()) return;
              setCreatingFolder(true);
              const { data, error } = await supabase
                .from("folders")
                .insert([{ name: newFolderName.trim(), user_id: userId }]);
              setCreatingFolder(false);
              if (!error) {
                setNewFolderName("");
                fetchFolders();
              } else {
                alert("Failed to create folder");
              }
            }}
          >
            <input
              type="text"
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              className="flex-1 px-2 py-1 rounded bg-white/20 text-white placeholder-gray-300 outline-none"
              placeholder="New folder name"
              disabled={creatingFolder}
            />
            <button
              type="submit"
              className="px-3 py-1 bg-green-600 rounded-lg text-xs font-semibold hover:bg-green-700 transition"
              disabled={creatingFolder}
            >
              {creatingFolder ? "..." : "Add"}
            </button>
          </form>

          <button
            className={`block w-full text-left px-3 py-2 rounded-lg mb-1 ${
              !selectedFolder
                ? "bg-blue-600/80"
                : "hover:bg-white/20"
            }`}
            onClick={() => setSelectedFolder(null)}
          >
            All Bookmarks
          </button>

          {folders.map((folder) => (
            <div key={folder.id} className="flex items-center mb-1 group">
              <button
                className={`flex-1 block text-left px-3 py-2 rounded-lg transition font-semibold ${
                  selectedFolder === folder.id
                    ? "bg-blue-600/80 text-white"
                    : "hover:bg-white/20"
                }`}
                onClick={() => setSelectedFolder(folder.id)}
              >
                {folder.name}
              </button>
              <button
                className="ml-2 px-2 py-1 rounded bg-red-600 text-white text-xs opacity-0 group-hover:opacity-100 transition"
                title="Delete folder"
                onClick={() => {
                  setItemToDelete(folder);
                  setDeleteModalOpen(true);
                }}
              >
                &#10005;
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
            .sort((a, b) => {
              // Pinned bookmarks first, then by created_at desc
              if (a.pinned && !b.pinned) return -1;
              if (!a.pinned && b.pinned) return 1;
              return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            })
            .map((bookmark) => (
              <div
                key={bookmark.id}
                className="bg-white/10 p-4 rounded-xl text-white flex justify-between"
              >
                {/* Pin/Favorite buttons */}
                <div className="flex flex-col items-center mr-4 gap-2">
                  <button
                    title={bookmark.pinned ? "Unpin" : "Pin"}
                    className={`text-yellow-400 hover:text-yellow-300 transition ${bookmark.pinned ? "" : "opacity-60"}`}
                    onClick={async () => {
                      await supabase.from("bookmarks").update({ pinned: !bookmark.pinned }).eq("id", bookmark.id);
                      setBookmarks((prev) => prev.map((b) => b.id === bookmark.id ? { ...b, pinned: !bookmark.pinned } : b));
                    }}
                  >
                    {bookmark.pinned ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20" className="w-5 h-5"><path d="M10 2a1 1 0 0 1 1 1v10.382l2.447-2.447a1 1 0 1 1 1.414 1.414l-4.243 4.243a1 1 0 0 1-1.414 0l-4.243-4.243a1 1 0 1 1 1.414-1.414L9 13.382V3a1 1 0 0 1 1-1z"/></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20" stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 2v11.586l-2.293-2.293a1 1 0 0 0-1.414 1.414l4 4a1 1 0 0 0 1.414 0l4-4a1 1 0 0 0-1.414-1.414L11 13.586V2a1 1 0 1 0-2 0z"/></svg>
                    )}
                  </button>
                  <button
                    title={bookmark.favorite ? "Unfavorite" : "Favorite"}
                    className={`text-pink-400 hover:text-pink-300 transition ${bookmark.favorite ? "" : "opacity-60"}`}
                    onClick={async () => {
                      await supabase.from("bookmarks").update({ favorite: !bookmark.favorite }).eq("id", bookmark.id);
                      setBookmarks((prev) => prev.map((b) => b.id === bookmark.id ? { ...b, favorite: !bookmark.favorite } : b));
                    }}
                  >
                    {bookmark.favorite ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20" className="w-5 h-5"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 0 0 .95.69h4.18c.969 0 1.371 1.24.588 1.81l-3.388 2.46a1 1 0 0 0-.364 1.118l1.287 3.966c.3.922-.755 1.688-1.54 1.118l-3.388-2.46a1 1 0 0 0-1.176 0l-3.388 2.46c-.784.57-1.838-.196-1.539-1.118l1.287-3.966a1 1 0 0 0-.364-1.118l-3.388-2.46c-.783-.57-.38-1.81.588-1.81h4.18a1 1 0 0 0 .95-.69l1.286-3.967z"/></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20" stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 0 0 .95.69h4.18c.969 0 1.371 1.24.588 1.81l-3.388 2.46a1 1 0 0 0-.364 1.118l1.287 3.966c.3.922-.755 1.688-1.54 1.118l-3.388-2.46a1 1 0 0 0-1.176 0l-3.388 2.46c-.784.57-1.838-.196-1.539-1.118l1.287-3.966a1 1 0 0 0-.364-1.118l-3.388-2.46c-.783-.57-.38-1.81.588-1.81h4.18a1 1 0 0 0 .95-.69l1.286-3.967z"/></svg>
                    )}
                  </button>
                </div>
                  <form
                    className="flex-1 flex flex-col gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleUpdate(bookmark);
                    }}
                  >
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) =>
                        setEditTitle(e.target.value)
                      }
                      className="px-2 py-1 rounded bg-white/20"
                      required
                    />

                    <input
                      type="url"
                      value={editUrl}
                      onChange={(e) =>
                        setEditUrl(e.target.value)
                      }
                      className="px-2 py-1 rounded bg-white/20"
                      required
                    />

                    <select
                      value={editFolder || ""}
                      onChange={(e) =>
                        setEditFolder(
                          e.target.value || null
                        )
                      }
                      className="px-2 py-1 rounded bg-white/20"
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
                  </>
                )}
              </div>
            ))}
        </div>
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
