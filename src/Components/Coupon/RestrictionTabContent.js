import { useQuery } from "@tanstack/react-query";
import request from "../../Utils/AxiosUtils";
import { product } from "../../Utils/AxiosUtils/API";
import CheckBoxField from "../InputFields/CheckBoxField";
import SearchableSelectInput from "../InputFields/SearchableSelectInput";
import SimpleInputField from "../InputFields/SimpleInputField";
import I18NextContext from "@/Helper/I18NextContext";
import { useContext } from "react";
import { useTranslation } from "@/app/i18n/client";

const RestrictionTabContent = ({ values, setFieldValue, errors }) => {
  const { i18Lang } = useContext(I18NextContext);
  const { t } = useTranslation(i18Lang, 'common');
  const { data: productList } = useQuery([product], () => request({ url: product }), {
    select: (data) => data.data.data.map((elem) => ({ id: elem.id, name: elem.name })),
  });
  return (
    <>
      <CheckBoxField name="is_apply_all" title="ApplyToAllProducts" />
      {
        values["is_apply_all"] ?
          <SearchableSelectInput
            nameList={[
              {
                name: "exclude_products",
                title: "ExcludeProducts",
                inputprops: {
                  name: "exclude_products",
                  id: "exclude_products",
                  options: productList || [],
                },
              },
            ]}
          />
          :
          <SearchableSelectInput
            nameList={[
              {
                name: "products",
                title: "IncludeProducts",
                require: "true",
                inputprops: {
                  name: "products",
                  id: "products",
                  options: productList || [],
                },
              },
            ]}
          />
      }
      <SimpleInputField
        nameList={[{ name: "min_spend", type: "number", placeholder: t("EnterMinimumSpend"), inputaddon: "true", title: "MinimumSpend", require: "true", helpertext: "*Define the minimum order value needed to utilize the coupon." }]} />
    </>
  );
};

export default RestrictionTabContent;
