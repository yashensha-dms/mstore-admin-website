import React, { useState } from "react";
import { Check, Cloud, HardDrive, Copy, CheckCheck, Eye, ImageOff } from "lucide-react";

const MediaCard = ({
  item,
  isSelected,
  onToggleSelect,
  onInspect,
  onCopyUrl,
  copiedId,
  isSelectionOnly = false,
}) => {
  const [imgError, setImgError] = useState(false);
  const isCloudinary = item?.disk === "external" || item?.original_url?.includes("cloudinary");
  const isCopied = copiedId === item.id;

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div
      onClick={(e) => {
        if (isSelectionOnly) {
          onToggleSelect(item);
        } else {
          onInspect ? onInspect(item) : onToggleSelect(item);
        }
      }}
      className={`group relative aspect-square rounded-2xl overflow-hidden cursor-pointer bg-slate-50 border transition-all duration-200 select-none ${
        isSelected
          ? "border-slate-800 ring-2 ring-slate-800/20 shadow-md scale-[0.98]"
          : "border-slate-200/80 hover:border-slate-400 hover:shadow-md"
      }`}
    >
      {/* Image Thumbnail or Broken Link Fallback */}
      {!imgError ? (
        <img
          src={item.original_url}
          alt={item.name || item.file_name || "Media"}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-3 bg-slate-100/90 text-slate-400 text-center">
          <ImageOff className="w-6 h-6 mb-1 text-slate-300" />
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">
            Unreachable Link
          </span>
        </div>
      )}

      {/* Storage Badge */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-1">
        {isCloudinary ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/90 text-white backdrop-blur-sm shadow-sm">
            <Cloud className="w-3 h-3 stroke-[2.5]" />
            <span>Cloudinary</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-800/80 text-white backdrop-blur-sm shadow-sm">
            <HardDrive className="w-3 h-3" />
            <span>Local</span>
          </span>
        )}
      </div>

      {/* Select Checkbox (Top Right) */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelect(item);
        }}
        className={`absolute top-2 right-2 z-20 w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-150 cursor-pointer ${
          isSelected
            ? "bg-slate-900 text-white shadow-sm ring-2 ring-white"
            : "bg-white/80 backdrop-blur-sm text-transparent hover:text-slate-400 hover:bg-white border border-slate-200/60 opacity-0 group-hover:opacity-100"
        }`}
      >
        <Check className={`w-3.5 h-3.5 stroke-[3] ${isSelected ? "text-white" : ""}`} />
      </button>

      {/* Quick Action Overlay (Bottom Hover) */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-950/50 to-transparent p-2.5 pt-7 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end justify-between text-white">
        <div className="min-w-0 flex-1 pr-2">
          <p className="text-[11px] font-medium truncate leading-tight">
            {item.name || item.file_name}
          </p>
          <p className="text-[10px] text-slate-300">
            {item.size ? formatFileSize(item.size) : `#${item.id}`}
          </p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {onCopyUrl && (
            <button
              type="button"
              title="Copy Image URL"
              onClick={(e) => {
                e.stopPropagation();
                onCopyUrl(item);
              }}
              className="p-1 rounded-md bg-white/20 hover:bg-white/40 text-white transition-colors cursor-pointer"
            >
              {isCopied ? (
                <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          )}

          {!isSelectionOnly && onInspect && (
            <button
              type="button"
              title="Inspect Details"
              onClick={(e) => {
                e.stopPropagation();
                onInspect(item);
              }}
              className="p-1 rounded-md bg-white/20 hover:bg-white/40 text-white transition-colors cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MediaCard;
