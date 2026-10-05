"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import request from "../../Utils/AxiosUtils";
import { attachment, attachmentDelete, syncCloudinaryAttachment } from "../../Utils/AxiosUtils/API";
import usePermissionCheck from "../../Utils/Hooks/usePermissionCheck";
import { ToastNotification } from "../../Utils/CustomFunctions/ToastNotification";

import MediaHeader from "./MediaHeader";
import MediaGrid from "./MediaGrid";
import MediaInspector from "./MediaInspector";
import BulkActionBar from "./BulkActionBar";
import BulkUploadQueueModal from "./BulkUploadQueueModal";
import CloudinarySyncModal from "./CloudinarySyncModal";

const AttachmentContain = ({ isattachment = true }) => {
  const [canCreate, canDestroy] = usePermissionCheck(["create", "destroy"], "attachment");
  const queryClient = useQueryClient();

  // Search & Filter State
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sorting, setSorting] = useState("newest");
  const [filterType, setFilterType] = useState("all"); // 'all' | 'local' | 'cloudinary'
  const [page, setPage] = useState(1);
  const paginate = 30; // Grid items per page

  // Selection & UI State
  const [selectedIds, setSelectedIds] = useState([]);
  const [inspectedItem, setInspectedItem] = useState(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch Attachments Query
  const {
    data: attachmentsResponse,
    isLoading,
    isFetching,
    refetch,
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
      refetchOnWindowFocus: false,
      select: (res) => res?.data,
    }
  );

  const rawItems = attachmentsResponse?.data || [];
  const totalItems = attachmentsResponse?.total || 0;
  const totalPages = Math.ceil(totalItems / paginate) || 1;

  // Filter items by storage type (Local vs Cloudinary)
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

  // Total count of Cloudinary items on current page or query
  const cloudinaryItemsOnPage = useMemo(() => {
    return rawItems.filter(
      (item) => item.disk === "external" || item.original_url?.includes("cloudinary")
    );
  }, [rawItems]);

  const selectedCloudinaryItems = useMemo(() => {
    return rawItems.filter(
      (item) =>
        selectedIds.includes(item.id) &&
        (item.disk === "external" || item.original_url?.includes("cloudinary"))
    );
  }, [rawItems, selectedIds]);

  // Bulk / Single Delete Mutation
  const { mutate: deleteMutate, isLoading: isDeleting } = useMutation(
    (ids) =>
      request({
        url: attachmentDelete,
        data: { ids },
        method: "post",
      }),
    {
      onSuccess: (resData, ids) => {
        ToastNotification("success", "Deleted Successfully");
        setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
        if (inspectedItem && ids.includes(inspectedItem.id)) {
          setInspectedItem(null);
        }
        refetch();
        queryClient.invalidateQueries([attachment]);
      },
      onError: () => {
        ToastNotification("error", "Failed to delete asset(s)");
      },
    }
  );

  // Cloudinary In-Place Sync Mutation
  const { mutate: syncCloudinaryMutate, isLoading: isSyncing } = useMutation(
    (payload) =>
      request({
        url: syncCloudinaryAttachment,
        data: payload,
        method: "post",
      }),
    {
      onSuccess: (res) => {
        const syncedCount = res?.data?.synced_count || 0;
        ToastNotification(
          "success",
          res?.data?.message || `Successfully synced ${syncedCount} images to local storage!`
        );
        refetch();
        queryClient.invalidateQueries([attachment]);
        if (inspectedItem) {
          // Re-fetch or update inspected item state
          const updated = rawItems.find((el) => el.id === inspectedItem.id);
          if (updated) setInspectedItem(updated);
        }
      },
      onError: (err) => {
        ToastNotification("error", err?.response?.data?.message || "Failed to sync images");
      },
    }
  );

  // Selection Handlers
  const handleToggleSelect = (item) => {
    setSelectedIds((prev) =>
      prev.includes(item.id) ? prev.filter((id) => id !== item.id) : [...prev, item.id]
    );
  };

  const handleToggleSelectAllPage = () => {
    const pageItemIds = filteredItems.map((item) => item.id);
    const isAllSelected = pageItemIds.every((id) => selectedIds.includes(id));

    if (isAllSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageItemIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageItemIds])));
    }
  };

  const handleCopyUrl = (item) => {
    if (!item?.original_url) return;
    navigator.clipboard.writeText(item.original_url);
    setCopiedId(item.id);
    ToastNotification("success", "Image URL copied to clipboard");
    setTimeout(() => setCopiedId(null), 2500);
  };

  const isAllPageSelected =
    filteredItems.length > 0 &&
    filteredItems.every((item) => selectedIds.includes(item.id));

  return (
    <div className="min-h-screen bg-slate-50/60 p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Header with Search, Filter Tabs, and Actions */}
        <MediaHeader
          search={search}
          setSearch={setSearch}
          sorting={sorting}
          setSorting={(val) => {
            setSorting(val);
            setPage(1);
          }}
          filterType={filterType}
          setFilterType={(val) => {
            setFilterType(val);
            setPage(1);
          }}
          cloudinaryCount={cloudinaryItemsOnPage.length}
          onSyncCloudinary={() => setSyncModalOpen(true)}
          isSyncing={isSyncing}
          onOpenUpload={() => setUploadModalOpen(true)}
          totalItems={totalItems}
          canCreate={canCreate}
        />

        {/* Media Grid Section */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm relative min-h-[400px]">
          <MediaGrid
            items={filteredItems}
            isLoading={isLoading || isFetching}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onInspect={(item) => setInspectedItem(item)}
            onCopyUrl={handleCopyUrl}
            copiedId={copiedId}
            onOpenUpload={() => setUploadModalOpen(true)}
            filterType={filterType}
            onSyncCloudinary={() => setSyncModalOpen(true)}
            isSyncing={isSyncing}
          />

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100 pt-5 mt-6">
              <p className="text-xs text-slate-500 font-medium">
                Showing {(page - 1) * paginate + 1} to{" "}
                {Math.min(page * paginate, totalItems)} of {totalItems} assets
              </p>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={page === 1}
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-40 transition-all cursor-pointer shadow-xs"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center px-3 py-1 bg-slate-100 rounded-xl text-xs font-bold text-slate-700">
                  {page} / {totalPages}
                </div>

                <button
                  type="button"
                  disabled={page === totalPages}
                  onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                  className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-40 transition-all cursor-pointer shadow-xs"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Slide-over Asset Inspector Drawer */}
      <MediaInspector
        item={inspectedItem}
        onClose={() => setInspectedItem(null)}
        onCopyUrl={handleCopyUrl}
        copiedId={copiedId}
        onSyncItem={(id) => syncCloudinaryMutate({ ids: [id] })}
        isSyncing={isSyncing}
        onDeleteItem={(id) => {
          if (window.confirm("Are you sure you want to permanently delete this asset?")) {
            deleteMutate([id]);
          }
        }}
        isDeleting={isDeleting}
        canDelete={canDestroy}
      />

      {/* Floating Bottom Bulk Actions Bar */}
      <BulkActionBar
        selectedCount={selectedIds.length}
        totalPageCount={filteredItems.length}
        isAllPageSelected={isAllPageSelected}
        onToggleSelectAllPage={handleToggleSelectAllPage}
        onClearSelection={() => setSelectedIds([])}
        selectedCloudinaryCount={selectedCloudinaryItems.length}
        onSyncSelectedCloudinary={() => {
          if (
            window.confirm(
              `Sync ${selectedCloudinaryItems.length} selected Cloudinary images to local storage?`
            )
          ) {
            syncCloudinaryMutate({ ids: selectedCloudinaryItems.map((i) => i.id) });
          }
        }}
        isSyncing={isSyncing}
        onDeleteSelected={() => {
          if (
            window.confirm(
              `Are you sure you want to delete ${selectedIds.length} selected assets? This action cannot be undone.`
            )
          ) {
            deleteMutate(selectedIds);
          }
        }}
        isDeleting={isDeleting}
        canDelete={canDestroy}
      />

      {/* Bulk Upload Queue Modal (Supports up to 100 images) */}
      <BulkUploadQueueModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        onUploadComplete={() => {
          refetch();
          queryClient.invalidateQueries([attachment]);
        }}
      />

      {/* Cloudinary In-Place Migration & Cleanup Modal */}
      <CloudinarySyncModal
        open={syncModalOpen}
        onClose={() => setSyncModalOpen(false)}
        onFinish={() => {
          refetch();
          queryClient.invalidateQueries([attachment]);
        }}
      />
    </div>
  );
};

export default AttachmentContain;