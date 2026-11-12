import { useContext } from 'react';
import { Card, CardBody } from 'reactstrap'
import I18NextContext from '@/Helper/I18NextContext';
import { useTranslation } from '@/app/i18n/client';

const ConsumerDetails = ({ data }) => {
    const { i18Lang } = useContext(I18NextContext);
    const { t } = useTranslation(i18Lang, 'common');
    const shipping = (data?.shipping_address?.street || data?.shipping_address?.city || data?.shipping_address?.pincode)
        ? data?.shipping_address
        : data?.billing_address;

    return (
        <Card>
            <CardBody>
                <div className="title-header" >
                    <div className="d-flex align-items-center">
                        <h5>{("Consumer Details")}</h5>
                    </div>
                </div>
                <div className="customer-detail tracking-wrapper">
                    <ul>
                        <li>
                            <label>{t("Name")}:</label>
                            <h4>{data?.consumer?.name}</h4>
                        </li>
                        <li>
                            <label>{t("EmailAddress")}:</label>
                            <h4>{data?.consumer?.email}</h4>
                        </li>
                        {data?.billing_address && (
                            <li>
                                <label>{t("BillingAddress")}:</label>
                                <h4>
                                    {[
                                        data?.billing_address?.street,
                                        data?.billing_address?.city,
                                        data?.billing_address?.state?.name || data?.billing_address?.state,
                                        data?.billing_address?.country?.name || data?.billing_address?.country,
                                        data?.billing_address?.pincode
                                    ].filter(Boolean).join(', ')}
                                    {data?.billing_address?.phone && <><br /><b>{t("Phone")} : </b> {data?.billing_address?.phone}</>}
                                </h4>
                            </li>
                        )}
                        {shipping && (
                            <li>
                                <label>{t("ShippingAddress")}:</label>
                                <h4>
                                    {[
                                        shipping?.street,
                                        shipping?.city,
                                        shipping?.state?.name || shipping?.state,
                                        shipping?.country?.name || shipping?.country,
                                        shipping?.pincode
                                    ].filter(Boolean).join(', ')}
                                    {shipping?.phone && <><br /><b>{t("Phone")} : </b> {shipping?.phone}</>}
                                </h4>
                            </li>
                        )}
                        <li>
                            <label>{t("DeliverySlot")}:</label>
                            <h4>{data?.delivery_description}</h4>
                        </li>
                        <li>
                            <label>{t("PaymentMode")}:</label>
                            <h4>{data?.payment_method.toUpperCase()}</h4>
                        </li>
                    </ul>
                </div>
            </CardBody>
        </Card >
    )
}

export default ConsumerDetails