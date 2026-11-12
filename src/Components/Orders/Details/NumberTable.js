import React, { useContext } from 'react'
import { Table } from 'reactstrap'
import placeHolderImage from "../../../../public/assets/images/placeholder.png";
import Avatar from '@/Components/CommonComponent/Avatar';
import SettingContext from '@/Helper/SettingContext';
import I18NextContext from '@/Helper/I18NextContext';
import { useTranslation } from '@/app/i18n/client';

const NumberTable = ({ data }) => {
    const { i18Lang } = useContext(I18NextContext);
    const { t } = useTranslation(i18Lang, 'common');
    const { convertCurrency } = useContext(SettingContext)
    return (
        <div className="tracking-wrapper table-responsive">
            <Table className="product-table">
                <thead>
                    <tr>
                        <th scope="col">{t("Image")}</th>
                        <th scope="col">{t("Name")}</th>
                        <th scope="col">{t("Price")}</th>
                        <th scope="col">{t("Quantity")}</th>
                        <th scope="col">{t("Subtotal")}</th>
                    </tr>
                </thead>
                <tbody>
                    {data?.products?.map((elem, index) => {
                        const singlePrice = Number(elem?.pivot?.single_price ?? elem?.price ?? 0);
                        const quantity = Number(elem?.pivot?.quantity ?? 1);
                        const lineSubtotal = singlePrice * quantity;
                        const pivotSubtotal = Number(elem?.pivot?.subtotal ?? 0);
                        const pivotTax = Number(elem?.pivot?.tax ?? 0);
                        // If GST was back-calculated, line total is single_price * quantity (or subtotal + tax)
                        const finalSubtotal = lineSubtotal > 0 ? lineSubtotal : (pivotSubtotal + pivotTax || pivotSubtotal);
                        const hasExtractedTax = pivotTax > 0 && Math.abs((pivotSubtotal + pivotTax) - finalSubtotal) < 0.1;

                        return (
                        <tr key={index}>
                            <td className="product-image">
                                <Avatar customeClass={'img-fluid'} data={elem?.product_thumbnail} placeHolder={placeHolderImage} name={elem?.name} />
                            </td>
                            <td>
                                <h6>{elem?.pivot?.variation ? elem?.pivot?.variation?.name : elem?.name}</h6>
                            </td>
                            <td>
                                <h6>{convertCurrency(singlePrice || elem?.pivot?.single_price)}</h6>
                            </td>
                            <td>
                                <h6>{quantity}</h6>
                            </td>
                            <td>
                                <h6>{convertCurrency(finalSubtotal)}</h6>
                                {hasExtractedTax && (
                                    <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', fontWeight: 'normal' }}>
                                        ({t("ExclTax") || "Excl. tax"}: {convertCurrency(pivotSubtotal)})
                                    </span>
                                )}
                            </td>
                        </tr>
                        );
                    })}
                </tbody>
            </Table>
        </div>
    )
}

export default NumberTable