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
  RefreshCw,
  HardDrive,
} from "lucide-react";
import request from "../../Utils/AxiosUtils";
import { syncCloudinaryAttachment } from "../../Utils/AxiosUtils/API";
import { ToastNotification } from "../../Utils/CustomFunctions/ToastNotification";

const BATCH_LIMIT = 15;

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

    try {
      while (hasMore && isRunningRef.current && !isPausedRef.current) {
        const res = await request({
          url: syncCloudinaryAttachment,
          data: {
            limit: 10,
            delete_dead: false,
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
            setLogs((prev) => [...prev, ...data.log].slice(-120)); // keep last 120
          }

          if (!data.has_more || data.processed_count === 0) {
            hasMore = false;
            setIsComplete(true);
          }
        } else if (res?.data && res.data.success === false) {
          setLogs((prev) => [
            ...prev,
            {
              id: "error",
              name: "Server Message",
              status: "failed",
              reason: res.data.message || "Unprocessable response",
            },
          ]);
          ToastNotification("error", res.data.message || "Batch request stopped");
          hasMore = false;
        } else {
          throw new Error(res?.data?.message || "Batch request failed");
        }
      }
    } catch (err) {
      setLogs((prev) => [
        ...prev,
        {
          id: "error",
          name: "Connection Error",
          status: "failed",
          reason: err.message || "Failed to reach endpoint",
        },
      ]);
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
      if (!window.confirm("Migration is currently in progress. Stop and close?")) {
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
                  Downloads live images into local storage with identical IDs & removes dead links.
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
