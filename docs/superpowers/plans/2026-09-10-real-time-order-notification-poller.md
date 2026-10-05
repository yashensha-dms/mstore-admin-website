# Real-Time Order Notification & Siren Alert Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore real-time order notifications, desktop alerts, and audible sirens in the admin panel by eliminating HTTP browser cache traps, adding Web Audio API gesture unlocking, tracking auto-incrementing order IDs, and auto-refreshing React Query tables and badges on new order arrival without requiring manual page refresh.

**Architecture:** A client-side poller in `nextjs-fastkart-admin` running every 5 seconds that sends dynamic cache-busting headers (`_t` and `Cache-Control: no-cache`), evaluates incoming order primary keys against `last_seen_order_id`, plays siren tones through a gesture-unlocked shared `AudioContext`, issues desktop/toast notifications, and immediately invalidates TanStack React Query caches (`/order`, `/notifications`, `BadgeApi`).

**Tech Stack:** Next.js 13+ App Router, React 18, TanStack React Query, Sonner Toast, Web Audio API, HTML5 Desktop Notification API, Axios.

## Global Constraints
- No server or database schema changes required.
- Do not alert on initial page load / mount; silently record current latest order ID.
- Maintain existing audio sweep pattern and Sonner toast styling.
- Prevent duplicate/overlapping fetch requests during active network latency.

---

### Task 1: Singleton AudioContext with User Gesture Unlocker

**Files:**
- Modify: `src/Utils/CustomFunctions/PlayNotificationSound.js`

**Interfaces:**
- Produces: `export const playNotificationSound: () => Promise<void>`
- Produces: `export const unlockAudioContext: () => Promise<void>`

- [ ] **Step 1: Update PlayNotificationSound.js with AudioContext singleton and unlocker**

```javascript
/**
 * Plays a distinct, highly noticeable siren alert sound using the Web Audio API.
 * Frequency sweeps up and down to create a siren tone that catches attention.
 * Uses a singleton AudioContext and unlocks on initial user interaction.
 */

let sharedAudioCtx = null;
let unlockListenerAttached = false;

export const getAudioContext = () => {
  if (typeof window === "undefined") return null;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;

  if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
    sharedAudioCtx = new AudioContext();
  }
  return sharedAudioCtx;
};

export const unlockAudioContext = async () => {
  const ctx = getAudioContext();
  if (ctx && ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch (err) {
      console.warn("Could not resume AudioContext:", err);
    }
  }
};

// Automatically attach unlock listeners once in the browser
if (typeof window !== "undefined" && !unlockListenerAttached) {
  const handleInteraction = () => {
    unlockAudioContext();
    ["click", "keydown", "pointerdown", "touchstart"].forEach((evt) => {
      window.removeEventListener(evt, handleInteraction);
    });
  };

  ["click", "keydown", "pointerdown", "touchstart"].forEach((evt) => {
    window.addEventListener(evt, handleInteraction, { once: true, passive: true });
  });
  unlockListenerAttached = true;
}

export const playNotificationSound = async () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    // Square wave has maximum harmonic energy, making it the loudest wave type
    osc.type = "square";

    const startTime = ctx.currentTime;
    const duration = 2.4; // Total duration of the siren (seconds)
    const cycleTime = 0.6; // Time for one full up-down sweep cycle (0.6s)

    // Set starting frequency (500Hz)
    osc.frequency.setValueAtTime(500, startTime);

    // Create rising and falling frequency sweeps
    for (let t = 0; t < duration; t += cycleTime) {
      if (startTime + t + cycleTime / 2 < startTime + duration) {
        osc.frequency.linearRampToValueAtTime(900, startTime + t + cycleTime / 2);
      }
      if (startTime + t + cycleTime < startTime + duration) {
        osc.frequency.linearRampToValueAtTime(500, startTime + t + cycleTime);
      }
    }

    // Set extreme gain for maximum hardware output volume with digital distortion
    gainNode.gain.setValueAtTime(50.0, startTime);
    gainNode.gain.setValueAtTime(50.0, startTime + duration - 0.25);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(startTime + duration);
  } catch (error) {
    console.warn("Failed to play notification siren sound:", error);
  }
};
```

- [ ] **Step 2: Verify lint and compilation**

Run: `npm run build` or lint check in `nextjs-fastkart-admin`
Expected: Passes without syntax or module resolution errors.

- [ ] **Step 3: Commit**

```bash
git add src/Utils/CustomFunctions/PlayNotificationSound.js
git commit -m "fix(audio): implement singleton AudioContext with user gesture unlocking"
```

---

### Task 2: Harden OrderNotificationPoller with Cache-Busting, ID Tracking, and React Query Invalidation

**Files:**
- Modify: `src/Components/CommonComponent/OrderNotificationPoller.js`

**Interfaces:**
- Consumes: `PlayNotificationSound.js` (`playNotificationSound`)
- Consumes: `@tanstack/react-query` (`useQueryClient`)
- Produces: Dispatches window event `new-order-received` and invalidates React Query keys `[OrderAPI]`, `['NotificationsAPI']`, `[BadgeApi]`

- [ ] **Step 1: Update OrderNotificationPoller.js**

Implement:
1. Cache-busting: `_t: Date.now()` in query params and no-cache headers.
2. Order tracking by primary key `id` (`last_seen_order_id`).
3. Query invalidation via `queryClient.invalidateQueries`.
4. Window event dispatch `new-order-received`.
5. Desktop notification permission check with graceful fallback.

```javascript
"use client";
import React, { useEffect, useRef } from "react";
import { useCookies } from "react-cookie";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import request from "../../Utils/AxiosUtils";
import { OrderAPI, NotificationsAPI, BadgeApi } from "../../Utils/AxiosUtils/API";

// Primary brand color
const PRIMARY = "#172B4D";

/**
 * Rich order toast content rendered as a JSX node.
 * Sonner accepts any React node as the first argument.
 */
const OrderToastContent = ({ orderNumber, onView }) => (
  <>
    <style>{`
      .order-toast-wrap {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        width: 100%;
      }
      .order-toast-icon-ring {
        flex-shrink: 0;
        width: 42px;
        height: 42px;
        border-radius: 50%;
        background: linear-gradient(135deg, #172B4D 0%, #2a4a8a 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(23,43,77,0.35);
        font-size: 20px;
        position: relative;
      }
      .order-toast-icon-ring::after {
        content: '';
        position: absolute;
        inset: -3px;
        border-radius: 50%;
        border: 2px solid rgba(23,43,77,0.15);
        animation: pulse-ring 2s ease-out infinite;
      }
      @keyframes pulse-ring {
        0%   { transform: scale(0.9); opacity: 1; }
        70%  { transform: scale(1.2); opacity: 0; }
        100% { transform: scale(1.2); opacity: 0; }
      }
      .order-toast-body {
        flex: 1;
        min-width: 0;
      }
      .order-toast-title {
        font-size: 13.5px;
        font-weight: 700;
        color: #0f1f38;
        margin: 0 0 2px;
        line-height: 1.3;
      }
      .order-toast-sub {
        font-size: 12px;
        color: #64748b;
        margin: 0 0 10px;
        line-height: 1.4;
      }
      .order-toast-badge {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-size: 11px;
        font-weight: 600;
        color: #172B4D;
        background: rgba(23,43,77,0.08);
        border: 1px solid rgba(23,43,77,0.15);
        border-radius: 20px;
        padding: 2px 8px;
        margin-bottom: 10px;
        letter-spacing: 0.02em;
      }
      .order-toast-actions {
        display: flex;
        gap: 8px;
        align-items: center;
      }
      .order-toast-btn-primary {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 6px 14px;
        border-radius: 7px;
        font-size: 12px;
        font-weight: 600;
        background: #172B4D;
        color: #fff;
        border: none;
        cursor: pointer;
        text-decoration: none;
        transition: background 0.18s ease, transform 0.12s ease;
        box-shadow: 0 2px 8px rgba(23,43,77,0.3);
        letter-spacing: 0.01em;
      }
      .order-toast-btn-primary:hover {
        background: #1e3a6e;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(23,43,77,0.4);
        color: #fff;
      }
      .order-toast-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #22c55e;
        box-shadow: 0 0 0 2px rgba(34,197,94,0.25);
        flex-shrink: 0;
      }
      .order-toast-live-label {
        font-size: 10.5px;
        color: #22c55e;
        font-weight: 600;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
    `}</style>

    <div className="order-toast-wrap">
      <div className="order-toast-icon-ring">🛒</div>

      <div className="order-toast-body">
        <p className="order-toast-title">New Order Received!</p>
        <p className="order-toast-sub">A customer just placed an order on your store.</p>

        <span className="order-toast-badge">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <circle cx="5" cy="5" r="4" stroke="#172B4D" strokeWidth="1.5" />
            <path d="M5 3v2.5l1.5 1" stroke="#172B4D" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          Order #{orderNumber}
        </span>

        <div className="order-toast-actions">
          <button className="order-toast-btn-primary" onClick={onView}>
            View Orders
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path
                d="M2 5.5h7M6.5 3l3 2.5-3 2.5"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span className="order-toast-dot" />
            <span className="order-toast-live-label">Live</span>
          </span>
        </div>
      </div>
    </div>
  </>
);

const OrderNotificationPoller = () => {
  const [cookies] = useCookies(["uat"]);
  const queryClient = useQueryClient();
  const isFetchingRef = useRef(false);

  useEffect(() => {
    if (!cookies.uat) return;

    // Request browser notification permission if not already decided
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch((err) =>
        console.error("Error requesting notification permission:", err)
      );
    }

    const checkForNewOrders = async () => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      try {
        // Cache-busting parameters and headers
        const response = await request({
          url: OrderAPI,
          method: "get",
          params: {
            paginate: 10,
            page: 1,
            sort: "desc",
            field: "created_at",
            _t: Date.now(), // Forces bypass of browser/proxy cache
          },
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        });

        const responseData = response?.data;
        let orders = [];
        if (responseData) {
          if (Array.isArray(responseData)) {
            orders = responseData;
          } else if (responseData.data && Array.isArray(responseData.data)) {
            orders = responseData.data;
          } else if (responseData.data?.data && Array.isArray(responseData.data.data)) {
            orders = responseData.data.data;
          }
        }

        if (orders.length > 0) {
          // Sort by database primary key ID descending
          const sortedOrders = [...orders].sort((a, b) => (b.id || 0) - (a.id || 0));
          const latestOrder = sortedOrders[0];
          const latestId = latestOrder?.id;
          const latestOrderNumber = latestOrder?.order_number || latestId;

          if (latestId) {
            const storedIdStr = localStorage.getItem("last_seen_order_id");

            if (storedIdStr) {
              const storedId = parseInt(storedIdStr, 10);
              const currentId = parseInt(latestId, 10);

              const isNewOrder = !isNaN(currentId) && !isNaN(storedId) ? currentId > storedId : false;

              if (isNewOrder) {
                const pathParts = window.location.pathname.split("/").filter(Boolean);
                const lng = pathParts[0] || "en";
                const toastId = `order-${latestOrderNumber}`;

                // 1. Play siren alert
                import("../../Utils/CustomFunctions/PlayNotificationSound").then((mod) => {
                  mod.playNotificationSound();
                });

                // 2. Desktop notification
                if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
                  try {
                    const notification = new Notification("New Order Received!", {
                      body: `Order #${latestOrderNumber} has been placed.`,
                      icon: "/assets/images/logo/logo.png",
                    });
                    notification.onclick = () => {
                      window.focus();
                      window.location.href = `/${lng}/order`;
                    };
                  } catch (e) {
                    console.error("Failed to create browser notification:", e);
                  }
                }

                // 3. Sonner toast
                toast(
                  <OrderToastContent
                    orderNumber={latestOrderNumber}
                    onView={() => {
                      toast.dismiss(toastId);
                      window.location.href = `/${lng}/order`;
                    }}
                  />,
                  {
                    id: toastId,
                    duration: 10000,
                    position: "top-right",
                    unstyled: false,
                    style: {
                      padding: "14px 16px",
                      borderRadius: "14px",
                      border: "1px solid rgba(23,43,77,0.15)",
                      background: "#fff",
                      boxShadow: "0 8px 30px rgba(23,43,77,0.12), 0 2px 8px rgba(0,0,0,0.06)",
                      minWidth: "320px",
                      maxWidth: "360px",
                    },
                  }
                );

                // 4. Invalidate React Query caches so tables and badges update automatically without refresh
                try {
                  queryClient.invalidateQueries([OrderAPI]);
                  queryClient.invalidateQueries(["NotificationsAPI"]);
                  queryClient.invalidateQueries([BadgeApi]);
                } catch (qErr) {
                  console.warn("Could not invalidate queries:", qErr);
                }

                // 5. Dispatch window event for custom page-level listeners
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("new-order-received", { detail: latestOrder }));
                }

                // 6. Update local storage pointer
                localStorage.setItem("last_seen_order_id", currentId.toString());
              }
            } else {
              // Initial load — establish baseline without alerting
              localStorage.setItem("last_seen_order_id", latestId.toString());
            }
          }
        }
      } catch (err) {
        console.error("Error checking for new orders:", err);
      } finally {
        isFetchingRef.current = false;
      }
    };

    // Run immediately on mount / auth change
    checkForNewOrders();

    // Poll every 5 seconds
    const interval = setInterval(checkForNewOrders, 5000);

    return () => clearInterval(interval);
  }, [cookies.uat, queryClient]);

  return null;
};

export default OrderNotificationPoller;
```

- [ ] **Step 2: Verify syntax and linting**

Run: `npm run lint` or check file diagnostics.

- [ ] **Step 3: Commit**

```bash
git add src/Components/CommonComponent/OrderNotificationPoller.js
git commit -m "fix(poller): add cache-busting, primary key tracking, and React Query invalidation"
```

---

### Task 3: Hook AllOrdersTable into New Order Event

**Files:**
- Modify: `src/Components/Orders/AllOrdersTable.js`

**Interfaces:**
- Consumes: Window event `new-order-received`
- Action: Calls `refetch()` when event fires if user is on page 1

- [ ] **Step 1: Add event listener to AllOrdersTable**

In `AllOrdersTable.js`, add a `useEffect`:
```javascript
  useEffect(() => {
    const handleNewOrder = () => {
      // If user is on first page without search filter, refresh table to show latest order
      if (page === 1 && !search) {
        refetch();
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener("new-order-received", handleNewOrder);
      return () => window.removeEventListener("new-order-received", handleNewOrder);
    }
  }, [page, search, refetch]);
```

- [ ] **Step 2: Verify syntax and linting**

- [ ] **Step 3: Commit**

```bash
git add src/Components/Orders/AllOrdersTable.js
git commit -m "feat(orders): live refetch orders table on new-order-received event"
```

---

### Task 4: End-to-End Build and Verification

- [ ] **Step 1: Test Next.js build**

Run: `npm run build` in `d:\Work\NEWECOM\mstore\nextjs-fastkart-admin`
Expected: Build succeeds with 0 errors.

- [ ] **Step 2: Commit any remaining changes**
