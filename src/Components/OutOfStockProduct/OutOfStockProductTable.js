"use client";
import React, { useState, useEffect, useContext, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Table, Card, CardBody, Input, Badge } from "reactstrap";
import { RiSearchLine, RiPencilLine } from "react-icons/ri";
import { ChevronLeft, ChevronRight } from "lucide-react";
import request from "../../Utils/AxiosUtils";
import { outOfStockProduct } from "../../Utils/AxiosUtils/API";
import Btn from "../../Elements/Buttons/Btn";
import { ToastNotification } from "../../Utils/CustomFunctions/ToastNotification";
import I18NextContext from "@/Helper/I18NextContext";
import { useTranslation } from "@/app/i18n/client";
import Loader from "../CommonComponent/Loader";

const OutOfStockProductTable = () => {
  const router = useRouter();
  const { i18Lang } = useContext(I18NextContext);
  const { t } = useTranslation(i18Lang, "common");

  const [loading, setLoading] = useState(true);
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [paginate, setPaginate] = useState(15);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search input so we don't hammer the API on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchOutOfStock = useCallback(async () => {
    setLoading(true);
    try {
      const res = await request({
        url: outOfStockProduct,
        method: "GET",
        params: { paginate, page, search: debouncedSearch || undefined },
      });
      const body = res?.data;
      // Backend returns a Laravel paginator { data: [...], total, last_page },
      // but fall back to a plain array for forward-compat.
      const rows = Array.isArray(body) ? body : body?.data || [];
      setList(rows);
      setTotal(Array.isArray(body) ? rows.length : body?.total ?? rows.length);
      setLastPage(Array.isArray(body) ? 1 : body?.last_page ?? 1);
    } catch (error) {
      console.error("Out of stock fetch error:", error);
      ToastNotification("error", error?.message || "Failed to load out of stock products");
    } finally {
      setLoading(false);
    }
  }, [paginate, page, debouncedSearch]);

  useEffect(() => {
    fetchOutOfStock();
  }, [fetchOutOfStock]);

  const handleRestock = (id) => {
    router.push(`/${i18Lang}/product/update/${id}`);
  };

  return (
    <Card>
      <CardBody>
        <div className="title-header option-title">
          <h5>
            {t("Out Of Stock Products")}{" "}
            {!loading && (
              <Badge color="danger" pill className="ms-2">
                {total}
              </Badge>
            )}
          </h5>
          <div className="right-options d-flex align-items-center gap-2">
            <Btn
              className="btn-outline btn-sm"
              type="button"
              onClick={fetchOutOfStock}
              title="Refresh"
            />
          </div>
        </div>

        <p className="text-muted small mt-2 mb-0">
          {t("Automatic list of products with zero quantity or out_of_stock status. Update quantity to restock.")}
        </p>

        {/* Search + page-size controls */}
        <div className="d-flex flex-column flex-md-row justify-content-between gap-3 mt-3">
          <div className="d-flex align-items-center gap-2">
            <span className="text-sm text-slate-500">{t("Show")}</span>
            <Input
              type="select"
              value={paginate}
              onChange={(e) => {
                setPaginate(Number(e.target.value));
                setPage(1);
              }}
              style={{ width: "80px" }}
            >
              {[15, 30, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </Input>
            <span className="text-sm text-slate-500">{t("Entries")}</span>
          </div>
          <div className="position-relative" style={{ maxWidth: "320px", width: "100%" }}>
            <Input
              type="search"
              placeholder="Search by name, SKU, barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <RiSearchLine
              className="position-absolute"
              style={{ right: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}
            />
          </div>
        </div>

        {loading ? (
          <Loader />
        ) : list.length === 0 ? (
          <div className="no-data-found-box text-center py-5">
            <p className="text-success fw-semibold mb-1">All products are in stock. Good job!</p>
            <p className="text-slate-500 mb-0 small">No out of stock products found.</p>
          </div>
        ) : (
          <>
            <div className="table-responsive border-table mt-3">
              <Table className="role-table all-package theme-table datatable-wrapper">
                <thead>
                  <tr>
                    <th className="sm-width">{t("No")}</th>
                    <th>{t("Image")}</th>
                    <th>{t("Name")}</th>
                    <th>{t("SKU")}</th>
                    <th>{t("Quantity")}</th>
                    <th>{t("Stock")}</th>
                    <th>{t("Price")}</th>
                    <th>{t("Action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((item, index) => (
                    <tr key={item.id}>
                      <td className="sm-width">{(page - 1) * paginate + index + 1}</td>
                      <td className="sm-width">
                        <img
                          src={item.product_thumbnail?.original_url || "/assets/images/placeholder.png"}
                          alt={item.name || ""}
                          style={{ width: "40px", height: "40px", objectFit: "cover", borderRadius: "8px" }}
                        />
                      </td>
                      <td>{item.name || "-"}</td>
                      <td className="text-muted small">{item.sku || item.barcode || "-"}</td>
                      <td>
                        <span className={`fw-bold ${Number(item.quantity) <= 0 ? "text-danger" : ""}`}>
                          {item.quantity ?? 0}
                        </span>
                      </td>
                      <td>
                        <span className="status-out_of_stock px-2.5 py-1 d-inline-block text-xs fw-semibold rounded">
                          {(item.stock_status || "out_of_stock").toString().replace(/_/g, " ")}
                        </span>
                      </td>
                      <td>{item.sale_price ?? item.price ?? "-"}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-light btn-xs p-1 d-inline-flex align-items-center gap-1"
                          title="Restock / Edit product"
                          onClick={() => handleRestock(item.id)}
                        >
                          <RiPencilLine /> Restock
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>

            {/* Pagination footer */}
            {lastPage > 1 && (
              <div className="d-flex flex-column flex-sm-row align-items-center justify-content-between gap-3 mt-3">
                <span className="text-sm text-slate-500">
                  {t("Showing")} {Math.min((page - 1) * paginate + 1, total)} {t("to")}{" "}
                  {Math.min(page * paginate, total)} {t("of")} {total} {t("Entries")}
                </span>
                <div className="d-flex align-items-center gap-2">
                  <button
                    className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1"
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  >
                    <ChevronLeft size={14} /> {t("Previous")}
                  </button>
                  <span className="text-sm fw-semibold">
                    {page} / {lastPage}
                  </span>
                  <button
                    className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1"
                    disabled={page === lastPage}
                    onClick={() => setPage((p) => Math.min(p + 1, lastPage))}
                  >
                    {t("Next")} <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </CardBody>
    </Card>
  );
};

export default OutOfStockProductTable;
