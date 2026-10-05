import dynamic from 'next/dynamic'
import Loader from '../CommonComponent/Loader'
import { Col, TabContent, TabPane } from 'reactstrap'

// loading must be a function component, not a JSX element
const TabLoader = () => <Loader />

const GeneralTab = dynamic(() => import('./GeneralTab'), { loading: TabLoader })
const InventoryTab = dynamic(() => import('./InventoryTab'), { loading: TabLoader })
const SetupTab = dynamic(() => import('./SetupTab'), { loading: TabLoader })
const ImagesTab = dynamic(() => import('./ImagesTab'), { loading: TabLoader })
const SeoTab = dynamic(() => import('./SeoTab'), { loading: TabLoader })
const ShippingTaxTab = dynamic(() => import('./ShippingTaxTab'), { loading: TabLoader })
const OptionsTab = dynamic(() => import('./OptionsTab'), { loading: TabLoader })

const AllProductTabs = ({ values, setFieldValue, errors, updateId, activeTab }) => {
    return (
        <Col xl="7" lg="8">
            <TabContent activeTab={activeTab}>
                <TabPane tabId="1" className="some">
                    <GeneralTab values={values} setFieldValue={setFieldValue} />
                </TabPane>
                <TabPane tabId="2">
                    <InventoryTab values={values} setFieldValue={setFieldValue} errors={errors} updateId={updateId} />
                </TabPane>
                <TabPane tabId="3">
                    <SetupTab values={values} setFieldValue={setFieldValue} errors={errors} updateId={updateId} />
                </TabPane>
                <TabPane tabId="4">
                    <ImagesTab values={values} setFieldValue={setFieldValue} errors={errors} updateId={updateId} />
                </TabPane>
                <TabPane tabId="5">
                    <SeoTab values={values} setFieldValue={setFieldValue} updateId={updateId} />
                </TabPane>
                <TabPane tabId="6">
                    <ShippingTaxTab />
                </TabPane>
                <TabPane tabId="7">
                    <OptionsTab />
                </TabPane>
            </TabContent>
        </Col>
    )
}

export default AllProductTabs