import React, { useState } from 'react'
import { Card, CardBody, Col, Container, Row, Button, Spinner } from 'reactstrap'
import UpdateStatus from './UpdateStatus'
import { Form, Formik } from 'formik'
import NumberTable from './NumberTable'
import request from '../../../Utils/AxiosUtils'
import { OrderAPI } from '../../../Utils/AxiosUtils/API'

const OrderNumberTable = ({ moduleName, data, orderStatusData, setOrderStatus, orderStatus, mutate, orderStatusUpdate, edit, refetch }) => {
    const [updating, setUpdating] = useState(false);

    const handleStatusChange = async (statusSlug) => {
        const newStatus = orderStatusData?.find(s => s.slug === statusSlug);
        if (!newStatus) return;

        setOrderStatus(newStatus);

        // If parent order has sub-orders, update parent AND each sub-order simultaneously
        if (data?.sub_orders?.length > 0) {
            setUpdating(true);
            try {
                const updatePromises = [
                    // Update parent order
                    request({
                        url: `${OrderAPI}/${data.id}`,
                        data: { _method: "put", order_status_id: newStatus.id },
                        method: "post"
                    }),
                    // Update all sub-orders
                    ...data.sub_orders.map(subOrder => 
                        request({
                            url: `${OrderAPI}/${subOrder.id}`,
                            data: { _method: "put", order_status_id: newStatus.id },
                            method: "post"
                        })
                    )
                ];
                await Promise.allSettled(updatePromises);
                refetch && refetch();
            } catch (err) {
                console.error("Error updating order statuses:", err);
            } finally {
                setUpdating(false);
            }
        } else {
            // Single order
            mutate({
                _method: "put",
                order_status_id: newStatus.id
            });
        }
    }

    React.useEffect(() => {
        if (orderStatusUpdate?.status === 200 || orderStatusUpdate?.status === 201) {
            refetch && refetch();
        }
    }, [orderStatusUpdate]);

    const statusActions = [
        { label: 'Pending', slug: 'pending', color: 'secondary' },
        { label: 'Packed', slug: 'packed', color: 'info' },
        { label: 'Out for Delivery', slug: 'out-for-delivery', color: 'warning' },
        { label: 'Delivered', slug: 'delivered', color: 'success' },
    ];

    const secondaryActions = [
        { label: 'Returned', slug: 'returned', color: 'danger' },
        { label: 'Cancelled', slug: 'cancelled', color: 'dark' },
    ];

    const paymentActions = [
        { label: 'Pending', slug: 'PENDING', color: 'secondary' },
        { label: 'Completed', slug: 'COMPLETED', color: 'success' },
        { label: 'Cancelled', slug: 'CANCELLED', color: 'dark' },
        { label: 'Failed', slug: 'FAILED', color: 'danger' },
    ];

    const handlePaymentStatusChange = async (status) => {
        if (data?.sub_orders?.length > 0) {
            setUpdating(true);
            try {
                const updatePromises = [
                    request({
                        url: `${OrderAPI}/${data.id}`,
                        data: { _method: "put", payment_status: status },
                        method: "post"
                    }),
                    ...data.sub_orders.map(subOrder =>
                        request({
                            url: `${OrderAPI}/${subOrder.id}`,
                            data: { _method: "put", payment_status: status },
                            method: "post"
                        })
                    )
                ];
                await Promise.allSettled(updatePromises);
                refetch && refetch();
            } catch (err) {
                console.error("Error updating payment statuses:", err);
            } finally {
                setUpdating(false);
            }
        } else {
            mutate({
                _method: "put",
                payment_status: status
            });
        }
    }

    return (
        <Container fluid={true}>
            <Row>
                <Col xs="12">
                    <Card>
                        <CardBody>
                            <div className="title-header">
                                <div className="d-flex align-items-center">
                                    <h5>{moduleName}</h5>
                                    {updating && <Spinner size="sm" color="primary" className="ms-2" />}
                                </div>
                                <div className="d-flex flex-column gap-3 w-100">
                                    {edit && (
                                        <div className="status-button-bar d-flex flex-column gap-3 w-100">
                                            <div className="d-flex align-items-center gap-2 flex-wrap">
                                                <span className="fw-bold me-2 text-muted" style={{ fontSize: '12px' }}>
                                                    {data?.sub_orders?.length > 0 ? "Order Status (All Products):" : "Order Status:"}
                                                </span>
                                                {statusActions.map((action) => (
                                                    <Button 
                                                        key={action.slug}
                                                        color={orderStatus?.slug === action.slug ? action.color : action.color}
                                                        outline={orderStatus?.slug !== action.slug}
                                                        size="sm"
                                                        disabled={updating}
                                                        onClick={() => handleStatusChange(action.slug)}
                                                        className="text-capitalize"
                                                    >
                                                        {action.label}
                                                    </Button>
                                                ))}
                                                <div className="ms-3 d-flex gap-2 border-start ps-3">
                                                    {secondaryActions.map((action) => (
                                                        <Button 
                                                            key={action.slug}
                                                            color={orderStatus?.slug === action.slug ? action.color : action.color}
                                                            outline={orderStatus?.slug !== action.slug}
                                                            size="sm"
                                                            disabled={updating}
                                                            onClick={() => handleStatusChange(action.slug)}
                                                            className="text-capitalize"
                                                        >
                                                            {action.label}
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>
                                            
                                            <div className="d-flex align-items-center gap-2 flex-wrap border-top pt-2">
                                                <span className="fw-bold me-2 text-muted" style={{ fontSize: '12px' }}>
                                                    {data?.sub_orders?.length > 0 ? "Payment Status (All Products):" : "Payment Status:"}
                                                </span>
                                                {paymentActions.map((action) => (
                                                    <Button 
                                                        key={action.slug}
                                                        color={data?.payment_status === action.slug ? action.color : action.color}
                                                        outline={data?.payment_status !== action.slug}
                                                        style={{ padding: '2px 10px', fontSize: '11px' }}
                                                        disabled={updating}
                                                        onClick={() => handlePaymentStatusChange(action.slug)}
                                                        className="text-capitalize"
                                                    >
                                                        {action.label}
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <NumberTable data={data} />
                        </CardBody>
                    </Card>
                </Col>
            </Row>
        </Container>
    )
}

export default OrderNumberTable