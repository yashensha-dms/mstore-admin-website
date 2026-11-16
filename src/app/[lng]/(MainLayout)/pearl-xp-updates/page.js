"use client";
import React, { useEffect, useContext } from "react";
import { useRouter } from "next/navigation";
import { Col } from "reactstrap";
import PearlXpUpdateTable from "@/Components/PearlXp/PearlXpUpdateTable";
import { isBismi } from "@/Utils/isBismi";
import I18NextContext from "@/Helper/I18NextContext";

const PearlXpUpdates = () => {
  const router = useRouter();
  const { i18Lang } = useContext(I18NextContext);
  const isBismiEnv = isBismi();

  useEffect(() => {
    if (isBismiEnv) {
      router.replace(`/${i18Lang}/product`);
    }
  }, [isBismiEnv, router, i18Lang]);

  if (isBismiEnv) {
    return null;
  }

  return (
    <Col sm="12">
      <PearlXpUpdateTable />
    </Col>
  );
};

export default PearlXpUpdates;
