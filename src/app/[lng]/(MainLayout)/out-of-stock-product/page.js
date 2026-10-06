"use client";
import React from "react";
import { Col } from "reactstrap";
import OutOfStockProductTable from "@/Components/OutOfStockProduct/OutOfStockProductTable";

const OutOfStockProductsPage = () => {
  return (
    <Col sm="12">
      <OutOfStockProductTable />
    </Col>
  );
};

export default OutOfStockProductsPage;
