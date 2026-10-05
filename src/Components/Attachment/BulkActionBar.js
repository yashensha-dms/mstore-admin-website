import React from "react";
import { CheckSquare, Square, Trash2, RefreshCw, X } from "lucide-react";

const BulkActionBar = ({
  selectedCount = 0,
  totalPageCount = 0,
  isAllPageSelected = false,
  onToggleSelectAllPage,
  onClearSelection,
  onDeleteSelected,
  isDeleting = false,
  selectedCloudinaryCount = 0,
  onSyncSelectedCloudinary,
  isSyncing = false,
  canDelete = true,
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[990] animate-slideUp">
      <div className="flex items-center gap-3 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-800 backdrop-blur-md">
        {/* Count Badge */}
        <div className="flex items-center gap-2 pr-3 border-r border-slate-700/80">
          <span className="w-6 h-6 rounded-full bg-slate-800 text-white text-xs flex items-center justify-center font-bold">
            {selectedCount}
          </span>
          <span className="text-xs font-semibold text-slate-300">Selected</span>
        </div>

        {/* Select / Deselect All on Current Page */}
        <button
          type="button"
          onClick={onToggleSelectAllPage}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
        >
          {isAllPageSelected ? (
            <>
              <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
              <span>Deselect Page</span>
            </>
          ) : (
            <>
              <Square className="w-3.5 h-3.5" />
              <span>Select Page ({totalPageCount})</span>
            </>
          )}
        </button>

        {/* Sync Selected Cloudinary Images */}
        {selectedCloudinaryCount > 0 && onSyncSelectedCloudinary && (
          <button
            type="button"
            disabled={isSyncing}
            onClick={onSyncSelectedCloudinary}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            <span>Sync Cloudinary ({selectedCloudinaryCount})</span>
          </button>
        )}

        {/* Delete Selected */}
        {canDelete && onDeleteSelected && (
          <button
            type="button"
            disabled={isDeleting}
            onClick={onDeleteSelected}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isDeleting ? "Deleting..." : `Delete (${selectedCount})`}</span>
          </button>
        )}

        {/* Dismiss / Clear All */}
        <button
          type="button"
          onClick={onClearSelection}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1 cursor-pointer"
          title="Clear Selection"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default BulkActionBar;
