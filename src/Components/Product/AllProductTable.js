import React, { useContext, useEffect, useState, useMemo, useCallback } from "react";
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
  RiFilter3Line,
} from "react-icons/ri";
import { ChevronLeft, ChevronRight, Check, MoreHorizontal, Trash2 } from "lucide-react";
import ShowModal from "../../Elements/Alerts&Modals/Modal";
import Btn from "../../Elements/Buttons/Btn";

import { product, Approved, Category } from "../../Utils/AxiosUtils/API";
import request from "../../Utils/AxiosUtils";
import usePermissionCheck from "../../Utils/Hooks/usePermissionCheck";
import AccountContext from "../../Helper/AccountContext";
import SettingContext from "../../Helper/SettingContext";
import I18NextContext from "@/Helper/I18NextContext";
import { useTranslation } from "@/app/i18n/client";
import placeHolderImage from "../../../public/assets/images/placeholder.png";

import Loader from "../CommonComponent/Loader";
import NoDataFound from "../CommonComponent/NoDataFound";
import Avatar from "../CommonComponent/Avatar";
import Status from "../Table/Status";
import DeleteButton from "../Table/DeleteButton";
import TableTitle from "../Table/TableTitle";
import useDelete from "../../Utils/Hooks/useDelete";
import useDeleteAll from "../../Utils/Hooks/useDeleteAll";

const AllProductTable = ({ url, moduleName, isCheck, setIsCheck, isReplicate, importExport, ...props }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { i18Lang } = useContext(I18NextContext);
  const { t } = useTranslation(i18Lang, "common");
  const { role, setRole } = useContext(AccountContext);
  const { settingObj, convertCurrency } = useContext(SettingContext);
  const [edit, destroy] = usePermissionCheck(["edit", "destroy"]);

  // Table parameters state
  const [paginate, setPaginate] = useState(15);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState({ field: "", sort: "asc" });
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteModal, setDeleteModal] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");

  // Restore table state (page, filters, search, sort, scroll position) on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedPage = sessionStorage.getItem("product-table-page");
      if (storedPage) {
        setPage(Number(storedPage));
      }
      const storedPaginate = sessionStorage.getItem("product-table-paginate");
      if (storedPaginate) {
        setPaginate(Number(storedPaginate));
      }
      const storedSearch = sessionStorage.getItem("product-table-search");
      if (storedSearch !== null) {
        setSearch(storedSearch);
      }
      const storedSortBy = sessionStorage.getItem("product-table-sortby");
      if (storedSortBy) {
        try {
          setSortBy(JSON.parse(storedSortBy));
        } catch (e) {}
      }
      const storedCategories = sessionStorage.getItem("product-table-categories");
      if (storedCategories) {
        try {
          setSelectedCategories(JSON.parse(storedCategories));
        } catch (e) {}
      }

      // Restore scroll position after data/table renders
      const storedScrollY = sessionStorage.getItem("product-table-scroll-y");
      if (storedScrollY !== null) {
        setTimeout(() => {
          window.scrollTo(0, Number(storedScrollY));
        }, 100);
      }
    }
  }, []);

  // Save table state changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("product-table-page", page);
    }
  }, [page]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("product-table-paginate", paginate);
    }
  }, [paginate]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("product-table-search", search);
    }
  }, [search]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("product-table-sortby", JSON.stringify(sortBy));
    }
  }, [sortBy]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("product-table-categories", JSON.stringify(selectedCategories));
    }
  }, [selectedCategories]);

  // Save scroll position when navigating to edit page
  const handleEditProduct = useCallback((id) => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("product-table-scroll-y", window.scrollY);
    }
    router.push(`/${i18Lang}/${pathname.split("/")[2]}/update/${id}`);
  }, [i18Lang, pathname, router]);

  // Fetch role on mount
  useEffect(() => {
    const storedRole = localStorage.getItem("role");
    if (storedRole) {
      const parsedRole = JSON.parse(storedRole);
      setRole(parsedRole.name);
    }
  }, [setRole]);

  // Fetch categories for filter dropdown
  const { data: categoryData } = useQuery(
    [Category],
    () => request({ url: Category, params: { type: "product" } }),
    {
      refetchOnWindowFocus: false,
      select: (res) => res?.data?.data || [],
    }
  );

  // Flattened categories list helper function
  const flattenedCategories = useMemo(() => {
    if (!categoryData) return [];
    const flat = [];
    const traverse = (cats, depth = 0) => {
      cats.forEach((cat) => {
        if (depth > 0) {
          flat.push({ ...cat, depth });
        }
        if (cat.subcategories && cat.subcategories.length > 0) {
          traverse(cat.subcategories, depth + 1);
        }
      });
    };
    traverse(categoryData);
    return flat;
  }, [categoryData]);

  const displayedCategories = useMemo(() => {
    return flattenedCategories.filter((cat) =>
      cat.name?.toLowerCase().includes(categorySearch.toLowerCase())
    );
  }, [flattenedCategories, categorySearch]);

  // Fetch products query
  const { data: productQueryData, isLoading, refetch, fetchStatus } = useQuery(
    [url, page, paginate, search, sortBy, selectedCategories],
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
          category_ids: selectedCategories.join(","),
        },
      }, router),
    {
      refetchOnWindowFocus: false,
      keepPreviousData: true,
      select: (res) => res.data,
    }
  );

  const productList = useMemo(() => productQueryData?.data || [], [productQueryData]);
  const totalProducts = productQueryData?.total || 0;
  const lastPage = productQueryData?.last_page || 1;

  // Single-row delete hook
  const { mutate: singleDeleteMutate } = useDelete(url, url);

  // Bulk delete hook
  const { mutate: bulkDeleteMutate, isLoading: bulkDeleting } = useDeleteAll(url, setIsCheck);

  // Sync checkboxes selection array on page changes
  useEffect(() => {
    setIsCheck && setIsCheck([]);
  }, [page, paginate, search, sortBy, selectedCategories, setIsCheck]);

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
          const selectableItems = productList.filter((item) => item.system_reserve !== "1");
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
      accessorKey: "product_thumbnail",
      header: t("Image"),
      cell: ({ row }) => (
        <Avatar
          data={row.original.product_thumbnail}
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
      cell: ({ row }) => {
        const name = row.original.name || "";
        const truncated = name.length > 20 ? name.slice(0, 20) + "..." : name;
        return (
          <div className="relative group inline-block">
            <span className={`font-semibold text-gray-800 ${name.length > 20 ? "cursor-help border-b border-dashed border-slate-300 pb-0.5" : ""}`}>
              {truncated}
            </span>
            {name.length > 20 && (
              <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block bg-slate-900 text-white text-xs rounded-lg py-1.5 px-3 whitespace-nowrap shadow-lg z-[999] pointer-events-none transition-all duration-200">
                {name}
                <div className="absolute top-full left-4 border-4 border-transparent border-t-slate-900" />
              </div>
            )}
          </div>
        );
      },
    });

    // Category column
    cols.push({
      id: "categories",
      header: t("Category"),
      cell: ({ row }) => {
        const cats = row.original.categories;
        if (Array.isArray(cats) && cats.length > 0) {
          return (
            <div className="flex flex-wrap gap-1">
              {cats.map((cat) => (
                <span
                  key={cat.id}
                  className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200"
                >
                  {cat.name}
                </span>
              ))}
            </div>
          );
        }
        return <span className="text-gray-400">-</span>;
      },
    });

    // Price column
    cols.push({
      accessorKey: "sale_price",
      header: () => (
        <div className="flex items-center gap-1 cursor-pointer select-none" onClick={() => handleSort("sale_price")}>
          {t("Price")}
          {sortBy.field === "sale_price" && (
            sortBy.sort === "asc" ? <RiArrowUpSFill className="w-4 h-4 text-emerald-600" /> : <RiArrowDownSFill className="w-4 h-4 text-emerald-600" />
          )}
        </div>
      ),
      cell: ({ row }) => <span>{convertCurrency(row.original.sale_price)}</span>,
    });

    // Stock column
    cols.push({
      accessorKey: "stock_status",
      header: t("Stock"),
      cell: ({ row }) => (
        <div className={`status-${row.original.stock_status} px-2.5 py-1 inline-block text-xs font-semibold rounded-md`}>
          <span>
            {row.original.stock_status?.toString().includes("_")
              ? row.original.stock_status.replace(/_/g, " ")
              : row.original.stock_status}
          </span>
        </div>
      ),
    });

    // Stock Quantity column
    cols.push({
      accessorKey: "quantity",
      header: () => (
        <div className="flex items-center gap-1 cursor-pointer select-none" onClick={() => handleSort("quantity")}>
          {t("StockQuantity")}
          {sortBy.field === "quantity" && (
            sortBy.sort === "asc" ? <RiArrowUpSFill className="w-4 h-4 text-emerald-600" /> : <RiArrowDownSFill className="w-4 h-4 text-emerald-600" />
          )}
        </div>
      ),
      cell: ({ row }) => row.original.quantity,
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
                      onSelect={() => handleEditProduct(item.id)}
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

                  {/* Inline Status & Approval Swapped into dropdown */}
                  {(edit && item.system_reserve !== "1") && (
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
                            url={product}
                            apiKey="status"
                            disabled={!edit || item.system_reserve === "1"}
                          />
                        </div>
                      </DropdownMenu.Item>
                      {role !== "vendor" && (
                        <DropdownMenu.Item 
                          className="radix-dropdown-item focus:bg-transparent hover:bg-transparent cursor-default" 
                          onSelect={(e) => e.preventDefault()}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="text-slate-500 font-semibold text-xs mr-4">{t("Approved")}</span>
                            <Status
                              data={item}
                              url={`${product}${Approved}`}
                              apiKey="is_approved"
                              disabled={!edit || item.system_reserve === "1"}
                            />
                          </div>
                        </DropdownMenu.Item>
                      )}
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
  }, [productList, isCheck, sortBy, role, page, paginate, edit, destroy, t, i18Lang, pathname, router, singleDeleteMutate, setIsCheck, convertCurrency, setDeleteId, setDeleteModal, handleEditProduct]);

  // TanStack Table Instance
  const table = useReactTable({
    data: productList,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <>
      {/* Tailwind and Custom utility styling */}
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
          animation: slideDownAndFade 0.2s cubic-bezier(0.16, 1, 0.3, 1);
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
        
        @keyframes slideDownAndFade {
          from { opacity: 0; transform: translateY(-2px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />

      <Card>
        <CardBody className="custom-role">
          {/* Table Header Section */}
          <TableTitle
            moduleName={moduleName}
            importExport={importExport}
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

              {/* Radix UI Multi-Select Dropdown Category Filter */}
              <DropdownMenu.Root onOpenChange={(open) => { if (!open) setCategorySearch(""); }}>
                <DropdownMenu.Trigger asChild>
                  <button className="radix-select-trigger min-w-[180px]">
                    <span className="flex items-center gap-2">
                      <RiFilter3Line className="w-4 h-4 text-slate-500" />
                      <span>
                        {selectedCategories.length === 0
                          ? t("Filter By Category")
                          : `${t("Categories")} (${selectedCategories.length})`}
                      </span>
                    </span>
                    <RiArrowDownSFill className="w-4 h-4 text-slate-400 ml-1" />
                  </button>
                </DropdownMenu.Trigger>

                <DropdownMenu.Portal>
                  <DropdownMenu.Content className="radix-dropdown-content" sideOffset={5} align="start">
                    <div className="px-3 py-2 border-bottom text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {t("SelectCategories")}
                    </div>
                    
                    {/* Radix Search Input inside dropdown */}
                    <div className="px-2.5 py-1.5 border-bottom bg-slate-50/50 flex items-center gap-2">
                      <RiSearchLine className="w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={categorySearch}
                        onChange={(e) => setCategorySearch(e.target.value)}
                        placeholder={t("SearchCategory") + "..."}
                        className="w-full bg-transparent border-none text-xs text-slate-700 placeholder-slate-400 focus:outline-none py-0.5"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      />
                      {categorySearch && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setCategorySearch("");
                          }}
                          className="text-slate-400 hover:text-slate-600 focus:outline-none"
                        >
                          <RiCloseLine className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {displayedCategories.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-400">{t("NoCategoriesFound")}</div>
                    ) : (
                      displayedCategories.map((cat) => {
                        const isSelected = selectedCategories.includes(cat.id);
                        return (
                          <div
                            key={cat.id}
                            className="radix-dropdown-item"
                            onClick={() => {
                              setSelectedCategories((prev) => {
                                const exists = prev.includes(cat.id);
                                if (exists) {
                                  return prev.filter((id) => id !== cat.id);
                                };
                                return [...prev, cat.id];
                              });
                              setPage(1);
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              readOnly
                              className="mr-2.5 rounded text-[#172B4D] focus:ring-[#172B4D] cursor-pointer"
                            />
                            <span className="font-medium">
                              {cat.name}
                            </span>
                          </div>
                        );
                      })
                    )}
                    {selectedCategories.length > 0 && (
                      <>
                        <div className="border-t my-1" />
                        <button
                          onClick={() => {
                            setSelectedCategories([]);
                            setPage(1);
                          }}
                          className="w-full text-center text-xs text-red-500 hover:text-red-700 py-2 font-medium hover:bg-slate-50 rounded transition"
                        >
                          {t("ClearAll")}
                        </button>
                      </>
                    )}
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
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
            ) : productList.length === 0 ? (
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

          {/* Stable Pagination Footer */}
          {!isLoading && productList.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-4 px-2">
              <span className="text-sm text-slate-500">
                {t("Showing")} {Math.min((page - 1) * paginate + 1, totalProducts)} {t("to")}{" "}
                {Math.min(page * paginate, totalProducts)} {t("of")} {totalProducts} {t("Entries")}
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

                {/* Page numbers */}
                {Array.from({ length: lastPage }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === lastPage || Math.abs(p - page) <= 1)
                  .map((p, idx, arr) => {
                    const showDots = idx > 0 && arr[idx - 1] !== p - 1;
                    return (
                      <React.Fragment key={p}>
                        {showDots && <span className="px-2 text-slate-400">...</span>}
                        <button
                          onClick={() => setPage(p)}
                          className={`px-3 py-1.5 text-sm font-semibold rounded-lg border transition ${
                            page === p
                              ? "bg-[var(--theme-color)] border-[var(--theme-color)] text-white"
                              : "border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {p}
                        </button>
                      </React.Fragment>
                    );
                  })}

                {/* Next Button */}
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

      {/* Floating Bulk Action Bar */}
      {isCheck && isCheck.length > 0 && (
        <div
          className="position-fixed start-50 translate-middle-x"
          style={{
            bottom: "30px",
            zIndex: 1050,
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(226, 232, 240, 0.8)",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            borderRadius: "16px",
            padding: "12px 24px",
            display: "flex",
            alignItems: "center",
            gap: "20px",
            minWidth: "320px",
            maxWidth: "90vw",
            animation: "tableWarperSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards",
          }}
        >
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes tableWarperSlideUp {
              from { transform: translate(-50%, 100px); opacity: 0; }
              to { transform: translate(-50%, 0); opacity: 1; }
            }
          `}} />
          <div className="flex items-center gap-2">
            <span className="bg-emerald-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
              {isCheck.length}
            </span>
            <span className="text-sm font-semibold text-slate-700">{t("Selected")}</span>
          </div>

          <div className="h-6 w-px bg-slate-200" />

          <div className="flex items-center gap-2">
            {destroy && (
              <button
                type="button"
                onClick={() => bulkDeleteMutate(isCheck)}
                disabled={bulkDeleting}
                className="flex items-center gap-1.5 px-4 py-2 border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:border-red-300 rounded-lg text-sm font-medium transition cursor-pointer"
              >
                <RiDeleteBinLine className="w-4 h-4" />
                {bulkDeleting ? `${t("Deleting")}...` : t("Delete")}
              </button>
            )}
          </div>

          <button
            onClick={() => setIsCheck && setIsCheck([])}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition ml-auto"
            title={t("ClearSelection")}
          >
            <RiCloseLine className="w-5 h-5" />
          </button>
        </div>
      )}

      <ShowModal
        open={deleteModal}
        close={false}
        setModal={setDeleteModal}
        buttons={
          <>
            <Btn
              title="No"
              onClick={() => {
                setDeleteModal(false);
                setDeleteId(null);
              }}
              className="btn--no btn-md fw-bold"
            />
            <Btn
              title="Yes"
              onClick={() => {
                if (deleteId) {
                  singleDeleteMutate(deleteId);
                }
                setDeleteModal(false);
                setDeleteId(null);
              }}
              className="btn-theme btn-md fw-bold"
            />
          </>
        }
      >
        <div className="remove-box">
          <Trash2 className="icon-box" />
          <h2>{t("DeleteItem")}?</h2>
          <p>
            {t("ThisItemWillBeDeletedPermanently") +
              " " +
              t("YouCan'tUndoThisAction!!")}
          </p>
        </div>
      </ShowModal>
    </>
  );
};

export default AllProductTable;
