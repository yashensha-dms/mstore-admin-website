'use client'
import { useContext } from "react";
import { Card, CardBody, Col, Row } from "reactstrap";
import { useTranslation } from "@/app/i18n/client";
import useUpdate from "@/Utils/Hooks/useUpdate";
import { offerBanner } from "@/Utils/AxiosUtils/API";
import OfferBannerForm from "@/Components/OfferBanner/OfferBannerForm";
import I18NextContext from "@/Helper/I18NextContext";

const OfferBannerUpdate = ({ params }) => {
  const { i18Lang } = useContext(I18NextContext);
  const { t } = useTranslation(i18Lang, 'common');
  const { mutate, isLoading } = useUpdate(offerBanner, params?.updateId, "/offer-banner");
  return (
    params?.updateId && (
      <Row>
        <Col sm="8" className="m-auto">
          <Card>
            <CardBody>
              <div className="card-header-2">
                <h5>{t("UpdateOfferBanner")}</h5>
              </div>
              <OfferBannerForm mutate={mutate} updateId={params?.updateId} loading={isLoading} />
            </CardBody>
          </Card>
        </Col>
      </Row>
    )
  );
};

export default OfferBannerUpdate;
