import I18NextContext from "@/Helper/I18NextContext";
import { useTranslation } from "@/app/i18n/client";
import React, { useContext, useEffect, useState } from "react";
import { Table } from "reactstrap";
import request from "@/Utils/AxiosUtils";
import { product } from "@/Utils/AxiosUtils/API";

const ReceiptModalTable = ({ data, productDetails }) => {
    const { i18Lang } = useContext(I18NextContext);
    const { t } = useTranslation(i18Lang, 'common');

    // Resolve MRP for a single product element (returns null if still loading details)
    const getProductMrp = (elem) => {
        const details = productDetails?.[elem.id];
        if (details) {
            if (elem?.pivot?.variation_id) {
                const matchedVariation = details.variations.find(v => v.id === elem.pivot.variation_id);
                return Number(matchedVariation?.price || details.price || 0);
            } else {
                return Number(details.price || 0);
            }
        }
        return null;
    };

    const getSubcategoryId = (elem) => {
        const details = productDetails?.[elem.id];
        if (details && details.categories) {
            const subcategory = details.categories.find(cat => cat.parent_id !== null);
            return subcategory ? subcategory.id : null;
        }
        return null;
    };

    return (
        <Table>
            <thead>
                <tr>
                    <th className="quantity">{t("Qty")}</th>
                    <th className="description">{t("ProductName")}</th>
                    <th className="price">{t("MRP")}</th>
                </tr>
            </thead>
            <tbody>
                {data?.products?.map((elem, index) => {
                    const details = productDetails?.[elem.id];
                    let resolvedBarcode = null;
                    if (details) {
                        if (elem?.pivot?.variation_id) {
                            const matchedVariation = details.variations.find(v => v.id === elem.pivot.variation_id);
                            resolvedBarcode = matchedVariation?.barcode || details.barcode;
                        } else {
                            resolvedBarcode = details.barcode;
                        }
                    }

                    const mrp = getProductMrp(elem);
                    const totalMrp = mrp !== null ? mrp * Number(elem?.pivot?.quantity || 1) : null;
                    const subcategoryId = getSubcategoryId(elem);

                    return (
                        <tr key={index}>
                            <td className="quantity">{elem?.pivot?.quantity}</td>
                            <td className="description">
                                <span style={{ fontWeight: '500' }}>{elem.name}</span>
                                {(elem?.pivot?.variation || subcategoryId || resolvedBarcode) && (
                                    <div className="text-muted mt-1" style={{ fontSize: '10px', lineHeight: '1.3' }}>
                                        {elem?.pivot?.variation && (
                                            <div style={{ fontSize: '10px' }}>Variant: {elem.pivot.variation.name}</div>
                                        )}
                                        {subcategoryId && (
                                            <div style={{ fontSize: '10px' }}>SubCategory ID: {subcategoryId}</div>
                                        )}
                                        {resolvedBarcode && (
                                            <div style={{ fontSize: '10px', letterSpacing: '0.5px' }}>{resolvedBarcode}</div>
                                        )}
                                    </div>
                                )}
                            </td>
                            <td className="price">
                                {totalMrp !== null ? `₹ ${Number(totalMrp).toFixed(2)}` : "..."}
                            </td>
                        </tr>
                    )
                })}
            </tbody>
        </Table>
    )
}

export default ReceiptModalTable;