"use client";

import React from "react";
import dynamic from "next/dynamic";

const BulkUploadForm = dynamic(() => import("@/Components/Product/BulkUploadForm"), {
  ssr: false,
});

const BulkProductImport = () => {
  return <BulkUploadForm />;
};

export default BulkProductImport;
