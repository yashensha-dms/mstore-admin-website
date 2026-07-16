import ShowModal from "@/Elements/Alerts&Modals/Modal";
import SettingContext from "@/Helper/SettingContext";
import { dateFormate } from "@/Utils/CustomFunctions/DateFormate";
import React, { useContext, useState } from "react";
import ReceiptModalTable from "./ReceiptModalTable";
import Btn from "@/Elements/Buttons/Btn";
import { useTranslation } from "@/app/i18n/client";
import I18NextContext from "@/Helper/I18NextContext";
import { render, Printer, Text, Row, Line, Cut } from 'react-thermal-printer';
import UsbPrinterService from "@/Utils/CustomFunctions/UsbPrinterService";
import { toast } from "react-toastify";
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from "reactstrap";

const ReceiptModal = ({ open, setOpen, data }) => {
    const { i18Lang } = useContext(I18NextContext);
    const { t } = useTranslation(i18Lang, 'common');
    const { settingObj } = useContext(SettingContext);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const toggleDropdown = () => setDropdownOpen((prevState) => !prevState);

    // Format address cleanly with commas and spacing
    const addressString = [
        data?.shipping_address?.street,
        data?.shipping_address?.city,
        data?.shipping_address?.state?.name,
        data?.shipping_address?.country?.name,
        data?.shipping_address?.pincode
    ].filter(Boolean).join(', ');

    const handlePrint = () => {
        const printContent = document.getElementById("printable-receipt-content").innerHTML;
        const iframe = document.createElement("iframe");
        iframe.style.position = "fixed";
        iframe.style.right = "0";
        iframe.style.bottom = "0";
        iframe.style.width = "0";
        iframe.style.height = "0";
        iframe.style.border = "0";
        document.body.appendChild(iframe);
        
        const doc = iframe.contentWindow.document;
        doc.write(`
            <html>
                <head>
                    <title>Print Receipt</title>
                    <style>
                        @page {
                            size: auto;
                            margin: 0;
                        }
                        body {
                            margin: 0;
                            padding: 8px;
                            font-family: 'Arial', sans-serif;
                            width: 100%;
                            background: #fff;
                            color: #000;
                            -webkit-print-color-adjust: exact;
                        }
                        .text-center { text-align: center; }
                        .text-end { text-align: right; }
                        .fw-bold { font-weight: bold; }
                        .fw-medium { font-weight: 500; }
                        .mb-1 { margin-bottom: 4px; }
                        .mb-3 { margin-bottom: 12px; }
                        .py-1 { padding-top: 4px; padding-bottom: 4px; }
                        .mt-1 { margin-top: 4px; }
                        .d-block { display: block; }
                        .text-muted { color: #666; }
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            font-size: 11px;
                        }
                        th {
                            border-bottom: 1px dashed #000;
                            border-top: 1px dashed #000;
                            font-weight: bold;
                            text-transform: uppercase;
                            padding: 6px 0;
                        }
                        td {
                            padding: 4px 0;
                        }
                        .quantity {
                            width: 10%;
                            text-align: left;
                        }
                        .description {
                            width: 70%;
                            text-align: left;
                        }
                        .price {
                            width: 20%;
                            text-align: right;
                        }
                    </style>
                </head>
                <body>
                    <div style="width: 72mm; max-width: 72mm; margin: 0 auto; box-sizing: border-box;">
                        ${printContent}
                    </div>
                </body>
            </html>
        `);
        doc.close();
        
        iframe.contentWindow.focus();
        setTimeout(() => {
            iframe.contentWindow.print();
            document.body.removeChild(iframe);
        }, 500);
    };

    const handlePairSerial = async () => {
        try {
            await UsbPrinterService.connectSerial();
            toast.success("Serial printer paired successfully!");
        } catch (error) {
            toast.error(error.message || "Failed to pair Serial printer.");
        }
    };

    const handlePairUsb = async () => {
        try {
            await UsbPrinterService.connectUsb();
            toast.success("USB printer paired successfully!");
        } catch (error) {
            toast.error(error.message || "Failed to pair USB printer.");
        }
    };

    const handleThermalPrint = async () => {
        const type = typeof window !== "undefined" ? localStorage.getItem("printer_type") : null;
        if (!type) {
            toast.info("No printer paired. Falling back to browser print dialog.");
            handlePrint();
            return;
        }

        try {
            const receiptData = await render(
                <Printer type="epson" width={36}>
                    <Text align="center" size={{ width: 2, height: 2 }}>Grabzo</Text>
                    <Text align="center">Retail Receipt</Text>
                    <Line />
                    <Row left="Order Number:" right={`#${data.order_number}`} />
                    <Row left="Date:" right={dateFormate(data.created_at)} />
                    {data?.consumer?.name && <Row left="Customer:" right={data.consumer.name} />}
                    {data?.consumer?.email && <Row left="Email:" right={data.consumer.email} />}
                    {data?.shipping_address?.phone && <Row left="Phone:" right={data.shipping_address.phone} />}
                    <Line />
                    <Row left="QTY ITEM" right="PRICE" />
                    <Line />
                    {data?.products?.map((elem, idx) => {
                        const name = elem?.pivot?.variation?.name || elem.name;
                        const qty = elem?.pivot?.quantity || 1;
                        const price = (elem?.pivot?.variation?.price || elem.price || 0) * qty;
                        return (
                            <Row key={idx} left={`${qty}x ${name}`} right={`₹${Number(price).toFixed(2)}`} />
                        );
                    })}
                    <Line />
                    <Row left="Total:" right={`₹${Number(data.total_amount || data.total || 0).toFixed(2)}`} />
                    <Line />
                    <Text align="center">Thank you for shopping!</Text>
                    <Cut />
                </Printer>
            );

            await UsbPrinterService.print(receiptData);
            toast.success("Receipt printed and cut successfully!");
        } catch (error) {
            console.error("Thermal printing error:", error);
            toast.info("Direct print failed. Falling back to browser print dialog.");
            handlePrint();
        }
    };

    return (
        <ShowModal
            open={open}
            setModal={setOpen}
            modalAttr={{ className: "theme-modal modal-sm invoice-modal" }}
            buttons={
                <div className="modal-btn-group d-flex align-items-center gap-2 justify-content-center">
                    <Btn className="btn-sm btn-animation theme-bg-color" onClick={handleThermalPrint}>{t("Print")}</Btn>
                    <Dropdown isOpen={dropdownOpen} toggle={toggleDropdown}>
                        <DropdownToggle className="btn-sm btn-outline dropdown-toggle" caret>
                            {t("Setup Printer")}
                        </DropdownToggle>
                        <DropdownMenu>
                            <DropdownItem onClick={handlePairSerial}>{t("Pair Serial Port")}</DropdownItem>
                            <DropdownItem onClick={handlePairUsb}>{t("Pair USB Device")}</DropdownItem>
                            <DropdownItem onClick={handlePrint}>{t("Open Print Dialog")}</DropdownItem>
                        </DropdownMenu>
                    </Dropdown>
                    <Btn className="btn-sm btn-outline" onClick={() => { setOpen(false) }}>{t("Cancel")}</Btn>
                </div>
            }
            close={false}
        >
            <div id="printable-receipt-content">
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
            </div>
        </ShowModal>
    )
}

export default ReceiptModal;