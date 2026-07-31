import ShowModal from "@/Elements/Alerts&Modals/Modal";
import SettingContext from "@/Helper/SettingContext";
import { dateFormate } from "@/Utils/CustomFunctions/DateFormate";
import React, { useContext, useState, useEffect } from "react";
import ReceiptModalTable from "./ReceiptModalTable";
import Btn from "@/Elements/Buttons/Btn";
import { useTranslation } from "@/app/i18n/client";
import I18NextContext from "@/Helper/I18NextContext";
import { render, Printer, Text, Row, Line, Cut } from 'react-thermal-printer';
import UsbPrinterService from "@/Utils/CustomFunctions/UsbPrinterService";
import { toast } from "react-toastify";
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from "reactstrap";
import request from "@/Utils/AxiosUtils";
import { product } from "@/Utils/AxiosUtils/API";

const ReceiptModal = ({ open, setOpen, data }) => {
    const { i18Lang } = useContext(I18NextContext);
    const { t } = useTranslation(i18Lang, 'common');
    const { settingObj } = useContext(SettingContext);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [showIpInput, setShowIpInput] = useState(false);
    const [inputIp, setInputIp] = useState(
        typeof window !== "undefined" ? localStorage.getItem("printer_ip") || "" : ""
    );
    const [productDetails, setProductDetails] = useState({});

    useEffect(() => {
        if (!data?.products) return;

        const fetchMissingDetails = async () => {
            const detailsToFetch = data.products.filter(elem => elem.id && !productDetails[elem.id]);
            if (detailsToFetch.length === 0) return;

            const newDetails = { ...productDetails };
            await Promise.all(
                detailsToFetch.map(async (elem) => {
                    try {
                        const response = await request({ url: `${product}/${elem.id}` });
                        const productObj = response?.data?.data || response?.data;
                        if (productObj) {
                            newDetails[elem.id] = {
                                price: productObj.price,
                                barcode: productObj.barcode,
                                variations: productObj.variations || [],
                                tax: productObj.tax,
                                categories: productObj.categories || []
                            };
                        }
                    } catch (error) {
                        console.error("Error fetching product barcode/tax/categories:", error);
                    }
                })
            );
            setProductDetails(newDetails);
        };

        fetchMissingDetails();
    }, [data?.products]);

    const getSubcategoryId = (elem) => {
        const details = productDetails?.[elem.id];
        if (details && details.categories) {
            const subcategory = details.categories.find(cat => cat.parent_id !== null);
            return subcategory ? subcategory.id : null;
        }
        return null;
    };

    const getVariantName = (elem) => {
        if (elem?.pivot?.variation?.attribute_values?.length > 0) {
            return elem.pivot.variation.attribute_values.map(attr => attr.value).join(', ');
        }
        const details = productDetails?.[elem.id];
        if (details && elem?.pivot?.variation_id) {
            const matchedVariation = details.variations?.find(v => v.id === elem.pivot.variation_id);
            if (matchedVariation?.attribute_values?.length > 0) {
                return matchedVariation.attribute_values.map(attr => attr.value).join(', ');
            }
            if (matchedVariation?.name) {
                return matchedVariation.name;
            }
        }
        if (elem?.pivot?.variation?.name) {
            return elem.pivot.variation.name;
        }
        return null;
    };

    const toggleDropdown = () => setDropdownOpen((prevState) => !prevState);

    // Format address cleanly with commas and spacing
    const addressString = [
        data?.shipping_address?.street,
        data?.shipping_address?.city,
        data?.shipping_address?.state?.name,
        data?.shipping_address?.country?.name,
        data?.shipping_address?.pincode
    ].filter(Boolean).join(', ');

    const deliverySlot = data?.delivery_interval && data?.delivery_description 
        ? `${data.delivery_description} (${data.delivery_interval})`
        : (data?.delivery_interval || data?.delivery_description);

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
                        *, *:before, *:after {
                            box-sizing: border-box;
                        }
                        @page {
                            size: auto;
                            margin: 0;
                        }
                        body {
                            margin: 0;
                            padding: 0;
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
                            width: 15%;
                            text-align: left;
                        }
                        .description {
                            width: 55%;
                            text-align: left;
                        }
                        .price {
                            width: 30%;
                            text-align: right;
                        }
                    </style>
                </head>
                <body>
                    <div style="display: flex; flex-direction: column; width: 100%; padding: 0 8px; box-sizing: border-box;">
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

    const handleConnectNetworkPrinter = async () => {
        if (!inputIp) {
            toast.error("Please enter a valid IP address first.");
            setShowIpInput(true);
            return;
        }
        try {
            toast.info(`Connecting to WiFi printer at ${inputIp}...`);
            const result = await UsbPrinterService.pingNetworkPrinter(inputIp);
            if (result?.online) {
                UsbPrinterService.setNetworkPrinter(inputIp);
                toast.success(`WiFi printer connected successfully!`);
                setShowIpInput(false);
            } else {
                toast.error(`Printer offline at ${inputIp}. Check connection.`);
            }
        } catch (error) {
            toast.error(error.message || "Cannot reach WiFi printer.");
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
                    {deliverySlot && <Row left="Delivery Slot:" right={deliverySlot} />}
                    {data?.consumer?.name && <Row left="Customer:" right={data.consumer.name} />}
                    {data?.consumer?.email && <Row left="Email:" right={data.consumer.email} />}
                    {data?.shipping_address?.phone && <Row left="Phone:" right={data.shipping_address.phone} />}
                    <Line />
                    <Row left="QTY ITEM" right="PRICE" />
                    <Line />
                    {data?.products?.map((elem, idx) => {
                        const qty = elem?.pivot?.quantity || 1;
                        const baseName = elem.name;
                        const variationName = getVariantName(elem);
                        const subcategoryId = getSubcategoryId(elem);
                        
                        let displayName = baseName;
                        if (variationName) {
                            displayName += ` (${variationName})`;
                        }
                        if (subcategoryId) {
                            displayName += ` [SC:${subcategoryId}]`;
                        }

                        const price = (elem?.pivot?.variation?.price || elem.price || 0) * qty;
                        return (
                            <Row key={idx} left={`${qty}x ${displayName}`} right={`₹${Number(price).toFixed(2)}`} />
                        );
                    })}
                    <Line />
                    <Row left="Subtotal:" right={`₹${Number(data.amount || 0).toFixed(2)}`} />
                    {data?.shipping_total > 0 && <Row left="Shipping:" right={`₹${Number(data.shipping_total).toFixed(2)}`} />}
                    {data?.tax_total > 0 && <Row left="Tax:" right={`₹${Number(data.tax_total).toFixed(2)}`} />}
                    {data?.coupon_total_discount > 0 && <Row left="Discount:" right={`-₹${Number(data.coupon_total_discount).toFixed(2)}`} />}
                    {data?.points_amount > 0 && <Row left="Points:" right={`-₹${Number(data.points_amount).toFixed(2)}`} />}
                    {data?.wallet_balance > 0 && <Row left="Wallet:" right={`-₹${Number(data.wallet_balance).toFixed(2)}`} />}
                    <Line />
                    <Row left="Total:" right={`₹${Number(data.total || data.total_amount || 0).toFixed(2)}`} />
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
                            <DropdownItem header>USB / Serial</DropdownItem>
                            <DropdownItem onClick={handlePairSerial}>{t("Pair Serial Port")}</DropdownItem>
                            <DropdownItem onClick={handlePairUsb}>{t("Pair USB Device")}</DropdownItem>
                            <DropdownItem divider />
                            <DropdownItem header>WiFi / Network</DropdownItem>
                            <DropdownItem onClick={() => setShowIpInput(!showIpInput)}>&#128225; {t("Configure WiFi Printer")}</DropdownItem>
                            <DropdownItem divider />
                            <DropdownItem onClick={handlePrint}>{t("Open Print Dialog")}</DropdownItem>
                        </DropdownMenu>
                    </Dropdown>
                    <Btn className="btn-sm btn-outline" onClick={() => { setOpen(false) }}>{t("Cancel")}</Btn>
                </div>
            }
            close={false}
        >
            {showIpInput && (
                <div className="mb-3 p-3 bg-light rounded border">
                    <label className="form-label fw-bold small mb-2 text-dark">WiFi Printer IP Address</label>
                    <div className="d-flex gap-2">
                        <input 
                            type="text" 
                            className="form-control form-control-sm" 
                            placeholder="e.g. 192.168.18.186" 
                            value={inputIp} 
                            onChange={(e) => setInputIp(e.target.value)} 
                        />
                        <button 
                            className="btn btn-sm btn-primary py-1 px-3 text-nowrap" 
                            onClick={handleConnectNetworkPrinter}
                        >
                            Connect
                        </button>
                    </div>
                    {localStorage.getItem("printer_ip") && (
                        <div className="mt-2 text-success small">
                            Active: {localStorage.getItem("printer_ip")}
                        </div>
                    )}
                </div>
            )}
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
                                {deliverySlot && (
                                    <tr>
                                        <td className="text-muted py-1">{t("DeliverySlot")}:</td>
                                        <td className="fw-medium text-end py-1">{deliverySlot}</td>
                                    </tr>
                                )}
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
                <ReceiptModalTable data={data} productDetails={productDetails} />
                <div style={{ borderTop: '1px dashed rgba(74, 85, 104, 0.25)', paddingTop: '10px', marginTop: '10px' }}>
                    <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                        <tbody>
                            <tr>
                                <td className="text-muted py-1">{t("Subtotal")}:</td>
                                <td className="fw-medium text-end py-1">₹{Number(data?.amount || 0).toFixed(2)}</td>
                            </tr>
                            {data?.shipping_total > 0 && (
                                <tr>
                                    <td className="text-muted py-1">{t("Shipping")}:</td>
                                    <td className="fw-medium text-end py-1">₹{Number(data.shipping_total).toFixed(2)}</td>
                                </tr>
                            )}
                            {data?.tax_total > 0 && (
                                <tr>
                                    <td className="text-muted py-1">{t("Tax")}:</td>
                                    <td className="fw-medium text-end py-1">₹{Number(data.tax_total).toFixed(2)}</td>
                                </tr>
                            )}
                            {data?.coupon_total_discount > 0 && (
                                <tr>
                                    <td className="text-muted py-1">{t("Discount")}:</td>
                                    <td className="fw-medium text-end py-1">-₹{Number(data.coupon_total_discount).toFixed(2)}</td>
                                </tr>
                            )}
                            {data?.points_amount > 0 && (
                                <tr>
                                    <td className="text-muted py-1">{t("Points")}:</td>
                                    <td className="fw-medium text-end py-1">-₹{Number(data.points_amount).toFixed(2)}</td>
                                </tr>
                            )}
                            {data?.wallet_balance > 0 && (
                                <tr>
                                    <td className="text-muted py-1">{t("WalletBalance")}:</td>
                                    <td className="fw-medium text-end py-1">-₹{Number(data.wallet_balance).toFixed(2)}</td>
                                </tr>
                            )}
                            <tr style={{ borderTop: '1px dashed #000' }}>
                                <td className="fw-bold py-2" style={{ fontSize: '13px' }}>{t("Total")}:</td>
                                <td className="fw-bold text-end py-2" style={{ fontSize: '13px' }}>₹{Number(data?.total || data?.total_amount || 0).toFixed(2)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </ShowModal>
    )
}

export default ReceiptModal;