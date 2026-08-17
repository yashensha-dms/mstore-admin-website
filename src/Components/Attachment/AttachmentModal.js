"use client";

import React, { useState, useEffect, useMemo, useContext } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  X,
  Search,
  SlidersHorizontal,
  Check,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  HardDrive,
  Cloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  ArrowUpCircle,
  Laptop,
  Globe,
  Plus,
} from "lucide-react";
import I18NextContext from "@/Helper/I18NextContext";
import { useTranslation } from "@/app/i18n/client";
import request from "../../Utils/AxiosUtils";
import { attachment, createAttachment } from "../../Utils/AxiosUtils/API";
import usePermissionCheck from "../../Utils/Hooks/usePermissionCheck";
import { ToastNotification } from "../../Utils/CustomFunctions/ToastNotification";

const CONCURRENCY_LIMIT = 4;
const MAX_BULK_FILES = 100;

const AttachmentModal = (props) => {
  const {
    modal,
    setModal,
    setFieldValue,
    name,
    setSelectedImage,
    isattachment,
    multiple,
    values,
    showImage,
    redirectToTabs,
    noAPICall,
    parentRefetch,
  } = props;

  const [createPerm] = usePermissionCheck(["create"], "attachment");
  const { i18Lang } = useContext(I18NextContext);
  const { t } = useTranslation(i18Lang, "common");
  const queryClient = useQueryClient();

  // Tab State: 1 = Library / Select, 2 = Bulk Upload
  const [tabNav, setTabNav] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sorting, setSorting] = useState("newest");
  const [filterType, setFilterType] = useState("all");
  const [page, setPage] = useState(1);
  const paginate = 24;

  // Selected items state in modal
  const [selectedItems, setSelectedItems] = useState([]);

  // Upload Queue State (Tab 2)
  const [activeUploadSource, setActiveUploadSource] = useState("device"); // 'device' | 'url'
  const [urlInput, setUrlInput] = useState("");
  const [urlTitle, setUrlTitle] = useState("");
  const [uploadQueue, setUploadQueue] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Query Media Library
  const {
    data: attachmentsResponse,
    refetch,
    isFetching,
  } = useQuery(
    [attachment, debouncedSearch, sorting, filterType, page],
    () =>
      request({
        url: attachment,
        params: {
          search: debouncedSearch ? debouncedSearch : undefined,
          sort: sorting,
          disk: filterType === "cloudinary" ? "external" : (filterType === "local" ? "public" : undefined),
          paginate,
          page,
        },
      }),
    {
      enabled: Boolean(modal && !noAPICall),
      refetchOnWindowFocus: false,
      select: (res) => res?.data,
    }
  );

  const rawItems = attachmentsResponse?.data || [];
  const totalItems = attachmentsResponse?.total || 0;
  const totalPages = Math.ceil(totalItems / paginate) || 1;

  // Storage Filtering
  const filteredItems = useMemo(() => {
    if (filterType === "cloudinary") {
      const matched = rawItems.filter(
        (item) => item.disk === "external" || item.original_url?.includes("cloudinary") || item.file_name?.includes("cloudinary") || item.name?.includes("cloudinary")
      );
      return matched.length > 0 ? matched : rawItems;
    }
    if (filterType === "local") {
      return rawItems.filter(
        (item) => item.disk !== "external" && !item.original_url?.includes("cloudinary")
      );
    }
    return rawItems;
  }, [rawItems, filterType]);

  // Sync modal open state and defaults
  useEffect(() => {
    if (modal) {
      if (!noAPICall) refetch();
      if (isattachment) setTabNav(2);
      else setTabNav(1);
      setSelectedItems([]);
      setUploadQueue([]);
    }
  }, [modal]);

  // Selection Logic
  const handleItemClick = (item) => {
    if (multiple) {
      setSelectedItems((prev) => {
        const exists = prev.some((el) => el.id === item.id);
        if (exists) {
          return prev.filter((el) => el.id !== item.id);
        }
        return [...prev, item];
      });
    } else {
      setSelectedItems([item]);
    }
  };

  const handleConfirmSelection = () => {
    if (!selectedItems || selectedItems.length === 0) {
      setModal(false);
      return;
    }

    const storeImageObject = name?.split("_id")[0];

    if (multiple) {
      if (setSelectedImage) {
        setSelectedImage([...selectedItems]);
      }
      if (setFieldValue && name) {
        setFieldValue(name, selectedItems.map((el) => el.id));
      }
    } else {
      const selected = selectedItems[0];
      if (showImage && setFieldValue && name) {
        setFieldValue(name, selected);
      } else if (setFieldValue && name) {
        setFieldValue(name, selected.id);
        if (storeImageObject) {
          setFieldValue(storeImageObject, selected);
        }
        if (setSelectedImage) {
          setSelectedImage([selected]);
        }
      }
    }

    setModal(false);
  };

  const activePreviewItem =
    selectedItems.length > 0 ? selectedItems[selectedItems.length - 1] : null;

  // --- TAB 2 Handlers ---
  const handleFilesAdded = (fileList) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) return;

    const remainingSlots = Math.max(0, MAX_BULK_FILES - uploadQueue.length);
    const filesToAdd = files.slice(0, remainingSlots);

    const newItems = filesToAdd.map((file) => ({
      id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: "file",
      file,
      name: file.name.split(".").slice(0, -1).join(".") || file.name,
      size: file.size,
      preview: URL.createObjectURL(file),
      status: "pending",
      progress: 0,
      error: null,
    }));

    setUploadQueue((prev) => [...prev, ...newItems]);
  };

  const handleAddUrls = (e) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    const urls = urlInput
      .split(/[\n,]/)
      .map((u) => u.trim())
      .filter((u) => u.length > 0 && (u.startsWith("http://") || u.startsWith("https://")));

    if (urls.length === 0) return;

    const remainingSlots = Math.max(0, MAX_BULK_FILES - uploadQueue.length);
    const urlsToAdd = urls.slice(0, remainingSlots);

    const newItems = urlsToAdd.map((url, index) => {
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

    setUploadQueue((prev) => [...prev, ...newItems]);
    setUrlInput("");
    setUrlTitle("");
  };

  const uploadSingleItem = async (item) => {
    try {
      setUploadQueue((prev) =>
        prev.map((q) =>
          q.id === item.id ? { ...q, status: "uploading", progress: 15 } : q
        )
      );

      let res;
      if (item.type === "url" || item.url) {
        res = await request({
          url: createAttachment,
          data: { url: item.url, name: item.name },
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
              setUploadQueue((prev) =>
                prev.map((q) =>
                  q.id === item.id ? { ...q, progress: Math.min(percent, 95) } : q
                )
              );
            }
          },
        });
      }

      if (res?.status === 200 || res?.data) {
        setUploadQueue((prev) =>
          prev.map((q) =>
            q.id === item.id ? { ...q, status: "done", progress: 100 } : q
          )
        );
      } else {
        throw new Error(res?.data?.message || "Upload failed");
      }
    } catch (err) {
      setUploadQueue((prev) =>
        prev.map((q) =>
          q.id === item.id
            ? { ...q, status: "error", error: err.message || "Failed to upload" }
            : q
        )
      );
    }
  };

  const processUploadQueue = async () => {
    if (isUploading) return;
    setIsUploading(true);

    const pending = uploadQueue.filter(
      (q) => q.status === "pending" || q.status === "error"
    );
    if (pending.length === 0) {
      setIsUploading(false);
      return;
    }

    let currentIndex = 0;
    const worker = async () => {
      while (currentIndex < pending.length) {
        const idx = currentIndex++;
        const item = pending[idx];
        if (item) await uploadSingleItem(item);
      }
    };

    const workers = Array.from(
      { length: Math.min(CONCURRENCY_LIMIT, pending.length) },
      () => worker()
    );

    await Promise.all(workers);
    setIsUploading(false);

    refetch();
    queryClient.invalidateQueries([attachment]);
    if (parentRefetch) parentRefetch();
    ToastNotification("success", "Uploaded successfully!");
    setTabNav(1);
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "URL Link";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <Dialog.Root open={modal} onOpenChange={setModal}>
      <Dialog.Portal>
        {/* Backdrop */}
        <Dialog.Overlay className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[9998] transition-opacity duration-300" />

        {/* Modal Container */}
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-3xl border border-slate-200/80 shadow-2xl z-[9999] w-[95vw] max-w-7xl h-[86vh] max-h-[850px] flex flex-col overflow-hidden outline-none font-sans">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-5">
              <Dialog.Title className="text-lg font-bold text-slate-800 leading-tight">
                {t("InsertMedia") || "Insert Media"}
              </Dialog.Title>

              {!isattachment && (
                <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setTabNav(1)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer ${
                      tabNav === 1
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {t("SelectFile") || "Select File"}
                  </button>

                  {createPerm && (
                    <button
                      type="button"
                      onClick={() => setTabNav(2)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer ${
                        tabNav === 2
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      {t("UploadNew") || "Upload Bulk"}
                    </button>
                  )}
                </div>
              )}
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
          <div className="flex-1 min-h-0 flex overflow-hidden">
            {tabNav === 1 ? (
              // TAB 1: Select File
              <div className="flex-1 flex min-h-0 w-full">
                {/* Left Panel: Filter & Grid */}
                <div className="flex-1 flex flex-col min-w-0 p-5 border-r border-slate-100 overflow-hidden">
                  {/* Search, Storage Filter & Sort */}
                  <div className="flex flex-col sm:flex-row items-center gap-3 mb-4 shrink-0">
                    <div className="flex items-center bg-slate-100 p-1 rounded-xl shrink-0">
                      <button
                        type="button"
                        onClick={() => setFilterType("all")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                          filterType === "all"
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-slate-500"
                        }`}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterType("local")}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                          filterType === "local"
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-slate-500"
                        }`}
                      >
                        <HardDrive className="w-3 h-3" />
                        <span>Local</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterType("cloudinary")}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                          filterType === "cloudinary"
                            ? "bg-white text-amber-700 shadow-sm"
                            : "text-slate-500"
                        }`}
                      >
                        <Cloud className="w-3 h-3" />
                        <span>Cloudinary</span>
                      </button>
                    </div>

                    <div className="relative flex-1 w-full">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search media..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-8 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 text-slate-700"
                      />
                    </div>

                    <div className="relative shrink-0 w-full sm:w-auto">
                      <SlidersHorizontal className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <select
                        value={sorting}
                        onChange={(e) => {
                          setSorting(e.target.value);
                          setPage(1);
                        }}
                        className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 cursor-pointer text-slate-700 font-medium"
                      >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="largest">Largest Size</option>
                        <option value="smallest">Smallest Size</option>
                      </select>
                    </div>
                  </div>

                  {/* Grid Container */}
                  <div className="flex-1 overflow-y-auto min-h-0 pr-1 select-file-scrollbar">
                    {isFetching ? (
                      <div className="flex flex-col items-center justify-center h-full py-16 gap-3">
                        <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
                        <p className="text-xs text-slate-400 font-medium">Loading assets...</p>
                      </div>
                    ) : filteredItems.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full py-16 text-center">
                        <ImageIcon className="w-12 h-12 text-slate-300 mb-2" />
                        <p className="text-xs font-bold text-slate-700">No media found</p>
                        <p className="text-[11px] text-slate-400 max-w-xs mt-1">
                          Try another search term or upload new images.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 pb-4">
                        {filteredItems.map((item) => {
                          const isSelected = selectedItems.some((el) => el.id === item.id);
                          const isCloudinary =
                            item.disk === "external" ||
                            item.original_url?.includes("cloudinary");

                          return (
                            <div
                              key={item.id}
                              onClick={() => handleItemClick(item)}
                              className={`group relative aspect-square rounded-2xl overflow-hidden cursor-pointer bg-slate-50 border transition-all duration-150 select-none ${
                                isSelected
                                  ? "border-slate-900 ring-2 ring-slate-900/20 shadow-md scale-[0.98]"
                                  : "border-slate-200/80 hover:border-slate-400 hover:shadow-sm"
                              }`}
                            >
                              <img
                                src={item.original_url}
                                alt={item.name || "Media"}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                loading="lazy"
                              />

                              {/* Storage Badge */}
                              <div className="absolute top-1.5 left-1.5 z-10">
                                {isCloudinary ? (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/90 text-white backdrop-blur-xs shadow-xs">
                                    <Cloud className="w-2.5 h-2.5" />
                                    <span>Cloud</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-800/80 text-white backdrop-blur-xs shadow-xs">
                                    <HardDrive className="w-2.5 h-2.5" />
                                    <span>Local</span>
                                  </span>
                                )}
                              </div>

                              {/* Checkmark indicator */}
                              {isSelected && (
                                <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-md bg-slate-900 text-white flex items-center justify-center z-10 shadow-xs">
                                  <Check className="w-3 h-3 stroke-[3]" />
                                </div>
                              )}

                              {/* Title Overlay */}
                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 pt-6 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                <p className="text-[10px] text-white font-medium truncate text-center">
                                  {item.name || item.file_name}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Pagination Row */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-auto shrink-0">
                      <span className="text-[11px] text-slate-400">
                        {totalItems} total files
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={page === 1}
                          onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                          className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-bold text-slate-700 px-2">
                          {page} / {totalPages}
                        </span>
                        <button
                          type="button"
                          disabled={page === totalPages}
                          onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                          className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Panel: Selection Preview & Confirmation */}
                <div className="w-[300px] shrink-0 bg-slate-50/50 flex flex-col p-5 min-h-0">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">
                    Selected Item
                  </h4>

                  <div className="flex-1 flex flex-col justify-between min-h-0">
                    {activePreviewItem ? (
                      <div className="flex flex-col h-full justify-between gap-4">
                        <div className="space-y-3">
                          <div className="aspect-video w-full rounded-2xl bg-white border border-slate-200 p-1 overflow-hidden shadow-xs">
                            <img
                              src={activePreviewItem.original_url}
                              alt="Preview"
                              className="w-full h-full object-contain rounded-xl"
                            />
                          </div>

                          <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 space-y-2.5 text-xs shadow-2xs">
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase">
                                File Name
                              </span>
                              <p className="font-semibold text-slate-800 truncate">
                                {activePreviewItem.name || activePreviewItem.file_name}
                              </p>
                            </div>
                            <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-2 text-[11px]">
                              <div>
                                <span className="text-[9px] font-bold text-slate-400 uppercase">
                                  Size
                                </span>
                                <p className="font-semibold text-slate-700">
                                  {activePreviewItem.size
                                    ? formatFileSize(activePreviewItem.size)
                                    : "N/A"}
                                </p>
                              </div>
                              <div>
                                <span className="text-[9px] font-bold text-slate-400 uppercase">
                                  ID
                                </span>
                                <p className="font-semibold text-slate-700">
                                  #{activePreviewItem.id}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Confirmation Bar */}
                        <div className="space-y-2 pt-3 border-t border-slate-200/80">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500 font-semibold">
                              {selectedItems.length} selected
                            </span>
                            <button
                              type="button"
                              onClick={() => setSelectedItems([])}
                              className="text-red-500 hover:underline font-bold text-[11px]"
                            >
                              Clear
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={handleConfirmSelection}
                            className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                          >
                            {t("InsertMedia") || "Insert Selected"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                        <ImageIcon className="w-10 h-10 text-slate-300 mb-2" />
                        <p className="text-xs font-bold text-slate-600">No image selected</p>
                        <p className="text-[11px] text-slate-400 max-w-[180px] mt-1">
                          Click any image in the grid to select it.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              // TAB 2: Upload Queue
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
                    className={`border-2 border-dashed rounded-2xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 shrink-0 ${
                      isDragOver
                        ? "border-slate-900 bg-slate-50 scale-[0.99]"
                        : "border-slate-200 hover:border-slate-400 hover:bg-slate-50/50"
                    }`}
                    onClick={() => {
                      const input = document.createElement("input");
                      input.type = "file";
                      input.multiple = true;
                      input.accept = "image/*";
                      input.onchange = (e) => handleFilesAdded(e.target.files);
                      input.click();
                    }}
                  >
                    <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600 mb-2">
                      <ArrowUpCircle className="w-5 h-5 stroke-[1.75]" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 mb-0.5">
                      Drop images here, or <span className="underline">browse</span>
                    </h4>
                    <p className="text-xs text-slate-400">
                      Supports up to {MAX_BULK_FILES} images simultaneously with automatic batching
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
                          placeholder="e.g. Product Image"
                          value={urlTitle}
                          onChange={(e) => setUrlTitle(e.target.value)}
                          className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 text-slate-800 placeholder:text-slate-400"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <p className="text-[11px] text-slate-400">
                        Paste Cloudinary or any direct image link to import.
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

                {/* Queue List */}
                {uploadQueue.length > 0 ? (
                  <div className="flex-1 min-h-0 flex flex-col bg-slate-50/50 rounded-2xl border border-slate-200/70 p-4">
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200/60 shrink-0">
                      <span className="text-xs font-bold text-slate-800">
                        Queue: {uploadQueue.filter((q) => q.status === "done").length} /{" "}
                        {uploadQueue.length} Uploaded
                      </span>
                      <div className="flex items-center gap-2">
                        {!isUploading && (
                          <button
                            type="button"
                            onClick={processUploadQueue}
                            className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer"
                          >
                            Start Upload
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setUploadQueue([])}
                          className="text-xs font-semibold text-slate-500 hover:text-red-600"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
                      {uploadQueue.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-200/80"
                        >
                          <img
                            src={item.preview}
                            alt="preview"
                            className="w-9 h-9 rounded-lg object-cover bg-slate-100 shrink-0"
                            onError={(e) => {
                              e.target.src =
                                "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='36' height='36' fill='none' stroke='%2394a3b8' viewBox='0 0 24 24'><rect width='18' height='18' x='3' y='3' rx='2'/><circle cx='8.5' cy='8.5' r='1.5'/><path d='m21 15-5-5L5 21'/></svg>";
                            }}
                          />
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
                              <span className="text-[10px] text-slate-400">
                                {formatFileSize(item.size)}
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-200 rounded-full ${
                                  item.status === "done"
                                    ? "bg-emerald-500"
                                    : item.status === "error"
                                    ? "bg-red-500"
                                    : "bg-slate-900"
                                }`}
                                style={{ width: `${item.progress}%` }}
                              />
                            </div>
                          </div>
                          <div className="shrink-0 w-6 flex items-center justify-center">
                            {item.status === "uploading" && (
                              <Loader2 className="w-3.5 h-3.5 text-slate-600 animate-spin" />
                            )}
                            {item.status === "done" && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            )}
                            {item.status === "error" && (
                              <AlertCircle className="w-4 h-4 text-red-500" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-slate-50/50 rounded-2xl border border-slate-100">
                    <ImageIcon className="w-8 h-8 text-slate-300 mb-1.5" />
                    <p className="text-xs font-semibold text-slate-600">No images in queue</p>
                    <p className="text-[11px] text-slate-400 max-w-xs mt-1">
                      Drag and drop local files, or switch to "Import via URL" above.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default AttachmentModal;