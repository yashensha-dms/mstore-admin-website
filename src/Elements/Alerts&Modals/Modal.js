"use client";
import React, { useContext, useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import I18NextContext from "@/Helper/I18NextContext";
import { useTranslation } from "@/app/i18n/client";

const ShowModal = ({ open = false, buttons, title, close = true, modalAttr, setModal, ...props }) => {
  const [isOpen, setIsOpen] = useState(open);
  const { i18Lang } = useContext(I18NextContext);
  const { t } = useTranslation(i18Lang, 'common');

  useEffect(() => {
    setIsOpen(open);
  }, [open]);

  const handleOpenChange = (val) => {
    setIsOpen(val);
    if (!val && setModal) {
      setModal(false);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        {/* Premium dialog style overrides */}
        <style dangerouslySetInnerHTML={{ __html: `
          .radix-dialog-overlay {
            background-color: rgba(15, 23, 42, 0.4);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            position: fixed;
            inset: 0;
            z-index: 9999;
            animation: overlayShow 200ms cubic-bezier(0.16, 1, 0.3, 1);
          }
          
          .radix-dialog-content {
            background-color: white;
            border-radius: 24px;
            box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.15), 0 0 0 1px rgba(15, 23, 42, 0.05);
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 90vw;
            max-width: 420px;
            max-height: 85vh;
            padding: 40px 36px;
            z-index: 10000;
            overflow-y: auto;
            animation: contentShow 200ms cubic-bezier(0.16, 1, 0.3, 1);
            outline: none;
          }

          /* Support larger modals */
          .radix-dialog-content.media-modal,
          .radix-dialog-content.modal-xl {
            max-width: 1200px !important;
            width: 95vw !important;
            padding: 24px 32px !important;
          }

          .radix-dialog-content.modal-lg {
            max-width: 800px !important;
            width: 90vw !important;
            padding: 24px 32px !important;
          }
          
          @keyframes overlayShow {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes contentShow {
            from { opacity: 0; transform: translate(-50%, -47%) scale(0.95); }
            to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          }

          /* Overriding remove-box classes for premium aesthetic */
          .remove-box {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
          }

          .remove-box .icon-box {
            width: 72px;
            height: 72px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px !important;
            transition: all 0.3s ease;
          }

          /* Deletion specific icon container */
          .remove-box svg[class*="Trash"], .remove-box .ri-delete-bin-line {
            color: #ef4444 !important;
            background-color: #fef2f2;
            border: 1px solid #fee2e2;
            padding: 18px;
            border-radius: 50%;
            width: 72px;
            height: 72px;
          }

          /* Confirmation/Warning specific icon container */
          .remove-box svg.wo-bg, .remove-box .ri-question-line, .remove-box svg[class*="Help"], .remove-box svg[class*="Alert"] {
            color: #d97706 !important; /* Darker amber for contrast */
            background-color: #fffbeb;
            border: 1px solid #fef3c7;
            padding: 18px;
            border-radius: 50%;
            width: 72px;
            height: 72px;
          }

          .remove-box h2, .remove-box h5 {
            font-size: 22px !important;
            font-weight: 700 !important;
            color: #0f172a !important;
            margin-top: 20px !important;
            margin-bottom: 12px !important;
            letter-spacing: -0.025em !important;
          }

          .remove-box p {
            font-size: 15px !important;
            color: #64748b !important;
            line-height: 1.6 !important;
            margin-bottom: 0 !important;
            max-width: 320px !important;
          }

          /* Custom Button Styling */
          .radix-dialog-content .btn--no {
            border: 1px solid #e2e8f0 !important;
            background-color: #ffffff !important;
            color: #475569 !important;
            font-weight: 600 !important;
            padding: 10px 24px !important;
            border-radius: 10px !important;
            font-size: 14px !important;
            transition: all 0.15s ease;
            box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
            cursor: pointer;
            min-width: 100px;
          }
          .radix-dialog-content .btn--no:hover {
            background-color: #f8fafc !important;
            border-color: #cbd5e1 !important;
            color: #1e293b !important;
          }

          /* Default Confirmation button (e.g. status) uses primary slate color */
          .radix-dialog-content .btn-theme, .radix-dialog-content .btn-primary {
            background-color: var(--theme-color, #4a5568) !important;
            border: 1px solid var(--theme-color, #4a5568) !important;
            color: #ffffff !important;
            font-weight: 600 !important;
            padding: 10px 24px !important;
            border-radius: 10px !important;
            font-size: 14px !important;
            transition: all 0.15s ease;
            box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
            cursor: pointer;
            min-width: 100px;
          }
          .radix-dialog-content .btn-theme:hover, .radix-dialog-content .btn-primary:hover {
            background-color: #334155 !important;
            border-color: #334155 !important;
          }

          /* Destructive Delete button uses red color */
          .radix-dialog-content:has(svg[class*="Trash"]) .btn-theme,
          .radix-dialog-content:has(svg[class*="Trash"]) .btn-primary {
            background-color: #ef4444 !important;
            border-color: #ef4444 !important;
          }
          .radix-dialog-content:has(svg[class*="Trash"]) .btn-theme:hover,
          .radix-dialog-content:has(svg[class*="Trash"]) .btn-primary:hover {
            background-color: #dc2626 !important;
            border-color: #dc2626 !important;
          }
        `}} />
        
        <Dialog.Overlay className="radix-dialog-overlay" />
        <Dialog.Content className={`radix-dialog-content ${modalAttr?.className || ""}`}>
          
          {/* Header */}
          {(title || close) && (
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <Dialog.Title className="text-lg font-bold text-slate-800 leading-tight">
                {title ? (title === "success" ? t("success") : title === "fail" ? t("Oops!") : t(title)) : ""}
              </Dialog.Title>
              {close && (
                <Dialog.Close asChild>
                  <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </Dialog.Close>
              )}
            </div>
          )}

          {/* Body */}
          <div className="text-sm text-slate-600 leading-relaxed">
            {props.children}
          </div>

          {/* Footer Buttons */}
          {buttons && (
            <div className="flex items-center justify-center gap-3 mt-6">
              {buttons}
            </div>
          )}

        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default ShowModal;
