'use client'
import AllPushBroadcasts from "@/Components/PushBroadcast/AllPushBroadcasts";
import { pushBroadcast } from "@/Utils/AxiosUtils/API";
import { useState } from "react";
import { Col } from "reactstrap";

const AllBroadcasts = () => {
  const [isCheck, setIsCheck] = useState([]);
  return (
    <Col sm="12">
      <AllPushBroadcasts url={pushBroadcast} moduleName="PushBroadcast" isCheck={isCheck} setIsCheck={setIsCheck} />
    </Col>
  );
};

export default AllBroadcasts;
