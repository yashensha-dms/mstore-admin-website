"use client";
import React, { useState } from "react";
import { Col } from "reactstrap";
import FeaturedProductTable from "@/Components/FeaturedProduct/FeaturedProductTable";

const FeaturedProductsPage = () => {
  const [isCheck, setIsCheck] = useState([]);
  return (
    <Col sm="12">
      <FeaturedProductTable
        isCheck={isCheck}
        setIsCheck={setIsCheck}
      />
    </Col>
  );
};

export default FeaturedProductsPage;
