# Cloudinary In-Place Migration & Dead-Link Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a high-reliability chunked migration engine that downloads live Cloudinary images into local storage in-place (retaining exact attachment IDs), hard-deletes dead/unreachable 404 links safely, and provides a real-time progress dashboard modal in the admin UI.

**Architecture:** The backend processes batches of 30 items per request, distinguishing live images (saved to `storage/app/public/{id}/{fileName}` and updated in-place to `disk = 'public'`) from dead links (foreign keys safely detached from `products`/`categories` to avoid cascade deletion, then `forceDelete` executed). The frontend runs an automated batch loop in a dedicated progress modal with live counters and activity logs.

**Tech Stack:** Laravel 10/11, Spatie Media Library, Next.js 14 App Router, React Query, Radix UI Dialog, Tailwind CSS, Lucide React.

---

## Global Constraints
- In-place updates MUST preserve `attachments.id` so products, categories, reviews, and stores never lose their image links.
- Dead links (HTTP status != 200, timeouts, connection errors) MUST detach parent foreign keys prior to `$attachment->forceDelete()` to prevent MySQL `onDelete('cascade')` from wiping out catalog products.
- Batch chunking MUST prevent server timeouts on large libraries (18,000+ files).
- Zero placeholders; all code and file paths must be explicit and exact.

---

### Task 1: Backend Chunked In-Place Sync & Safe Hard-Delete Engine

**Files:**
- Modify: `d:\Work\NEWECOM\mstore\BACKEND\shopping-app-backend\app\Repositories\Eloquents\AttachmentRepository.php`
- Modify: `d:\Work\NEWECOM\mstore\BACKEND\shopping-app-backend\app\Http\Controllers\AttachmentController.php`

**Interfaces:**
- Consumes: `POST /api/attachment/sync-cloudinary` with `{ ids?: number[], limit?: number, delete_dead?: boolean }`
- Produces: JSON response with `{ success: true, processed_count, synced_count, deleted_dead_count, failed_count, remaining_count, has_more, log: [] }`

- [ ] **Step 1: Implement chunked in-place sync & safe deletion in `AttachmentRepository.php`**

```php
    public function syncCloudinary($request)
    {
        try {
            $limit = (int) ($request->limit ?: 30);
            $deleteDead = $request->has('delete_dead') ? (bool) $request->delete_dead : true;

            $baseQuery = $this->model->where(function ($q) {
                $q->where('disk', 'external')
                  ->orWhere('custom_properties', 'like', '%cloudinary%')
                  ->orWhere('file_name', 'like', '%cloudinary%')
                  ->orWhere('name', 'like', '%cloudinary%');
            });

            if ($request->ids && is_array($request->ids) && count($request->ids) > 0) {
                $baseQuery->whereIn('id', $request->ids);
            }

            $totalRemaining = (clone $baseQuery)->count();
            $attachments = (clone $baseQuery)->take($limit)->get();

            if ($attachments->isEmpty()) {
                return response()->json([
                    'success' => true,
                    'message' => 'No Cloudinary media found to sync.',
                    'processed_count' => 0,
                    'synced_count' => 0,
                    'deleted_dead_count' => 0,
                    'failed_count' => 0,
                    'remaining_count' => 0,
                    'has_more' => false,
                    'log' => [],
                ]);
            }

            $syncedCount = 0;
            $deletedDeadCount = 0;
            $failedCount = 0;
            $log = [];

            foreach ($attachments as $attachment) {
                $externalUrl = $attachment->custom_properties['external_url'] 
                    ?? (filter_var($attachment->file_name, FILTER_VALIDATE_URL) ? $attachment->file_name : null)
                    ?? $attachment->original_url 
                    ?? null;

                if (!$externalUrl || !filter_var($externalUrl, FILTER_VALIDATE_URL)) {
                    if ($deleteDead) {
                        $this->safeDetachAndForceDelete($attachment);
                        $deletedDeadCount++;
                        $log[] = [
                            'id' => $attachment->id,
                            'name' => $attachment->name ?: $attachment->file_name,
                            'status' => 'deleted_dead',
                            'reason' => 'Invalid or missing URL',
                        ];
                    } else {
                        $failedCount++;
                        $log[] = [
                            'id' => $attachment->id,
                            'name' => $attachment->name ?: $attachment->file_name,
                            'status' => 'failed',
                            'reason' => 'Invalid URL',
                        ];
                    }
                    continue;
                }

                try {
                    $response = Http::timeout(15)->withHeaders([
                        'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    ])->get($externalUrl);

                    if ($response->successful()) {
                        $imageContent = $response->body();
                        $contentType = $response->header('Content-Type') ?: 'image/jpeg';

                        $finfo = new \finfo(FILEINFO_MIME_TYPE);
                        $mimeType = $finfo->buffer($imageContent) ?: $contentType;

                        $extension = 'jpg';
                        if (str_contains($mimeType, 'png')) $extension = 'png';
                        elseif (str_contains($mimeType, 'webp')) $extension = 'webp';
                        elseif (str_contains($mimeType, 'gif')) $extension = 'gif';
                        elseif (str_contains($mimeType, 'svg')) $extension = 'svg';

                        $baseName = pathinfo($attachment->file_name, PATHINFO_FILENAME);
                        $cleanName = Str::slug($attachment->name ?: $baseName) ?: 'media_' . $attachment->id;
                        $finalFileName = $cleanName . '.' . $extension;
                        $fileSize = strlen($imageContent);

                        // Save file in Spatie standard folder structure
                        $storageRelativePath = "{$attachment->id}/{$finalFileName}";
                        Storage::disk('public')->put($storageRelativePath, $imageContent);

                        $customProps = $attachment->custom_properties ?: [];
                        $customProps['synced_from'] = 'cloudinary';
                        $customProps['synced_at'] = now()->toIso8601String();
                        unset($customProps['external_url']);

                        $attachment->update([
                            'disk' => 'public',
                            'conversions_disk' => 'public',
                            'file_name' => $finalFileName,
                            'mime_type' => $mimeType,
                            'size' => $fileSize,
                            'custom_properties' => $customProps,
                        ]);

                        $syncedCount++;
                        $log[] = [
                            'id' => $attachment->id,
                            'name' => $finalFileName,
                            'status' => 'synced',
                            'size' => $fileSize,
                        ];
                    } else {
                        // Dead link (404, 403, 500)
                        if ($deleteDead) {
                            $this->safeDetachAndForceDelete($attachment);
                            $deletedDeadCount++;
                            $log[] = [
                                'id' => $attachment->id,
                                'name' => $attachment->name ?: $attachment->file_name,
                                'status' => 'deleted_dead',
                                'reason' => 'HTTP ' . $response->status(),
                            ];
                        } else {
                            $failedCount++;
                            $log[] = [
                                'id' => $attachment->id,
                                'name' => $attachment->name ?: $attachment->file_name,
                                'status' => 'failed',
                                'reason' => 'HTTP status ' . $response->status(),
                            ];
                        }
                    }
                } catch (\Exception $e) {
                    if ($deleteDead) {
                        $this->safeDetachAndForceDelete($attachment);
                        $deletedDeadCount++;
                        $log[] = [
                            'id' => $attachment->id,
                            'name' => $attachment->name ?: $attachment->file_name,
                            'status' => 'deleted_dead',
                            'reason' => 'Unreachable: ' . $e->getMessage(),
                        ];
                    } else {
                        $failedCount++;
                        $log[] = [
                            'id' => $attachment->id,
                            'name' => $attachment->name ?: $attachment->file_name,
                            'status' => 'failed',
                            'reason' => $e->getMessage(),
                        ];
                    }
                }
            }

            $remainingAfterBatch = max(0, $totalRemaining - ($syncedCount + $deletedDeadCount));

            return response()->json([
                'success' => true,
                'message' => "Batch processed: {$syncedCount} synced in-place, {$deletedDeadCount} dead deleted.",
                'processed_count' => count($attachments),
                'synced_count' => $syncedCount,
                'deleted_dead_count' => $deletedDeadCount,
                'failed_count' => $failedCount,
                'remaining_count' => $remainingAfterBatch,
                'has_more' => $remainingAfterBatch > 0,
                'log' => $log,
            ]);
        } catch (\Exception $e) {
            throw new ExceptionHandler($e->getMessage(), 422);
        }
    }

    protected function safeDetachAndForceDelete($attachment)
    {
        $id = $attachment->id;

        // Nullify foreign keys across tables to prevent MySQL cascade delete
        \App\Models\Product::where('product_thumbnail_id', $id)->update(['product_thumbnail_id' => null]);
        \App\Models\Product::where('size_chart_image_id', $id)->update(['size_chart_image_id' => null]);
        \App\Models\Product::where('product_meta_image_id', $id)->update(['product_meta_image_id' => null]);
        \App\Models\Product::where('attachment_id', $id)->update(['attachment_id' => null]);
        \App\Models\Category::where('category_image_id', $id)->update(['category_image_id' => null]);
        \App\Models\Category::where('category_icon_id', $id)->update(['category_icon_id' => null]);
        \App\Models\Store::where('store_logo_id', $id)->update(['store_logo_id' => null]);
        \App\Models\Store::where('store_cover_id', $id)->update(['store_cover_id' => null]);
        \App\Models\Blog::where('blog_thumbnail_id', $id)->update(['blog_thumbnail_id' => null]);
        \App\Models\Blog::where('blog_meta_image_id', $id)->update(['blog_meta_image_id' => null]);
        \App\Models\Page::where('page_meta_image_id', $id)->update(['page_meta_image_id' => null]);
        \App\Models\Review::where('review_image_id', $id)->update(['review_image_id' => null]);
        \App\Models\Refund::where('refund_image_id', $id)->update(['refund_image_id' => null]);
        \App\Models\OfferBanner::where('banner_image_id', $id)->update(['banner_image_id' => null]);

        $attachment->forceDelete();
    }
```

- [ ] **Step 2: Validate PHP syntax**

Run: `php -l app/Repositories/Eloquents/AttachmentRepository.php`
Expected: `No syntax errors detected`

---

### Task 2: Frontend Migration Dashboard Modal (`CloudinarySyncModal.js`)

**Files:**
- Create: `d:\Work\NEWECOM\mstore\nextjs-fastkart-admin\src\Components\Attachment\CloudinarySyncModal.js`

**Interfaces:**
- Props: `open` (boolean), `onClose` (function), `onFinish` (function)
- State: `isRunning`, `isPaused`, `totalSynced`, `totalDeadDeleted`, `totalProcessed`, `remaining`, `logs`

- [ ] **Step 1: Create `CloudinarySyncModal.js` with batch runner and live metrics**

```javascript
"use client";

import React, { useState, useEffect, useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Cloud,
  CheckCircle2,
  Trash2,
  Loader2,
  Play,
  Pause,
  X,
  HardDrive,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import request from "../../Utils/AxiosUtils";
import { syncCloudinaryAttachment } from "../../Utils/AxiosUtils/API";
import { ToastNotification } from "../../Utils/CustomFunctions/ToastNotification";

const BATCH_LIMIT = 30;

const CloudinarySyncModal = ({ open, onClose, onFinish }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const [totalSynced, setTotalSynced] = useState(0);
  const [totalDeadDeleted, setTotalDeadDeleted] = useState(0);
  const [totalProcessed, setTotalProcessed] = useState(0);
  const [remainingCount, setRemainingCount] = useState(null);
  const [logs, setLogs] = useState([]);

  const isPausedRef = useRef(false);
  const isRunningRef = useRef(false);

  const logEndRef = useRef(null);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  const startMigration = async () => {
    if (isRunningRef.current) return;

    setIsRunning(true);
    setIsPaused(false);
    setIsComplete(false);
    isRunningRef.current = true;
    isPausedRef.current = false;

    let hasMore = true;
    let batchIndex = 1;

    try {
      while (hasMore && isRunningRef.current && !isPausedRef.current) {
        const res = await request({
          url: syncCloudinaryAttachment,
          data: {
            limit: BATCH_LIMIT,
            delete_dead: true,
          },
          method: "post",
        });

        if (res?.status === 200 && res?.data?.success) {
          const data = res.data;
          setTotalSynced((prev) => prev + (data.synced_count || 0));
          setTotalDeadDeleted((prev) => prev + (data.deleted_dead_count || 0));
          setTotalProcessed((prev) => prev + (data.processed_count || 0));
          setRemainingCount(data.remaining_count);

          if (data.log && Array.isArray(data.log)) {
            setLogs((prev) => [...prev, ...data.log].slice(-100)); // keep last 100
          }

          if (!data.has_more || data.processed_count === 0) {
            hasMore = false;
            setIsComplete(true);
            ToastNotification("success", "All Cloudinary images successfully migrated!");
          }

          batchIndex++;
        } else {
          throw new Error(res?.data?.message || "Batch request failed");
        }
      }
    } catch (err) {
      ToastNotification("error", err.message || "Migration encountered an error");
    } finally {
      setIsRunning(false);
      isRunningRef.current = false;
    }
  };

  const handlePause = () => {
    setIsPaused(true);
    isPausedRef.current = true;
    setIsRunning(false);
    isRunningRef.current = false;
  };

  const handleClose = () => {
    if (isRunning) {
      if (!window.confirm("Migration is in progress. Are you sure you want to stop and close?")) {
        return;
      }
      handlePause();
    }
    onClose();
    if (onFinish) onFinish();
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[9998] transition-opacity" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-3xl border border-slate-200 shadow-2xl z-[9999] w-[95vw] max-w-2xl max-h-[85vh] flex flex-col overflow-hidden font-sans outline-none">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <Dialog.Title className="text-base font-bold text-slate-800">
                  Cloudinary In-Place Migration
                </Dialog.Title>
                <p className="text-xs text-slate-400">
                  Downloads live images into local storage with same IDs & removes dead links.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 flex-1 min-h-0 flex flex-col gap-5 overflow-hidden">
            {/* Metric Counters */}
            <div className="grid grid-cols-3 gap-3 shrink-0">
              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3.5 flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-1">
                  Saved to Local Disk
                </span>
                <span className="text-2xl font-black text-emerald-800">
                  {totalSynced}
                </span>
                <span className="text-[10px] text-emerald-600 font-medium mt-0.5">
                  Exact IDs retained
                </span>
              </div>

              <div className="bg-red-50/70 border border-red-200/80 rounded-2xl p-3.5 flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 mb-1">
                  Dead Links Deleted
                </span>
                <span className="text-2xl font-black text-red-800">
                  {totalDeadDeleted}
                </span>
                <span className="text-[10px] text-red-600 font-medium mt-0.5">
                  Unreachable 404/403
                </span>
              </div>

              <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5 flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 mb-1">
                  Remaining Files
                </span>
                <span className="text-2xl font-black text-amber-800">
                  {remainingCount !== null ? remainingCount : "Scanning..."}
                </span>
                <span className="text-[10px] text-amber-600 font-medium mt-0.5">
                  {isComplete ? "Completed" : "In Queue"}
                </span>
              </div>
            </div>

            {/* Live Activity Feed */}
            <div className="flex-1 min-h-0 flex flex-col bg-slate-900 rounded-2xl border border-slate-800 p-4 text-slate-300 font-mono text-xs overflow-hidden">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 shrink-0 mb-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Live Activity Log
                </span>
                {isRunning && (
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-amber-400">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Processing Batch...</span>
                  </span>
                )}
              </div>

              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 select-none">
                {logs.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-500 text-xs italic">
                    Press "Start Migration" below to scan and process your media library.
                  </div>
                ) : (
                  logs.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[11px] py-0.5">
                      <div className="flex items-center gap-2 truncate pr-2">
                        {item.status === "synced" ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5 text-red-400 shrink-0" />
                        )}
                        <span className="truncate text-slate-200 font-sans">
                          {item.name || `Asset #${item.id}`}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold uppercase shrink-0 ${
                          item.status === "synced"
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >
                        {item.status === "synced" ? "Local Saved" : item.reason || "Dead Removed"}
                      </span>
                    </div>
                  ))
                )}
                <div ref={logEndRef} />
              </div>
            </div>
          </div>

          {/* Footer Controls */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
            <p className="text-xs text-slate-500">
              {isRunning
                ? "Running chunked migration. Keep this window open."
                : isComplete
                ? "All files processed. You can now close this modal."
                : "Ready to start in-place conversion."}
            </p>

            <div className="flex items-center gap-2.5">
              {!isRunning && !isComplete && (
                <button
                  type="button"
                  onClick={startMigration}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>{isPaused ? "Resume Migration" : "Start Migration"}</span>
                </button>
              )}

              {isRunning && (
                <button
                  type="button"
                  onClick={handlePause}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
                >
                  <Pause className="w-3.5 h-3.5 fill-white" />
                  <span>Pause</span>
                </button>
              )}

              {isComplete && (
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
                >
                  Done
                </button>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default CloudinarySyncModal;
```

---

### Task 3: Wire Migration Modal into Media Header, Grid & Index

**Files:**
- Modify: `d:\Work\NEWECOM\mstore\nextjs-fastkart-admin\src\Components\Attachment\index.js`
- Modify: `d:\Work\NEWECOM\mstore\nextjs-fastkart-admin\src\Components\Attachment\MediaHeader.js`
- Modify: `d:\Work\NEWECOM\mstore\nextjs-fastkart-admin\src\Components\Attachment\MediaGrid.js`

- [ ] **Step 1: Import and render `CloudinarySyncModal` in `index.js`**

Connect state `isSyncModalOpen`, trigger on clicking "Sync Cloudinary", and auto-invalidate React Query queries on close.

- [ ] **Step 2: Connect triggers in `MediaHeader.js` and `MediaGrid.js`**

Ensure clicking "Sync Cloudinary" opens the new modal directly.

---

### Task 4: Verification and Build Validation

- [ ] **Step 1: Test PHP syntax**

Run: `php -l app/Repositories/Eloquents/AttachmentRepository.php`
Expected: `No syntax errors detected`

- [ ] **Step 2: Test Next.js build**

Run: `npm run build`
Expected: `Compiled successfully` with 0 errors.
