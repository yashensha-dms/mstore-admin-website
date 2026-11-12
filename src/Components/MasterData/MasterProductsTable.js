"use client";

import React, { useContext, useState, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Container,
  Row,
  Col,
  Card,
  CardBody,
  Table,
  Badge,
  Input,
  Button as RsButton,
  Spinner
} from "reactstrap";
import * as Switch from "@radix-ui/react-switch";
import {
  RiSearchLine,
  RiFilter3Line,
  RiRefreshLine,
  RiCheckLine,
  RiCloseLine,
  RiStore3Line,
  RiUploadCloud2Line,
  RiPencilLine,
  RiEyeLine,
  RiEyeOffLine,
  RiCheckboxCircleLine,
  RiInformationLine,
  RiFileExcel2Line
} from "react-icons/ri";
import { ChevronLeft, ChevronRight, Copy } from "lucide-react";
import I18NextContext from "@/Helper/I18NextContext";
import { useTranslation } from "@/app/i18n/client";
import request from "@/Utils/AxiosUtils";
import { product, Category } from "@/Utils/AxiosUtils/API";
import { ToastNotification } from "@/Utils/CustomFunctions/ToastNotification";
import placeHolderImage from "../../../public/assets/images/placeholder.png";

const MasterProductsTable = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { i18Lang } = useContext(I18NextContext);
  const { t } = useTranslation(i18Lang, "common");

  // Filter States
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | '1' (Active) | '0' (Inactive)
  const [stockFilter, setStockFilter] = useState("all"); // 'all' | 'positive' | 'out_of_stock'
  const [page, setPage] = useState(1);
  const [paginate, setPaginate] = useState(15);

  // Selection state for bulk actions
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  // Debounce search input
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch Categories for the filter dropdown
  const { data: categoriesData } = useQuery(
    [Category],
    () => request({ url: Category, params: { type: "product" } }),
    { refetchOnWindowFocus: false, select: (res) => res?.data?.data || [] }
  );

  // Flatten categories list for dropdown
  const categoryOptions = useMemo(() => {
    if (!categoriesData) return [];
    const list = [];
    const traverse = (cats, prefix = "") => {
      cats.forEach((c) => {
        list.push({ id: c.id, name: prefix ? `${prefix} > ${c.name}` : c.name });
        if (c.subcategories && c.subcategories.length > 0) {
          traverse(c.subcategories, c.name);
        }
      });
    };
    traverse(categoriesData);
    return list;
  }, [categoriesData]);

  // Query Products
  const queryParams = useMemo(() => {
    const params = {
      page,
      paginate,
      search: debouncedSearch || undefined,
      category_ids: selectedCategory || undefined
    };
    if (statusFilter !== "all") {
      params.status = parseInt(statusFilter, 10);
    }
    return params;
  }, [page, paginate, debouncedSearch, selectedCategory, statusFilter]);

  const { data: productsResponse, isLoading, isFetching, refetch } = useQuery(
    [product, queryParams],
    () => request({ url: product, params: queryParams }),
    { refetchOnWindowFocus: false, keepPreviousData: true, select: (res) => res?.data }
  );

  const rawProductList = productsResponse?.data || [];
  const totalCount = productsResponse?.total || 0;
  const lastPage = productsResponse?.last_page || 1;

  // Filter products by stock if selected
  const productList = useMemo(() => {
    if (stockFilter === "positive") {
      return rawProductList.filter((p) => (p.quantity || 0) > 0);
    }
    if (stockFilter === "out_of_stock") {
      return rawProductList.filter((p) => (p.quantity || 0) <= 0);
    }
    return rawProductList;
  }, [rawProductList, stockFilter]);

  // Toggle single product Active/Inactive status
  const handleToggleStatus = async (item, currentStatus) => {
    const newStatus = currentStatus === 1 ? 0 : 1;
    setTogglingId(item.id);

    try {
      // Endpoint contract in mstore: PUT /product/{id}/{status} with boolean/number data
      const res = await request({
        url: `${product}/${item.id}/${newStatus}`,
        method: "put",
        data: Boolean(newStatus)
      });

      ToastNotification(
        "success",
        `Product "${item.name}" marked as ${newStatus === 1 ? "ACTIVE (Visible in App)" : "INACTIVE (Hidden)"}`
      );
      queryClient.invalidateQueries([product]);
    } catch (err) {
      // Try fallback direct update
      try {
        await request({
          url: `${product}/${item.id}`,
          method: "put",
          data: { status: newStatus }
        });
        ToastNotification(
          "success",
          `Product "${item.name}" marked as ${newStatus === 1 ? "ACTIVE (Visible in App)" : "INACTIVE (Hidden)"}`
        );
        queryClient.invalidateQueries([product]);
      } catch (e2) {
        ToastNotification("error", `Failed to update status: ${e2.message}`);
      }
    } finally {
      setTogglingId(null);
    }
  };

  // Bulk active/inactive toggle
  const handleBulkStatusChange = async (targetStatus) => {
    if (selectedIds.length === 0) return;
    setIsBulkLoading(true);
    let successCount = 0;

    for (const id of selectedIds) {
      try {
        await request({
          url: `${product}/${id}/${targetStatus}`,
          method: "put",
          data: Boolean(targetStatus)
        });
        successCount++;
      } catch (err) {
        // try fallback
        try {
          await request({
            url: `${product}/${id}`,
            method: "put",
            data: { status: targetStatus }
          });
          successCount++;
        } catch (e) {
          // continue
        }
      }
    }

    setIsBulkLoading(false);
    setSelectedIds([]);
    queryClient.invalidateQueries([product]);
    ToastNotification(
      "success",
      `${successCount} products marked as ${targetStatus === 1 ? "ACTIVE (Visible in App)" : "INACTIVE (Hidden)"} successfully.`
    );
  };

  // Multi-select handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(productList.map((p) => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const isAllSelected = productList.length > 0 && selectedIds.length === productList.length;

  return (
    <Container fluid className="p-0">
      <style dangerouslySetInnerHTML={{ __html: `
        .radix-switch-root {
          width: 38px;
          height: 22px;
          background-color: #cbd5e1;
          border-radius: 9999px;
          position: relative;
          border: none;
          cursor: pointer;
          outline: none;
          transition: background-color 200ms ease;
          display: inline-flex;
          align-items: center;
        }
        .radix-switch-root[data-state='checked'] {
          background-color: #0da487;
        }
        .radix-switch-thumb {
          display: block;
          width: 18px;
          height: 18px;
          background-color: white;
          border-radius: 9999px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
          transition: transform 200ms ease;
          transform: translateX(2px);
          will-change: transform;
        }
        .radix-switch-thumb[data-state='checked'] {
          transform: translateX(18px);
        }
      `}} />

      {/* Header */}
      <div className="mb-4 d-flex justify-content-between align-items-center flex-wrap gap-3">
        <div>
          <h3 className="fw-bold text-slate-800 mb-1">{t("MasterProductsTitle")}</h3>
          <p className="text-muted mb-0">{t("MasterProductsSubtitle")}</p>
        </div>
        <div className="d-flex gap-2">
          <Link href={`/${i18Lang}/master-data/upload`} className="btn btn-theme d-flex align-items-center gap-2">
            <RiUploadCloud2Line /> Upload / Import CSV
          </Link>
          <Link href={`/${i18Lang}/master-data/categories`} className="btn btn-outline-primary d-flex align-items-center gap-2">
            View Categories
          </Link>
          <RsButton color="light" className="border d-flex align-items-center gap-1" onClick={() => refetch()}>
            <RiRefreshLine className={isFetching ? "animate-spin" : ""} /> Refresh
          </RsButton>
        </div>
      </div>

      {/* App Visibility Informational Banner */}
      <div className="p-3 mb-4 rounded-3 border bg-light d-flex align-items-center gap-3">
        <div className="badge bg-primary-subtle text-primary p-2 rounded-circle fs-5">
          <RiStore3Line />
        </div>
        <div className="text-sm">
          <strong className="text-slate-800">Product Visibility in App:</strong> Products toggled to{" "}
          <span className="badge bg-success-subtle text-success px-2 py-0.5 rounded-pill">Active</span> are visible
          and purchasable in your customer mobile app and storefront. Products set to{" "}
          <span className="badge bg-secondary-subtle text-secondary px-2 py-0.5 rounded-pill">Inactive</span> are
          immediately hidden from the catalog.
        </div>
      </div>

      {/* Main Table Card */}
      <Card className="shadow-sm border-0">
        <CardBody className="p-4">
          {/* Filters Bar */}
          <Row className="g-3 mb-4 align-items-center">
            {/* Search */}
            <Col xl="4" md="6">
              <div className="position-relative">
                <Input
                  type="text"
                  placeholder="Search by Product Name, SKU, or Barcode..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pe-5"
                />
                <RiSearchLine className="position-absolute top-50 end-0 translate-middle-y me-3 text-muted" />
              </div>
            </Col>

            {/* Category Filter */}
            <Col xl="3" md="6">
              <Input
                type="select"
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Categories</option>
                {categoryOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Input>
            </Col>

            {/* Status Filter */}
            <Col xl="2" md="6">
              <Input
                type="select"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All Visibility</option>
                <option value="1">Active Only (In App)</option>
                <option value="0">Inactive Only (Hidden)</option>
              </Input>
            </Col>

            {/* Stock Filter */}
            <Col xl="3" md="6">
              <Input
                type="select"
                value={stockFilter}
                onChange={(e) => {
                  setStockFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All Inventory</option>
                <option value="positive">Positive Stock Only (&gt; 0)</option>
                <option value="out_of_stock">Out of Stock Only (0)</option>
              </Input>
            </Col>
          </Row>

          {/* Bulk Action Controls */}
          {selectedIds.length > 0 && (
            <div className="p-2 mb-3 bg-primary-subtle border border-primary rounded-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
              <span className="text-primary fw-semibold text-sm">
                {selectedIds.length} product{selectedIds.length > 1 ? "s" : ""} selected
              </span>
              <div className="d-flex gap-2">
                <RsButton
                  color="success"
                  size="sm"
                  disabled={isBulkLoading}
                  onClick={() => handleBulkStatusChange(1)}
                  className="d-flex align-items-center gap-1"
                >
                  <RiEyeLine /> Set Active (Show in App)
                </RsButton>
                <RsButton
                  color="secondary"
                  size="sm"
                  disabled={isBulkLoading}
                  onClick={() => handleBulkStatusChange(0)}
                  className="d-flex align-items-center gap-1"
                >
                  <RiEyeOffLine /> Set Inactive (Hide in App)
                </RsButton>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="table-responsive" style={{ minHeight: "350px" }}>
            <Table className="table align-middle table-hover text-sm mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: "40px" }}>
                    <Input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th>Product</th>
                  <th>SKU & Barcode</th>
                  <th>Category</th>
                  <th className="text-end">MRP / Rate</th>
                  <th className="text-center">Stock Quantity</th>
                  <th className="text-center">Active in App?</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="8" className="text-center py-5">
                      <Spinner color="primary" />
                      <div className="text-muted text-xs mt-2">Loading products...</div>
                    </td>
                  </tr>
                ) : productList.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-5 text-muted">
                      <RiStore3Line size={48} className="text-slate-300 mb-2" />
                      <div className="fw-semibold">No products found</div>
                      <small>Try adjusting filters or upload a new master CSV.</small>
                    </td>
                  </tr>
                ) : (
                  productList.map((item) => {
                    const isActive = Number(item.status) === 1;
                    const isSelected = selectedIds.includes(item.id);
                    const isRowToggling = togglingId === item.id;
                    const stockQty = item.quantity || 0;
                    const isPositive = stockQty > 0;
                    const imgUrl = item.product_thumbnail?.original_url || placeHolderImage;

                    return (
                      <tr key={item.id} className={isSelected ? "table-active" : ""}>
                        <td>
                          <Input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectRow(item.id)}
                          />
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-2.5">
                            <div
                              style={{ width: "44px", height: "44px", position: "relative", flexShrink: 0 }}
                              className="rounded border overflow-hidden bg-light"
                            >
                              <Image
                                src={imgUrl}
                                alt={item.name}
                                fill
                                sizes="44px"
                                style={{ objectFit: "contain" }}
                              />
                            </div>
                            <div>
                              <div className="fw-semibold text-slate-800" title={item.name}>
                                {item.name}
                              </div>
                              <small className="text-muted text-xs">ID: #{item.id}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="font-monospace text-xs text-slate-700">{item.sku || "-"}</div>
                          {item.barcode && (
                            <small className="text-muted text-xs d-flex align-items-center gap-1">
                              {item.barcode}
                            </small>
                          )}
                        </td>
                        <td>
                          {item.categories && item.categories.length > 0 ? (
                            <span className="badge bg-light text-dark border">
                              {item.categories.map((c) => c.name).join(", ")}
                            </span>
                          ) : (
                            <span className="text-muted text-xs">Uncategorized</span>
                          )}
                        </td>
                        <td className="text-end">
                          <div className="fw-bold text-slate-800">
                            ₹{parseFloat(item.sale_price || item.price || 0).toFixed(2)}
                          </div>
                          {item.sale_price && parseFloat(item.sale_price) < parseFloat(item.price) && (
                            <small className="text-muted text-xs line-through">
                              ₹{parseFloat(item.price).toFixed(2)}
                            </small>
                          )}
                        </td>
                        <td className="text-center">
                          <span
                            className={`badge px-2.5 py-1 rounded-pill ${
                              isPositive ? "bg-success-subtle text-success" : "bg-danger-subtle text-danger"
                            }`}
                          >
                            {isPositive ? `${stockQty} In Stock` : "Out of Stock"}
                          </span>
                        </td>
                        <td className="text-center">
                          <div className="d-inline-flex align-items-center gap-2">
                            {isRowToggling ? (
                              <Spinner size="sm" color="primary" />
                            ) : (
                              <Switch.Root
                                className="radix-switch-root"
                                checked={isActive}
                                onCheckedChange={() => handleToggleStatus(item, item.status)}
                              >
                                <Switch.Thumb className="radix-switch-thumb" />
                              </Switch.Root>
                            )}
                            <span
                              className={`text-xs fw-semibold ${
                                isActive ? "text-success" : "text-muted"
                              }`}
                            >
                              {isActive ? "Active (In App)" : "Inactive"}
                            </span>
                          </div>
                        </td>
                        <td className="text-end">
                          <div className="d-flex justify-content-end gap-1">
                            <Link
                              href={`/${i18Lang}/product/update/${item.id}`}
                              className="btn btn-sm btn-outline-secondary p-1"
                              title="Edit Product"
                            >
                              <RiPencilLine size={16} />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mt-4 pt-3 border-top">
            <div className="text-xs text-muted">
              Showing page <strong>{page}</strong> of <strong>{lastPage}</strong> ({totalCount} total products)
            </div>
            <div className="d-flex align-items-center gap-2">
              <Input
                type="select"
                bsSize="sm"
                value={paginate}
                onChange={(e) => {
                  setPaginate(Number(e.target.value));
                  setPage(1);
                }}
                style={{ width: "90px" }}
              >
                <option value={15}>15 / page</option>
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
              </Input>

              <RsButton
                color="light"
                size="sm"
                className="border"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft size={16} />
              </RsButton>
              <span className="text-xs px-2 fw-semibold">{page}</span>
              <RsButton
                color="light"
                size="sm"
                className="border"
                disabled={page >= lastPage}
                onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
              >
                <ChevronRight size={16} />
              </RsButton>
            </div>
          </div>
        </CardBody>
      </Card>
    </Container>
  );
};

export default MasterProductsTable;

