import { useRouter } from "next/navigation";
import React, { useContext, useEffect, useState, useCallback } from "react";
import { RiArrowDownSFill, RiArrowUpSFill, RiLock2Line } from "react-icons/ri";
import { Rating } from "react-simple-star-rating";
import { Input, Table } from "reactstrap";
import SettingContext from "../../Helper/SettingContext";
import { dateFormate } from "../../Utils/CustomFunctions/DateFormate";
import usePermissionCheck from "../../Utils/Hooks/usePermissionCheck";
import Avatar from "../CommonComponent/Avatar";
import NoDataFound from "../CommonComponent/NoDataFound";
import Options from "./Options";
import Status from "./Status";
import TableLoader from "./TableLoader";
import I18NextContext from "@/Helper/I18NextContext";
import { useTranslation } from "@/app/i18n/client";

const TableRow = React.memo(({ tableData, index, headerData, isCheck, handleChange, isHandelEdit, getSubKeysData, current_page, per_page, mutate, moduleName, type, refetch, keyInPermission, convertCurrency, edit, url, t }) => {
  return (
    <tr className={`${tableData?.customRowClass || ""} ${isCheck?.some(id => String(id) === String(tableData?.id)) ? "row-checked" : ""}`}>
      {headerData?.checkBox && (
        <td className="sm-width">
          <Input className="custom-control-input checkbox_animated" checked={headerData?.data?.[index]?.system_reserve !== "1" && isCheck?.some(id => String(id) === String(tableData?.id))} disabled={headerData?.data?.[index]?.system_reserve == "1" ? true : false} onChange={(e) => handleChange(tableData)} type={"checkbox"} />
        </td>
      )}
      {headerData.isSerialNo !== false && (
        <td className="sm-width" onClick={(e) => isHandelEdit(e, tableData, headerData)}>
          {index + 1 + (current_page - 1) * per_page}
        </td>
      )}
      <>
        {headerData?.column.map((item, i) => (
          <td className={item.type == "image" ? "sm-width" : ""} key={i} onClick={(e) => item.type !== "switch" && isHandelEdit(e, tableData, headerData)}>
            {item.type == "date" ? (
              <>{dateFormate(tableData[item?.apiKey])}</>
            ) : item.type == "image" ? (
              <Avatar data={tableData[item?.apiKey]} placeHolder={item.placeHolderImage} name={tableData} />
            ) : item.type == "price" ? (
              <>{convertCurrency(tableData[item?.apiKey])}</>
            ) : item.type == "rating" ? (
              <Rating initialValue={tableData.rating} readonly={true} size={20} fillColor="#0da487" />
            ) : item.type == "switch" ? (
              <>{!edit || headerData?.data?.[index].system_reserve == "1" ? <Status data={tableData} url={url} disabled={true} /> : <Status data={tableData} url={item.url ? item.url : url} apiKey={item.url && item.apiKey} />}</>
            ) : item.type == "stock_status" ? (
              <>
                <div className={`status-${tableData[item?.apiKey]}`}>
                  <span>{tableData[item?.apiKey]?.toString().includes("_") ? tableData[item?.apiKey]?.replace(/_/g, " ") : " "}</span>
                </div>
              </>
            ) : item?.subKey ? (
              <>{getSubKeysData(tableData[item?.apiKey], item?.subKey)}</>
            ) : (
              <>{tableData[item?.apiKey]}</>
            )}
          </td>
        ))}
      </>
      {headerData?.isOption && <td>{headerData?.data?.[index]?.system_reserve == "1" ? <RiLock2Line /> : <Options fullObj={tableData} mutate={mutate} moduleName={moduleName} type={type} optionPermission={headerData} refetch={refetch} keyInPermission={keyInPermission} />}</td>}
    </tr>
  );
}, (prev, next) => {
  // Only re-render if this specific row's data or check-status changes
  try {
    return (
      prev.tableData.id === next.tableData.id &&
      prev.index === next.index &&
      prev.edit === next.edit &&
      prev.headerData?.noEdit === next.headerData?.noEdit &&
      (prev.isCheck || []).some(id => String(id) === String(prev.tableData?.id)) === (next.isCheck || []).some(id => String(id) === String(next.tableData?.id)) &&
      prev.headerData.data.length === next.headerData.data.length &&
      JSON.stringify(prev.tableData) === JSON.stringify(next.tableData)
    );
  } catch (e) {
    // If circular structure or other error occurs, allow re-render
    return false;
  }
});

const ShowTable = ({ current_page, per_page, mutate, isCheck, setIsCheck, url, sortBy, setSortBy, headerData, fetchStatus, moduleName, type, redirectLink, refetch, keyInPermission }) => {
  const { i18Lang } = useContext(I18NextContext);
  const { t } = useTranslation(i18Lang, "common");
  const { convertCurrency } = useContext(SettingContext);
  const [edit] = usePermissionCheck(["edit", "destroy"]);
  const [colSpann, setColSpann] = useState();
  const router = useRouter();
  const selectableItems = headerData?.data?.filter((elem) => elem.system_reserve !== "1") || [];
  /* Select All Data */
  const handleChange = useCallback((result) => {
    if (!result || result.id === undefined || result.id === null) return;
    setIsCheck((prevCheck) => {
      const currentCheck = Array.isArray(prevCheck) ? prevCheck : [];
      const exists = currentCheck.some(id => String(id) === String(result.id));
      if (exists) {
        return currentCheck.filter(id => String(id) !== String(result.id));
      } else {
        return [...currentCheck, result.id];
      }
    });
  }, [setIsCheck]);
  /* Sorting Data */
  const handleSort = (title) => {
    setSortBy({ ...sortBy, field: title, sort: `${sortBy.sort == "asc" ? "desc" : "asc"}` });
  };
  // Calculation For Row Head
  const countColSpan = () => {
    let totalColumn = headerData?.column?.length || 0;
    let isSerialNo = headerData.isSerialNo !== false ? 1 : 0;
    let isCheckbox = headerData?.checkBox ? 1 : 0;
    let isOption = headerData?.isOption ? 1 : 0;
    setColSpann(totalColumn + isSerialNo + isCheckbox + isOption);
  };
  // On mount calling the function
  useEffect(() => {
    countColSpan();
  }, []);
  // Clicking on Row data
  const isHandelEdit = (e, tableData, headerData) => {
    e.preventDefault();
    if (!headerData.noEdit) {
      if (headerData?.optionHead?.type == "View") {
        redirectLink ? redirectLink(tableData) : "";
      } else if (tableData.system_reserve !== "1" && headerData?.isOption) {
        tableData?.id && router.push(`${moduleName.toLowerCase()}/update/${tableData.id}`);
      }
    }
  };
  // Geting Sub-objects data
  const getSubKeysData = (mainData, subKey) => {
    if (typeof mainData === "object" && subKey.length > 0) {
      const [key, ...remainingSubKey] = subKey;
      return getSubKeysData(mainData?.[key], remainingSubKey);
    } else {
      return mainData;
    }
  };
  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        .theme-table tbody tr {
          transition: background-color 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        .theme-table tbody tr:hover {
          background-color: #f8fafc !important;
        }
        .theme-table tbody tr.row-checked {
          background-color: rgba(13, 168, 155, 0.06) !important;
        }
        .theme-table tbody tr.row-checked:hover {
          background-color: rgba(13, 168, 155, 0.1) !important;
        }
        .checkbox_animated {
          cursor: pointer !important;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        .checkbox_animated:not(:disabled):hover {
          transform: scale(1.15);
        }
        .checkbox_animated:checked {
          background-color: var(--theme-color, #0da89b) !important;
          border-color: var(--theme-color, #0da89b) !important;
        }
        .table-responsive.border-table {
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.02);
          border: 1px solid rgba(226, 232, 240, 0.8) !important;
        }
      `}} />
      <Table id="table_id" className={`role-table ${headerData?.noCustomClass ? "" : "refund-table"} all-package theme-table datatable-wrapper`}>
        <TableLoader fetchStatus={fetchStatus} />
      <thead>
        <tr>
          <>
            {headerData?.checkBox && (
              <th className="sm-width">
                <Input
                  className="custom-control-input checkbox_animated"
                  type={"checkbox"}
                  checked={selectableItems.length > 0 && selectableItems.every(item => isCheck?.some(id => String(id) === String(item.id)))}
                  disabled={selectableItems.length === 0}
                  onChange={(e) => {
                    e.target.checked ? setIsCheck(selectableItems.map((item) => item.id)) : setIsCheck([]);
                  }}
                />
              </th>
            )}
            {headerData.isSerialNo !== false && <th className="sm-width">{t("No")}</th>}
            {/* Table Heading */}
            {headerData?.column.map((elem, i) => (
              <th key={i} className={elem.class ? elem.class : ""} onClick={() => (elem.sorting ? handleSort(elem.apiKey) : false)}>
                {t(elem.title)}
                {elem.sorting ? <div className="filter-arrow">{sortBy?.field == elem.apiKey && sortBy.sort == "desc" ? <RiArrowUpSFill /> : <RiArrowDownSFill />}</div> : ""}
              </th>
            ))}
            {headerData?.isOption && <th>{t(headerData?.optionHead?.title)}</th>}
          </>
        </tr>
      </thead>
      <tbody>
        {headerData?.data.length > 0 ? (
          headerData?.data?.map((tableData, index) => (
            <TableRow
              key={tableData.id || index}
              tableData={tableData}
              index={index}
              headerData={headerData}
              isCheck={isCheck}
              handleChange={handleChange}
              isHandelEdit={isHandelEdit}
              getSubKeysData={getSubKeysData}
              current_page={current_page}
              per_page={per_page}
              mutate={mutate}
              moduleName={moduleName}
              type={type}
              refetch={refetch}
              keyInPermission={keyInPermission}
              convertCurrency={convertCurrency}
              edit={edit}
              url={url}
              t={t}
            />
          ))
        ) : (
          <tr>
            <td colSpan={colSpann}>
              <NoDataFound noImage={true} />
            </td>
          </tr>
        )}
      </tbody>
    </Table>
    </>
  );
};

export default ShowTable;
