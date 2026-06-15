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
  
  // Auto-generate name based on Product Name and Options
  useEffect(() => {
    const productName = values['name'] || '';
    const optionLabel = elem?.map(opt => opt.value).join(' - ');
    const autoName = optionLabel ? `${productName} - ${optionLabel}` : productName;
    
    const currentName = values[`variations`][index]?.name;
    
    // Only update if current name is empty or matches a previous auto-generated name
    // We check if it's empty to get started, or if it follows the pattern "[Product Name] - [Anything]"
    if (!currentName || currentName.startsWith(`${productName} - `) || currentName === productName) {
       if (currentName !== autoName) {
         setFieldValue(`variations[${index}][name]`, autoName);
       }
    }
  }, [values['name'], elem, index]);

  // Sync stock_status and quantity for variations
  const variation = values[`variations`]?.[index];
  const stockStatus = variation?.stock_status;
  const quantity = variation?.quantity;

  useEffect(() => {
    const qty = Number(quantity) || 0;
    if (stockStatus === 'out_of_stock' && qty !== 0) {
      setFieldValue(`variations[${index}][quantity]`, 0);
    }
  }, [stockStatus, index]);

  useEffect(() => {
    const qty = Number(quantity) || 0;
    if (qty > 0 && stockStatus !== 'in_stock') {
      setFieldValue(`variations[${index}][stock_status]`, 'in_stock');
    } else if (qty <= 0 && stockStatus !== 'out_of_stock') {
      setFieldValue(`variations[${index}][stock_status]`, 'out_of_stock');
    }
  }, [quantity, index, stockStatus]);

  
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
