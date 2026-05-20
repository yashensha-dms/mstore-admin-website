import React from 'react'
import { Card, CardBody, Col, Container, Row, Button } from 'reactstrap'
import UpdateStatus from './UpdateStatus'
import { Form, Formik } from 'formik'
import NumberTable from './NumberTable'

const OrderNumberTable = ({ moduleName, data, orderStatusData, setOrderStatus, orderStatus, mutate, orderStatusUpdate, edit, refetch }) => {
    const handleStatusChange = (statusSlug) => {
        const newStatus = orderStatusData?.find(s => s.slug === statusSlug);
        if (newStatus) {
            mutate({
                _method: "put",
                order_status_id: newStatus.id
            });
            setOrderStatus(newStatus);
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

    const handlePaymentStatusChange = (status) => {
        mutate({
            _method: "put",
            payment_status: status
        });
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
                                </div>
                                <div className="d-flex flex-column gap-3 w-100">
                                    {edit && !data?.sub_orders?.length && (
                                        <div className="status-button-bar d-flex flex-column gap-3 w-100">
                                            <div className="d-flex align-items-center gap-2 flex-wrap">
                                                <span className="fw-bold me-2 text-muted" style={{ fontSize: '12px' }}>Order Status:</span>
                                                {statusActions.map((action) => (
                                                    <Button 
                                                        key={action.slug}
                                                        color={orderStatus?.slug === action.slug ? action.color : action.color}
                                                        outline={orderStatus?.slug !== action.slug}
                                                        size="sm"
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
                                                            onClick={() => handleStatusChange(action.slug)}
                                                            className="text-capitalize"
                                                        >
                                                            {action.label}
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>
                                            
                                            <div className="d-flex align-items-center gap-2 flex-wrap border-top pt-2">
                                                <span className="fw-bold me-2 text-muted" style={{ fontSize: '12px' }}>Payment Status:</span>
                                                {paymentActions.map((action) => (
                                                    <Button 
                                                        key={action.slug}
                                                        color={data?.payment_status === action.slug ? action.color : action.color}
                                                        outline={data?.payment_status !== action.slug}
                                                        style={{ padding: '2px 10px', fontSize: '11px' }}
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