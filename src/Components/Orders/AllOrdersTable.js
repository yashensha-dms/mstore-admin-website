import React, { useContext, useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "reactstrap";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table";
import * as Select from "@radix-ui/react-select";
import {
  RiArrowDownSFill,
  RiArrowUpSFill,
  RiSearchLine,
  RiCloseLine,
  RiEyeLine,
} from "react-icons/ri";
import { ChevronLeft, Check, ArrowRight } from "lucide-react";
import TableTitle from "../Table/TableTitle";
import NoDataFound from "../CommonComponent/NoDataFound";
import CalenderFilter from "../Table/CalenderFilter";
import request from "../../Utils/AxiosUtils";
import I18NextContext from "@/Helper/I18NextContext";
import { useTranslation } from "@/app/i18n/client";
import SettingContext from "../../Helper/SettingContext";
import { dateFormate } from "../../Utils/CustomFunctions/DateFormate";
import usePermissionCheck from "../../Utils/Hooks/usePermissionCheck";

const AllOrdersTable = ({ url, moduleName, dateRange, isCheck, setIsCheck, ...props }) => {
  const router = useRouter();
  const { i18Lang } = useContext(I18NextContext);
  const { t } = useTranslation(i18Lang, "common");
  const { convertCurrency } = useContext(SettingContext);
  const [edit, destroy] = usePermissionCheck(["edit", "destroy"]);

  // Table parameters state
  const [paginate, setPaginate] = useState(15);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState({ field: "created_at", sort: "desc" });
  const [date, setDate] = useState([{ startDate: null, endDate: null, key: "selection" }]);

  // Fetch orders query
  const { data: orderQueryData, isLoading, refetch } = useQuery(
    [url, page, paginate, search, sortBy, date],
    () =>
      request(
        {
          url,
          method: "get",
          params: {
            paginate,
            page,
            search,
            sort: sortBy?.sort,
            field: sortBy?.field,
            start_date: date[0]?.startDate ? date[0].startDate : null,
            end_date: date[0]?.endDate ? date[0].endDate : null,
          },
        },
        router
      ),
    {
      refetchOnWindowFocus: false,
      keepPreviousData: true,
      select: (res) => res.data,
    }
  );

  const orderList = useMemo(() => orderQueryData?.data || [], [orderQueryData]);
  const totalOrders = orderQueryData?.total || 0;

  // Sync checkboxes selection array on page/filter changes
  useEffect(() => {
    setIsCheck && setIsCheck([]);
  }, [page, paginate, search, sortBy, date, setIsCheck]);

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

    // Serial Number Column
    cols.push({
      accessorKey: "index",
      header: t("No"),
      cell: ({ row }) => row.index + 1 + (page - 1) * paginate,
    });

    // Order Number Column
    cols.push({
      accessorKey: "order_number",
      header: () => (
        <div
          className="flex items-center gap-1 cursor-pointer select-none"
          onClick={() => handleSort("order_number")}
        >
          {t("OrderNumber")}
          {sortBy.field === "order_number" &&
            (sortBy.sort === "asc" ? (
              <RiArrowUpSFill className="w-4 h-4 text-emerald-600" />
            ) : (
              <RiArrowDownSFill className="w-4 h-4 text-emerald-600" />
            ))}
        </div>
      ),
      cell: ({ row }) => (
        <span className="font-semibold text-gray-900">#{row.original.order_number}</span>
      ),
    });

    // Order Date Column
    cols.push({
      accessorKey: "created_at",
      header: () => (
        <div
          className="flex items-center gap-1 cursor-pointer select-none"
          onClick={() => handleSort("created_at")}
        >
          {t("OrderDate")}
          {sortBy.field === "created_at" &&
            (sortBy.sort === "asc" ? (
              <RiArrowUpSFill className="w-4 h-4 text-emerald-600" />
            ) : (
              <RiArrowDownSFill className="w-4 h-4 text-emerald-600" />
            ))}
        </div>
      ),
      cell: ({ row }) => <span>{dateFormate(row.original.created_at)}</span>,
    });

    // Customer Name Column
    cols.push({
      accessorKey: "consumer.name",
      header: t("CustomerName"),
      cell: ({ row }) => (
        <span className="text-capitalize font-medium text-gray-800">
          {row.original.consumer?.name || "-"}
        </span>
      ),
    });

    // Total Amount Column
    cols.push({
      accessorKey: "total",
      header: () => (
        <div
          className="flex items-center gap-1 cursor-pointer select-none"
          onClick={() => handleSort("total")}
        >
          {t("TotalAmount")}
          {sortBy.field === "total" &&
            (sortBy.sort === "asc" ? (
              <RiArrowUpSFill className="w-4 h-4 text-emerald-600" />
            ) : (
              <RiArrowDownSFill className="w-4 h-4 text-emerald-600" />
            ))}
        </div>
      ),
      cell: ({ row }) => <span>{convertCurrency(row.original.total)}</span>,
    });

    // Payment Status Column
    cols.push({
      accessorKey: "payment_status",
      header: t("PaymentStatus"),
      cell: ({ row }) => {
        const status = row.original.payment_status?.toLowerCase() || "";
        return (
          <div className={`status-${status} px-2.5 py-1 inline-block text-xs font-semibold rounded-md`}>
            <span className="text-capitalize">{row.original.payment_status || "-"}</span>
          </div>
        );
      },
    });

    // Payment Method Column
    cols.push({
      accessorKey: "payment_method",
      header: t("PaymentMode"),
      cell: ({ row }) => (
        <div className="payment-mode text-sm font-medium text-gray-600">
          <span>{row.original.payment_method || "-"}</span>
        </div>
      ),
    });

    // Order Status Column
    cols.push({
      accessorKey: "order_status",
      header: t("OrderStatus"),
      cell: ({ row }) => {
        const slug = row.original.order_status?.slug?.toLowerCase() || "";
        return (
          <div className={`status-${slug} px-2.5 py-1 inline-block text-xs font-semibold rounded-md`}>
            <span>{row.original.order_status?.name || "-"}</span>
          </div>
        );
      },
    });

    // Actions Column
    cols.push({
      id: "actions",
      header: t("Action"),
      cell: ({ row }) => (
        <button
          onClick={() => router.push(`/${i18Lang}/order/details/${row.original.order_number}`)}
          className="flex items-center gap-2 px-3.5 py-1.5 border !border-[#172B4D] !text-[#172B4D] hover:bg-[#172B4D]/5 font-semibold text-xs rounded-lg transition duration-150 focus:outline-none whitespace-nowrap"
        >
          <span>{t("View Order")}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      ),
    });

    return cols;
  }, [sortBy, page, paginate, t, i18Lang, router, convertCurrency]);

  // TanStack Table Instance
  const table = useReactTable({
    data: orderList,
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
        .modern-table tbody tr.unattended-order-row {
          background-color: rgba(239, 68, 68, 0.02);
        }
        .modern-table tbody tr.unattended-order-row:hover {
          background-color: rgba(239, 68, 68, 0.05);
        }

        /* Radix Select Styles */
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
        .radix-select-item[data-disabled] {
          color: #94a3b8;
          pointer-events: none;
        }
        .radix-select-item[data-highlighted] {
          background-color: #f1f5f9;
          color: #0f172a;
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
          {/* Table Header Section */}
          <TableTitle
            moduleName={moduleName}
            refetch={refetch}
          />

          {/* Search, Filter, Page Size Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 mt-3">
            <div className="flex flex-wrap items-center gap-3">
              {/* Pagination Size Selector using Radix Select */}
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

              {/* Date Filter */}
              {dateRange && <CalenderFilter date={date} setDate={setDate} />}
            </div>

            {/* Stable Search Input */}
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

          {/* Table Element */}
          <div className="custom-table-wrapper">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm font-medium text-slate-500">{t("Loading")}...</span>
              </div>
            ) : orderList.length === 0 ? (
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
                    {table.getRowModel().rows.map((row) => {
                      const isPending = row.original?.order_status?.slug === "pending";
                      return (
                        <tr
                          key={row.id}
                          className={isPending ? "unattended-order-row" : ""}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <td key={cell.id}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Stable Pagination Footer */}
          {!isLoading && orderList.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-4 px-2">
              <span className="text-sm text-slate-500">
                {t("Showing")} {Math.min((page - 1) * paginate + 1, totalOrders)} {t("to")}{" "}
                {Math.min(page * paginate, totalOrders)} {t("of")} {totalOrders} {t("Entries")}
              </span>

              <div className="flex items-center gap-2 justify-end">
                {/* Prev Button */}
                <button
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page === 1}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer text-sm font-semibold"
                >
                  <ChevronLeft className="w-4 h-4" />
                  {t("Previous")}
                </button>

                {/* Page Number Indicator */}
                <span className="text-sm font-medium text-slate-700 px-2">
                  {t("Page")} {page}
                </span>

                {/* Next Button */}
                <button
                  onClick={() =>
                    setPage((p) => (orderList.length < paginate ? p : p + 1))
                  }
                  disabled={orderList.length < paginate}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer text-sm font-semibold"
                >
                  {t("Next")}
                  <ChevronLeft className="w-4 h-4 rotate-180" />
                </button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </>
  );
};

export default AllOrdersTable;