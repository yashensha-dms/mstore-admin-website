'use client'
import { useContext } from "react";
import { Card, CardBody, Col, Row } from "reactstrap";
import { useTranslation } from "@/app/i18n/client";
import useUpdate from "@/Utils/Hooks/useUpdate";
import { pushBroadcast } from "@/Utils/AxiosUtils/API";
import PushBroadcastForm from "@/Components/PushBroadcast/PushBroadcastForm";
import I18NextContext from "@/Helper/I18NextContext";

const PushBroadcastUpdate = ({ params }) => {
  const { i18Lang } = useContext(I18NextContext);
  const { t } = useTranslation(i18Lang, 'common');
  const { mutate, isLoading } = useUpdate(pushBroadcast, params?.updateId, "/push-broadcast");
  return (
    params?.updateId && (
      <Row>
        <Col sm="8" className="m-auto">
          <Card>
            <CardBody>
              <div className="card-header-2">
                <h5>{t("UpdatePushBroadcast")}</h5>
              </div>
              <PushBroadcastForm mutate={mutate} updateId={params?.updateId} loading={isLoading} />
            </CardBody>
          </Card>
        </Col>
      </Row>
    )
  );
};

export default PushBroadcastUpdate;
