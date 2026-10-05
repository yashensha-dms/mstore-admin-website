import { AllTimeZone } from "../../Data/AllTimeZoneData";
import FileUploadField from "../InputFields/FileUploadField";
import SearchableSelectInput from "../InputFields/SearchableSelectInput";
import SimpleInputField from "../InputFields/SimpleInputField";
import GeneralTab1 from "./GeneralTab1";
import { getHelperText } from "../../Utils/CustomFunctions/getHelperText";
import { useContext } from "react";
import I18NextContext from "@/Helper/I18NextContext";
import { useTranslation } from "@/app/i18n/client";

const GeneralTab = ({ values, setFieldValue, errors }) => {
  const { i18Lang } = useContext(I18NextContext);
  const { t } = useTranslation(i18Lang, 'common');
  return (
    <>
      <SearchableSelectInput
        nameList={[
          {
            name: "default_timezone",
            title: "Timezone",
            inputprops: {
              name: "default_timezone",
              id: "default_timezone",
              options: AllTimeZone || [],
            },
          },
        ]}
      />
      <GeneralTab1 />
    </>
  );
};

export default GeneralTab;
