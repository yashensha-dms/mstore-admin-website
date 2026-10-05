"use client";
import React, { useState } from "react";
import { Col } from "reactstrap";
import TrendingProductTable from "@/Components/TrendingProduct/TrendingProductTable";

const TrendingProductsPage = () => {
  const [isCheck, setIsCheck] = useState([]);
  return (
    <Col sm="12">
      <TrendingProductTable
        isCheck={isCheck}
        setIsCheck={setIsCheck}
      />
    </Col>
  );
};

export default TrendingProductsPage;
