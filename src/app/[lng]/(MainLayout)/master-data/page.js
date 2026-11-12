"use client";

import { useEffect, useContext } from "react";
import { useRouter } from "next/navigation";
import I18NextContext from "@/Helper/I18NextContext";
import Loader from "@/Components/CommonComponent/Loader";

const MasterDataIndexPage = () => {
  const router = useRouter();
  const { i18Lang } = useContext(I18NextContext);

  useEffect(() => {
    router.replace(`/${i18Lang}/master-data/upload`);
  }, [router, i18Lang]);

  return <Loader />;
};

export default MasterDataIndexPage;

