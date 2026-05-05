import React from 'react'
import { Card, CardBody, Col, Container, Row, Button } from 'reactstrap'
import UpdateStatus from './UpdateStatus'
import { Form, Formik } from 'formik'
import NumberTable from './NumberTable'

const OrderNumberTable = ({ moduleName, data, orderStatusData, setOrderStatus, orderStatus, mutate, orderStatusUpdate, edit }) => {
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
                                <div className="d-flex align-items-center gap-2">
                                    {edit && !data?.sub_orders?.length && (
                                        <>
                                            {orderStatus?.slug === 'pending' && (
                                                <Button color="primary" size="sm" onClick={() => handleStatusChange('packed')}>
                                                    Mark as Packed
                                                </Button>
                                            )}
                                            {orderStatus?.slug === 'packed' && (
                                                <Button color="primary" size="sm" onClick={() => handleStatusChange('out-for-delivery')}>
                                                    Dispatch Order
                                                </Button>
                                            )}
                                            {orderStatus?.slug === 'out-for-delivery' && (
                                                <>
                                                    <Button color="danger" size="sm" onClick={() => handleStatusChange('returned')}>
                                                        Mark Returned
                                                    </Button>
                                                    <Button color="success" size="sm" onClick={() => handleStatusChange('delivered')}>
                                                        Mark Delivered
                                                    </Button>
                                                </>
                                            )}
                                            {['pending', 'packed', 'out-for-delivery'].includes(orderStatus?.slug) && (
                                                <Button color="secondary" size="sm" outline onClick={() => handleStatusChange('cancelled')}>
                                                    Cancel
                                                </Button>
                                            )}
                                        </>
                                    )}

                                    {edit && <Formik initialValues={{
                                        order_status_id: ""
                                    }}>
                                        {({ values, setFieldValue }) => (
                                            <Form>
                                                {!data?.sub_orders?.length &&
                                                    (orderStatus?.slug != 'cancelled' && orderStatus?.slug != 'delivered' && orderStatus?.slug != 'returned')
                                                    && <UpdateStatus values={values} setFieldValue={setFieldValue} orderStatusData={orderStatusData} data={data} setOrderStatus={setOrderStatus} orderStatus={orderStatus} mutate={mutate} orderStatusUpdate={orderStatusUpdate} />}
                                            </Form>
                                        )}
                                    </Formik>}
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