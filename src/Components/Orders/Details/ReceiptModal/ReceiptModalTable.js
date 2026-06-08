import I18NextContext from "@/Helper/I18NextContext";
import { useTranslation } from "@/app/i18n/client";
import React, { useContext, useEffect, useState } from "react";
import { Table } from "reactstrap";
import request from "@/Utils/AxiosUtils";
import { product } from "@/Utils/AxiosUtils/API";

const ReceiptModalTable = ({ data }) => {
    const { i18Lang } = useContext(I18NextContext);
    const { t } = useTranslation(i18Lang, 'common');
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
                                tax: productObj.tax
                            };
                        }
                    } catch (error) {
                        console.error("Error fetching product barcode/tax:", error);
                    }
                })
            );
            setProductDetails(newDetails);
        };

        fetchMissingDetails();
    }, [data?.products]);

    // Resolve MRP for a single product element (returns null if still loading details)
    const getProductMrp = (elem) => {
        const details = productDetails[elem.id];
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
                    const details = productDetails[elem.id];
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

                    return (
                        <tr key={index}>
                            <td className="quantity">{elem?.pivot?.quantity}</td>
                            <td className="description">
                                {elem?.pivot?.variation?.name || elem.name}
                                {resolvedBarcode && (
                                    <div className="mt-1">
                                        <span className="d-block text-muted" style={{ fontSize: '10px', letterSpacing: '1px' }}>
                                            {resolvedBarcode}
                                        </span>
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