import React, { useState } from "react";
import { 
  X, Copy, CheckCheck, Trash2, RefreshCw, Cloud, HardDrive, 
  ExternalLink, Calendar, FileText, Database, Layers
} from "lucide-react";

const MediaInspector = ({
  item,
  onClose,
  onCopyUrl,
  copiedId,
  onSyncItem,
  isSyncing = false,
  onDeleteItem,
  isDeleting = false,
  canDelete = true,
}) => {
  if (!item) return null;

  const [imageDims, setImageDims] = useState(null);
  const isCloudinary = item?.disk === "external" || item?.original_url?.includes("cloudinary");
  const isCopied = copiedId === item.id;

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[380px] bg-white shadow-2xl z-[999] border-l border-slate-200 flex flex-col transition-all duration-300">
      {/* Drawer Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Asset Details
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Drawer Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Large Preview */}
        <div className="aspect-video w-full rounded-2xl bg-slate-50 border border-slate-200/80 overflow-hidden flex items-center justify-center p-2 shadow-inner">
          <img
            src={item.original_url}
            alt={item.name || "Asset"}
            className="max-h-full max-w-full object-contain rounded-lg"
            onLoad={(e) => {
              setImageDims({
                width: e.target.naturalWidth,
                height: e.target.naturalHeight,
              });
            }}
          />
        </div>

        {/* Action Pills */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onCopyUrl(item)}
            className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer shadow-sm"
          >
            {isCopied ? (
              <>
                <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-600">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Copy URL</span>
              </>
            )}
          </button>

          <a
            href={item.original_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer shadow-sm"
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
            <span>Open Link</span>
          </a>
        </div>

        {/* Sync Button if Cloudinary */}
        {isCloudinary && onSyncItem && (
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80 space-y-2">
            <div className="flex items-center gap-2 text-amber-800 text-xs font-bold">
              <Cloud className="w-4 h-4 text-amber-600" />
              <span>Cloudinary External Media</span>
            </div>
            <p className="text-[11px] text-amber-700 leading-relaxed">
              This asset is served externally from Cloudinary. Sync to save it locally into server storage.
            </p>
            <button
              type="button"
              disabled={isSyncing}
              onClick={() => onSyncItem(item.id)}
              className="w-full py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              <span>{isSyncing ? "Syncing to Local..." : "Sync to Local Storage"}</span>
            </button>
          </div>
        )}

        {/* File Metadata Info */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/60 space-y-3.5 text-xs">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              File Name
            </span>
            <p className="font-semibold text-slate-800 break-all leading-tight">
              {item.name || item.file_name}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/60">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Asset ID
              </span>
              <p className="font-semibold text-slate-700">#{item.id}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Storage
              </span>
              <p className="font-semibold text-slate-700 flex items-center gap-1">
                {isCloudinary ? (
                  <>
                    <Cloud className="w-3 h-3 text-amber-500" />
                    <span>Cloudinary</span>
                  </>
                ) : (
                  <>
                    <HardDrive className="w-3 h-3 text-slate-700" />
                    <span>Local Disk</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/60">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                File Size
              </span>
              <p className="font-semibold text-slate-700">
                {item.size ? formatFileSize(item.size) : "N/A"}
              </p>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Dimensions
              </span>
              <p className="font-semibold text-slate-700">
                {imageDims ? `${imageDims.width} × ${imageDims.height}` : "Loading..."}
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Created / Uploaded
            </span>
            <p className="font-semibold text-slate-700 flex items-center gap-1.5 mt-0.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{formatDate(item.created_at)}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Drawer Footer (Delete) */}
      {canDelete && onDeleteItem && (
        <div className="p-4 border-t border-slate-100 shrink-0 bg-slate-50/50">
          <button
            type="button"
            disabled={isDeleting}
            onClick={() => onDeleteItem(item.id)}
            className="w-full py-2.5 px-4 rounded-xl border border-red-200 bg-white hover:bg-red-50 text-red-600 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isDeleting ? "Deleting..." : "Delete Asset"}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default MediaInspector;
