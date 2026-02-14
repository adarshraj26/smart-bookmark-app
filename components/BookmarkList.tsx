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
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBookmarks();
  }, [userId]);

  // ================= FILTER =================

  const filteredBookmarks = bookmarks.filter((bookmark) =>
    selectedFolder ? bookmark.folder_id === selectedFolder : true
  );

  // ================= DELETE HANDLER =================

  async function handleDeleteConfirmed() {
    if (!itemToDelete) return;

    try {
      if ("url" in itemToDelete) {
        // Bookmark delete
        await supabase
          .from("bookmarks")
          .delete()
          .eq("id", itemToDelete.id);

        setBookmarks((prev) =>
          prev.filter((b) => b.id !== itemToDelete.id)
        );
      } else {
        // Folder delete
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
                setItemToDelete(folder);
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
            className="bg-white/10 p-4 rounded-xl text-white flex items-center justify-between"
          >
            <div>
              <h3 className="font-semibold">{bookmark.title}</h3>
              <a
                href={bookmark.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400"
              >
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
                          await supabase.from('bookmarks').update({
                            title: editTitle.trim(),
                            url: editUrl.trim(),
                            folder_id: editFolder || null,
                          }).eq('id', bookmark.id);
                          setBookmarks((prev) => prev.map((b) => b.id === bookmark.id ? { ...b, title: editTitle.trim(), url: editUrl.trim(), folder_id: editFolder || null } : b));
                          setEditingId(null);
                        } catch (error) {
                          alert('Failed to update bookmark');
                        }
                      }}
                    >
                      <input
                        type="text"
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        className="mb-1 px-2 py-1 rounded bg-white/20 text-white placeholder-gray-300 outline-none"
                        placeholder="Title"
                        required
                      />
                      <input
                        type="url"
                        value={editUrl}
                        onChange={e => setEditUrl(e.target.value)}
                        className="mb-1 px-2 py-1 rounded bg-white/20 text-white placeholder-gray-300 outline-none"
                        placeholder="URL"
                        required
                      />
                      <select
                        value={editFolder || ''}
                        onChange={e => setEditFolder(e.target.value || null)}
                        className="mb-2 px-2 py-1 rounded bg-white/20 text-white"
                      >
                        <option value="">No Folder</option>
                        {folders.map(folder => (
                          <option key={folder.id} value={folder.id}>{folder.name}</option>
                        ))}
                      </select>
                      <div className="flex gap-2 mt-1">
                        <button type="submit" className="px-3 py-1 bg-green-600/80 text-white rounded-lg text-xs font-semibold hover:bg-green-700 transition flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                          Save
                        </button>
                        <button type="button" onClick={() => setEditingId(null)} className="px-3 py-1 bg-gray-600/80 text-white rounded-lg text-xs font-semibold hover:bg-gray-700 transition flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div>
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
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => {
                            setEditingId(bookmark.id);
                            setEditTitle(bookmark.title);
                            setEditUrl(bookmark.url);
                            setEditFolder(bookmark.folder_id || null);
                          }}
                          className="flex items-center gap-1 px-3 py-1 bg-blue-600/80 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => {
                            setFolderToDelete(bookmark); // reuse folderToDelete for bookmark modal
                            setDeleteModalOpen(true);
                          }}
                          className="flex items-center gap-1 px-3 py-1 bg-red-600/80 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          <span>Delete</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>

            <div className="flex justify-end gap-3">
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
    </div>
  );
}
