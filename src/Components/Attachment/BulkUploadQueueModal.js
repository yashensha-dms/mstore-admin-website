import React, { useState, useRef, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { 
  X, UploadCloud, FileImage, CheckCircle2, AlertCircle, 
  Loader2, RefreshCw, Trash2, ArrowUpCircle, Link2, Plus, 
  Laptop, Globe, Sparkles
} from "lucide-react";
import request from "../../Utils/AxiosUtils";
import { createAttachment } from "../../Utils/AxiosUtils/API";

const CONCURRENCY_LIMIT = 4;
const MAX_BULK_FILES = 100;

const BulkUploadQueueModal = ({
  open,
  onOpenChange,
  onUploadComplete,
}) => {
  const [activeUploadSource, setActiveUploadSource] = useState("device"); // 'device' | 'url'
  const [urlInput, setUrlInput] = useState("");
  const [urlTitle, setUrlTitle] = useState("");
  const [queue, setQueue] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const queueRef = useRef([]);

  // Keep queueRef in sync with state
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      queueRef.current.forEach((item) => {
        if (item.preview && item.type === "file") URL.revokeObjectURL(item.preview);
      });
    };
  }, []);

  const handleFilesAdded = (fileList) => {
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);
    const validImageFiles = files.filter((file) => file.type.startsWith("image/"));

    if (validImageFiles.length === 0) return;

    // Check max cap
    const currentCount = queue.length;
    const remainingSlots = Math.max(0, MAX_BULK_FILES - currentCount);
    const filesToAdd = validImageFiles.slice(0, remainingSlots);

    const newQueueItems = filesToAdd.map((file) => ({
      id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: "file",
      file,
      name: file.name.split(".").slice(0, -1).join(".") || file.name,
      size: file.size,
      preview: URL.createObjectURL(file),
      status: "pending", // 'pending' | 'uploading' | 'done' | 'error'
      progress: 0,
      error: null,
    }));

    setQueue((prev) => [...prev, ...newQueueItems]);
  };

  const handleAddUrls = (e) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    // Support single URL or multiple URLs separated by newline / commas
    const urls = urlInput
      .split(/[\n,]/)
      .map((u) => u.trim())
      .filter((u) => u.length > 0 && (u.startsWith("http://") || u.startsWith("https://")));

    if (urls.length === 0) return;

    const currentCount = queue.length;
    const remainingSlots = Math.max(0, MAX_BULK_FILES - currentCount);
    const urlsToAdd = urls.slice(0, remainingSlots);

    const newQueueItems = urlsToAdd.map((url, index) => {
      let derivedName = urlTitle.trim();
      if (!derivedName || urlsToAdd.length > 1) {
        try {
          const parsed = new URL(url);
          const parts = parsed.pathname.split("/");
          const last = parts[parts.length - 1];
          derivedName = last ? last.split(".")[0] : `url_image_${Date.now()}_${index}`;
        } catch {
          derivedName = `url_image_${Date.now()}_${index}`;
        }
      }

      return {
        id: `url_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: "url",
        url,
        name: derivedName || `image_${index + 1}`,
        size: 0,
        preview: url,
        status: "pending",
        progress: 0,
        error: null,
      };
    });

    setQueue((prev) => [...prev, ...newQueueItems]);
    setUrlInput("");
    setUrlTitle("");
  };

  const uploadSingleItem = async (item) => {
    try {
      setQueue((prev) =>
        prev.map((q) =>
          q.id === item.id ? { ...q, status: "uploading", progress: 20 } : q
        )
      );

      let res;
      if (item.type === "url" || item.url) {
        const payload = {
          url: item.url,
          name: item.name,
        };
        res = await request({
          url: createAttachment,
          data: payload,
          method: "post",
        });
      } else {
        const formData = new FormData();
        formData.append("attachments[0]", item.file);
        formData.append("name", item.name);

        res = await request({
          url: createAttachment,
          data: formData,
          method: "post",
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percent = Math.round(
                (progressEvent.loaded * 90) / progressEvent.total
              );
              setQueue((prev) =>
                prev.map((q) =>
                  q.id === item.id ? { ...q, progress: Math.min(percent, 95) } : q
                )
              );
            }
          },
        });
      }

      if (res?.status === 200 || res?.data) {
        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id ? { ...q, status: "done", progress: 100 } : q
          )
        );
      } else {
        throw new Error(res?.data?.message || "Upload failed");
      }
    } catch (err) {
      setQueue((prev) =>
        prev.map((q) =>
          q.id === item.id
            ? { ...q, status: "error", error: err.message || "Failed to upload" }
            : q
        )
      );
    }
  };

  // Concurrent queue runner
  const processQueue = async () => {
    if (isUploading) return;
    setIsUploading(true);

    const pendingItems = queueRef.current.filter(
      (q) => q.status === "pending" || q.status === "error"
    );
    if (pendingItems.length === 0) {
      setIsUploading(false);
      return;
    }

    let currentIndex = 0;

    const worker = async () => {
      while (currentIndex < pendingItems.length) {
        const itemIndex = currentIndex++;
        const item = pendingItems[itemIndex];
        if (item) {
          await uploadSingleItem(item);
        }
      }
    };

    // Run CONCURRENCY_LIMIT workers in parallel
    const workers = Array.from(
      { length: Math.min(CONCURRENCY_LIMIT, pendingItems.length) },
      () => worker()
    );

    await Promise.all(workers);
    setIsUploading(false);

    if (onUploadComplete) {
      onUploadComplete();
    }
  };

  const handleRemoveItem = (id) => {
    setQueue((prev) => {
      const item = prev.find((q) => q.id === id);
      if (item?.preview && item.type === "file") URL.revokeObjectURL(item.preview);
      return prev.filter((q) => q.id !== id);
    });
  };

  const handleClearAll = () => {
    queue.forEach((item) => {
      if (item.preview && item.type === "file") URL.revokeObjectURL(item.preview);
    });
    setQueue([]);
    setIsUploading(false);
  };

  // Metrics
  const totalCount = queue.length;
  const completedCount = queue.filter((q) => q.status === "done").length;
  const failedCount = queue.filter((q) => q.status === "error").length;
  const overallProgress =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isAllDone = totalCount > 0 && completedCount + failedCount === totalCount;

  const formatFileSize = (bytes) => {
    if (!bytes) return "URL Link";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        {/* Backdrop */}
        <Dialog.Overlay className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[9998] transition-opacity duration-300" />

        {/* Dialog Content */}
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-3xl border border-slate-200/80 shadow-2xl z-[9999] w-[95vw] max-w-4xl h-[86vh] max-h-[780px] flex flex-col overflow-hidden outline-none font-sans">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <Dialog.Title className="text-base font-bold text-slate-800 leading-tight">
                  Media Uploader (Device & URL)
                </Dialog.Title>
                <Dialog.Description className="text-xs text-slate-500">
                  Upload files from your device or import via image URLs (Up to {MAX_BULK_FILES} files)
                </Dialog.Description>
              </div>
            </div>

            <Dialog.Close asChild>
              <button
                type="button"
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          {/* Main Area */}
          <div className="flex-1 min-h-0 flex flex-col p-6 gap-4 overflow-hidden">
            {/* Upload Source Mode Toggle */}
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl w-fit shrink-0">
              <button
                type="button"
                onClick={() => setActiveUploadSource("device")}
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeUploadSource === "device"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Laptop className="w-3.5 h-3.5" />
                <span>Upload from Device</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveUploadSource("url")}
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeUploadSource === "url"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Import via URL</span>
              </button>
            </div>

            {/* Input Panels */}
            {activeUploadSource === "device" ? (
              /* Dropzone */
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  handleFilesAdded(e.dataTransfer.files);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 shrink-0 ${
                  isDragOver
                    ? "border-slate-900 bg-slate-50 scale-[0.99]"
                    : "border-slate-200 hover:border-slate-400 hover:bg-slate-50/50"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFilesAdded(e.target.files)}
                />
                <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600 mb-2">
                  <ArrowUpCircle className="w-5 h-5 stroke-[1.75]" />
                </div>
                <h4 className="text-sm font-bold text-slate-800 mb-0.5">
                  Drop images here, or <span className="text-slate-900 underline">browse</span>
                </h4>
                <p className="text-xs text-slate-400">
                  Supports JPG, PNG, WebP, GIF & SVG (Max {MAX_BULK_FILES} files per batch)
                </p>
              </div>
            ) : (
              /* URL Import Input */
              <form
                onSubmit={handleAddUrls}
                className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 space-y-3 shrink-0"
              >
                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Direct Image URL(s)
                    </label>
                    <input
                      type="text"
                      placeholder="https://example.com/image.jpg or multiple URLs separated by commas"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 text-slate-800 placeholder:text-slate-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Custom Title (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Hero Banner"
                      value={urlTitle}
                      onChange={(e) => setUrlTitle(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 text-slate-800 placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <p className="text-[11px] text-slate-400">
                    Paste Cloudinary, S3, or any public image link.
                  </p>
                  <button
                    type="submit"
                    disabled={!urlInput.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm disabled:opacity-40 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Add URL to Queue</span>
                  </button>
                </div>
              </form>
            )}

            {/* Upload Queue Section */}
            {totalCount > 0 ? (
              <div className="flex-1 min-h-0 flex flex-col bg-slate-50/50 rounded-2xl border border-slate-200/70 p-4">
                {/* Overall Progress Summary Header */}
                <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-200/60 shrink-0">
                  <div>
                    <span className="text-xs font-bold text-slate-800">
                      Queue Progress: {completedCount} / {totalCount} Uploaded ({overallProgress}%)
                    </span>
                    {failedCount > 0 && (
                      <span className="ml-2 text-xs font-semibold text-red-600">
                        ({failedCount} failed)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!isUploading && !isAllDone && (
                      <button
                        type="button"
                        onClick={processQueue}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                      >
                        Start Upload ({totalCount - completedCount})
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="text-xs font-semibold text-slate-500 hover:text-red-600 transition-colors"
                    >
                      Clear Queue
                    </button>
                  </div>
                </div>

                {/* Overall Progress Bar */}
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mb-4 shrink-0">
                  <div
                    className="bg-slate-900 h-full transition-all duration-300 rounded-full"
                    style={{ width: `${overallProgress}%` }}
                  />
                </div>

                {/* Scrollable File List */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
                  {queue.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-xs"
                    >
                      {/* Thumbnail */}
                      <img
                        src={item.preview}
                        alt="Preview"
                        className="w-10 h-10 rounded-lg object-cover bg-slate-100 shrink-0 border border-slate-100"
                        onError={(e) => {
                          e.target.src =
                            "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' fill='none' stroke='%2394a3b8' viewBox='0 0 24 24'><rect width='18' height='18' x='3' y='3' rx='2'/><circle cx='8.5' cy='8.5' r='1.5'/><path d='m21 15-5-5L5 21'/></svg>";
                        }}
                      />

                      {/* File Info */}
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5 truncate">
                            {item.type === "url" && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                                URL
                              </span>
                            )}
                            <p className="text-xs font-semibold text-slate-800 truncate">
                              {item.name}
                            </p>
                          </div>
                          <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                            {formatFileSize(item.size)}
                          </span>
                        </div>

                        {/* Individual Progress Bar */}
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-200 rounded-full ${
                              item.status === "error"
                                ? "bg-red-500"
                                : item.status === "done"
                                ? "bg-emerald-500"
                                : "bg-slate-900"
                            }`}
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Status Icon */}
                      <div className="shrink-0 w-8 flex items-center justify-center">
                        {item.status === "uploading" && (
                          <Loader2 className="w-4 h-4 text-slate-600 animate-spin" />
                        )}
                        {item.status === "done" && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        )}
                        {item.status === "error" && (
                          <AlertCircle
                            className="w-4 h-4 text-red-500"
                            title={item.error || "Upload failed"}
                          />
                        )}
                        {item.status === "pending" && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-slate-300 hover:text-red-500 transition-colors p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-slate-50/50 rounded-2xl border border-slate-100">
                <FileImage className="w-10 h-10 text-slate-300 mb-2" />
                <p className="text-xs font-semibold text-slate-600">
                  No files or URLs added to the queue yet.
                </p>
                <p className="text-[11px] text-slate-400 max-w-xs mt-1">
                  Drag and drop local files, or switch to "Import via URL" above.
                </p>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 shrink-0 bg-slate-50/50">
            <span className="text-xs text-slate-400">
              {totalCount > 0 ? `${totalCount} items in queue` : "Ready"}
            </span>

            <div className="flex items-center gap-3">
              {totalCount > 0 && !isAllDone && (
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={processQueue}
                  className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {isUploading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isUploading ? "Uploading Batch..." : "Upload All Items"}</span>
                </button>
              )}

              {isAllDone && (
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                  >
                    Done
                  </button>
                </Dialog.Close>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default BulkUploadQueueModal;
