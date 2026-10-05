'use client'
import AllOfferBanners from "@/Components/OfferBanner/AllOfferBanners";
import { offerBanner } from "@/Utils/AxiosUtils/API";
import { useState } from "react";
import { Col } from "reactstrap";

const AllBanners = () => {
  const [isCheck, setIsCheck] = useState([]);
  return (
    <Col sm="12">
      <AllOfferBanners url={offerBanner} moduleName="OfferBanner" isCheck={isCheck} setIsCheck={setIsCheck} />
    </Col>
  );
};

export default AllBanners;
