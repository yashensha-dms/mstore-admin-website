"use client";
import React, { useState } from "react";
import { Col } from "reactstrap";
import BestsellingProductTable from "@/Components/BestsellingProduct/BestsellingProductTable";

const BestsellingProductsPage = () => {
  const [isCheck, setIsCheck] = useState([]);
  return (
    <Col sm="12">
      <BestsellingProductTable
        isCheck={isCheck}
        setIsCheck={setIsCheck}
      />
    </Col>
  );
};

export default BestsellingProductsPage;
