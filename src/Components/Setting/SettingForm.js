import { useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Row, Col, Card } from "reactstrap";
import { Form, Formik } from "formik";
import { SettingTabTitleListData } from "../../Data/TabTitleListData";
import request from "../../Utils/AxiosUtils";
import TabTitle from "../Coupon/TabTitle";
import { setting } from "../../Utils/AxiosUtils/API";
import AllTabs from "./AllTabs";
import Btn from "../../Elements/Buttons/Btn";
import usePermissionCheck from "../../Utils/Hooks/usePermissionCheck";
import { YupObject } from "../../Utils/Validation/ValidationSchemas";
import I18NextContext from "@/Helper/I18NextContext";
import { useTranslation } from "@/app/i18n/client";

const SettingForm = ({ mutate, loading, title }) => {
  const { i18Lang } = useContext(I18NextContext);
  const { t } = useTranslation(i18Lang, 'common');
  const [edit] = usePermissionCheck(["edit"]);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("1");
  const { data, isLoading, refetch } = useQuery([setting], () => request({ url: setting }), { enabled: false, refetchOnWindowFocus: false, select: (res) => res.data });
  let IncludeList = ['status', "coupon_enable", "point_enable", "product_auto_approve", "stock_product_hide", "wallet_enable", 'same_day_delivery', "is_category_based_commission", "multivendor", "sandbox_mode", "store_auto_approve", "maintenance_mode"]
  const RecursiveSet = ({ data }) => {
    if (data && typeof data == 'object') {
      Object.keys(data).forEach(key => {
        if (data[key] == 0 && IncludeList.includes(key)) {
          data[key] = false
        } else if (data[key] == 1 && IncludeList.includes(key)) {
          data[key] = true
        } else {
          RecursiveSet({ data: data[key] });
        }
      })
    }
  }
  useEffect(() => {
    refetch()
  }, [])
  
  let NewSettingsData = data?.values || {};
  if (!NewSettingsData.general) {
    NewSettingsData.general = {};
  }
  if (!NewSettingsData.activation) {
    NewSettingsData.activation = {};
  }
  if (!NewSettingsData.wallet_points) {
    NewSettingsData.wallet_points = {};
  }
  
  // Fully initialize email configuration so all keys exist in request payload
  if (!NewSettingsData.email) {
    NewSettingsData.email = {
      mail_mailer: "smtp",
      mail_host: "",
      mail_port: "",
      mail_username: "",
      mail_password: "",
      mail_encryption: "",
      mail_from_address: "",
      mail_from_name: "",
      mailgun_domain: "",
      mailgun_secret: "",
    };
  } else {
    NewSettingsData.email.mail_mailer = NewSettingsData.email.mail_mailer || "smtp";
    NewSettingsData.email.mail_host = NewSettingsData.email.mail_host || "";
    NewSettingsData.email.mail_port = NewSettingsData.email.mail_port || "";
    NewSettingsData.email.mail_username = NewSettingsData.email.mail_username || "";
    NewSettingsData.email.mail_password = NewSettingsData.email.mail_password || "";
    NewSettingsData.email.mail_encryption = NewSettingsData.email.mail_encryption || "";
    NewSettingsData.email.mail_from_address = NewSettingsData.email.mail_from_address || "";
    NewSettingsData.email.mail_from_name = NewSettingsData.email.mail_from_name || "";
    NewSettingsData.email.mailgun_domain = NewSettingsData.email.mailgun_domain || "";
    NewSettingsData.email.mailgun_secret = NewSettingsData.email.mailgun_secret || "";
  }

  if (!NewSettingsData.vendor_commissions) {
    NewSettingsData.vendor_commissions = {};
  }
  if (!NewSettingsData.refund) {
    NewSettingsData.refund = {};
  }
  if (!NewSettingsData.newsletter) {
    NewSettingsData.newsletter = {};
  }
  if (!NewSettingsData.delivery) {
    NewSettingsData.delivery = { same_day_intervals: [] };
  } else if (!NewSettingsData.delivery.same_day_intervals) {
    NewSettingsData.delivery.same_day_intervals = [];
  }

  // Fully initialize payment methods structure defensively
  if (!NewSettingsData.payment_methods) {
    NewSettingsData.payment_methods = {
      cod: { status: true, title: "Cash on Delivery" },
      paypal: { sandbox_mode: false, client_id: "", client_secret: "", status: false, title: "" },
      stripe: { key: "", secret: "", status: false, title: "" },
      ccavenue: { title: "", status: false, access_code: "", merchant_id: "", sandbox_mode: false, working_key: "" },
      razorpay: { key: "", secret: "", status: false, title: "" },
      mollie: { secret_key: "", status: false, title: "" },
      instamojo: { client_id: "", client_secret: "", salt_key: "", sandbox_mode: false, status: false, title: "" },
      phonepe: { merchant_id: "", salt_index: "", salt_key: "", sandbox_mode: false, status: false, title: "" },
    };
  } else {
    NewSettingsData.payment_methods.cod = NewSettingsData.payment_methods.cod || { status: true, title: "Cash on Delivery" };
    NewSettingsData.payment_methods.paypal = NewSettingsData.payment_methods.paypal || { sandbox_mode: false, client_id: "", client_secret: "", status: false, title: "" };
    NewSettingsData.payment_methods.stripe = NewSettingsData.payment_methods.stripe || { key: "", secret: "", status: false, title: "" };
    NewSettingsData.payment_methods.ccavenue = NewSettingsData.payment_methods.ccavenue || { title: "", status: false, access_code: "", merchant_id: "", sandbox_mode: false, working_key: "" };
    NewSettingsData.payment_methods.razorpay = NewSettingsData.payment_methods.razorpay || { key: "", secret: "", status: false, title: "" };
    NewSettingsData.payment_methods.mollie = NewSettingsData.payment_methods.mollie || { secret_key: "", status: false, title: "" };
    NewSettingsData.payment_methods.instamojo = NewSettingsData.payment_methods.instamojo || { client_id: "", client_secret: "", salt_key: "", sandbox_mode: false, status: false, title: "" };
    NewSettingsData.payment_methods.phonepe = NewSettingsData.payment_methods.phonepe || { merchant_id: "", salt_index: "", salt_key: "", sandbox_mode: false, status: false, title: "" };
  }

  if (!NewSettingsData.analytics) {
    NewSettingsData.analytics = {};
  }
  if (!NewSettingsData.googleReCaptcha) {
    NewSettingsData.googleReCaptcha = {};
  }
  if (!NewSettingsData.maintenance) {
    NewSettingsData.maintenance = {};
  }
  NewSettingsData.activation.product_auto_approve = true;
  NewSettingsData.activation.store_auto_approve = true;
  RecursiveSet({ data: NewSettingsData })
  if (isLoading && !data) return null;

  const validationSchema = YupObject({});
  return (
    <Formik
      enableReinitialize
      initialValues={{
        light_logo_image: "", light_logo_image_id: "",
        dark_logo_image: "", dark_logo_image_id: "",
        tiny_logo_image: "", tiny_logo_image_id: "",
        favicon_image: "", favicon_image_id: "",
        values: NewSettingsData || {}, default_timezone: NewSettingsData?.general?.default_timezone || "Asia/Kolkata",
        mail_mailer: NewSettingsData?.email?.mail_mailer || "smtp", maintenance_image: "", maintenance_image_id: "", mail_encryption: NewSettingsData?.email?.mail_encryption || ""
      }}
      validationSchema={validationSchema}
      onSubmit={(values) => {
        values["_method"] = "put";
        values['values']["general"]["default_timezone"] = values["default_timezone"]
        values['values']["email"]["mail_mailer"] = values["mail_mailer"]
        values['values']["email"]["mail_encryption"] = values["mail_encryption"]
        values['values']["general"]["light_logo_image_id"] = values["light_logo_image_id"] ? values["light_logo_image_id"] : ""
        values['values']["general"]["favicon_image_id"] = values["favicon_image_id"] ? values["favicon_image_id"] : ''
        values['values']["general"]["dark_logo_image_id"] = values["dark_logo_image_id"] ? values["dark_logo_image_id"] : ''
        values['values']["general"]["tiny_logo_image_id"] = values["tiny_logo_image_id"] ? values["tiny_logo_image_id"] : ''
        values['values']["maintenance"]["maintenance_image_id"] = values["maintenance_image_id"] ? values["maintenance_image_id"] : ''
        mutate(values);
      }}>
      {({ values, errors, touched, setFieldValue }) => {
        if (typeof window !== "undefined" && Object.keys(errors).length > 0) {
          console.warn("Formik Validation Errors blocking submit:", errors);
        }
        return (
          <Col>
            <Card>
              <div className="title-header option-title">
                <h5>{t(title)}</h5>
              </div>
              <Form className="theme-form theme-form-2 mega-form vertical-tabs">
                <Row>
                  <Col xl="3" lg="4">
                    <TabTitle activeTab={activeTab} setActiveTab={setActiveTab} titleList={SettingTabTitleListData} errors={errors} touched={touched} />
                  </Col>
                  <AllTabs values={values} activeTab={activeTab} setFieldValue={setFieldValue} errors={errors} touched={touched} />
                  <div className="ms-auto justify-content-end dflex-wgap mt-4 save-back-button">
                    <Btn className="me-2 btn-outline btn-lg" title="Back" onClick={() => router.back()} />
                    {edit && <Btn className="btn-primary btn-lg" type="submit" title="Save" loading={Number(loading)} />}
                  </div>
                </Row>
              </Form>
            </Card>
          </Col>
        );
      }}
    </Formik>
  );
};

export default SettingForm;
