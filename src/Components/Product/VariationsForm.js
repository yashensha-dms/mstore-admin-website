import React, { useEffect, useState, useContext, useRef } from "react";
import { RiArrowDownSLine } from "react-icons/ri";
import allPossibleCases from "../../Utils/CustomFunctions/AllPossibleCases";
import CheckBoxField from "../InputFields/CheckBoxField";
import FileUploadField from "../InputFields/FileUploadField";
import SearchableSelectInput from "../InputFields/SearchableSelectInput";
import SimpleInputField from "../InputFields/SimpleInputField";
import I18NextContext from "@/Helper/I18NextContext";
import { useTranslation } from "@/app/i18n/client";

const VariationsForm = React.memo(({ values, setFieldValue, newId, index, elem, errors }) => {
  const [active, setActive] = useState(false);
  const { i18Lang } = useContext(I18NextContext);
  const { t } = useTranslation(i18Lang, 'common');
  
  /* 
  // Effect: variation price (MRP) or sale_price (Selling Price) changed → recompute discount percentage
  useEffect(() => {
    const priceValue = Number(values[`variations`][index]?.price) || 0;
    const salePriceValue = Number(values[`variations`][index]?.sale_price) || 0;
    if (priceValue > 0 && salePriceValue >= 0) {
      const discountValue = ((priceValue - salePriceValue) / priceValue) * 100;
      if (Math.abs(Number(values[`variations`][index]?.discount) - discountValue) > 0.01) {
        setFieldValue(`variations[${index}][discount]`, parseFloat(discountValue.toFixed(2)));
      }
    }
  }, [values[`variations`][index]?.price, values[`variations`][index]?.sale_price])
  */

  
  return (
    <div className="mt-3 shipping-accordion-custom" key={index}>
      <div className="p-3 rule-dropdown d-flex justify-content-between" onClick={() => setActive((prev) => prev !== elem.id && elem.id)}>{newId}<RiArrowDownSLine />
      </div>
      {active === elem.id && (
        <div className="rule-edit-form">
          <SimpleInputField
            nameList={[
              { name: `variations[${index}][name]`, title: "name", placeholder: "Enter Name", require: "true", errormsg: "Name" },
              { name: `variations[${index}][cost]`, title: "PurchasePrice", type: "number", inputaddon: "true", placeholder: t("EnterPurchasePrice") },
              { name: `variations[${index}][price]`, title: "MRP", type: "number", placeholder: "Enter Price", require: "true", inputaddon: "true", errormsg: "Price", min: "0" },
              { name: `variations[${index}][sale_price]`, title: "SellingPrice", type: "number", inputaddon: "true", placeholder: "0.00" },
              // { name: `variations[${index}][discount]`, title: "discount", type: "number", min: '0', max: '100', step: "0.01", inputaddon: "true", placeholder: "Enter Discount", postprefix: "%" },
              { name: `variations[${index}][quantity]`, title: "Stock Quantity", type: "number", require: "true", errormsg: "Quantity", placeholder: "Enter Quantity", },
              { name: `variations[${index}][sku]`, title: "sku", require: "true", placeholder: "Enter SKU", errormsg: "SKU" },
              { name: `variations[${index}][barcode]`, title: "barcode", placeholder: "Enter Barcode" },
            ]}
          />
          <SearchableSelectInput
            nameList={[
              {
                name: `variations[${index}][stock_status]`,
                require: 'true',
                inputprops: {
                  name: `variations[${index}][stock_status]`,
                  id: `variations[${index}][stock_status]`,
                  options: [
                    { id: "in_stock", name: "InStock" },
                    { id: "out_of_stock", name: "OutOfStock" },
                  ],
                },
                title: "StockStatus"
              },
            ]}
          />
          <CheckBoxField name={`variations[${index}][status]`} title="status" require="true" />
          <FileUploadField name={`variations[${index}][variation_image_id]`} id={`variations[${index}][variation_image_id]`} uniquename={values[`variations`][index]['variation_image']} type="file" values={values} setFieldValue={setFieldValue} title="image" />
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent re-renders when other parts of the form change
  return (
    prevProps.index === nextProps.index &&
    prevProps.newId === nextProps.newId &&
    JSON.stringify(prevProps.values?.variations?.[prevProps.index]) === JSON.stringify(nextProps.values?.variations?.[nextProps.index]) &&
    prevProps.errors?.variations?.[prevProps.index] === nextProps.errors?.variations?.[nextProps.index]
  );
});

export default VariationsForm;
