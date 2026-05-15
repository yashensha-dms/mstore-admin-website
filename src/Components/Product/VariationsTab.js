import React, { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Btn from "../../Elements/Buttons/Btn";
import request from "../../Utils/AxiosUtils";
import { attribute } from "../../Utils/AxiosUtils/API";
import allPossibleCases from "../../Utils/CustomFunctions/AllPossibleCases";
import getStringId from "../../Utils/CustomFunctions/getStringId";
import VariationsForm from "./VariationsForm";
import VariationTop from "./VariationTop";
import VariationSkuAssistant from "./VariationSkuAssistant";
import SearchableSelectInput from "../InputFields/SearchableSelectInput";

const VariationsTab = ({ values, setFieldValue, errors, updateId }) => {
  const { data } = useQuery([attribute], () => request({ url: attribute }), { refetchOnWindowFocus: false, select: (data) => data.data.data });
  useEffect(() => {
    setFieldValue("attribute_values", values["options"]?.map((item) => item.values).flat(Infinity));
    // set our combointation in values obj
    setFieldValue("variation_options", allPossibleCases(values["combination"]?.map((item) => item?.values?.map((elem) => ({ name: item.name?.name, value: item.name.attribute_values?.find((attr) => attr.id == elem)?.value })))))
  }, [values["combination"]]);

  // Auto-inject "Weight" attribute for grocery items if empty
  useEffect(() => {
    if (values["type"] === "classified" && (!values["combination"] || values["combination"].length === 0 || (values["combination"].length === 1 && !values["combination"][0].name))) {
      const weightAttr = data?.find(attr => attr.name.toLowerCase() === 'weight');
      if (weightAttr) {
        setFieldValue("combination", [{ name: weightAttr, values: [] }]);
      }
    }
  }, [values["type"], data]);

  useEffect(() => {
    getNewVariations()
  }, [values["variation_options"]]);
  const getNewVariations = () => {
    const variations_val = values['variations'] || [];
    const variationOptions = values['variation_options'] || [];
    
    // Calculate all possible attribute combinations upfront
    const combinations = allPossibleCases(values["combination"]?.map((item) => item?.values?.map((elem) => elem))) || [];

    const temp_variations = variationOptions.map((opt, ind) => {
      const att_vals = opt.map((val) => val.value);
      let variant_val = variations_val.find(({ attribute_values }) => 
        attribute_values?.every(({ value }) => att_vals.includes(value))
      );

      // Clone or create new variant object
      const newVariant = variant_val ? { ...variant_val } : {};
      
      // Batch sync: Ensure attribute_values are correctly set for this index
      newVariant['attribute_values'] = combinations[ind];
      
      if (newVariant.status !== undefined) {
        newVariant['status'] = Boolean(newVariant.status);
      }
      return newVariant;
    });

    if (temp_variations.length > 0) {
      setFieldValue("variations", temp_variations);
    }
  };
  return (
    <div className="variant-box">
      <VariationSkuAssistant />
      {values["variations"]?.length > 0 && (
        <SearchableSelectInput
          nameList={[
            {
              name: "default_variation_id",
              title: "DefaultVariation",
              inputprops: {
                name: "default_variation_id",
                id: "default_variation_id",
                options: values["variations"]?.map((v, i) => {
                   const label = values["variation_options"]?.[i] 
                    ? values["variation_options"][i].map(opt => opt.value).join(' - ')
                    : (v.name || `Variation ${i + 1}`);
                   // Use ID if exists (existing product), otherwise use index (new product)
                   return { id: v.id !== undefined ? v.id : i, name: label };
                }),
                value: values["default_variation_id"],
              },
            },
          ]}
        />
      )}
      {values["combination"]?.map((elem, i) => (
        <VariationTop key={i} index={i} data={data} setFieldValue={setFieldValue} values={values} />
      ))}
      <div className="save-back-button">
        <Btn className="btn-primary" title="AddVariation" onClick={() => setFieldValue("combination", [...values["combination"], {}])} />
      </div>
      {values["variation_options"]?.map((elem, i) => (
        <VariationsForm elem={elem} values={values} setFieldValue={setFieldValue} key={i} index={i} newId={getStringId(elem)} errors={errors} />
      ))}
    </div>
  );
};

export default VariationsTab;
