# Cloudinary In-Place Replacement & Dead-Link Cleanup Engine Design

## Overview
This specification details the end-to-end architecture for migrating remote Cloudinary images into local server storage (`storage/app/public/...`) while:
1. **Preserving 100% of Image ID relationships**: In-place replacement maintains the exact `attachments.id` for each working media item so no products, categories, reviews, or stores lose their image links.
2. **Hard-deleting dead / unreachable Cloudinary URLs**: Proactively identifying broken 404/403/timeout links, safely detaching foreign keys to avoid cascade deletion, and hard deleting the dead records.
3. **Chunked batch execution with live UI feedback**: A modal runner that processes the library in chunks with real-time progress, live metrics, and pause/cancel controls.

---

## 1. Problem Statement & Architecture Goals

### Problem
- Historical media items point to remote Cloudinary URLs (`https://res.cloudinary.com/...`).
- Many of these historical links are dead, unreachable, or obsolete.
- Other live Cloudinary links need to be stored locally on the server for reliability, independence, and performance.
- Direct table deletion without foreign key handling risks triggering MySQL `onDelete('cascade')` on `products`, `categories`, and `stores`.
- Generating new attachment records would break thousands of product thumbnail and gallery linkages (`product_thumbnail_id`, `product_galleries`, `category_image_id`).

### Solution
- **In-Place Image Replacement**:
  - Download binary from Cloudinary and save directly to `storage/app/public/{id}/{file_name}`.
  - Update `Attachment` record (`disk = 'public'`, `size`, `mime_type`, `file_name`) with the **same primary key `id`**.
  - All foreign keys referencing `attachments.id` immediately resolve to the local file without modifying any other tables.
- **Safe Hard Delete for Dead Links**:
  - Detect dead links (HTTP status != 200, connection errors, DNS failure, timeout).
  - Explicitly nullify foreign key columns (`products.product_thumbnail_id = null`, etc.) to prevent cascade deletion.
  - Execute `$attachment->forceDelete()` to eliminate dead rows.

---

## 2. Backend Design

### API Endpoint
`POST /api/attachment/sync-cloudinary`

#### Request Payload
```json
{
  "ids": [101, 102],       // Optional: specific IDs to sync
  "limit": 30,              // Chunk size (default: 30)
  "delete_dead": true       // Whether to hard-delete 404/unreachable links
}
```

#### Response Format
```json
{
  "success": true,
  "processed_count": 30,
  "synced_count": 24,
  "deleted_dead_count": 6,
  "failed_count": 0,
  "remaining_count": 120,
  "has_more": true,
  "log": [
    { "id": 101, "name": "shoe.jpg", "status": "synced", "size": 145020 },
    { "id": 102, "name": "banner.jpg", "status": "deleted_dead", "reason": "HTTP 404 Not Found" }
  ]
}
```

### Backend Processing Workflow

```mermaid
flowchart TD
    A[Start Batch Request] --> B[Query Cloudinary Attachments]
    B --> C{Any Attachments Found?}
    C -- No --> D[Return has_more: false, remaining: 0]
    C -- Yes --> E[Loop Through Batch Items]
    E --> F[Resolve External URL]
    F --> G[HTTP GET with 15s Timeout]
    G --> H{HTTP 200 & Valid Binary?}
    
    H -- Yes (Live) --> I[Save to storage/app/public/{id}/{fileName}]
    I --> J[Update Attachment row in-place: disk='public']
    J --> K[Log Synced: exact ID retained]
    
    H -- No (Dead/404) --> L{delete_dead is true?}
    L -- Yes --> M[Nullify parent pointers in products/categories/stores]
    M --> N[Attachment forceDelete]
    N --> O[Log Dead Deleted]
    L -- No --> P[Log Failed/Skipped]
    
    K --> Q[Next Item in Batch]
    O --> Q
    P --> Q
    Q --> R{Batch Complete?}
    R -- Yes --> S[Return Batch Summary & has_more status]
```

### Database Foreign Key Safety Matrix
Before executing `$attachment->forceDelete()` on dead attachments, the following relationships are safely detached:
- `Product`: `product_thumbnail_id`, `size_chart_image_id`, `product_meta_image_id`, `attachment_id`
- `Category`: `category_image_id`, `category_icon_id`
- `Store`: `store_logo_id`, `store_cover_id`
- `Blog`: `blog_thumbnail_id`, `blog_meta_image_id`
- `Review`: `review_image_id`
- `Refund`: `refund_image_id`
- `OfferBanner`: `banner_image_id`

---

## 3. Frontend Design

### Cloudinary Migration Modal Component (`CloudinarySyncModal.js`)
A dedicated, high-aesthetic modal triggered by clicking **"Sync Cloudinary"** on the header or empty state.

#### Features & State:
1. **Runner Engine**:
   - Loops consecutive batch calls (`limit: 30`) until `has_more === false` or user pauses.
   - Calculates total migrated, total dead deleted, and remaining.
2. **Visual Progress**:
   - Animated progress bar with percentage and estimated time remaining.
   - Three key metric badges:
     - 🟢 **Saved to Local Storage** (green counter)
     - 🔴 **Dead Links Deleted** (red counter)
     - ⏳ **Remaining Cloudinary Files** (amber counter)
3. **Live Activity Stream**:
   - Scrollable terminal-style live log of processed files with status badges.
4. **Controls**:
   - **Start / Resume Sync**
   - **Pause Sync**
   - **Close / Finish** (refreshes Media Library and triggers success toast)

---

## 4. Verification Plan

### Automated / Backend Tests
- Run `php -l` on all modified Laravel controller and repository files.
- Test `POST /api/attachment/sync-cloudinary` with a mock sample to verify:
  - Live images download to disk and update `disk = 'public'` with the **exact same ID**.
  - Dead links are hard deleted with parent product foreign keys safely set to `null`.

### Frontend Verification
- Run `npm run build` to confirm 0 compilation errors across all routes.
- Verify modal opens smoothly, runs chunked batches, updates counters in real-time, and refreshes the grid upon completion.
