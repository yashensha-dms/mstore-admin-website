"use client";
import React, { useEffect, useRef } from "react";
import { useCookies } from "react-cookie";
import { toast } from "sonner";
import request from "../../Utils/AxiosUtils";
import { OrderAPI } from "../../Utils/AxiosUtils/API";

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
      {/* Animated icon */}
      <div className="order-toast-icon-ring">🛒</div>

      {/* Body */}
      <div className="order-toast-body">
        <p className="order-toast-title">New Order Received!</p>
        <p className="order-toast-sub">A customer just placed an order on your store.</p>

        {/* Order badge */}
        <span className="order-toast-badge">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <circle cx="5" cy="5" r="4" stroke="#172B4D" strokeWidth="1.5"/>
            <path d="M5 3v2.5l1.5 1" stroke="#172B4D" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          Order #{orderNumber}
        </span>

        {/* Actions */}
        <div className="order-toast-actions">
          <button
            className="order-toast-btn-primary"
            onClick={onView}
          >
            View Orders
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M2 5.5h7M6.5 3l3 2.5-3 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* Live indicator */}
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
  const isFetchingRef = useRef(false);

  useEffect(() => {
    if (!cookies.uat) return;

    const checkForNewOrders = async () => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      try {
        const response = await request({
          url: OrderAPI,
          method: "get",
          params: { paginate: 10, page: 1, sort: "desc", field: "created_at" }
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
          const sortedOrders = [...orders].sort((a, b) => b.id - a.id);
          const latestOrder = sortedOrders[0];
          const latestOrderNumber = latestOrder?.order_number;

          if (latestOrderNumber) {
            const storedLatest = localStorage.getItem("latest_order_number");

            if (storedLatest) {
              const storedNumVal = parseInt(storedLatest, 10);
              const newNumVal = parseInt(latestOrderNumber, 10);

              const isNewOrder =
                (!isNaN(newNumVal) && !isNaN(storedNumVal) && newNumVal > storedNumVal) ||
                (isNaN(newNumVal) && latestOrderNumber.toString() !== storedLatest.toString());

              if (isNewOrder) {
                // Detect current locale from pathname (e.g. /en/... -> "en")
                const pathParts = window.location.pathname.split("/").filter(Boolean);
                const lng = pathParts[0] || "en";

                const toastId = `order-${latestOrderNumber}`;

                import("../../Utils/CustomFunctions/PlayNotificationSound").then((mod) => {
                  mod.playNotificationSound();
                });

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

                localStorage.setItem("latest_order_number", latestOrderNumber.toString());
              }
            } else {
              // Initial load — store silently, no toast
              localStorage.setItem("latest_order_number", latestOrderNumber.toString());
            }
          }
        }
      } catch (err) {
        console.error("Error checking for new orders:", err);
      } finally {
        isFetchingRef.current = false;
      }
    };

    // Run immediately on mount/auth change
    checkForNewOrders();

    // Poll every 5 seconds
    const interval = setInterval(checkForNewOrders, 5000);

    return () => clearInterval(interval);
  }, [cookies.uat]);

  return null;
};

export default OrderNotificationPoller;
