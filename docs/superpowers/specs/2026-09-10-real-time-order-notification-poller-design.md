# Real-Time Order Notification & Siren Alert Design

## Overview
This design resolves the issue where order notifications and siren audio alerts stopped firing in the admin panel unless the page was manually refreshed. It eliminates client/proxy HTTP caching, unlocks the Web Audio API against browser autoplay restrictions, synchronizes local state by database order ID, and automatically refreshes active order tables and notification badges via React Query cache invalidation without requiring full page reloads or complex WebSocket server daemons.

---

## 1. Problem Analysis & Root Cause

1. **HTTP Caching of Polling Requests**:
   - `OrderNotificationPoller` polled `/order` every 5 seconds with static parameters (`{ paginate: 10, page: 1, sort: "desc", field: "created_at" }`).
   - Without dynamic cache-busting parameters (`_t: Date.now()`) or `Cache-Control: no-cache` request headers, Chromium browsers (Chrome/Edge) served cached responses (`304 Not Modified` or `200 from disk cache`).
   - Consequently, polling requests continually retrieved stale order snapshots. Only manual full-page refreshes (F5) forced a cache bypass.

2. **LocalStorage Monotonic Lockup**:
   - The comparison logic relied on `parseInt(latestOrderNumber) > parseInt(storedLatest)`.
   - If test orders, deleted records, or differently formatted identifiers resulted in a higher number stored previously in `localStorage`, all subsequent new orders were treated as old and skipped permanently.

3. **Web Audio Autoplay Policy & AudioContext Suspension**:
   - `PlayNotificationSound.js` initialized `new AudioContext()` on demand without verifying `ctx.state` or awaiting `ctx.resume()`.
   - Browsers block or suspend AudioContext when not initialized or resumed through an active user gesture (such as a click or keydown).

4. **Disconnected Orders Table UI**:
   - `AllOrdersTable.js` relied on TanStack React Query without a refetch interval. Even when an order arrived, the table view never updated until the user manually refreshed the entire browser tab.

---

## 2. Architecture & Detailed Design

```
+-----------------------------------------------------------------------+
| Browser / Admin Panel Client                                          |
|                                                                       |
|  [User Interaction]                                                   |
|         |                                                             |
|         v                                                             |
|  [Audio Unlocker] ---> Shared AudioContext (resumed)                  |
|                                                                       |
|  [OrderNotificationPoller (every 5s)]                                 |
|         |                                                             |
|         +---> GET /order?paginate=10&page=1&_t=Date.now()             |
|         |     Headers: Cache-Control: no-cache, no-store               |
|         |                                                             |
|  [Response Evaluation]                                                |
|         |                                                             |
|         +-- if new order id > last_seen_order_id:                     |
|                   |                                                   |
|                   +---> 1. Play Siren Alert (Shared AudioContext)     |
|                   +---> 2. Trigger Desktop Notification (Web API)     |
|                   +---> 3. Display Toast Notification (Sonner)        |
|                   +---> 4. Invalidate React Query Cache:              |
|                             - queryClient.invalidateQueries('/order') |
|                             - queryClient.invalidateQueries('/notifications')
|                   +---> 5. Update last_seen_order_id in LocalStorage  |
|                                                                       |
|  [AllOrdersTable Component]                                           |
|         ^                                                             |
|         | (React Query automatically re-fetches orders)               |
+---------+-------------------------------------------------------------+
```

### Component Details

#### A. Request & Cache-Busting (`OrderNotificationPoller.js`)
- Request parameters will include `_t: Date.now()` to force unique request URLs on every poll tick.
- Request headers will explicitly include:
  ```javascript
  headers: {
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0"
  }
  ```
- Polling frequency set to 5 seconds with an active ref check (`isFetchingRef`) to prevent overlapping concurrent requests.

#### B. Order Identification & Tracking
- Track `last_seen_order_id` in `localStorage` based on the database primary key `id` (integer) rather than `order_number`.
- Initial mount behavior:
  - If `localStorage.getItem("last_seen_order_id")` is empty, read the highest `id` from the initial fetch and store it silently without firing alerts. This prevents siren blasting upon logging in or opening a tab.
  - If `localStorage.getItem("last_seen_order_id")` exists, check if `latestOrder.id > storedId`.
  - When new orders are detected, update `last_seen_order_id` to `latestOrder.id`.

#### C. Audio Context Unlocker & Siren Playback (`PlayNotificationSound.js`)
- Implement a singleton audio context manager:
  ```javascript
  let sharedAudioCtx = null;
  export const getAudioContext = () => { ... }
  ```
- Add a one-time global window interaction listener (`click`, `keydown`, `touchstart`, `pointerdown`) that calls `ctx.resume()`.
- In `playNotificationSound()`:
  - Acquire the shared context.
  - If `sharedAudioCtx.state === 'suspended'`, invoke `sharedAudioCtx.resume()`.
  - Play the multi-frequency siren sweep tone.

#### D. TanStack React Query Cache Invalidation
- Inject `useQueryClient()` into `OrderNotificationPoller`.
- Whenever a new order is detected:
  - Invalidate order list queries: `queryClient.invalidateQueries([OrderAPI])`.
  - Invalidate notifications query: `queryClient.invalidateQueries(['NotificationsAPI'])`.
  - Invalidate badge counts query: `queryClient.invalidateQueries([BadgeApi])`.
- This ensures all open views (Orders table, dashboard recent orders, header notification bell, sidebar badge counters) immediately refresh their data in the background without a browser page reload.

---

## 3. Error Handling & Edge Cases

1. **Authentication Expiry**: If `cookies.uat` is cleared or expired, stop polling immediately to prevent 401 request spam.
2. **Network Interruption**: Catch fetch errors defensively in the polling loop and log a warning; allow the interval timer to continue without unhandled promise rejections.
3. **Background Tab Throttling**: Chrome may throttle timers in background tabs to 1-minute intervals. The poller will catch all orders created while backgrounded on its very next active tick.
4. **Desktop Notifications Disabled**: Check `Notification.permission === "granted"`. If denied or dismissed, silently continue with Sonner toast and sound alert without crashing.

---

## 4. Verification Plan

1. **Cache Verification**: Inspect network tab in browser developer tools to verify that every 5-second polling request sends `_t` timestamp and returns HTTP 200 (not 304 or disk cache).
2. **Sound Verification**: Verify siren sounds properly on first order arrival after clicking on the admin panel.
3. **Table Auto-Refresh**: Place a new order from POS or consumer site while viewing `/order` page and verify that the table row updates dynamically without pressing F5.
4. **Toast & Desktop Notification**: Verify that Sonner toast pops up at the top-right and native desktop notification triggers.
