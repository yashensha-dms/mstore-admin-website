# Media Library Modernization, 100-Image Bulk Upload Engine & Cloudinary In-Place Sync

## 1. Overview & Objective
This specification defines the complete overhaul of the media management ecosystem across the Next.js Admin dashboard (`nextjs-fastkart-admin`) and Laravel backend (`shopping-app-backend`).

### Key Goals:
1. **Frontend Legacy Cleanup**: Remove outdated, redundant, and tangled files and legacy reactstrap markup in `src/Components/Attachment/` (`AttachmentData.js`, `AttachmentDropdown.js`, `AttachmentHead.js`, `AttachmentModalNav.js`, `MediaData.js`, `ModalButton.js`, `Tab1Form.js`, `TopSection.js`) to establish a clean slate.
2. **Modernized UI/UX**: Replace legacy tables/antiquated boxes with an agency-grade, responsive Media Library grid, floating bulk action bar, filter tabs (All, Local, Cloudinary), sort selector, and slide-over metadata inspector drawer.
3. **High-Capacity Bulk Upload Engine (up to 100 images)**: Drag-and-drop zone with client-side concurrency queue worker (4 parallel requests), live upload progress per file, overall completion percentage, cancellation, and error retry without exceeding server limits.
4. **Cloudinary In-Place Sync Engine**: One-click server-to-server migration for external Cloudinary images into local disk storage that preserves existing `Attachment` IDs, ensuring 100% data integrity for linked products, categories, reviews, and banners.

---

## 2. Architecture & Data Flow

```
[ Frontend: Next.js Admin ]
   │
   ├── 0. Clean Up Legacy Frontend Files
   │     └── Remove obsolete files: AttachmentData.js, AttachmentDropdown.js,
   │         AttachmentHead.js, AttachmentModalNav.js, MediaData.js, ModalButton.js,
   │         Tab1Form.js, TopSection.js
   │
   ├── 1. Clean Modular Components (src/Components/Attachment/)
   │     ├── MediaLibrary.js (Main Container & State)
   │     ├── MediaHeader.js (Search, Sort, Filters, Action Buttons)
   │     ├── MediaGrid.js & MediaCard.js (Responsive Grid, Badges, Hover Effects)
   │     ├── MediaInspector.js (Slide-over Details Drawer & Quick Actions)
   │     ├── BulkActionBar.js (Floating Bottom Actions: Sync Selected, Bulk Delete, Clear)
   │     └── BulkUploadQueueModal.js (100-file dropzone, 4-worker concurrent queue, progress drawer)
   │
   ├── 2. AttachmentModal.js (Form Picker for Products, Categories, Banners, etc.)
   │     └── Powered by the new MediaGrid & Upload Queue, preserving formik bindings
   │
   └── 3. Cloudinary Sync Trigger (All or Selected)
         │
         ▼ (POST /api/attachment/sync-cloudinary)
[ Backend: Laravel Engine ]
   │
   ├── 1. Query external attachments (disk = 'external' & custom_properties.external_url)
   ├── 2. Stream remote image bytes server-to-server via Laravel HTTP client
   ├── 3. Write physical image to storage/app/public/attachments/
   ├── 4. Mutate Attachment model in-place (disk = 'public', update mime_type/size/file_name)
   └── 5. Return migration summary (synced_count, failed_count)
```

---

## 3. Detailed Component Specifications

### 3.1 Frontend Phase 0: Cleanup
- Identify and remove legacy files in `src/Components/Attachment/` that contain duplicate logic or deprecated reactstrap elements.
- Ensure that `ImportExport.js` or other consumers of shared inputs remain completely unaffected.

### 3.2 Frontend Phase 1: Clean Modular Media System (`src/Components/Attachment`)

1. **`AttachmentContain` / `MediaLibrary` (`index.js`)**:
   - Manages top-level state: search term, sort order, storage type filter (`all`, `local`, `cloudinary`), pagination, selected image IDs, and active inspector item.
   - Hosts the `MediaHeader`, `MediaGrid`, `MediaInspector`, `BulkActionBar`, and `BulkUploadQueueModal`.

2. **`MediaCard.js`**:
   - Aspect-square visual card with lazy-loaded thumbnails.
   - Visual storage badge:
     - `☁️ Cloudinary` (Amber badge)
     - `💾 Local` (Slate/Emerald badge)
   - Selection checkbox with clear hover & active visual feedback.
   - Click card to inspect or select, click checkbox for multi-select.

3. **`MediaInspector.js` (Slide-over Drawer)**:
   - High-resolution preview image.
   - Detailed metadata table: ID, file name, dimensions, file size, MIME type, storage disk, created date.
   - Action buttons:
     - **Copy Direct URL**: Copies URL to clipboard with animated toast confirmation.
     - **Sync to Local**: Single-item sync trigger if disk is Cloudinary.
     - **Delete Asset**: Single-item deletion with confirmation dialog.

4. **`BulkActionBar.js` (Floating Bottom Bar)**:
   - Automatically slides up from bottom when `selectedCount > 0`.
   - Actions:
     - Count badge (`X selected`)
     - `Select All Page` / `Deselect All`
     - `☁️ Sync Selected to Local` (active when at least 1 Cloudinary image is in selection)
     - `🗑️ Delete Selected` (triggers bulk delete modal)

5. **`BulkUploadQueueModal.js`**:
   - Supports selecting/dropping up to 100 images simultaneously.
   - Concurrency Queue: Uses a promise pool of 4 active uploads at any time.
   - Live Drawer UI: Displays overall progress bar and scrollable individual file queue with states: `Queued`, `Uploading (X%)`, `Done`, `Error`.

6. **`AttachmentModal.js` (Form Field Picker)**:
   - Unified to use the new `MediaGrid` layout and the new `BulkUploadQueueModal` tab, maintaining full backward compatibility with formik fields (`product_thumbnail_id`, `product_galleries`, `category_image_id`, etc.).

---

### 3.3 Backend Phase: Endpoints & Service Layer (`shopping-app-backend`)

1. **Route (`routes/api.php`)**:
   ```php
   Route::post('/attachment/sync-cloudinary', [AttachmentController::class, 'syncCloudinary']);
   ```

2. **Controller (`AttachmentController.php`)**:
   - Method `syncCloudinary(Request $request)`:
     - Validates optional `ids` (array of integers) and `all` (boolean).
     - Delegates work to `AttachmentRepository::syncCloudinary($ids, $all)`.

3. **Repository (`AttachmentRepository.php`)**:
   - Queries target attachments with `disk = 'external'`.
   - Iterates through attachments, fetching image binary via `Http::timeout(30)->get($url)`.
   - Saves file using Spatie MediaLibrary or Laravel Storage disk `public`.
   - Updates the existing `Attachment` record in-place:
     ```php
     $attachment->update([
         'disk' => 'public',
         'file_name' => $fileName,
         'mime_type' => $mimeType,
         'size' => $fileSize,
         'custom_properties' => array_merge($attachment->custom_properties ?? [], ['synced_at' => now()->toIso8601String()]),
     ]);
     ```
   - Retains the exact same `id` so foreign relationships remain completely valid.

---

## 4. Error Handling & Edge Cases

| Scenario | Handling Strategy |
| :--- | :--- |
| **Cloudinary Image 404 / Broken Link** | Server logs failure for the specific ID, continues syncing remaining items, and reports failed ID list in the response payload. |
| **Upload Network Interruption** | Queue worker flags failed item as `Error` with a "Retry" button without failing the entire batch. |
| **File Exceeds Max Upload Limit** | Client-side validation validates MIME type and file size before pushing to queue. |
| **Duplicate Filename on Sync** | Uses a unique UUID prefix or hash timestamp during local storage save. |

---

## 5. Verification Plan

1. **Upload Engine Test**:
   - Upload batches of 5, 20, and 50+ images simultaneously. Verify concurrent queue processing and live progress drawer.
2. **Cloudinary Sync Test**:
   - Create external Cloudinary image records.
   - Link one Cloudinary image to a test Product.
   - Run "Sync Cloudinary".
   - Verify image is downloaded to `storage/app/public/`, database record disk changes to `public`, and test product image continues to load properly.
3. **Form Modal Integration Test**:
   - Open Product Create/Edit form, open image picker modal, select single/multiple images, and verify formik values are updated correctly.
