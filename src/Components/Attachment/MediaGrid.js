import React from "react";
import { Image as ImageIcon, SearchX } from "lucide-react";
import MediaCard from "./MediaCard";

const MediaGrid = ({
  items = [],
  isLoading = false,
  selectedIds = [],
  onToggleSelect,
  onInspect,
  onCopyUrl,
  copiedId,
  isSelectionOnly = false,
  onOpenUpload,
  filterType = "all",
  onSyncCloudinary,
  isSyncing = false,
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4 p-1">
        {Array.from({ length: 18 }).map((_, index) => (
          <div
            key={index}
            className="aspect-square rounded-2xl bg-slate-100 animate-pulse border border-slate-200/60"
          />
        ))}
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center rounded-3xl bg-slate-50/50 border border-dashed border-slate-200 my-4">
        <div className="w-16 h-16 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 mb-4">
          <ImageIcon className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-slate-800 mb-1">
          {filterType === "cloudinary" ? "No Cloudinary Images on this View" : "No media files found"}
        </h3>
        <p className="text-sm text-slate-500 max-w-md mb-5">
          {filterType === "cloudinary"
            ? "Cloudinary images in older pages can be synced to local storage directly using the bulk sync tool."
            : "There are no images matching your current filter criteria or search query."}
        </p>

        <div className="flex items-center gap-3">
          {filterType === "cloudinary" && onSyncCloudinary ? (
            <button
              type="button"
              disabled={isSyncing}
              onClick={onSyncCloudinary}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isSyncing ? "Syncing in progress..." : "Scan & Sync All Cloudinary From Library"}
            </button>
          ) : (
            onOpenUpload && (
              <button
                type="button"
                onClick={onOpenUpload}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-all shadow-sm cursor-pointer"
              >
                Upload New Images
              </button>
            )
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4 p-1">
      {items.map((item) => {
        const isSelected = selectedIds.includes(item.id);
        return (
          <MediaCard
            key={item.id}
            item={item}
            isSelected={isSelected}
            onToggleSelect={onToggleSelect}
            onInspect={onInspect}
            onCopyUrl={onCopyUrl}
            copiedId={copiedId}
            isSelectionOnly={isSelectionOnly}
          />
        );
      })}
    </div>
  );
};

export default MediaGrid;
