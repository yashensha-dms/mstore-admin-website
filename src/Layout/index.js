'use client'
import React, { useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Container } from "reactstrap";
import ConvertPermissionArr from "../Utils/CustomFunctions/ConvertPermissionArr";
import Header from "./Header";
import Sidebar from "./Sidebar";
import { replacePath } from "../Utils/CustomFunctions/ReplacePath";
import I18NextContext from "@/Helper/I18NextContext";
import OrderNotificationPoller from "../Components/CommonComponent/OrderNotificationPoller";

const Layout = (props) => {
  const { i18Lang, setI18Lang } = useContext(I18NextContext);
  useEffect(() => {
    if (i18Lang == "") {
      setI18Lang(props.lng);
    }
  }, [props.lng]);
  const [mode, setMode] = useState(false);
  const [ltr, setLtr] = useState(true);
  const router = useRouter();
  const path = usePathname();
  const [accountData, setAccountData] = useState(null);
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    const storedAccount = localStorage.getItem("account");
    if (storedAccount) {
      try {
        setAccountData(JSON.parse(storedAccount));
      } catch (e) {
        console.error("Error parsing account data", e);
      }
    }
  }, []);

  useEffect(() => {
    mode ? document.body.classList.add("dark-only") : document.body.classList.remove("dark-only");
  }, [mode]);

  useEffect(() => {
    if (mounted && accountData && path.includes("/dashboard")) {
      const securePaths = ConvertPermissionArr(accountData?.permissions);
      const currentModule = replacePath(path?.split("/")[2]);
      
      // Only check permissions for non-core modules if needed
      if (currentModule && !["dashboard", "403"].includes(currentModule)) {
        const hasPermission = securePaths.find((item) => item?.name == currentModule);
        if (!hasPermission) {
          router.push(`/${props.lng}/403`);
        }
      }
    }
  }, [mounted, accountData, path, props.lng]);
  return (
    <>
      <OrderNotificationPoller />
      <div className="page-wrapper compact-wrapper" id="pageWrapper">
        <Header setMode={setMode} setLtr={setLtr} settingData={'settingData'} />
        <div className="page-body-wrapper">
          <Sidebar />
          <div className="page-body">
            <Container fluid={true}>
              {props.children}
            </Container>
          </div>
        </div>
      </div>
    </>
  );
};

export default Layout;
