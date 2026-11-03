import { useQuery } from "@tanstack/react-query";
import request from "../../Utils/AxiosUtils";
import { product } from "../../Utils/AxiosUtils/API";
import CheckBoxField from "../InputFields/CheckBoxField";
import SearchableSelectInput from "../InputFields/SearchableSelectInput";
import SimpleInputField from "../InputFields/SimpleInputField";
import I18NextContext from "@/Helper/I18NextContext";
import { useContext, useEffect, useState } from "react";
import { useTranslation } from "@/app/i18n/client";

const RestrictionTabContent = ({ values, setFieldValue, errors }) => {
  const { i18Lang } = useContext(I18NextContext);
  const { t } = useTranslation(i18Lang, 'common');
  const [search, setSearch] = useState("");
  const [customSearch, setCustomSearch] = useState("");
  const [tc, setTc] = useState(null);

  // Debounce search input to avoid spamming the backend
  useEffect(() => {
    if (tc) clearTimeout(tc);
    setTc(setTimeout(() => setCustomSearch(search || ""), 350));
  }, [search]);

  // Determine existing selected product IDs so they load on update
  const selectedIds = values["is_apply_all"]
    ? (Array.isArray(values["exclude_products"]) ? values["exclude_products"] : [])
    : (Array.isArray(values["products"]) ? values["products"] : []);

  const { data: productList } = useQuery(
    [product, customSearch],
    () =>
      request({
        url: product,
        params: {
          status: 1,
          search: customSearch ? customSearch : "",
          paginate: 50,
          ids: customSearch ? null : (selectedIds?.length ? selectedIds.join(",") : null),
          with_union_products: customSearch ? 0 : (selectedIds?.length ? 1 : 0),
        },
      }),
    {
      refetchOnWindowFocus: false,
      select: (data) =>
        (data?.data?.data || []).map((elem) => ({
          id: elem.id,
          name: elem.name,
          slug: elem.slug,
        })),
    }
  );

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
                  setsearch: setSearch,
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
                  setsearch: setSearch,
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
