import React, { useEffect, useRef } from "react";
import { useCookies } from "react-cookie";
import request from "../../Utils/AxiosUtils";
import { OrderAPI } from "../../Utils/AxiosUtils/API";

const OrderNotificationPoller = () => {
  const [cookies] = useCookies(["uat"]);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    // 1. Request notification permission on mount
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, []);

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
          // Sort to ensure the newest order (highest id or order_number) is evaluated
          const sortedOrders = [...orders].sort((a, b) => b.id - a.id);
          const latestOrder = sortedOrders[0];
          const latestOrderNumber = latestOrder?.order_number;

          if (latestOrderNumber) {
            const storedLatest = localStorage.getItem("latest_order_number");
            
            if (storedLatest) {
              const storedNumVal = parseInt(storedLatest, 10);
              const newNumVal = parseInt(latestOrderNumber, 10);
              
              if (!isNaN(newNumVal) && !isNaN(storedNumVal) && newNumVal > storedNumVal) {
                if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
                  new Notification("New Order Placed", {
                    body: `Order #${latestOrderNumber} has been received.`,
                    icon: "/assets/images/favicon.png",
                  });
                }
                localStorage.setItem("latest_order_number", latestOrderNumber.toString());
              } else if (isNaN(newNumVal) && latestOrderNumber.toString() !== storedLatest.toString()) {
                // Fallback for non-numeric order numbers: just check inequality
                if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
                  new Notification("New Order Placed", {
                    body: `Order #${latestOrderNumber} has been received.`,
                    icon: "/assets/images/favicon.png",
                  });
                }
                localStorage.setItem("latest_order_number", latestOrderNumber.toString());
              }
            } else {
              // Initial load: save the current latest order number to localStorage without notifying
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

    // Run check immediately on mount/auth change
    checkForNewOrders();

    // Poll every 5 seconds (5000ms)
    const interval = setInterval(checkForNewOrders, 5000);

    return () => clearInterval(interval);
  }, [cookies.uat]);

  return null;
};

export default OrderNotificationPoller;
