# Media Library Overhaul, 100-Image Bulk Upload & Cloudinary In-Place Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul the admin media library with a modern UI, slide-over inspector drawer, 100-image concurrent bulk uploader, and server-side in-place Cloudinary image sync preserving database relations.

**Architecture:** Frontend built with clean modular React/Tailwind/Lucide components (`MediaGrid`, `MediaInspector`, `BulkActionBar`, `BulkUploadQueueModal`) in `src/Components/Attachment/`. Backend extended with `POST /api/attachment/sync-cloudinary` in Laravel `AttachmentRepository` streaming images server-to-server and updating attachment records in-place without changing IDs.

**Tech Stack:** Next.js 14, React, Tailwind CSS, TanStack React Query, Radix UI Dialog, Lucide React, Laravel 10/11, Spatie MediaLibrary.

## Global Constraints
- Clean up legacy frontend media files in `src/Components/Attachment/` before adding new modules.
- Preserve existing `Attachment` model primary keys (`id`) during Cloudinary sync so products, categories, and banners maintain unbroken relationships.
- Client-side upload queue must cap concurrency at 4 parallel uploads to prevent server payload/memory exhaustion with up to 100 images.

---

### Task 1: Clean Up Legacy Frontend Media Files

**Files:**
- Delete: `d:/Work/NEWECOM/mstore/nextjs-fastkart-admin/src/Components/Attachment/AttachmentData.js`
- Delete: `d:/Work/NEWECOM/mstore/nextjs-fastkart-admin/src/Components/Attachment/AttachmentDropdown.js`
- Delete: `d:/Work/NEWECOM/mstore/nextjs-fastkart-admin/src/Components/Attachment/AttachmentHead.js`
- Delete: `d:/Work/NEWECOM/mstore/nextjs-fastkart-admin/src/Components/Attachment/AttachmentModalNav.js`
- Delete: `d:/Work/NEWECOM/mstore/nextjs-fastkart-admin/src/Components/Attachment/MediaData.js`
- Delete: `d:/Work/NEWECOM/mstore/nextjs-fastkart-admin/src/Components/Attachment/ModalButton.js`
- Delete: `d:/Work/NEWECOM/mstore/nextjs-fastkart-admin/src/Components/Attachment/Tab1Form.js`
- Delete: `d:/Work/NEWECOM/mstore/nextjs-fastkart-admin/src/Components/Attachment/TopSection.js`

**Interfaces:**
- Consumes: None
- Produces: Clean directory structure inside `src/Components/Attachment/` ready for the new architecture.

- [ ] **Step 1: Verify no external dependencies reference the legacy helper files**
Check `grep` search for references to `AttachmentData`, `AttachmentDropdown`, `AttachmentHead`, `AttachmentModalNav`, `MediaData`, `ModalButton`, `Tab1Form`, and `TopSection`. Only `src/Components/Attachment/index.js` and `AttachmentModal.js` reference them internally.

- [ ] **Step 2: Remove legacy files**
Delete the legacy files from `d:/Work/NEWECOM/mstore/nextjs-fastkart-admin/src/Components/Attachment/`.

- [ ] **Step 3: Verification**
Verify `src/Components/Attachment/` only contains active files (`index.js`, `AttachmentModal.js`).

---

### Task 2: Backend Cloudinary In-Place Sync Engine

**Files:**
- Modify: `d:/Work/NEWECOM/mstore/BACKEND/shopping-app-backend/routes/api.php`
- Modify: `d:/Work/NEWECOM/mstore/BACKEND/shopping-app-backend/app/Http/Controllers/AttachmentController.php`
- Modify: `d:/Work/NEWECOM/mstore/BACKEND/shopping-app-backend/app/Repositories/Eloquents/AttachmentRepository.php`
- Modify: `d:/Work/NEWECOM/mstore/nextjs-fastkart-admin/src/Utils/AxiosUtils/API.js`

**Interfaces:**
- Consumes: `POST /api/attachment/sync-cloudinary` with `{ all?: boolean, ids?: number[] }`
- Produces: `{ success: true, message: string, synced_count: number, failed_count: number, items: array }`

- [ ] **Step 1: Add sync route in `routes/api.php`**
```php
Route::post('/attachment/sync-cloudinary', [AttachmentController::class, 'syncCloudinary']);
```

- [ ] **Step 2: Add `syncCloudinary` method in `AttachmentController.php`**
```php
public function syncCloudinary(Request $request)
{
    return $this->repository->syncCloudinary($request);
}
```

- [ ] **Step 3: Implement `syncCloudinary` in `AttachmentRepository.php`**
Implement the server-side download using `Illuminate\Support\Facades\Http` and `Illuminate\Support\Facades\Storage`:
- Fetch attachments where `disk = 'external'` and `custom_properties->external_url` contains `cloudinary` (or matches selected IDs).
- Stream file contents, detect mime type, write to `storage/app/public/attachments/{id}/{filename}`.
- Update the `Attachment` row in-place with `disk = 'public'`, `file_name`, `mime_type`, `size`, retaining its original `id`.
- Return detailed counts of synced and failed items.

- [ ] **Step 4: Add API endpoint constant in frontend `API.js`**
Add `export const syncCloudinaryAttachment = "/attachment/sync-cloudinary";`

---

### Task 3: Next.js Admin Modular Media Components

**Files:**
- Create: `d:/Work/NEWECOM/mstore/nextjs-fastkart-admin/src/Components/Attachment/MediaCard.js`
- Create: `d:/Work/NEWECOM/mstore/nextjs-fastkart-admin/src/Components/Attachment/MediaGrid.js`
- Create: `d:/Work/NEWECOM/mstore/nextjs-fastkart-admin/src/Components/Attachment/MediaHeader.js`
- Create: `d:/Work/NEWECOM/mstore/nextjs-fastkart-admin/src/Components/Attachment/MediaInspector.js`
- Create: `d:/Work/NEWECOM/mstore/nextjs-fastkart-admin/src/Components/Attachment/BulkActionBar.js`

**Interfaces:**
- Consumes: Media list from React Query, selection state, sync/delete mutations.
- Produces: Clean, reusable, reactive media grid, inspector drawer, and bottom action bar.

- [ ] **Step 1: Create `MediaCard.js`**
- Square aspect ratio with image thumbnail, loaded state, and smooth hover overlay.
- Status badges: `☁️ Cloudinary` (Amber badge), `💾 Local` (Slate/Emerald badge).
- Selection checkbox with active highlight ring.
- Card click handler (inspect in library page, toggle select in picker modal).

- [ ] **Step 2: Create `MediaGrid.js`**
- Responsive grid (2 cols mobile up to 6 cols desktop).
- Skeleton loading state and empty search state illustration with Lucide icons.
- Renders `MediaCard` components with selection bindings.

- [ ] **Step 3: Create `MediaHeader.js`**
- Search input with clear button and debouncing.
- Filter tabs: `All Files`, `Local Storage`, `Cloudinary External`.
- Sort dropdown: `Newest First`, `Oldest First`, `Largest Size`, `Smallest Size`.
- Top action buttons: `☁️ Sync Cloudinary` (with count badge) and `+ Add Media`.

- [ ] **Step 4: Create `MediaInspector.js`**
- Slide-over drawer with high-resolution image preview.
- Detailed file attributes: ID, File Name, Dimensions, Size, Storage Disk, Uploaded Date.
- Action triggers: Copy Direct URL (with clipboard confirmation), Sync Single Cloudinary Item, Delete Item.

- [ ] **Step 5: Create `BulkActionBar.js`**
- Floating bottom bar with entrance transition when `selectedIds.length > 0`.
- Badges: `X Selected`.
- Buttons: `Select All Visible`, `Deselect All`, `☁️ Sync Selected` (enabled if Cloudinary items exist), `🗑️ Delete Selected` (with confirmation modal).

---

### Task 4: High-Capacity Bulk Upload Queue Modal (Up to 100 Images)

**Files:**
- Create: `d:/Work/NEWECOM/mstore/nextjs-fastkart-admin/src/Components/Attachment/BulkUploadQueueModal.js`

**Interfaces:**
- Consumes: Dropped/selected files (up to 100).
- Produces: Multi-file concurrent upload with live progress, retry, cancellation, and React Query cache invalidation.

- [ ] **Step 1: Create `BulkUploadQueueModal.js`**
- Drag-and-drop dropzone supporting image selection up to 100 items.
- Client-side concurrency queue worker (pool size of 4 simultaneous requests).
- Live progress drawer:
  - Overall progress bar `Uploading X / Y (Z%)`.
  - Scrollable file queue showing thumbnail, filename, size, individual percentage bar, status badge (`Queued`, `Uploading`, `Done`, `Error`).
- Controls: `Cancel Remaining`, `Retry Failed`, `Done`.
- Invalidate `[attachment]` query on completion to refresh media library automatically.

---

### Task 5: Main Media Library Page Overhaul

**Files:**
- Modify: `d:/Work/NEWECOM/mstore/nextjs-fastkart-admin/src/Components/Attachment/index.js`
- Modify: `d:/Work/NEWECOM/mstore/nextjs-fastkart-admin/src/app/[lng]/(MainLayout)/attachment/page.js`

**Interfaces:**
- Consumes: All components from Task 3 & 4.
- Produces: Complete, seamless Media Library page with state management for filters, selection, inspector, bulk actions, and pagination.

- [ ] **Step 1: Update `src/Components/Attachment/index.js`**
- Integrate `MediaHeader`, `MediaGrid`, `MediaInspector`, `BulkActionBar`, and `BulkUploadQueueModal`.
- Connect React Query pagination and mutations (`syncCloudinary`, `deleteAttachments`).

- [ ] **Step 2: Verify page route in `attachment/page.js`**
- Verify translation context and metadata for the `/attachment` route.

---

### Task 6: Form Media Picker Modal Integration (`AttachmentModal.js`)

**Files:**
- Modify: `d:/Work/NEWECOM/mstore/nextjs-fastkart-admin/src/Components/Attachment/AttachmentModal.js`

**Interfaces:**
- Consumes: Formik field props (`name`, `setFieldValue`, `multiple`, `showImage`, `values`).
- Produces: Full compatibility with all forms (Products, Categories, Themes, Settings) using the new UI and upload queue.

- [ ] **Step 1: Refactor `AttachmentModal.js`**
- Replace legacy inner markup with the new `MediaGrid` and `BulkUploadQueueModal` tab.
- Preserve formik selection contract: `setFieldValue(name, id)` or array of IDs when `multiple=true`.

---

### Task 7: Full Verification & E2E Testing

- [ ] **Step 1: Test Bulk Upload Engine**
  - Upload 10 to 50 images in bulk via drag-and-drop.
  - Verify concurrent upload queue (4 active), progress feedback, and successful addition to media grid.
- [ ] **Step 2: Test Cloudinary In-Place Sync**
  - Trigger "Sync Cloudinary" on external Cloudinary images.
  - Verify server downloads image to local storage, attachment `disk` updates to `public`, and `id` is retained.
- [ ] **Step 3: Test Product/Category Media Picker**
  - Open Product Edit page, select an image from the new picker modal, save, and confirm product thumbnail renders accurately.

---
