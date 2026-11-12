"use client";

import React, { useContext, useState, useMemo } from "react";
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
  Spinner,
  Alert
} from "reactstrap";
import * as Switch from "@radix-ui/react-switch";
import {
  RiSearchLine,
  RiFilter3Line,
  RiRefreshLine,
  RiCheckLine,
  RiCloseLine,
  RiFolderLine,
  RiUploadCloud2Line,
  RiPencilLine,
  RiEyeLine,
  RiEyeOffLine,
  RiStore3Line,
  RiInformationLine
} from "react-icons/ri";
import I18NextContext from "@/Helper/I18NextContext";
import { useTranslation } from "@/app/i18n/client";
import request from "@/Utils/AxiosUtils";
import { Category } from "@/Utils/AxiosUtils/API";
import { ToastNotification } from "@/Utils/CustomFunctions/ToastNotification";
import placeHolderImage from "../../../public/assets/images/placeholder.png";

const MasterCategoriesTable = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { i18Lang } = useContext(I18NextContext);
  const { t } = useTranslation(i18Lang, "common");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | '1' | '0'
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  // Fetch Categories
  const { data: rawCategories, isLoading, isFetching, refetch } = useQuery(
    [Category],
    () => request({ url: Category, params: { type: "product" } }),
    { refetchOnWindowFocus: false, select: (res) => res?.data?.data || [] }
  );

  // Flatten categories into list including subcategories
  const allCategoriesList = useMemo(() => {
    if (!rawCategories || !Array.isArray(rawCategories)) return [];
    const list = [];
    const traverse = (cats, parent = null) => {
      cats.forEach((cat) => {
        list.push({
          ...cat,
          parentName: parent ? parent.name : null,
          subCount: cat.subcategories ? cat.subcategories.length : 0
        });
        if (cat.subcategories && cat.subcategories.length > 0) {
          traverse(cat.subcategories, cat);
        }
      });
    };
    traverse(rawCategories);
    return list;
  }, [rawCategories]);

  // Filtered categories
  const filteredCategories = useMemo(() => {
    return allCategoriesList.filter((cat) => {
      if (search) {
        const query = search.toLowerCase();
        const matchesName = (cat.name || "").toLowerCase().includes(query);
        const matchesSlug = (cat.slug || "").toLowerCase().includes(query);
        if (!matchesName && !matchesSlug) return false;
      }
      if (statusFilter !== "all") {
        if (Number(cat.status) !== parseInt(statusFilter, 10)) return false;
      }
      return true;
    });
  }, [allCategoriesList, search, statusFilter]);

  // Statistics
  const activeCount = useMemo(() => {
    return allCategoriesList.filter((c) => Number(c.status) === 1).length;
  }, [allCategoriesList]);

  const inactiveCount = allCategoriesList.length - activeCount;

  // Single category status toggle
  const handleToggleStatus = async (item, currentStatus) => {
    const newStatus = Number(currentStatus) === 1 ? 0 : 1;
    setTogglingId(item.id);

    try {
      // Endpoint contract in mstore: PUT /category/{id}/{status} with boolean/number
      await request({
        url: `${Category}/${item.id}/${newStatus}`,
        method: "put",
        data: Boolean(newStatus)
      });

      ToastNotification(
        "success",
        `Category "${item.name}" marked as ${newStatus === 1 ? "ACTIVE (Visible in App)" : "INACTIVE (Hidden)"}`
      );
      queryClient.invalidateQueries([Category]);
    } catch (err) {
      // Fallback direct update
      try {
        await request({
          url: `${Category}/${item.id}`,
          method: "put",
          data: { status: newStatus }
        });
        ToastNotification(
          "success",
          `Category "${item.name}" marked as ${newStatus === 1 ? "ACTIVE (Visible in App)" : "INACTIVE (Hidden)"}`
        );
        queryClient.invalidateQueries([Category]);
      } catch (e2) {
        ToastNotification("error", `Failed to update category status: ${e2.message}`);
      }
    } finally {
      setTogglingId(null);
    }
  };

  // Bulk status update
  const handleBulkStatusChange = async (targetStatus, all = false) => {
    const idsToUpdate = all ? allCategoriesList.map((c) => c.id) : selectedIds;
    if (idsToUpdate.length === 0) return;

    setIsBulkLoading(true);
    let successCount = 0;

    for (const id of idsToUpdate) {
      try {
        await request({
          url: `${Category}/${id}/${targetStatus}`,
          method: "put",
          data: Boolean(targetStatus)
        });
        successCount++;
      } catch (err) {
        try {
          await request({
            url: `${Category}/${id}`,
            method: "put",
            data: { status: targetStatus }
          });
          successCount++;
        } catch (e) {
          // ignore individual error
        }
      }
    }

    setIsBulkLoading(false);
    setSelectedIds([]);
    queryClient.invalidateQueries([Category]);
    ToastNotification(
      "success",
      `${successCount} categories marked as ${targetStatus === 1 ? "ACTIVE (Visible in App)" : "INACTIVE (Hidden)"} successfully.`
    );
  };

  // Selection
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredCategories.map((c) => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const isAllSelected = filteredCategories.length > 0 && selectedIds.length === filteredCategories.length;

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
          <h3 className="fw-bold text-slate-800 mb-1">{t("MasterCategoriesTitle")}</h3>
          <p className="text-muted mb-0">{t("MasterCategoriesSubtitle")}</p>
        </div>
        <div className="d-flex gap-2">
          <Link href={`/${i18Lang}/master-data/upload`} className="btn btn-theme d-flex align-items-center gap-2">
            <RiUploadCloud2Line /> Upload / Import CSV
          </Link>
          <Link href={`/${i18Lang}/master-data/products`} className="btn btn-outline-primary d-flex align-items-center gap-2">
            <RiStore3Line /> View Master Products
          </Link>
          <RsButton color="light" className="border d-flex align-items-center gap-1" onClick={() => refetch()}>
            <RiRefreshLine className={isFetching ? "animate-spin" : ""} /> Refresh
          </RsButton>
        </div>
      </div>

      {/* App Visibility Explanatory Banner */}
      <div className="p-3 mb-4 rounded-3 border bg-light d-flex align-items-center gap-3">
        <div className="badge bg-primary-subtle text-primary p-2 rounded-circle fs-5">
          <RiFolderLine />
        </div>
        <div className="text-sm">
          <strong className="text-slate-800">Category App Visibility:</strong> Categories marked as{" "}
          <span className="badge bg-success-subtle text-success px-2 py-0.5 rounded-pill">Active</span> are
          displayed to customers in the mobile app category navigation, homepage carousels, and search filters.
          Categories marked as{" "}
          <span className="badge bg-secondary-subtle text-secondary px-2 py-0.5 rounded-pill">Inactive</span> are
          immediately hidden from the customer-facing app.
        </div>
      </div>

      {/* Main Table Card */}
      <Card className="shadow-sm border-0">
        <CardBody className="p-4">
          {/* Filters Bar */}
          <Row className="g-3 mb-4 align-items-center">
            <Col xl="5" md="6">
              <div className="position-relative">
                <Input
                  type="text"
                  placeholder="Search category by name or slug..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pe-5"
                />
                <RiSearchLine className="position-absolute top-50 end-0 translate-middle-y me-3 text-muted" />
              </div>
            </Col>

            <Col xl="3" md="6">
              <Input
                type="select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses ({allCategoriesList.length})</option>
                <option value="1">Active Only in App ({activeCount})</option>
                <option value="0">Inactive Only ({inactiveCount})</option>
              </Input>
            </Col>

            <Col xl="4" className="d-flex justify-content-end gap-2">
              <RsButton
                color="outline-success"
                size="sm"
                disabled={isBulkLoading}
                onClick={() => handleBulkStatusChange(1, true)}
                className="d-flex align-items-center gap-1"
                title="Mark all categories as active in app"
              >
                <RiCheckLine /> Activate All
              </RsButton>
              <RsButton
                color="outline-secondary"
                size="sm"
                disabled={isBulkLoading}
                onClick={() => handleBulkStatusChange(0, true)}
                className="d-flex align-items-center gap-1"
                title="Mark all categories as inactive"
              >
                <RiCloseLine /> Deactivate All
              </RsButton>
            </Col>
          </Row>

          {/* Bulk Action Controls */}
          {selectedIds.length > 0 && (
            <div className="p-2 mb-3 bg-primary-subtle border border-primary rounded-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
              <span className="text-primary fw-semibold text-sm">
                {selectedIds.length} categor{selectedIds.length > 1 ? "ies" : "y"} selected
              </span>
              <div className="d-flex gap-2">
                <RsButton
                  color="success"
                  size="sm"
                  disabled={isBulkLoading}
                  onClick={() => handleBulkStatusChange(1, false)}
                  className="d-flex align-items-center gap-1"
                >
                  <RiEyeLine /> Set Active (Show in App)
                </RsButton>
                <RsButton
                  color="secondary"
                  size="sm"
                  disabled={isBulkLoading}
                  onClick={() => handleBulkStatusChange(0, false)}
                  className="d-flex align-items-center gap-1"
                >
                  <RiEyeOffLine /> Set Inactive (Hide in App)
                </RsButton>
              </div>
            </div>
          )}

          {/* Categories Table */}
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
                  <th>Category</th>
                  <th>Hierarchy / Parent</th>
                  <th className="text-center">Subcategories</th>
                  <th className="text-center">Products Count</th>
                  <th className="text-center">Active in App?</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-5">
                      <Spinner color="primary" />
                      <div className="text-muted text-xs mt-2">Loading categories...</div>
                    </td>
                  </tr>
                ) : filteredCategories.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-5 text-muted">
                      <RiFolderLine size={48} className="text-slate-300 mb-2" />
                      <div className="fw-semibold">No categories found</div>
                      <small>Try a different search or import new master data.</small>
                    </td>
                  </tr>
                ) : (
                  filteredCategories.map((item) => {
                    const isActive = Number(item.status) === 1;
                    const isSelected = selectedIds.includes(item.id);
                    const isRowToggling = togglingId === item.id;
                    const imgUrl =
                      item.media?.find((m) => m.collection_name === "image" || m.collection_name === "icon")
                        ?.original_url || placeHolderImage;

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
                              style={{ width: "40px", height: "40px", position: "relative", flexShrink: 0 }}
                              className="rounded border overflow-hidden bg-light"
                            >
                              <Image
                                src={imgUrl}
                                alt={item.name}
                                fill
                                sizes="40px"
                                style={{ objectFit: "contain" }}
                              />
                            </div>
                            <div>
                              <div className="fw-semibold text-slate-800">{item.name}</div>
                              <small className="text-muted text-xs font-monospace">slug: {item.slug}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          {item.parentName ? (
                            <span className="badge bg-light text-dark border">
                              Subcategory of <strong>{item.parentName}</strong>
                            </span>
                          ) : (
                            <span className="badge bg-primary-subtle text-primary">
                              Root Category
                            </span>
                          )}
                        </td>
                        <td className="text-center">
                          <span className="badge bg-secondary-subtle text-secondary px-2.5 py-1 rounded-pill">
                            {item.subCount} sub
                          </span>
                        </td>
                        <td className="text-center">
                          <span className="fw-semibold text-slate-700">
                            {item.products_count !== undefined ? item.products_count : "-"}
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
                          <Link
                            href={`/${i18Lang}/category/update/${item.id}`}
                            className="btn btn-sm btn-outline-secondary p-1"
                            title="Edit Category"
                          >
                            <RiPencilLine size={16} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </Table>
          </div>
        </CardBody>
      </Card>
    </Container>
  );
};

export default MasterCategoriesTable;

