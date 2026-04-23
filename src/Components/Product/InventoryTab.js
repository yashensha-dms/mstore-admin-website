import React, { useContext, useEffect, useRef } from "react";
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
  // Track which field the user last edited so the two effects don't loop into each other.
  // 'price_discount' means Effect 1 should run; 'sale_price' means Effect 2 should run.
  const lastChangedRef = useRef(null);

  // Effect 1: user changed price or discount → recompute sale_price
  useEffect(() => {
    if (lastChangedRef.current === 'sale_price') {
      // sale_price effect just fired; don't override it
      lastChangedRef.current = null;
      return;
    }
    lastChangedRef.current = 'price_discount';
    if (Number(values['price']) > 0) {
      const salePriceValue = Number(values['price']) - ((Number(values['price']) * Number(values['discount'] || 0)) / 100);
      setFieldValue("sale_price", parseFloat(salePriceValue.toFixed(2)));
    }
  }, [values['price'], values['discount']])

  // Effect 2: user changed sale_price → recompute discount
  useEffect(() => {
    if (lastChangedRef.current === 'price_discount') {
      // price/discount effect just fired; don't override it
      lastChangedRef.current = null;
      return;
    }
    lastChangedRef.current = 'sale_price';
    const price = Number(values['price']);
    const salePrice = Number(values['sale_price']);
    if (price > 0 && salePrice >= 0) {
      const discountValue = ((price - salePrice) / price) * 100;
      if (Math.abs(Number(values['discount']) - discountValue) > 0.01) {
        setFieldValue("discount", parseFloat(discountValue.toFixed(2)));
      }
    }
  }, [values['sale_price']])

  // Effect 3: barcode changes → prefill SKU if user hasn't manually edited it.
  // We track the last barcode value we copied into SKU. If SKU still matches that,
  // the user hasn't overridden it, so we keep syncing. Otherwise leave SKU alone.
  const lastSyncedBarcodeRef = useRef(null);
  useEffect(() => {
    const barcode = values['barcode'] || '';
    const currentSku = values['sku'] || '';
    // Sync if SKU is empty, or if SKU still equals the last barcode we copied in
    if (currentSku === '' || currentSku === lastSyncedBarcodeRef.current) {
      setFieldValue('sku', barcode);
      lastSyncedBarcodeRef.current = barcode;
    }
  }, [values['barcode']])

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
        { name: "barcode", title: "Barcode", placeholder: t("EnterBarcode") },
        { name: "sku", title: "SKU", require: "true", placeholder: t("EnterSKU") }, 
        { name: "quantity", title: "StockQuantity", placeholder: t("EnterQuantity"), type: "number", require: "true" }, 
        { name: "cost", title: "PurchasePrice", type: "number", inputaddon: "true", placeholder: t("EnterPurchasePrice") },
        { name: "price", title: "MRP", type: "number", inputaddon: "true", placeholder: t("EnterPrice"), require: "true" }, 
        { name: "sale_price", title: "SellingPrice", type: "number", inputaddon: "true" }, 
        { name: "discount", type: "number", inputaddon: "true", postprefix: "%", placeholder: t("EnterDiscount"), min: "0", max: "100", step: "0.01" }
      ]} />}
      <ProductDateRangePicker values={values} setFieldValue={setFieldValue} />
      {values["type"] === "classified" && <VariationsTab updateId={updateId} values={values} setFieldValue={setFieldValue} errors={errors} />}
    </>
  );
};

export default InventoryTab;
