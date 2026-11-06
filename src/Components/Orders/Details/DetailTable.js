import React, { useContext, useState } from 'react'
import { Table, Button, Spinner } from 'reactstrap'
import { RiEyeLine } from 'react-icons/ri'
import Link from 'next/link'
import I18NextContext from '@/Helper/I18NextContext'
import { useTranslation } from '@/app/i18n/client'
import SettingContext from '@/Helper/SettingContext'
import { dateFormate } from '@/Utils/CustomFunctions/DateFormate'
import request from '../../../Utils/AxiosUtils'
import { OrderAPI } from '../../../Utils/AxiosUtils/API'

const DetailTable = ({ data, orderStatusData, refetch }) => {
    const { i18Lang } = useContext(I18NextContext);
    const { t } = useTranslation(i18Lang, 'common');
    const { convertCurrency } = useContext(SettingContext)
    const [rowLoading, setRowLoading] = useState({});

    const handleSubOrderStatus = async (subOrderId, statusSlug) => {
        const newStatus = orderStatusData?.find(s => s.slug === statusSlug);
        if (!newStatus) return;

        setRowLoading(prev => ({ ...prev, [subOrderId]: true }));
        try {
            await request({
                url: `${OrderAPI}/${subOrderId}`,
                data: { _method: "put", order_status_id: newStatus.id },
                method: "post"
            });
            refetch && refetch();
        } catch (err) {
            console.error("Failed to update sub-order status:", err);
        } finally {
            setRowLoading(prev => ({ ...prev, [subOrderId]: false }));
        }
    };

    const quickStatuses = [
        { label: 'Out for Delivery', slug: 'out-for-delivery', color: 'warning' },
        { label: 'Delivered', slug: 'delivered', color: 'success' },
        { label: 'Cancelled', slug: 'cancelled', color: 'dark' },
    ];

    return (
        <div className='table-responsive'>
            <Table className="table all-package theme-table no-footer">
                <thead>
                    <tr>
                        <th scope="col">{t("OrderNumber")}</th>
                        <th scope="col">{t("OrderDate")}</th>
                        <th scope="col">{t("TotalAmount")}</th>
                        <th scope="col">{t("Status")}</th>
                        <th scope="col">{t("Action")}</th>
                    </tr>
                </thead>
                <tbody>
                    {data?.sub_orders?.map((elem, index) => {
                        const isLoading = rowLoading[elem?.id];
                        const currentStatus = elem?.order_status;
                        return (
                            <tr key={index}>
                                <td>
                                    <h6>#{elem?.order_number}</h6>
                                </td>
                                <td>
                                    <h6>{dateFormate(elem?.created_at)}</h6>
                                </td>
                                <td>
                                    <h6>{convertCurrency(elem?.amount)}</h6>
                                </td>
                                <td>
                                    <div className="d-flex align-items-center gap-1 flex-wrap">
                                        <span className="badge me-1" style={{ 
                                            backgroundColor: currentStatus?.slug === 'delivered' ? '#198754' : 
                                                            currentStatus?.slug === 'out-for-delivery' ? '#ffc107' : 
                                                            currentStatus?.slug === 'cancelled' ? '#212529' : '#0d6efd',
                                            color: currentStatus?.slug === 'out-for-delivery' ? '#000' : '#fff'
                                        }}>
                                            {currentStatus?.name || elem?.order_status?.name || 'Pending'}
                                        </span>
                                        {isLoading && <Spinner size="sm" color="primary" />}
                                    </div>
                                </td>
                                <td>
                                    <div className="d-flex align-items-center gap-2">
                                        <Link href={`${elem?.order_number}`} className="btn btn-sm btn-outline-secondary p-1">
                                            <RiEyeLine size={16} />
                                        </Link>
                                    </div>
                                </td>
                            </tr >
                        )
                    })}
                </tbody >
            </Table>
        </div>
    )
}

export default DetailTable