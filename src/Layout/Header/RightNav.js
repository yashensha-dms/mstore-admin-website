import React, { useContext, useEffect, useState } from "react";
import Link from "next/link";
import { RiFullscreenExitLine, RiFullscreenFill, RiGlobalLine, RiMoonLine, RiSearchLine } from "react-icons/ri";
import { Col } from "reactstrap";
import useOutsideDropdown from "../../Utils/Hooks/CustomHooks/useOutsideDropdown";
import usePermissionCheck from "../../Utils/Hooks/usePermissionCheck";
import Language from "./Language";
import NotificationBox from "./NotificationBox";
import ProfileNav from "./ProfileNav";
import I18NextContext from "@/Helper/I18NextContext";
import { useTranslation } from "@/app/i18n/client";
import QuickLinks from "./QuickLinks";
import SettingContext from "@/Helper/SettingContext";
import AccountContext from "@/Helper/AccountContext";
import { getStoreTheme } from "../../Utils/StoreTheme";

const RightNav = ({ setMode, setOpenSearchBar }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const { i18Lang } = useContext(I18NextContext);
  const { t } = useTranslation(i18Lang, 'common');
  const { activeStore } = useContext(AccountContext);
  const storeTheme = getStoreTheme(activeStore);
  const [isOrderCreate] = usePermissionCheck(["create"], "order");
  const { ref, isComponentVisible, setIsComponentVisible } = useOutsideDropdown();
  const { settingObj } = useContext(SettingContext);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const toggleFullScreen = () => {

    if (
      (document.fullScreenElement && document.fullScreenElement !== null) ||
      (!document.mozFullScreen && !document.webkitIsFullScreen)
    ) {
      setIsFullScreen(prev => prev = true);
      if (document.documentElement.requestFullScreen) {
        document.documentElement.requestFullScreen();
      } else if (document.documentElement.mozRequestFullScreen) {
        document.documentElement.mozRequestFullScreen();
      } else if (document.documentElement.webkitRequestFullScreen) {
        document.documentElement.webkitRequestFullScreen(
          Element.ALLOW_KEYBOARD_INPUT
        );
      }
    } else {
      setIsFullScreen(prev => prev = false);
      if (document.cancelFullScreen) {
        document.cancelFullScreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.webkitCancelFullScreen) {
        document.webkitCancelFullScreen();
      }
    }
  }

  return (
    <Col className="nav-right pull-right right-header p-0">
      {/* <div className="header-btns d-none d-lg-flex">
        <QuickLinks  isComponentVisible={isComponentVisible} setIsComponentVisible={setIsComponentVisible}/>
        {isOrderCreate && <Link href={"/order/create"} className="btn btn-animation">{t("Pos")}</Link>}
      </div> */}
      <ul className="nav-menus" ref={ref}>
        <li>
          <span className="header-search-btn" onClick={() => setOpenSearchBar(true)}>
            <RiSearchLine size={18} />
          </span>
        </li>
        {/* <li>
          <a className="global-box" href={settingObj?.general?.site_url} target="_blank">
            <RiGlobalLine />
          </a>
        </li> */}
        {/* <li>
          <div className="full-screen-box">
          {isFullScreen?
            <RiFullscreenExitLine className="header-fullscreen" onClick={toggleFullScreen} />
            :
            <RiFullscreenFill className="header-fullscreen" onClick={toggleFullScreen} />
          }
          </div>
        </li> */}
        {/* <Language isComponentVisible={isComponentVisible} setIsComponentVisible={setIsComponentVisible} /> */}
        {/* <NotificationBox isComponentVisible={isComponentVisible} setIsComponentVisible={setIsComponentVisible} /> */}
        {/* <li>
          <div className="mode">
            <RiMoonLine className="ri-moon-line" onClick={() => setMode((prev) => !prev)} />
          </div>
        </li> */}
        {mounted && (
          <li className="d-none d-sm-inline-flex align-items-center me-2">
            <span
              className="store-header-pill"
              style={{
                padding: "4px 12px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: storeTheme.colorLight,
                color: storeTheme.color,
                border: `1px solid ${storeTheme.borderColor}`,
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              }}
            >
              <span>{storeTheme.icon}</span>
              <span>{activeStore?.store_name || "Grocery"}</span>
            </span>
          </li>
        )}
        <ProfileNav isComponentVisible={isComponentVisible} setIsComponentVisible={setIsComponentVisible} />
      </ul>
    </Col>
  );
};

export default RightNav;
