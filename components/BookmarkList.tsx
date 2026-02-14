  return (
    <div className="flex gap-8">
      {/* Sidebar: Folders */}
      <aside className="w-64 min-w-[200px] max-w-xs bg-white/10 rounded-xl p-4 text-white h-fit self-start">
        <div className="mb-4">
          <div className="font-bold text-lg mb-2">Folders</div>
          <button
            className={`block w-full text-left px-3 py-2 rounded-lg mb-1 transition font-semibold ${!selectedFolder ? 'bg-blue-600/80 text-white' : 'hover:bg-white/20'}`}
            onClick={() => setSelectedFolder(null)}
          >
            All Bookmarks
          </button>
          {folders.map((folder) => (
            <button
              key={folder.id}
              className={`block w-full text-left px-3 py-2 rounded-lg mb-1 transition font-semibold ${selectedFolder === folder.id ? 'bg-blue-600/80 text-white' : 'hover:bg-white/20'}`}
              onClick={() => setSelectedFolder(folder.id)}
            >
              {folder.name}
            </button>
          ))}
        </div>
      </aside>

      {/* Bookmarks List */}
      <div className="flex-1 space-y-4">
        {bookmarks
          .filter((b) => !selectedFolder || b.folder_id === selectedFolder)
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
                      className="px-3 py-1 bg-green-600/80 text-white rounded-lg text-xs font-semibold hover:bg-green-700 transition flex items-center gap-1"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1 bg-gray-600/80 text-white rounded-lg text-xs font-semibold hover:bg-gray-700 transition flex items-center gap-1"
                    >
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
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setItemToDelete(bookmark);
                        setDeleteModalOpen(true);
                      }}
                      className="flex items-center gap-1 px-3 py-1 bg-red-600/80 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition"
                      title="Delete"
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
      </div>

      {/* Modal remains unchanged */}
      {/* ...existing code for Dialog/modal... */}
    </div>
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
