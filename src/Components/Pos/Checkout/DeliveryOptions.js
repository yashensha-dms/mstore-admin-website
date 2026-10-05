import React, { useContext } from "react";
import { RiTruckLine } from "react-icons/ri";
import { Col, Input, Label, Row } from "reactstrap";
import CheckoutCard from "./common/CheckoutCard";
import SettingContext from "@/Helper/SettingContext";
import I18NextContext from "@/Helper/I18NextContext";
import { useTranslation } from "@/app/i18n/client";

const DeliveryOptions = ({ values, setFieldValue }) => {
  const { i18Lang } = useContext(I18NextContext);
  const { t } = useTranslation(i18Lang, 'common');
  const { state } = useContext(SettingContext);

  return (
    <CheckoutCard icon={<RiTruckLine />}>
      <div className="checkout-title">
        <h4>{t("DeliveryOption")}</h4>
      </div>
      {values['consumer_id'] ? (
        <div className="checkout-detail">
          <Row className="g-4">
            {state?.setDelivery?.same_day_delivery && (
              <Col xs="12" className={`future-box ${values['isTimeSlot'] ? 'show' : ""}`}>
                <div className="future-option">
                  <div className="delivery-items">
                    <div>
                      <h4>{t("Selecttimingslot")}:</h4>
                      <ul>
                        {state?.setDelivery?.same_day_intervals?.length > 0 && 
                          state.setDelivery.same_day_intervals.map((elem, i) => (
                            <li 
                              className={values['delivery_interval'] === elem?.description ? "active" : ""} 
                              onClick={() => setFieldValue('delivery_interval', elem?.description)} 
                              key={i}
                            >
                              <a href="#javascript">{elem?.description}</a>
                            </li>
                          ))
                        }
                      </ul>
                    </div>
                  </div>
                </div>
              </Col>
            )}
          </Row>
        </div>
      ) : (
        <div className="empty-box">
          <h2>{t("NoDeliveryOptionFound")}</h2>
        </div>
      )}
    </CheckoutCard>
  );
};

export default DeliveryOptions;
