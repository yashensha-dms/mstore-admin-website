'use client'
import AllTax from "@/Components/Tax/AllTax";
import SimpleGstReport from "@/Components/Tax/SimpleGstReport";
import { tax } from "@/Utils/AxiosUtils/API";
import { useState } from "react";
import { Col } from "reactstrap";

const AllRoles = () => {
  const [isCheck, setIsCheck] = useState([]);
  return (
    <Col sm="12">
      <AllTax url={tax} moduleName="Tax" isCheck={isCheck} setIsCheck={setIsCheck} />
      <SimpleGstReport />
    </Col>
  );
};

export default AllRoles;

