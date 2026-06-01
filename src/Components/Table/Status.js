import { usePathname } from "next/navigation";
import { useContext, useEffect, useState } from "react";
import { HelpCircle } from "lucide-react";
import * as Switch from "@radix-ui/react-switch";
import ShowModal from "../../Elements/Alerts&Modals/Modal";
import Btn from "../../Elements/Buttons/Btn";
import BadgeContext from "../../Helper/BadgeContext";
import Capitalize from "../../Utils/CustomFunctions/Capitalize";
import useUpdate from "../../Utils/Hooks/useUpdate";
import I18NextContext from "@/Helper/I18NextContext";
import { useTranslation } from "@/app/i18n/client";

const Status = ({ url, data, disabled, apiKey }) => {
  const { i18Lang } = useContext(I18NextContext);
  const { t } = useTranslation(i18Lang, "common");
  const router = usePathname()
  const [status, setStatus] = useState(false);
  const [modal, setModal] = useState(false);
  const { state, dispatch } = useContext(BadgeContext);
  useEffect(() => {
    setStatus(Boolean(Number(apiKey ? data[apiKey] : data.status)));
  }, [data, disabled]);
  const { data: apiData, mutate, isLoading } = useUpdate(url, [data.id, Number(status)], false, `${Capitalize(router.split('/')[2])} Status Updated Successfully`, () => { url });
  useEffect(() => {
    if ((apiData, url == "/product/approve")) {
      let store = state?.badges?.map((elem) => {
        if (elem.path.toString() == "/product") {
          elem = {
            path: elem.path,
            value: apiData?.data?.total_in_approved_products,
          };
        } else if (elem.path.toString() == "/store") {
          elem = {
            path: elem.path,
            value: apiData?.data?.total_in_approved_stores,
          };
        }
        return elem;
      });
      dispatch({ type: "ALLBADGE", allBadges: store });
    }
  }, [isLoading]);
  const handleClick = (value) => {
    setStatus(value);
    mutate(Boolean(Number(value)));
    setModal(false);
  };
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .radix-switch-root {
          width: 36px;
          height: 20px;
          background-color: #cbd5e1;
          border-radius: 9999px;
          position: relative;
          border: none;
          cursor: pointer;
          outline: none;
          transition: background-color 200ms ease;
          display: inline-flex;
          align-items: center;
          padding: 0;
        }
        .radix-switch-root[data-state="checked"] {
          background-color: #172B4D;
        }
        .radix-switch-root[disabled] {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .radix-switch-thumb {
          display: block;
          width: 16px;
          height: 16px;
          background-color: white;
          border-radius: 50%;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
          transition: transform 200ms ease;
          transform: translateX(2px);
          will-change: transform;
        }
        .radix-switch-root[data-state="checked"] .radix-switch-thumb {
          transform: translateX(18px);
        }
      `}} />
      
      <div className="flex items-center">
        <Switch.Root
          checked={status}
          onCheckedChange={() => !disabled && setModal(true)}
          disabled={disabled}
          className="radix-switch-root"
        >
          <Switch.Thumb className="radix-switch-thumb" />
        </Switch.Root>
      </div>

      <ShowModal
        open={modal}
        close={false}
        setModal={setModal}
        buttons={
          <>
            <Btn
              title="No"
              onClick={() => setModal(false)}
              className="btn--no btn-md fw-bold"
            />
            <Btn
              title="Yes"
              onClick={() => handleClick(!status)}
              loading={Number(isLoading)}
              className="btn-theme btn-md fw-bold"
            />
          </>
        }
      >
        <div className="remove-box">
          <HelpCircle className="icon-box wo-bg" />
          <h5 className="modal-title">{t("Confirmation")}</h5>
          <p>{t("Areyousureyouwanttoproceed?")} </p>
        </div>
      </ShowModal>
    </>
  );
};

export default Status;
