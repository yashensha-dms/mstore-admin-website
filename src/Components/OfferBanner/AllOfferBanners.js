import React, { useContext, useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, usePathname } from "next/navigation";
import { Row, Col, Card, CardBody, Input } from "reactstrap";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Select from "@radix-ui/react-select";
import {
  RiArrowDownSFill,
  RiArrowUpSFill,
  RiSearchLine,
  RiDeleteBinLine,
  RiPencilLine,
  RiCloseLine,
} from "react-icons/ri";
import { ChevronLeft, ChevronRight, Check, MoreHorizontal } from "lucide-react";
import ShowModal from "../../Elements/Alerts&Modals/Modal";
import Btn from "../../Elements/Buttons/Btn";

import { offerBanner } from "../../Utils/AxiosUtils/API";
import request from "../../Utils/AxiosUtils";
import usePermissionCheck from "../../Utils/Hooks/usePermissionCheck";
import I18NextContext from "@/Helper/I18NextContext";
import { useTranslation } from "@/app/i18n/client";
import placeHolderImage from "../../../public/assets/images/placeholder.png";

import NoDataFound from "../CommonComponent/NoDataFound";
import Avatar from "../CommonComponent/Avatar";
import Status from "../Table/Status";
import TableTitle from "../Table/TableTitle";
import useDelete from "../../Utils/Hooks/useDelete";
import useDeleteAll from "../../Utils/Hooks/useDeleteAll";

const AllOfferBanners = ({ url, moduleName, isCheck, setIsCheck, importExport, ...props }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { i18Lang } = useContext(I18NextContext);
  const { t } = useTranslation(i18Lang, "common");
  const [edit, destroy] = usePermissionCheck(["edit", "destroy"], "offer_banner");

  // Table parameters state
  const [paginate, setPaginate] = useState(15);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState({ field: "", sort: "asc" });
  const [deleteId, setDeleteId] = useState(null);
  const [deleteModal, setDeleteModal] = useState(false);

  // Fetch offer banners query
  const { data: bannerQueryData, isLoading, refetch, fetchStatus } = useQuery(
    [url, page, paginate, search, sortBy],
    () =>
      request({
        url,
        method: "get",
        params: {
          paginate,
          page,
          search,
          sort: sortBy?.sort,
          field: sortBy?.field,
        },
      }, router),
    {
      refetchOnWindowFocus: false,
      keepPreviousData: true,
      select: (res) => res.data,
    }
  );

  const bannerList = useMemo(() => bannerQueryData?.data || [], [bannerQueryData]);
  const totalBanners = bannerQueryData?.total || 0;
  const lastPage = bannerQueryData?.last_page || 1;

  // Single-row delete hook
  const { mutate: singleDeleteMutate } = useDelete(url, url);

  // Bulk delete hook
  const { mutate: bulkDeleteMutate, isLoading: bulkDeleting } = useDeleteAll(url, setIsCheck);

  // Sync checkboxes selection array on page changes
  useEffect(() => {
    setIsCheck && setIsCheck([]);
  }, [page, paginate, search, sortBy, setIsCheck]);

  // Handle column sorting
  const handleSort = (field) => {
    setSortBy((prev) => ({
      field,
      sort: prev.field === field && prev.sort === "asc" ? "desc" : "asc",
    }));
  };

  // Define table columns
  const columns = useMemo(() => {
    const cols = [];

    // Checkbox Column
    if (destroy) {
      cols.push({
        id: "select",
        header: () => {
          const selectableItems = bannerList.filter((item) => item.system_reserve !== "1");
          const isAllChecked =
            selectableItems.length > 0 &&
            selectableItems.every((item) => isCheck?.includes(item.id));
          return (
            <div className="flex items-center justify-center">
              <Input
                type="checkbox"
                className="checkbox_animated custom-control-input cursor-pointer"
                checked={isAllChecked}
                disabled={selectableItems.length === 0}
                onChange={(e) => {
                  if (e.target.checked) {
                    setIsCheck(selectableItems.map((item) => item.id));
                  } else {
                    setIsCheck([]);
                  }
                }}
              />
            </div>
          );
        },
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex items-center justify-center">
              <Input
                type="checkbox"
                className="checkbox_animated custom-control-input cursor-pointer"
                checked={isCheck?.includes(item.id) || false}
                disabled={item.system_reserve === "1"}
                onChange={() => {
                  setIsCheck((prev) => {
                    const exists = prev.includes(item.id);
                    if (exists) {
                      return prev.filter((id) => id !== item.id);
                    } else {
                      return [...prev, item.id];
                    }
                  });
                }}
              />
            </div>
          );
        },
      });
    }

    // Number/Serial column
    cols.push({
      accessorKey: "index",
      header: t("No"),
      cell: ({ row }) => row.index + 1 + (page - 1) * paginate,
    });

    // Image column
    cols.push({
      accessorKey: "banner_image",
      header: t("Image"),
      cell: ({ row }) => (
        <Avatar
          data={row.original.banner_image}
          placeHolder={placeHolderImage}
          name={row.original}
        />
      ),
    });

    // Name column
    cols.push({
      accessorKey: "name",
      header: () => (
        <div className="flex items-center gap-1 cursor-pointer select-none" onClick={() => handleSort("name")}>
          {t("Name")}
          {sortBy.field === "name" && (
            sortBy.sort === "asc" ? <RiArrowUpSFill className="w-4 h-4 text-emerald-600" /> : <RiArrowDownSFill className="w-4 h-4 text-emerald-600" />
          )}
        </div>
      ),
      cell: ({ row }) => <span className="font-semibold text-gray-800">{row.original.name}</span>,
    });

    // Redirect Type column
    cols.push({
      accessorKey: "redirect_type",
      header: t("RedirectType"),
      cell: ({ row }) => (
        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
          {row.original.redirect_type}
        </span>
      ),
    });

    // Action Column
    if (edit || destroy) {
      cols.push({
        id: "actions",
        header: t("Action"),
        cell: ({ row }) => {
          const item = row.original;
          if (item.system_reserve === "1") return null;
          return (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button className="p-1.5 text-slate-500 hover:text-[#172B4D] hover:bg-slate-100 rounded-md transition duration-150 focus:outline-none">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content className="radix-dropdown-content" sideOffset={5} align="end">
                  {edit && (
                    <DropdownMenu.Item
                      className="radix-dropdown-item"
                      onSelect={() => router.push(`${pathname}/update/${item.id}`)}
                    >
                      <RiPencilLine className="w-4.5 h-4.5 text-slate-400 mr-2.5" />
                      <span>{t("Edit")}</span>
                    </DropdownMenu.Item>
                  )}
                  {destroy && (
                    <DropdownMenu.Item
                      className="radix-dropdown-item text-red-600 hover:bg-red-50 focus:bg-red-50 focus:text-red-700"
                      onSelect={() => {
                        setDeleteId(item.id);
                        setDeleteModal(true);
                      }}
                    >
                      <RiDeleteBinLine className="w-4.5 h-4.5 text-red-500 mr-2.5" />
                      <span>{t("Delete")}</span>
                    </DropdownMenu.Item>
                  )}

                  {edit && (
                    <>
                      <DropdownMenu.Separator className="h-px bg-slate-100 my-1.5" />
                      <DropdownMenu.Item
                        className="radix-dropdown-item focus:bg-transparent hover:bg-transparent cursor-default"
                        onSelect={(e) => e.preventDefault()}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-slate-500 font-semibold text-xs mr-4">{t("Status")}</span>
                          <Status
                            data={item}
                            url={offerBanner}
                            apiKey="status"
                            disabled={!edit}
                          />
                        </div>
                      </DropdownMenu.Item>
                    </>
                  )}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          );
        },
      });
    }

    return cols;
  }, [bannerList, isCheck, sortBy, page, paginate, edit, destroy, t, i18Lang, router, setIsCheck]);

  // TanStack Table Instance
  const table = useReactTable({
    data: bannerList,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-table-wrapper {
          background-color: #fff;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
          overflow: hidden;
        }
        .modern-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        .modern-table th {
          background-color: #f8fafc;
          padding: 14px 16px;
          font-weight: 600;
          font-size: 13px;
          color: #475569;
          border-bottom: 2px solid #edf2f7;
        }
        .modern-table td {
          padding: 14px 16px;
          font-size: 14px;
          color: #1e293b;
          border-bottom: 1px solid #edf2f7;
        }
        .modern-table tbody tr {
          transition: background-color 0.15s ease;
        }
        .modern-table tbody tr:hover {
          background-color: #f8fafc;
        }
        .modern-table tbody tr.row-checked {
          background-color: rgba(13, 168, 155, 0.04);
        }
        .modern-table tbody tr.row-checked:hover {
          background-color: rgba(13, 168, 155, 0.08);
        }
        
        .radix-dropdown-content {
          min-width: 240px;
          background-color: white;
          border-radius: 8px;
          padding: 6px;
          box-shadow: 0px 10px 38px -10px rgba(22, 23, 24, 0.35), 0px 10px 20px -15px rgba(22, 23, 24, 0.2);
          border: 1px solid #e2e8f0;
          z-index: 1000;
          max-height: 350px;
          overflow-y: auto;
        }
        .radix-dropdown-item {
          font-size: 13px;
          color: #334155;
          display: flex;
          align-items: center;
          padding: 8px 12px;
          border-radius: 6px;
          cursor: pointer;
          user-select: none;
          outline: none;
          transition: background-color 0.15s ease;
        }
        .radix-dropdown-item:hover, .radix-dropdown-item:focus {
          background-color: #f1f5f9;
        }

        .radix-select-trigger {
          display: inline-flex;
          align-items: center;
          justify-content: space-between;
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 14px;
          font-weight: 500;
          height: 38px;
          gap: 6px;
          background-color: white;
          color: #1e293b;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
          outline: none;
          transition: all 150ms ease;
          cursor: pointer;
        }
        .radix-select-trigger:hover {
          border-color: #cbd5e1;
          background-color: #f8fafc;
        }
        .radix-select-trigger:focus {
          border-color: var(--theme-color);
          box-shadow: 0 0 0 2px rgba(23, 43, 77, 0.1);
        }
        .radix-select-content {
          overflow: hidden;
          background-color: white;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          box-shadow: 0px 10px 38px -10px rgba(22, 23, 24, 0.35), 0px 10px 20px -15px rgba(22, 23, 24, 0.2);
          z-index: 1000;
        }
        .radix-select-viewport {
          padding: 5px;
        }
        .radix-select-item {
          font-size: 13px;
          color: #334155;
          border-radius: 6px;
          display: flex;
          align-items: center;
          padding: 8px 28px 8px 12px;
          position: relative;
          user-select: none;
          outline: none;
          cursor: pointer;
          transition: background-color 0.15s ease;
        }
        .radix-select-item-indicator {
          position: absolute;
          right: 8px;
          width: 16px;
          height: 16px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
      `}} />

      <Card>
        <CardBody className="custom-role">
          <TableTitle
            moduleName={moduleName}
            importExport={importExport}
            refetch={refetch}
            keyInPermission="offer_banner"
          />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 mt-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-500">{t("Show")}</span>
                <Select.Root
                  value={String(paginate)}
                  onValueChange={(val) => {
                    setPaginate(Number(val));
                    setPage(1);
                  }}
                >
                  <Select.Trigger className="radix-select-trigger w-20">
                    <Select.Value />
                    <Select.Icon>
                      <RiArrowDownSFill className="w-4 h-4 text-slate-400" />
                    </Select.Icon>
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Content className="radix-select-content">
                      <Select.Viewport className="radix-select-viewport">
                        {[15, 30, 50, 100].map((size) => (
                          <Select.Item key={size} value={String(size)} className="radix-select-item">
                            <Select.ItemText>{size}</Select.ItemText>
                            <Select.ItemIndicator className="radix-select-item-indicator">
                              <Check className="w-4 h-4 text-slate-700" />
                            </Select.ItemIndicator>
                          </Select.Item>
                        ))}
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
                <span className="text-sm font-medium text-slate-500">{t("Entries")}</span>
              </div>
            </div>

            <div className="relative w-full md:w-72">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <RiSearchLine className="w-4 h-4 text-slate-400" />
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder={t("Search") + "..."}
                className="w-full pl-9 pr-8 h-[38px] border border-slate-200 rounded-lg text-sm bg-white placeholder-slate-400 focus:outline-none focus:border-[#172B4D] focus:ring-1 focus:ring-[#172B4D] transition"
              />
              {search && (
                <button
                  onClick={() => {
                    setSearch("");
                    setPage(1);
                  }}
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                >
                  <RiCloseLine className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                </button>
              )}
            </div>
          </div>

          <div className="custom-table-wrapper">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm font-medium text-slate-500">{t("Loading")}...</span>
              </div>
            ) : bannerList.length === 0 ? (
              <div className="py-20">
                <NoDataFound noImage={true} />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="modern-table">
                  <thead>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <tr key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <th key={header.id}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(header.column.columnDef.header, header.getContext())}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {table.getRowModel().rows.map((row) => (
                      <tr
                        key={row.id}
                        className={isCheck?.includes(row.original.id) ? "row-checked" : ""}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {!isLoading && bannerList.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-4 px-2">
              <span className="text-sm text-slate-500">
                {t("Showing")} {Math.min((page - 1) * paginate + 1, totalBanners)} {t("to")}{" "}
                {Math.min(page * paginate, totalBanners)} {t("of")} {totalBanners} {t("Entries")}
              </span>

              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page === 1}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer text-sm font-semibold"
                >
                  <ChevronLeft className="w-4 h-4" />
                  {t("Previous")}
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(p + 1, lastPage))}
                  disabled={page === lastPage}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer text-sm font-semibold"
                >
                  {t("Next")}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      <ShowModal
        open={deleteModal}
        close={false}
        setModal={setDeleteModal}
        buttons={
          <>
            <Btn
              title="No"
              onClick={() => setDeleteModal(false)}
              className="btn--no btn-md fw-bold"
            />
            <Btn
              title="Yes"
              onClick={() => {
                singleDeleteMutate(deleteId);
                setDeleteModal(false);
              }}
              className="btn-theme btn-md fw-bold"
            />
          </>
        }
      >
        <div className="remove-box">
          <RiDeleteBinLine className="icon-box" />
          <h5 className="modal-title">{t("Confirmation")}</h5>
          <p>{t("Areyousureyouwanttodeletethisbanner?")}</p>
        </div>
      </ShowModal>
    </>
  );
};

export default AllOfferBanners;
