"use client";
import React, { useContext, useState } from "react";
import Cookies from "js-cookie";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { User, LogOut, Settings, HelpCircle, ChevronDown } from "lucide-react";

import ShowModal from "../../Elements/Alerts&Modals/Modal";
import Btn from "../../Elements/Buttons/Btn";
import AccountContext from "../../Helper/AccountContext";
import { LogoutAPI } from "../../Utils/AxiosUtils/API";
import useCreate from "../../Utils/Hooks/useCreate";
import I18NextContext from "@/Helper/I18NextContext";
import { useTranslation } from "@/app/i18n/client";

const ProfileNav = () => {
  const { i18Lang } = useContext(I18NextContext);
  const { t } = useTranslation(i18Lang, 'common');
  const [modal, setModal] = useState(false);
  const router = useRouter();
  const { accountData, accountContextData } = useContext(AccountContext);
  
  const displayName = accountContextData.name !== "" ? accountContextData.name : (accountData?.name || "Admin");
  const displayRole = accountData ? accountData?.role?.name : t("Account");
  const initials = displayName.charAt(0).toUpperCase();

  const isStateData = (accountContextData.image && Object?.keys(accountContextData.image).length > 0) || accountContextData.image == "";
  const profileImage = isStateData ? accountContextData.image : accountData?.profile_image;
  const imageUrl = profileImage?.original_url;
  
  const { mutate, isLoading } = useCreate(LogoutAPI, false, false, "No", () => {
    Cookies.remove("uat");
    Cookies.remove("ue");
    Cookies.remove("account");
    localStorage.removeItem("account");
    localStorage.removeItem("role");
    router.push(`/auth/login`);
    setModal(false);
  });

  const handleLogout = () => {
    mutate({});
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        /* Premium Top Nav Styling Overrides */
        .page-header {
          background: rgba(255, 255, 255, 0.8) !important;
          backdrop-filter: blur(12px) !important;
          border-bottom: 1px solid rgba(226, 232, 240, 0.8) !important;
          box-shadow: 0 4px 20px -2px rgba(23, 43, 77, 0.04) !important;
          transition: all 0.3s ease;
        }

        .page-header .header-wrapper {
          padding: 10px 24px !important;
          background: transparent !important;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        /* Nav search trigger button */
        .header-search-btn {
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .header-search-btn:hover {
          background: #f1f5f9;
          color: #172B4D;
          border-color: #cbd5e1;
          transform: translateY(-1px);
        }

        /* Radix Profile Dropdown Content */
        .radix-profile-content {
          min-width: 220px;
          background-color: #ffffff;
          border-radius: 14px;
          padding: 8px;
          box-shadow: 0px 10px 30px -10px rgba(23, 43, 77, 0.15), 0px 10px 20px -15px rgba(23, 43, 77, 0.08);
          border: 1px solid #e2e8f0;
          z-index: 99999;
          animation: slideDownAndFade 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          margin-top: 10px;
        }

        .radix-profile-header {
          padding: 12px 14px;
          border-bottom: 1px solid #f1f5f9;
          margin-bottom: 6px;
        }

        .radix-profile-header-name {
          font-size: 14px;
          font-weight: 600;
          color: #172B4D;
          display: block;
        }

        .radix-profile-header-role {
          font-size: 11px;
          color: #64748b;
          display: block;
          margin-top: 2px;
          font-weight: 500;
        }

        .radix-profile-item {
          font-size: 13.5px;
          color: #475569;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-radius: 8px;
          cursor: pointer;
          user-select: none;
          outline: none;
          transition: all 0.15s ease;
          font-weight: 500;
        }

        .radix-profile-item:hover, .radix-profile-item:focus {
          background-color: #f1f5f9;
          color: #172B4D;
        }

        .radix-profile-item-danger {
          color: #ef4444;
        }

        .radix-profile-item-danger:hover, .radix-profile-item-danger:focus {
          background-color: #fef2f2;
          color: #dc2626;
        }

        .radix-profile-item a {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          color: inherit;
          text-decoration: none;
        }

        /* Premium Profile Trigger Capsule Layout */
        .profile-media-trigger {
          cursor: pointer;
          display: flex;
          align-items: center;
          outline: none;
          padding: 6px 14px 6px 8px;
          border-radius: 9999px;
          transition: all 200ms ease;
          user-select: none;
          border: 1px solid #e2e8f0;
          background-color: #f8fafc;
        }

        .profile-media-trigger:hover, 
        .profile-media-trigger[data-state="open"] {
          background-color: #f1f5f9;
          border-color: #cbd5e1;
        }

        /* Self-contained initials/image avatar */
        .profile-avatar-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #e2e8f0;
          border: 1px solid #cbd5e1;
          overflow: visible;
          flex-shrink: 0;
        }

        .profile-avatar-img {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
        }

        .profile-avatar-initials {
          font-size: 14px;
          font-weight: 700;
          color: #172B4D;
          user-select: none;
          line-height: 1;
        }

        .profile-avatar-status {
          position: absolute;
          bottom: -1px;
          right: -1px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background-color: #22c55e;
          border: 2px solid #ffffff;
          z-index: 2;
        }

        .profile-media-trigger .user-name-hide {
          text-align: left;
          margin-left: 10px;
        }

        .profile-media-trigger .user-name-hide span {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #172B4D;
          line-height: 1.2;
        }

        .profile-media-trigger .user-name-hide p {
          font-size: 10.5px;
          font-weight: 500;
          color: #64748b;
          margin-top: 1px;
          display: flex;
          align-items: center;
          gap: 4px;
          margin-bottom: 0;
        }

        .profile-media-trigger .chevron-icon {
          transition: transform 200ms ease;
          font-size: 14px;
          color: #64748b;
        }

        .profile-media-trigger[data-state="open"] .chevron-icon {
          transform: rotate(180deg);
        }

        @keyframes slideDownAndFade {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}} />

      <li className="profile-nav onhover-dropdown pe-0 me-0 list-none">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <div className="profile-media-trigger">
              <div className="profile-avatar-wrapper">
                {imageUrl ? (
                  <img src={imageUrl} alt={displayName} className="profile-avatar-img" />
                ) : (
                  <span className="profile-avatar-initials">{initials}</span>
                )}
                <span className="profile-avatar-status" />
              </div>
              <div className="user-name-hide">
                <span>{displayName}</span>
                <p className="font-roboto">
                  {displayRole}
                  <ChevronDown className="chevron-icon" />
                </p>
              </div>
            </div>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content className="radix-profile-content" align="end" sideOffset={5}>
              <div className="radix-profile-header">
                <span className="radix-profile-header-name">{displayName}</span>
                <span className="radix-profile-header-role">{displayRole}</span>
              </div>
              
              <DropdownMenu.Item className="radix-profile-item" asChild>
                <Link href={"/account"}>
                  <User className="w-4 h-4 text-slate-500" />
                  <span>{t("MyAccount")}</span>
                </Link>
              </DropdownMenu.Item>

              <DropdownMenu.Item className="radix-profile-item" asChild>
                <Link href={"/setting"}>
                  <Settings className="w-4 h-4 text-slate-500" />
                  <span>{t("Settings")}</span>
                </Link>
              </DropdownMenu.Item>

              <DropdownMenu.Item className="radix-profile-item radix-profile-item-danger" onSelect={() => setModal(true)}>
                <div className="flex items-center gap-[10px] w-full">
                  <LogOut className="w-4 h-4" />
                  <span>{t("Logout")}</span>
                </div>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </li>

      <ShowModal
        open={modal}
        close={false}
        setModal={setModal}
        buttons={
          <>
            <Btn title="No" onClick={() => setModal(false)} className="btn--no btn-md fw-bold" />
            <Btn title="Yes" onClick={() => handleLogout()} className="btn-theme btn-md fw-bold" loading={Number(isLoading)} />
          </>
        }
      >
        <div className="remove-box">
          <HelpCircle className="icon-box wo-bg" />
          <h5 className="modal-title">{t("Confirmation")}</h5>
          <p>{t("Areyousureyouwanttoproceed?")} </p>
        </div>
      </ShowModal>
    </>
  );
};

export default ProfileNav;
