import { Col, TabContent, TabPane } from 'reactstrap'
import GeneralTab from './GeneralTab'
import ActivationTab from './ActivationTab'
import WalletPointTab from './WalletPointTab'
import EmailTab from './EmailTab'
import VendorCommissionTab from './VendorCommissionTab'
import RefundTab from './Refund'
import NewsLetterTab from './NewsLetterTab'
import DeliveyTab from './DeliveyTab'
import PaymentMethodsTab from './PaymentMethodsTab'
import AnalyticsTab from './AnalyticsTab'
import GoogleReCaptcha from './GoogleReCaptcha'
import MaintenanceTab from './MaintenanceTab'

const AllTabs = ({ values, activeTab, setFieldValue, errors, touched }) => {
    return (
        <>
            <Col xl="7" lg="8">
                <TabContent activeTab={activeTab}>
                    <TabPane tabId="1"><GeneralTab values={values} setFieldValue={setFieldValue} errors={errors} /></TabPane>
                    <TabPane tabId="2"><ActivationTab /></TabPane>
                    <TabPane tabId="3"><WalletPointTab /></TabPane>
                    <TabPane tabId="4"><RefundTab values={values} /></TabPane>
                    <TabPane tabId="5"><DeliveyTab values={values} setFieldValue={setFieldValue} /></TabPane>
                    <TabPane tabId="6"><PaymentMethodsTab errors={errors} touched={touched} /></TabPane>
                    <TabPane tabId="7"><AnalyticsTab errors={errors} touched={touched} /> </TabPane>
                    <TabPane tabId="8"><GoogleReCaptcha /></TabPane>
                    <TabPane tabId="9"><MaintenanceTab values={values} setFieldValue={setFieldValue} errors={errors} /></TabPane>
                </TabContent>
            </Col>
        </>
    )
}

export default AllTabs