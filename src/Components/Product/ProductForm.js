import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Form, Formik } from "formik";
import { Row, Col, Card } from "reactstrap";
import { ProductTabTitleListData } from "../../Data/TabTitleListData";
import FormBtn from "../../Elements/Buttons/FormBtn";
import request from "../../Utils/AxiosUtils";
import { product } from "../../Utils/AxiosUtils/API";
import { YupObject } from "../../Utils/Validation/ValidationSchemas";
import Loader from "../CommonComponent/Loader";
import TabTitle from "../Coupon/TabTitle";
import { ProductInitValues, ProductValidationSchema } from "./ProductObjects";
import ProductSubmitFunction from "./ProductSubmitFunction";
import AllProductTabs from "./AllProductTabs";
import I18NextContext from "@/Helper/I18NextContext";
import { useTranslation } from "@/app/i18n/client";
import { ToastNotification } from "../../Utils/CustomFunctions/ToastNotification";

const ProductForm = ({ mutate, loading, updateId, title }) => {
  const { i18Lang } = useContext(I18NextContext);
  const { t } = useTranslation(i18Lang, 'common');
  const [activeTab, setActiveTab] = useState("1");
  const formikRef = useRef(null);

  const { data: oldData, isLoading: oldDataLoading, refetch, status } = useQuery([updateId], () => request({ url: `${product}/${updateId}` }), { refetchOnWindowFocus: false, enabled: false, select: (data) => data.data });
  useEffect(() => {
    if (updateId) {
      refetch();
    }
  }, [updateId]);
  const watchEvent = useCallback((oldData, updateId) => {
    return ProductInitValues(oldData, updateId)
  }, [oldData, updateId])

  // Block rendering until data is loaded for update mode.
  // "idle" = refetch() not yet fired (first render), "loading" = in-flight.
  // Formik only reads initialValues ONCE on mount, so we must not render until oldData is ready.
  if (updateId && (status === "idle" || oldDataLoading)) return <Loader />;

  const handleSubmitClick = async () => {
    if (!formikRef.current) return;
    // Run validation manually so we can intercept errors before Formik silently blocks
    const errors = await formikRef.current.validateForm();
    const errorKeys = Object.keys(errors);
    if (errorKeys.length > 0) {
      // Build a human-readable message from the first error
      const firstKey = errorKeys[0];
      const firstMsg = typeof errors[firstKey] === 'string'
        ? errors[firstKey]
        : JSON.stringify(errors[firstKey]);
      ToastNotification("error", `"${firstKey}" — ${firstMsg}`);
      // Also mark all as touched so field-level errors show in the UI
      formikRef.current.setTouched(
        errorKeys.reduce((acc, k) => ({ ...acc, [k]: true }), {})
      );
    }
    // Let Formik's own submit proceed (it will skip onSubmit if errors exist)
    formikRef.current.submitForm();
  };

  return (
    <Formik
      innerRef={formikRef}
      initialValues={{ ...watchEvent(oldData, updateId) }}
      validationSchema={YupObject({
        ...ProductValidationSchema,
      })}
      onSubmit={(values) => {
        if (updateId) {
          values["_method"] = "put"
        }
        ProductSubmitFunction(mutate, values, updateId);
      }}>
      {({ values, setFieldValue, errors, touched }) => (
        <Form className="theme-form theme-form-2 mega-form vertical-tabs">
          <Row>
            <Col>
              <Card>
                <div className="title-header option-title">
                  <h5>{t(title)}</h5>
                </div>
                <Row>
                  <Col xl="3" lg="4">
                    <TabTitle activeTab={activeTab} setActiveTab={setActiveTab} titleList={ProductTabTitleListData} errors={errors} touched={touched} />
                  </Col>
                  <AllProductTabs values={values} activeTab={activeTab} setFieldValue={setFieldValue} errors={errors} updateId={updateId} />
                  <FormBtn loading={loading} onSaveClick={handleSubmitClick} />
                </Row>
              </Card>
            </Col>
          </Row>
        </Form>
      )}
    </Formik>
  );
};

export default ProductForm;