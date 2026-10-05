"use client";
import React, { useState, useEffect } from "react";
import * as Toast from "@radix-ui/react-toast";
import {
  RiCheckLine,
  RiCloseLine,
  RiErrorWarningLine,
  RiInformationLine,
} from "react-icons/ri";
import { registerToastContainer } from "../../Utils/CustomFunctions/ToastNotification";

const RadixToastContainer = () => {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    // Register the helper function to push toasts into our local state
    registerToastContainer(({ type, message }) => {
      const id = String(Date.now());
      setToasts((prev) => [...prev, { id, type, message }]);
    });
  }, []);

  const getToastStyles = (type) => {
    switch (type) {
      case "success":
        return {
          icon: <RiCheckLine className="w-5 h-5 text-emerald-600" />,
          borderColor: "border-l-4 border-l-emerald-500",
          bgColor: "bg-white/90",
        };
      case "error":
        return {
          icon: <RiErrorWarningLine className="w-5 h-5 text-red-600" />,
          borderColor: "border-l-4 border-l-red-500",
          bgColor: "bg-white/90",
        };
      case "warn":
        return {
          icon: <RiErrorWarningLine className="w-5 h-5 text-amber-500" />,
          borderColor: "border-l-4 border-l-amber-500",
          bgColor: "bg-white/90",
        };
      case "info":
        return {
          icon: <RiInformationLine className="w-5 h-5 text-blue-500" />,
          borderColor: "border-l-4 border-l-blue-500",
          bgColor: "bg-white/90",
        };
      default:
        return {
          icon: <RiInformationLine className="w-5 h-5 text-slate-500" />,
          borderColor: "border-l-4 border-l-slate-400",
          bgColor: "bg-white/90",
        };
    }
  };

  return (
    <Toast.Provider swipeDirection="right">
      <style dangerouslySetInnerHTML={{ __html: `
        .radix-toast-viewport {
          position: fixed;
          bottom: 0;
          right: 0;
          display: flex;
          flex-direction: column;
          padding: 24px;
          gap: 12px;
          width: 390px;
          max-width: 100vw;
          margin: 0;
          list-style: none;
          z-index: 99999;
          outline: none;
        }
        
        .radix-toast-root {
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(226, 232, 240, 0.8);
          border-radius: 12px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -4px rgba(0, 0, 0, 0.05);
          padding: 16px;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          position: relative;
          transition: all 0.2s ease-in-out;
        }

        .radix-toast-root[data-state='open'] {
          animation: slideIn 150ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        .radix-toast-root[data-state='closed'] {
          animation: hide 100ms ease-in;
        }
        .radix-toast-root[data-state='move'] {
          transform: translateX(var(--radix-toast-swipe-move-x));
        }
        .radix-toast-root[data-state='cancel'] {
          transform: translateX(0);
          transition: transform 200ms ease-out;
        }
        .radix-toast-root[data-state='end'] {
          animation: swipeOut 100ms ease-out;
        }

        @keyframes slideIn {
          from { transform: translateX(calc(100% + 24px)); }
          to { transform: translateX(0); }
        }

        @keyframes hide {
          from { opacity: 1; }
          to { opacity: 0; }
        }

        @keyframes swipeOut {
          from { transform: translateX(var(--radix-toast-swipe-end-x)); }
          to { transform: translateX(calc(100% + 24px)); }
        }
      `}} />

      {toasts.map(({ id, type, message }) => {
        const styles = getToastStyles(type);
        return (
          <Toast.Root
            key={id}
            className={`radix-toast-root ${styles.bgColor} ${styles.borderColor}`}
            duration={4000}
            onOpenChange={(open) => {
              if (!open) {
                setTimeout(() => {
                  setToasts((prev) => prev.filter((t) => t.id !== id));
                }, 100);
              }
            }}
          >
            <div className="flex-shrink-0 pt-0.5">{styles.icon}</div>
            
            <div className="flex-1 min-w-0 pr-4">
              <Toast.Title className="text-sm font-semibold text-slate-800 capitalize leading-tight">
                {type}
              </Toast.Title>
              <Toast.Description className="mt-1 text-sm text-slate-600 leading-normal break-words">
                {message}
              </Toast.Description>
            </div>

            <Toast.Close asChild>
              <button className="absolute top-3.5 right-3.5 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors duration-150">
                <RiCloseLine className="w-4 h-4" />
              </button>
            </Toast.Close>
          </Toast.Root>
        );
      })}

      <Toast.Viewport className="radix-toast-viewport" />
    </Toast.Provider>
  );
};

export default RadixToastContainer;
