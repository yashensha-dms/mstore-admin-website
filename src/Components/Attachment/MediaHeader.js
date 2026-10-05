import React from "react";
import { Search, X, SlidersHorizontal, Cloud, Plus, RefreshCw, HardDrive } from "lucide-react";

const MediaHeader = ({
  search,
  setSearch,
  sorting,
  setSorting,
  filterType,
  setFilterType,
  cloudinaryCount = 0,
  onSyncCloudinary,
  isSyncing = false,
  onOpenUpload,
  totalItems = 0,
  canCreate = true,
}) => {
  return (
    <div className="space-y-4 mb-6">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Media Library</h2>
          {totalItems > 0 && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
              {totalItems} items
            </span>
          )}
        </div>

        {/* Top Action Buttons */}
        <div className="flex items-center gap-2.5">
          {(cloudinaryCount > 0 || filterType === "cloudinary") && onSyncCloudinary && (
            <button
              type="button"
              disabled={isSyncing}
              onClick={onSyncCloudinary}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white transition-all disabled:opacity-50 cursor-pointer shadow-sm"
              title="Download all Cloudinary images and save to local storage"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              <span>
                Sync Cloudinary {cloudinaryCount > 0 ? `(${cloudinaryCount})` : "All"}
              </span>
            </button>
          )}

          {canCreate && onOpenUpload && (
            <button
              type="button"
              onClick={onOpenUpload}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-all hover:shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Media</span>
            </button>
          )}
        </div>
      </div>

      {/* Control Bar: Filters, Search, Sort */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-slate-200/80 shadow-sm">
        {/* Storage Filter Tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setFilterType("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 whitespace-nowrap cursor-pointer ${
              filterType === "all"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            All Files
          </button>
          <button
            type="button"
            onClick={() => setFilterType("local")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 whitespace-nowrap cursor-pointer ${
              filterType === "local"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <HardDrive className="w-3 h-3" />
            <span>Local Storage</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterType("cloudinary")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 whitespace-nowrap cursor-pointer ${
              filterType === "cloudinary"
                ? "bg-white text-amber-700 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Cloud className="w-3 h-3" />
            <span>Cloudinary</span>
            {cloudinaryCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-800 text-[10px] flex items-center justify-center font-bold">
                {cloudinaryCount}
              </span>
            )}
          </button>
        </div>

        {/* Search & Sort Panel */}
        <div className="flex items-center gap-2 flex-1 md:justify-end">
          {/* Live Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search files..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 transition-all placeholder:text-slate-400 text-slate-700"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="relative shrink-0">
            <SlidersHorizontal className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select
              value={sorting}
              onChange={(e) => setSorting(e.target.value)}
              className="pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 transition-all cursor-pointer text-slate-700 font-medium"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="largest">Largest Size</option>
              <option value="smallest">Smallest Size</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MediaHeader;
