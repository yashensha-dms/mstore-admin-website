import React, { useContext } from "react";
import { Button } from "reactstrap";
import I18NextContext from "@/Helper/I18NextContext";
import { useTranslation } from "@/app/i18n/client";

const Btn = (props) => {
  const { i18Lang } = useContext(I18NextContext);
  const { t } = useTranslation(i18Lang, 'common');
  
  // Custom button formatting inspired by Radix UI Themes buttons
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        /* Radix Button Style Overrides */
        .btn-theme, .btn-primary, button.btn-theme, button.btn-primary {
          background-color: var(--theme-color, #172B4D) !important;
          border-color: var(--theme-color, #172B4D) !important;
          color: #ffffff !important;
          border-radius: 8px !important;
          font-weight: 500 !important;
          font-size: 14px !important;
          padding: 8px 16px !important;
          transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1) !important;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05) !important;
          cursor: pointer;
        }

        .btn-theme:hover, .btn-primary:hover, button.btn-theme:hover, button.btn-primary:hover {
          background-color: #0f1d35 !important; /* Slightly darker navy */
          border-color: #0f1d35 !important;
          color: #ffffff !important;
          transform: translateY(-0.5px);
          box-shadow: 0 4px 6px -1px rgba(23, 43, 77, 0.2), 0 2px 4px -2px rgba(23, 43, 77, 0.2) !important;
        }

        .btn-theme:active, .btn-primary:active, button.btn-theme:active, button.btn-primary:active {
          transform: translateY(0.5px) scale(0.98);
        }

        .btn-outline, button.btn-outline {
          border: 1px solid #e2e8f0 !important;
          background-color: #ffffff !important;
          color: #475569 !important;
          border-radius: 8px !important;
          font-weight: 500 !important;
          font-size: 14px !important;
          padding: 8px 16px !important;
          transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1) !important;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05) !important;
          cursor: pointer;
        }

        .btn-outline:hover, button.btn-outline:hover {
          background-color: #f8fafc !important;
          border-color: #cbd5e1 !important;
          color: #1e293b !important;
        }

        /* Loading Spinner inside Radix Button */
        .radix-btn-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid currentColor;
          border-top-color: transparent;
          border-radius: 50%;
          animation: radix-spinner-spin 0.6s linear infinite;
          margin-right: 8px;
        }

        @keyframes radix-spinner-spin {
          to { transform: rotate(360deg); }
        }
      `}} />

      <Button {...props}>
        <div className={`d-flex align-items-center justify-content-center position-relative${props.loading ? " spinning" : ""}`}>
          {props.loading ? <div className="radix-btn-spinner" /> : null}
          {props.children}
          {t(props.title)}
        </div>
      </Button>
    </>
  );
};
export default Btn;
