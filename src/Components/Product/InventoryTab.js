import React, { useContext, useEffect } from "react";
import SearchableSelectInput from "../InputFields/SearchableSelectInput";
import SimpleInputField from "../InputFields/SimpleInputField";
import VariationsTab from "./VariationsTab";
import ProductDateRangePicker from "./DateRangePicker";
import I18NextContext from "@/Helper/I18NextContext";
import { useTranslation } from "@/app/i18n/client";
import CheckBoxField from "../InputFields/CheckBoxField";

const InventoryTab = ({ values, setFieldValue, errors, updateId }) => {
  const { i18Lang } = useContext(I18NextContext);
  const { t } = useTranslation(i18Lang, 'common');
  // Set the value of sale price
  // Set the value of sale price
  useEffect(() => {
    if (values['price'] > 0) {
      let salePriceValue = values['price'] - ((values['price'] * values['discount']) / 100);
      setFieldValue("sale_price", salePriceValue)
    }
  }, [values['price'], values['discount']])

  useEffect(() => {
    if (values['price'] > 0 && values['sale_price'] >= 0) {
      let discountValue = ((values['price'] - values['sale_price']) / values['price']) * 100;
      if (Math.abs(values['discount'] - discountValue) > 0.01) {
        setFieldValue("discount", discountValue.toFixed(2))
      }
    }
  }, [values['sale_price']])

  return (
    <>
      <SearchableSelectInput
        nameList={[
          {
            name: "type",
            require: "true",
            inputprops: {
              name: "type",
              id: "type",
              options: [
                { id: "simple", name: "Simple" },
                { id: "classified", name: "Classified" },
              ],
            },
          },
        ]}
      />
      {/* <CheckBoxField name="is_external" title="is_external" />
        {values['is_external'] && 
            <SimpleInputField 
              nameList={[
                { name:'external_url', placeholder:t("EnterExternalUrl"), require: "true"},
                { name:'external_button_text', placeholder:t("EnterExternalButtonText")}
              ]} 
            />
      } */}
      <SimpleInputField nameList={[
        { name: "hsn_code", title: "HSNCode", placeholder: t("EnterHSNCode") },
        { name: "unit", placeholder: t("EnterUnit(e.g10pieces)"), helpertext: "*Specify the measurement unit, such as 10 Pieces, 1 KG, 1 Ltr, etc." }, 
        { name: "weight", type: "number", placeholder: t("EnterweightGms(e.g100)"), helpertext: "*Specify the weight of this product in Gms." }
      ]} />
      {values["type"] === "simple" && <SearchableSelectInput
        nameList={[
          {
            name: "stock_status",
            title: "StockStatus",
            require: 'true',
            inputprops: {
              name: "stock_status",
              id: "stock_status",
              options: [
                { id: "in_stock", name: "InStock" },
                { id: "out_of_stock", name: "OutOfStock" },
              ],
            },
          },
        ]}
      />}
      {values["type"] === "simple" && <SimpleInputField nameList={[
        { name: "sku", title: "SKU", require: "true", placeholder: t("EnterSKU") }, 
        { name: "barcode", title: "Barcode", placeholder: t("EnterBarcode") },
        { name: "quantity", title: "StockQuantity", placeholder: t("EnterQuantity"), type: "number", require: "true" }, 
        { name: "cost", title: "PurchasePrice", type: "number", inputaddon: "true", placeholder: t("EnterPurchasePrice"), require: "true" },
        { name: "price", title: "MRP", type: "number", inputaddon: "true", placeholder: t("EnterPrice"), require: "true" }, 
        { name: "sale_price", title: "SellingPrice", type: "number", inputaddon: "true" }, 
        { name: "discount", type: "number", inputaddon: "true", postprefix: "%", placeholder: t("EnterDiscount"), min: "0", max: "100" }
      ]} />}
      <ProductDateRangePicker values={values} setFieldValue={setFieldValue} />
      {values["type"] === "classified" && <VariationsTab updateId={updateId} values={values} setFieldValue={setFieldValue} errors={errors} />}
    </>
  );
};

export default InventoryTab;
