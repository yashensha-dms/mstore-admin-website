import ShowModal from "@/Elements/Alerts&Modals/Modal";
import SettingContext from "@/Helper/SettingContext";
import { dateFormate } from "@/Utils/CustomFunctions/DateFormate";
import React, { useContext } from "react";
import ReceiptModalTable from "./ReceiptModalTable";
import Btn from "@/Elements/Buttons/Btn";
import { useTranslation } from "@/app/i18n/client";
import I18NextContext from "@/Helper/I18NextContext";

const ReceiptModal = ({ open, setOpen, data }) => {
    const { i18Lang } = useContext(I18NextContext);
    const { t } = useTranslation(i18Lang, 'common');
    const { settingObj } = useContext(SettingContext);

    // Format address cleanly with commas and spacing
    const addressString = [
        data?.shipping_address?.street,
        data?.shipping_address?.city,
        data?.shipping_address?.state?.name,
        data?.shipping_address?.country?.name,
        data?.shipping_address?.pincode
    ].filter(Boolean).join(', ');

    return (
        <ShowModal
            open={open}
            setModal={setOpen}
            modalAttr={{ className: "theme-modal modal-sm invoice-modal" }}
            buttons={
                <div className="modal-btn-group d-flex align-items-center gap-2 justify-content-center">
                    <Btn className="btn-sm btn-animation theme-bg-color" onClick={() => { window.print() }}>{t("Print")}</Btn>
                    <Btn className="btn-sm btn-outline" onClick={() => { setOpen(false) }}>{t("Cancel")}</Btn>
                </div>
            }
            close={false}
        >
            <div className="ticket">
                <div className="title-text text-center">
                    <h4 className="fw-bold mb-1" style={{ color: '#222', fontSize: '24px' }}>
                        Grabzo
                    </h4>
                    <p className="text-muted uppercase fw-medium mb-3" style={{ fontSize: '10px', letterSpacing: '1.5px' }}>
                        Retail Receipt
                    </p>
                </div>
                <div style={{ borderBottom: '1px dashed rgba(74, 85, 104, 0.25)', paddingBottom: '12px', marginBottom: '12px' }}>
                    <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                        <tbody>
                            <tr>
                                <td className="text-muted py-1" style={{ width: '35%' }}>{t("OrderNumber")}:</td>
                                <td className="fw-medium text-end py-1">#{data.order_number}</td>
                            </tr>
                            <tr>
                                <td className="text-muted py-1">{t("Date")}:</td>
                                <td className="fw-medium text-end py-1">{dateFormate(data.created_at)}</td>
                            </tr>
                            {data?.consumer?.name && (
                                <tr>
                                    <td className="text-muted py-1">{t("Customer")}:</td>
                                    <td className="fw-medium text-end py-1">{data.consumer.name}</td>
                                </tr>
                            )}
                            {data?.consumer?.email && (
                                <tr>
                                    <td className="text-muted py-1">{t("Email")}:</td>
                                    <td className="fw-medium text-end py-1" style={{ textTransform: 'none' }}>{data.consumer.email}</td>
                                </tr>
                            )}
                            {data?.shipping_address?.phone && (
                                <tr>
                                    <td className="text-muted py-1">{t("Phone")}:</td>
                                    <td className="fw-medium text-end py-1">{data.shipping_address.phone}</td>
                                </tr>
                            )}
                            {addressString && (
                                <tr>
                                    <td className="text-muted py-1" style={{ verticalAlign: 'top' }}>{t("Address")}:</td>
                                    <td className="fw-medium text-end py-1" style={{ fontSize: '11px', lineHeight: '1.4' }}>{addressString}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            <ReceiptModalTable data={data} />
        </ShowModal>
    )
}

export default ReceiptModal;