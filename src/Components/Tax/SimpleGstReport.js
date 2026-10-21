import React, { useContext, useEffect, useMemo, useState } from "react";
import { Card, CardBody, Button, Spinner, Table, Badge, Row, Col } from "reactstrap";
import { useQuery } from "@tanstack/react-query";
import request from "@/Utils/AxiosUtils";
import { gstReport, OrderAPI, tax } from "@/Utils/AxiosUtils/API";
import SettingContext from "@/Helper/SettingContext";
import I18NextContext from "@/Helper/I18NextContext";
import { useTranslation } from "@/app/i18n/client";
import {
  RiFilter3Line,
  RiFilterOffLine,
  RiPrinterLine,
  RiFileExcel2Line,
  RiInformationLine,
  RiCalendarLine,
  RiBillLine,
  RiMoneyDollarCircleLine,
  RiPercentLine,
  RiFileListLine,
  RiSearchLine,
  RiFoldersLine,
  RiBarcodeLine,
  RiStackLine,
} from "react-icons/ri";

// Format date to YYYY-MM-DD
const formatDate = (date) => {
  if (!date) return "";
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Format date to DD/MM/YYYY for display
const formatDisplayDate = (dateStr) => {
  if (!dateStr) return "-";
  const parts = String(dateStr).split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

// Format numbers with 2 decimals
const formatNum = (val) => {
  const n = Number(val);
  if (isNaN(n)) return "0.00";
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// Helper to compute preset date ranges
const calcPresetDates = (type) => {
  const now = new Date();
  if (type === "today") {
    const d = formatDate(now);
    return { from: d, to: d };
  } else if (type === "yesterday") {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    const d = formatDate(y);
    return { from: d, to: d };
  } else if (type === "this_month") {
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: formatDate(firstDay), to: formatDate(now) };
  } else if (type === "last_month") {
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: formatDate(firstDay), to: formatDate(lastDay) };
  } else if (type === "last_7_days") {
    const past7 = new Date(now);
    past7.setDate(past7.getDate() - 6);
    return { from: formatDate(past7), to: formatDate(now) };
  }
  const d = formatDate(now);
  return { from: d, to: d };
};

// Reusable Period Filter Bar matching MStore styling
const PeriodFilterBar = ({
  activeFilter,
  fromDate,
  toDate,
  onPreset,
  onFromChange,
  onToChange,
  onFilter,
  onReset,
  isLoading,
}) => (
  <div
    className="d-flex flex-wrap align-items-center justify-content-between gap-3 p-3 rounded-3 mb-3 no-print"
    style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}
  >
    <div className="d-flex flex-wrap align-items-center gap-1">
      <span className="text-muted mr-2 font-weight-500" style={{ fontSize: "13px" }}>
        Period:
      </span>
      {[
        { key: "today", label: "Today" },
        { key: "yesterday", label: "Yesterday" },
        { key: "last_7_days", label: "Last 7 Days" },
        { key: "this_month", label: "This Month" },
        { key: "last_month", label: "Last Month" },
      ].map((p) => (
        <button
          key={p.key}
          type="button"
          className={`btn btn-sm ${
            activeFilter === p.key ? "font-weight-bold text-white shadow-sm" : "bg-white text-dark border"
          }`}
          style={{
            fontSize: "12.5px",
            padding: "5px 12px",
            borderRadius: "8px",
            backgroundColor: activeFilter === p.key ? "#172b4d" : "#ffffff",
            borderColor: activeFilter === p.key ? "#172b4d" : "#e2e8f0",
          }}
          onClick={() => onPreset(p.key)}
        >
          {p.label}
        </button>
      ))}
    </div>

    <div className="d-flex align-items-center gap-2 flex-wrap">
      <div
        className="d-flex align-items-center gap-2 bg-white px-2 py-1 rounded"
        style={{ border: "1px solid #e2e8f0" }}
      >
        <RiCalendarLine size={15} className="text-muted" />
        <span style={{ fontSize: "12px", color: "#64748b" }}>From:</span>
        <input
          type="date"
          className="border-0 bg-transparent"
          style={{ fontSize: "13px", outline: "none", cursor: "pointer", color: "#1e293b" }}
          value={fromDate}
          onChange={(e) => onFromChange(e.target.value)}
        />
      </div>

      <div
        className="d-flex align-items-center gap-2 bg-white px-2 py-1 rounded"
        style={{ border: "1px solid #e2e8f0" }}
      >
        <RiCalendarLine size={15} className="text-muted" />
        <span style={{ fontSize: "12px", color: "#64748b" }}>To:</span>
        <input
          type="date"
          className="border-0 bg-transparent"
          style={{ fontSize: "13px", outline: "none", cursor: "pointer", color: "#1e293b" }}
          value={toDate}
          onChange={(e) => onToChange(e.target.value)}
        />
      </div>

      <button
        type="button"
        className="btn btn-sm text-white d-flex align-items-center gap-1 px-3 py-2 rounded"
        style={{ backgroundColor: "#172b4d", borderColor: "#172b4d" }}
        onClick={onFilter}
        title="Apply Filter"
      >
        <RiFilter3Line size={15} />
        <span style={{ fontSize: "12.5px" }}>Filter</span>
        {isLoading && <Spinner size="sm" color="light" className="ml-1" />}
      </button>

      <button
        type="button"
        className="btn btn-sm btn-light border d-flex align-items-center gap-1 px-2 py-2 rounded"
        onClick={onReset}
        title="Reset to Today"
      >
        <RiFilterOffLine size={15} className="text-danger" />
      </button>
    </div>
  </div>
);

const SimpleGstReport = () => {
  const { i18Lang } = useContext(I18NextContext);
  const { t } = useTranslation(i18Lang, "common");
  const { convertCurrency, settingObj } = useContext(SettingContext);

  const todayStr = useMemo(() => formatDate(new Date()), []);
  const [showFormulaHelp, setShowFormulaHelp] = useState(false);

  // Active store from localStorage if multi-store
  const activeStoreName = typeof window !== "undefined" ? localStorage.getItem("active_store_name") : null;

  // =========================================================================
  // REPORT 1 (SIMPLE GST REPORT / SLABS) INDEPENDENT STATE
  // =========================================================================
  const [r1FromDate, setR1FromDate] = useState(todayStr);
  const [r1ToDate, setR1ToDate] = useState(todayStr);
  const [r1ActiveFilter, setR1ActiveFilter] = useState("today");

  const handleR1Preset = (type) => {
    setR1ActiveFilter(type);
    const { from, to } = calcPresetDates(type);
    setR1FromDate(from);
    setR1ToDate(to);
  };

  const handleR1Reset = () => {
    handleR1Preset("today");
  };

  // =========================================================================
  // REPORT 2 (HSN & SUBCATEGORY SUMMARY) INDEPENDENT STATE
  // =========================================================================
  const [r2FromDate, setR2FromDate] = useState(todayStr);
  const [r2ToDate, setR2ToDate] = useState(todayStr);
  const [r2ActiveFilter, setR2ActiveFilter] = useState("today");
  const [hsnSearchTerm, setHsnSearchTerm] = useState("");

  const handleR2Preset = (type) => {
    setR2ActiveFilter(type);
    const { from, to } = calcPresetDates(type);
    setR2FromDate(from);
    setR2ToDate(to);
  };

  const handleR2Reset = () => {
    handleR2Preset("today");
  };

  // =========================================================================
  // SHARED: STORE TAXES
  // =========================================================================
  const { data: storeTaxes } = useQuery(
    [tax, "report-slabs"],
    () => request({ url: tax, params: { paginate: 100 } }),
    {
      select: (res) => res?.data?.data || res?.data || [],
      staleTime: 5 * 60 * 1000,
    }
  );

  // =========================================================================
  // REPORT 1: DATA QUERIES
  // =========================================================================
  const {
    data: r1ReportData,
    isLoading: r1ReportLoading,
    isFetching: r1ReportFetching,
    refetch: refetchR1Report,
  } = useQuery(
    [gstReport, "r1", r1FromDate, r1ToDate],
    () =>
      request({
        url: gstReport,
        method: "get",
        params: {
          from: r1FromDate,
          to: r1ToDate,
        },
      }),
    {
      refetchOnWindowFocus: false,
      select: (res) => res?.data,
      staleTime: 30 * 1000,
    }
  );

  const {
    data: r1OrdersList,
    isLoading: r1OrdersLoading,
    refetch: refetchR1Orders,
  } = useQuery(
    [OrderAPI, "gst-orders-r1", r1FromDate, r1ToDate],
    () =>
      request({
        url: OrderAPI,
        method: "get",
        params: {
          start_date: r1FromDate,
          end_date: r1ToDate,
          paginate: 500,
        },
      }),
    {
      refetchOnWindowFocus: false,
      select: (res) => res?.data?.data || res?.data || [],
      staleTime: 30 * 1000,
    }
  );

  const [r1OrderDetailsMap, setR1OrderDetailsMap] = useState({});
  const [r1FetchingDetails, setR1FetchingDetails] = useState(false);

  useEffect(() => {
    const hasReportLines = Array.isArray(r1ReportData?.lines) && r1ReportData.lines.length > 0;
    const hasReportSlabs = Array.isArray(r1ReportData?.slabs) && r1ReportData.slabs.some((s) => s.total_sale > 0);

    if (!hasReportLines && !hasReportSlabs && Array.isArray(r1OrdersList) && r1OrdersList.length > 0) {
      const activeList = r1OrdersList.filter((o) => {
        const s = (o.order_status?.slug || o.order_status?.name || o.payment_status || "").toLowerCase();
        return !s.includes("cancel");
      });

      const missing = activeList.filter((o) => {
        const num = o.order_number || o.id;
        return num && !r1OrderDetailsMap[num] && !Array.isArray(o.products);
      });

      if (missing.length > 0 && !r1FetchingDetails) {
        setR1FetchingDetails(true);
        const batch = missing.slice(0, 40);
        Promise.all(
          batch.map((o) => {
            const num = o.order_number || o.id;
            return request({ url: `${OrderAPI}/${num}` })
              .then((res) => ({ num, data: res?.data }))
              .catch(() => ({ num, data: null }));
          })
        )
          .then((results) => {
            setR1OrderDetailsMap((prev) => {
              const next = { ...prev };
              results.forEach((r) => {
                if (r.data) next[r.num] = r.data;
              });
              return next;
            });
            setR1FetchingDetails(false);
          })
          .catch(() => setR1FetchingDetails(false));
      }
    }
  }, [r1OrdersList, r1ReportData, r1OrderDetailsMap, r1FetchingDetails]);

  // =========================================================================
  // REPORT 2: DATA QUERIES
  // =========================================================================
  const {
    data: r2ReportData,
    isLoading: r2ReportLoading,
    isFetching: r2ReportFetching,
    refetch: refetchR2Report,
  } = useQuery(
    [gstReport, "r2", r2FromDate, r2ToDate],
    () =>
      request({
        url: gstReport,
        method: "get",
        params: {
          from: r2FromDate,
          to: r2ToDate,
        },
      }),
    {
      refetchOnWindowFocus: false,
      select: (res) => res?.data,
      staleTime: 30 * 1000,
    }
  );

  const {
    data: r2OrdersList,
    isLoading: r2OrdersLoading,
    refetch: refetchR2Orders,
  } = useQuery(
    [OrderAPI, "gst-orders-r2", r2FromDate, r2ToDate],
    () =>
      request({
        url: OrderAPI,
        method: "get",
        params: {
          start_date: r2FromDate,
          end_date: r2ToDate,
          paginate: 500,
        },
      }),
    {
      refetchOnWindowFocus: false,
      select: (res) => res?.data?.data || res?.data || [],
      staleTime: 30 * 1000,
    }
  );

  const [r2OrderDetailsMap, setR2OrderDetailsMap] = useState({});
  const [r2FetchingDetails, setR2FetchingDetails] = useState(false);

  useEffect(() => {
    const hasHsnSummary = Array.isArray(r2ReportData?.hsn_summary) && r2ReportData.hsn_summary.length > 0;
    const hasReportLines = Array.isArray(r2ReportData?.lines) && r2ReportData.lines.length > 0;

    if (!hasHsnSummary && !hasReportLines && Array.isArray(r2OrdersList) && r2OrdersList.length > 0) {
      const activeList = r2OrdersList.filter((o) => {
        const s = (o.order_status?.slug || o.order_status?.name || o.payment_status || "").toLowerCase();
        return !s.includes("cancel");
      });

      const missing = activeList.filter((o) => {
        const num = o.order_number || o.id;
        return num && !r2OrderDetailsMap[num] && !Array.isArray(o.products);
      });

      if (missing.length > 0 && !r2FetchingDetails) {
        setR2FetchingDetails(true);
        const batch = missing.slice(0, 40);
        Promise.all(
          batch.map((o) => {
            const num = o.order_number || o.id;
            return request({ url: `${OrderAPI}/${num}` })
              .then((res) => ({ num, data: res?.data }))
              .catch(() => ({ num, data: null }));
          })
        )
          .then((results) => {
            setR2OrderDetailsMap((prev) => {
              const next = { ...prev };
              results.forEach((r) => {
                if (r.data) next[r.num] = r.data;
              });
              return next;
            });
            setR2FetchingDetails(false);
          })
          .catch(() => setR2FetchingDetails(false));
      }
    }
  }, [r2OrdersList, r2ReportData, r2OrderDetailsMap, r2FetchingDetails]);

  // =========================================================================
  // REPORT 1: SLABS CALCULATION (GSTR-3B B2C STATEMENT)
  // =========================================================================
  const processedR1 = useMemo(() => {
    const ratesSet = new Set([0, 3, 5, 18, 40]);
    if (Array.isArray(storeTaxes)) {
      storeTaxes.forEach((t) => {
        const r = parseFloat(t.rate);
        if (!isNaN(r)) ratesSet.add(r);
      });
    }

    let totalBills = 0;
    let cancelledBills = 0;
    let activeBills = 0;
    let billStart = "-";
    let billEnd = "-";

    const orders = Array.isArray(r1OrdersList) ? r1OrdersList : [];
    if (orders.length > 0) {
      totalBills = orders.length;
      const billNumbers = [];
      orders.forEach((o) => {
        const num = o.order_number || o.id;
        if (num) billNumbers.push(String(num));

        const s = (o.order_status?.slug || o.order_status?.name || o.payment_status || "").toLowerCase();
        if (s.includes("cancel")) {
          cancelledBills++;
        } else {
          activeBills++;
        }
      });
      if (billNumbers.length > 0) {
        billStart = billNumbers[0];
        billEnd = billNumbers[billNumbers.length - 1];
      }
    } else if (r1ReportData?.bills) {
      totalBills = r1ReportData.bills.total_bills || 0;
      cancelledBills = r1ReportData.bills.cancelled_bills || 0;
      activeBills = r1ReportData.bills.active_bills || 0;
      billStart = r1ReportData.bills.bill_start || "-";
      billEnd = r1ReportData.bills.bill_end || "-";
    }

    const salesByRate = {};
    ratesSet.forEach((r) => {
      salesByRate[r] = 0;
    });

    let hasConcreteSales = false;

    // Source 1: Backend reportData.slabs
    if (Array.isArray(r1ReportData?.slabs) && r1ReportData.slabs.some((s) => Number(s.total_sale || 0) > 0)) {
      r1ReportData.slabs.forEach((s) => {
        const r = Number(s.rate);
        const sale = Number(s.total_sale || 0);
        salesByRate[r] = (salesByRate[r] || 0) + sale;
        ratesSet.add(r);
        if (sale > 0) hasConcreteSales = true;
      });
    }
    // Source 2: Backend reportData.lines
    else if (Array.isArray(r1ReportData?.lines) && r1ReportData.lines.length > 0) {
      r1ReportData.lines.forEach((line) => {
        const r = Number(line.gst_rate ?? 0);
        const lineSale = Number(
          line.selling_price_inclusive ??
            line.line_total ??
            (Number(line.taxable_value || 0) + Number(line.total_gst || 0)) ??
            0
        );
        salesByRate[r] = (salesByRate[r] || 0) + lineSale;
        ratesSet.add(r);
        if (lineSale > 0) hasConcreteSales = true;
      });
    }
    // Source 3: Active orders & r1OrderDetailsMap
    else if (orders.length > 0) {
      const activeOrders = orders.filter((o) => {
        const s = (o.order_status?.slug || o.order_status?.name || o.payment_status || "").toLowerCase();
        return !s.includes("cancel");
      });

      activeOrders.forEach((o) => {
        const num = o.order_number || o.id;
        const details = r1OrderDetailsMap[num] || o;
        const products = details?.products;

        if (Array.isArray(products) && products.length > 0) {
          products.forEach((prod) => {
            const pivot = prod.pivot || {};
            const qty = Number(pivot.quantity || 1);
            const price = Number(pivot.single_price || prod.sale_price || prod.price || 0);
            const lineSale = Number(pivot.subtotal ? Number(pivot.subtotal) + Number(pivot.tax || 0) : price * qty);

            let r = 0;
            if (prod.tax && prod.tax.rate !== undefined) {
              r = Number(prod.tax.rate);
            }
            salesByRate[r] = (salesByRate[r] || 0) + lineSale;
            ratesSet.add(r);
            if (lineSale > 0) hasConcreteSales = true;
          });
        } else {
          const orderTotal = Number(o.total || o.amount || 0);
          if (orderTotal > 0) {
            salesByRate[0] = (salesByRate[0] || 0) + orderTotal;
            hasConcreteSales = true;
          }
        }
      });
    }

    const sortedRates = Array.from(ratesSet).sort((a, b) => a - b);
    const slabs = sortedRates.map((r) => {
      const totalSale = Number((salesByRate[r] || 0).toFixed(2));
      const taxableValue = r > 0 ? Number(((totalSale * 100) / (100 + r)).toFixed(2)) : totalSale;
      const cgst = r > 0 ? Number((taxableValue * ((r / 2) / 100)).toFixed(2)) : 0;
      const sgst = r > 0 ? Number((taxableValue * ((r / 2) / 100)).toFixed(2)) : 0;

      return {
        name: `Sales (b2c)-${r}%`,
        rate: r,
        total_sale: totalSale,
        taxable_value: taxableValue,
        cgst,
        sgst,
        igst: 0,
        gst_cess: 0,
      };
    });

    const grandTotalSale = Number(slabs.reduce((acc, curr) => acc + curr.total_sale, 0).toFixed(2));
    const grandTaxable = Number(slabs.reduce((acc, curr) => acc + curr.taxable_value, 0).toFixed(2));
    const grandCgst = Number(slabs.reduce((acc, curr) => acc + curr.cgst, 0).toFixed(2));
    const grandSgst = Number(slabs.reduce((acc, curr) => acc + curr.sgst, 0).toFixed(2));

    const storeName =
      r1ReportData?.store?.name || activeStoreName || settingObj?.general?.site_title || "MATHER TRADING COMPANY";
    const storeAddress = r1ReportData?.store?.address || "NH-47, KOTTIYAM, KOLLAM";

    return {
      storeName,
      storeAddress,
      slabs,
      grandTotalSale,
      grandTaxable,
      grandCgst,
      grandSgst,
      billStart,
      billEnd,
      totalBills,
      cancelledBills,
      activeBills,
      hasConcreteSales,
    };
  }, [storeTaxes, r1ReportData, r1OrdersList, r1OrderDetailsMap, activeStoreName, settingObj]);

  // =========================================================================
  // REPORT 2: HSN / SUBCATEGORY / GST GROUPING
  // Columns: HSN CODE | SUBCATEGORY NAME | TOTAL SALE QTY | GST | TAXABLE RATE | CGST | SGST
  // =========================================================================
  const hsnSubcategoryData = useMemo(() => {
    // Priority 1: Use backend r2ReportData.hsn_summary if available
    if (Array.isArray(r2ReportData?.hsn_summary) && r2ReportData.hsn_summary.length > 0) {
      return r2ReportData.hsn_summary;
    }

    // Priority 2: Use backend r2ReportData.lines
    if (Array.isArray(r2ReportData?.lines) && r2ReportData.lines.length > 0) {
      const map = {};
      r2ReportData.lines.forEach((line) => {
        const hsn = line.hsn_code ? String(line.hsn_code).trim() : "N/A";
        const subcat = line.subcategory_name ? String(line.subcategory_name).trim() : "General";
        const rate = Number(line.gst_rate ?? 0);
        const qty = Number(line.quantity ?? 1);
        const lineSale = Number(
          line.selling_price_inclusive ??
            line.line_total ??
            (Number(line.taxable_value || 0) + Number(line.total_gst || 0)) ??
            0
        );

        const groupKey = `${hsn}__${subcat}__${rate}`;
        if (!map[groupKey]) {
          map[groupKey] = {
            hsn_code: hsn,
            subcategory_name: subcat,
            gst_rate: rate,
            total_qty: 0,
            total_sale: 0,
          };
        }
        map[groupKey].total_qty += qty;
        map[groupKey].total_sale += lineSale;
      });

      return Object.values(map)
        .map((item) => {
          const taxable =
            item.gst_rate > 0 ? Number(((item.total_sale * 100) / (100 + item.gst_rate)).toFixed(2)) : item.total_sale;
          const cgst = item.gst_rate > 0 ? Number((taxable * ((item.gst_rate / 2) / 100)).toFixed(2)) : 0;
          const sgst = item.gst_rate > 0 ? Number((taxable * ((item.gst_rate / 2) / 100)).toFixed(2)) : 0;
          return {
            hsn_code: item.hsn_code,
            subcategory_name: item.subcategory_name,
            total_qty: item.total_qty,
            gst_rate: item.gst_rate,
            total_sale: item.total_sale,
            taxable_value: taxable,
            cgst,
            sgst,
          };
        })
        .sort((a, b) => a.hsn_code.localeCompare(b.hsn_code) || a.subcategory_name.localeCompare(b.subcategory_name));
    }

    // Priority 3: Compute from active orders and r2OrderDetailsMap
    const map = {};
    const orders = Array.isArray(r2OrdersList) ? r2OrdersList : [];
    const activeOrders = orders.filter((o) => {
      const s = (o.order_status?.slug || o.order_status?.name || o.payment_status || "").toLowerCase();
      return !s.includes("cancel");
    });

    activeOrders.forEach((o) => {
      const num = o.order_number || o.id;
      const details = r2OrderDetailsMap[num] || o;
      const products = details?.products;

      if (Array.isArray(products) && products.length > 0) {
        products.forEach((prod) => {
          const pivot = prod.pivot || {};
          const qty = Number(pivot.quantity || 1);
          const price = Number(pivot.single_price || prod.sale_price || prod.price || 0);
          const lineSale = Number(pivot.subtotal ? Number(pivot.subtotal) + Number(pivot.tax || 0) : price * qty);

          let rate = 0;
          if (prod.tax && prod.tax.rate !== undefined) {
            rate = Number(prod.tax.rate);
          }

          let subcat = "General";
          if (Array.isArray(prod.categories) && prod.categories.length > 0) {
            const childCat = prod.categories.find((c) => c.parent_id !== null);
            subcat = childCat ? childCat.name : prod.categories[0].name;
          }

          const hsn = prod.hsn_code ? String(prod.hsn_code).trim() : "N/A";
          const groupKey = `${hsn}__${subcat}__${rate}`;

          if (!map[groupKey]) {
            map[groupKey] = {
              hsn_code: hsn,
              subcategory_name: subcat,
              gst_rate: rate,
              total_qty: 0,
              total_sale: 0,
            };
          }
          map[groupKey].total_qty += qty;
          map[groupKey].total_sale += lineSale;
        });
      }
    });

    return Object.values(map)
      .map((item) => {
        const taxable =
          item.gst_rate > 0 ? Number(((item.total_sale * 100) / (100 + item.gst_rate)).toFixed(2)) : item.total_sale;
        const cgst = item.gst_rate > 0 ? Number((taxable * ((item.gst_rate / 2) / 100)).toFixed(2)) : 0;
        const sgst = item.gst_rate > 0 ? Number((taxable * ((item.gst_rate / 2) / 100)).toFixed(2)) : 0;
        return {
          hsn_code: item.hsn_code,
          subcategory_name: item.subcategory_name,
          total_qty: item.total_qty,
          gst_rate: item.gst_rate,
          total_sale: item.total_sale,
          taxable_value: taxable,
          cgst,
          sgst,
        };
      })
      .sort((a, b) => a.hsn_code.localeCompare(b.hsn_code) || a.subcategory_name.localeCompare(b.subcategory_name));
  }, [r2ReportData, r2OrdersList, r2OrderDetailsMap]);

  // Filtered HSN data by search input
  const filteredHsnData = useMemo(() => {
    if (!hsnSearchTerm.trim()) return hsnSubcategoryData;
    const term = hsnSearchTerm.toLowerCase();
    return hsnSubcategoryData.filter(
      (item) =>
        item.hsn_code.toLowerCase().includes(term) ||
        item.subcategory_name.toLowerCase().includes(term) ||
        String(item.gst_rate).includes(term)
    );
  }, [hsnSubcategoryData, hsnSearchTerm]);

  // HSN summary totals
  const hsnTotals = useMemo(() => {
    const totalQty = filteredHsnData.reduce((acc, curr) => acc + curr.total_qty, 0);
    const totalTaxable = Number(filteredHsnData.reduce((acc, curr) => acc + curr.taxable_value, 0).toFixed(2));
    const totalCgst = Number(filteredHsnData.reduce((acc, curr) => acc + curr.cgst, 0).toFixed(2));
    const totalSgst = Number(filteredHsnData.reduce((acc, curr) => acc + curr.sgst, 0).toFixed(2));
    const totalSale = Number(filteredHsnData.reduce((acc, curr) => acc + (curr.total_sale || 0), 0).toFixed(2));

    return {
      totalQty,
      totalTaxable,
      totalCgst,
      totalSgst,
      totalSale,
    };
  }, [filteredHsnData]);

  // Print handlers
  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  // Export CSV for Report 1
  const handleExportCsv = () => {
    if (!processedR1) return;
    const headers = ["Tax Slab", "Invoice Amount", "TAXABLE", "CGST", "SGST", "IGST", "GSTCESS"];
    const rows = [
      headers,
      ["Sales (b2c)", processedR1.grandTotalSale.toFixed(2), "", "", "", "", ""],
      ...processedR1.slabs.map((s) => [
        s.name,
        s.total_sale > 0 ? s.total_sale.toFixed(2) : "0.00",
        s.taxable_value.toFixed(2),
        s.cgst > 0 ? s.cgst.toFixed(2) : "0.00",
        s.sgst > 0 ? s.sgst.toFixed(2) : "0.00",
        "-",
        "-",
      ]),
      [
        "TOTAL",
        processedR1.grandTotalSale.toFixed(2),
        processedR1.grandTaxable.toFixed(2),
        processedR1.grandCgst.toFixed(2),
        processedR1.grandSgst.toFixed(2),
        "-",
        "-",
      ],
      [],
      ["Bill Numbers", `NUMBER : ${processedR1.billStart} to ${processedR1.billEnd}`],
      ["Total Bills", processedR1.totalBills],
      ["Cancelled Bills", processedR1.cancelledBills],
      ["Active Bills", processedR1.activeBills],
      ["Period", `From ${formatDisplayDate(r1FromDate)} To ${formatDisplayDate(r1ToDate)}`],
    ];

    const csvContent =
      "data:text/csv;charset=utf-8," +
      rows.map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `GST_Statement_${r1FromDate}_to_${r1ToDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export CSV for Report 2: HSN / Subcategory Summary
  const handleExportHsnCsv = () => {
    if (!hsnSubcategoryData) return;
    const headers = [
      "HSN CODE",
      "SUBCATEGORY NAME",
      "TOTAL SALE QTY",
      "GST RATE (%)",
      "TAXABLE RATE (TAXABLE VALUE)",
      "CGST",
      "SGST",
      "TOTAL GST",
    ];
    const rows = [
      headers,
      ...hsnSubcategoryData.map((item) => [
        item.hsn_code,
        item.subcategory_name,
        item.total_qty,
        `${item.gst_rate}%`,
        item.taxable_value.toFixed(2),
        item.cgst.toFixed(2),
        item.sgst.toFixed(2),
        (item.cgst + item.sgst).toFixed(2),
      ]),
      [],
      [
        "TOTAL",
        "",
        hsnTotals.totalQty,
        "",
        hsnTotals.totalTaxable.toFixed(2),
        hsnTotals.totalCgst.toFixed(2),
        hsnTotals.totalSgst.toFixed(2),
        (hsnTotals.totalCgst + hsnTotals.totalSgst).toFixed(2),
      ],
      [],
      ["Period", `From ${formatDisplayDate(r2FromDate)} To ${formatDisplayDate(r2ToDate)}`],
      ["Store", processedR1.storeName],
    ];

    const csvContent =
      "data:text/csv;charset=utf-8," +
      rows.map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `HSN_Subcategory_Summary_${r2FromDate}_to_${r2ToDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isR1Busy = r1ReportLoading || r1OrdersLoading || r1FetchingDetails;
  const isR2Busy = r2ReportLoading || r2OrdersLoading || r2FetchingDetails;

  return (
    <>
      <style jsx global>{`
        /* Print Styles */
        @media print {
          body * {
            visibility: hidden;
          }
          #gst-report-card,
          #gst-report-card * {
            visibility: visible;
          }
          #gst-report-card {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
        }

        /* Modern MStore Theme Elements */
        .gst-kpi-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px 20px;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .gst-kpi-card:hover {
          box-shadow: 0 4px 12px -2px rgba(0, 0, 0, 0.05);
          transform: translateY(-1px);
        }
        .gst-kpi-icon {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
        }
        .gst-table th {
          background-color: #f8fafc;
          color: #475569;
          font-size: 13px;
          font-weight: 600;
          padding: 13px 16px;
          border-top: none;
          border-bottom: 2px solid #e2e8f0;
          letter-spacing: 0.3px;
        }
        .gst-table td {
          padding: 13px 16px;
          font-size: 13.5px;
          color: #1e293b;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
        }
        .gst-table tbody tr:hover {
          background-color: #f8fafc;
        }
        .gst-table tr.aggregate-row {
          background-color: #f1f5f9;
          font-weight: 600;
        }
        .gst-table tr.total-row {
          background-color: #f8fafc;
          border-top: 2px solid #cbd5e1;
          font-weight: 700;
        }
        .hsn-badge {
          font-family: monospace;
          background-color: #f1f5f9;
          color: #1e293b;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 4px 8px;
          font-size: 12px;
          font-weight: 600;
        }
        .subcat-badge {
          background-color: #f0fdf4;
          color: #15803d;
          border: 1px solid #dcfce7;
          border-radius: 6px;
          padding: 4px 8px;
          font-size: 12.5px;
          font-weight: 500;
        }
      `}</style>

      {/* Main Container Card */}
      <Card
        id="gst-report-card"
        className="mt-4 shadow-sm border-0"
        style={{
          borderRadius: "14px",
          backgroundColor: "#ffffff",
          border: "1px solid #e2e8f0",
        }}
      >
        <CardBody className="p-4">
          {/* Top Header Bar */}
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 pb-3 border-bottom no-print">
            <div>
              <div className="d-flex align-items-center gap-2">
                <div
                  style={{
                    width: "4px",
                    height: "22px",
                    backgroundColor: "#172b4d",
                    borderRadius: "4px",
                  }}
                />
                <h4 className="mb-0 font-weight-bold" style={{ fontSize: "19px", color: "#1e293b" }}>
                  GST Sales & Tax Reports
                </h4>
                <Badge
                  color="light"
                  className="px-2 py-1"
                  style={{
                    backgroundColor: "#f1f5f9",
                    color: "#0284c7",
                    border: "1px solid #e0f2fe",
                    fontWeight: "600",
                  }}
                >
                  GSTR-3B Compliant
                </Badge>
                {(isR1Busy || isR2Busy) && <Spinner size="sm" color="primary" className="ml-2" />}
              </div>
              <div className="text-muted mt-1" style={{ fontSize: "13px" }}>
                <span>{processedR1.storeName}</span>
                <span className="mx-2">•</span>
                <span>{processedR1.storeAddress}</span>
              </div>
            </div>

            <div className="d-flex align-items-center gap-2 flex-wrap">
              <Button
                color="light"
                size="sm"
                className="d-flex align-items-center gap-1 border"
                style={{ borderRadius: "8px", fontSize: "13px" }}
                onClick={() => setShowFormulaHelp(!showFormulaHelp)}
              >
                <RiInformationLine size={16} className="text-primary" />
                <span>{showFormulaHelp ? "Hide Formula" : "Formula Used"}</span>
              </Button>

              <Button
                color="primary"
                size="sm"
                className="d-flex align-items-center gap-1 text-white"
                style={{
                  borderRadius: "8px",
                  fontSize: "13px",
                  backgroundColor: "#172b4d",
                  borderColor: "#172b4d",
                }}
                onClick={handlePrint}
              >
                <RiPrinterLine size={16} />
                <span>Print All Statements</span>
              </Button>
            </div>
          </div>

          {/* Formula Helper Callout */}
          {showFormulaHelp && (
            <div
              className="mt-3 p-3 rounded-3 border no-print"
              style={{ backgroundColor: "#f8fafc", borderColor: "#cbd5e1" }}
            >
              <div className="d-flex align-items-start gap-2">
                <RiInformationLine className="text-primary mt-1" size={18} />
                <div style={{ fontSize: "12.5px", color: "#334155" }}>
                  <div className="font-weight-bold text-dark mb-1">Standard GST Calculation Equations Applied:</div>
                  <ul className="mb-0 pl-3">
                    <li>
                      <strong>Total Taxable Value</strong> = <code>Total Sale × 100 ÷ (100 + GST Rate)</code> (Back-calculates
                      the base taxable amount from inclusive price)
                    </li>
                    <li>
                      <strong>CGST</strong> = <code>Total Taxable Value × ((GST Rate ÷ 2) ÷ 100)</code> (Intra-state
                      half share)
                    </li>
                    <li>
                      <strong>SGST</strong> = <code>Total Taxable Value × ((GST Rate ÷ 2) ÷ 100)</code> (Intra-state
                      half share)
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 1: SIMPLE GST REPORT (GSTR-3B B2C STATEMENT - SLABS)               */}
          {/* WITH ITS OWN DEDICATED PERIOD FILTER                                      */}
          {/* ========================================================================= */}
          <div className="mt-4">
            <div
              className="d-flex flex-wrap align-items-center justify-content-between p-3 rounded-top gap-2"
              style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderBottom: "none" }}
            >
              <div className="d-flex align-items-center gap-2">
                <RiFileListLine size={18} className="text-primary" />
                <span className="font-weight-bold text-dark" style={{ fontSize: "15px" }}>
                  1. Simple GST Report (GST Statement for GSTR-3B)
                </span>
                <span
                  className="badge px-2 py-1 text-dark"
                  style={{ backgroundColor: "#e2e8f0", fontSize: "11px", fontWeight: "600" }}
                >
                  B2C Intra-State
                </span>
              </div>

              <div className="d-flex align-items-center gap-2">
                <span className="text-muted" style={{ fontSize: "12.5px" }}>
                  Period: <strong>{formatDisplayDate(r1FromDate)}</strong> to{" "}
                  <strong>{formatDisplayDate(r1ToDate)}</strong>
                </span>
                <Button
                  color="light"
                  size="sm"
                  className="d-flex align-items-center gap-1 border no-print ml-2"
                  style={{ borderRadius: "6px", fontSize: "12px", marginLeft: "8px" }}
                  onClick={handleExportCsv}
                >
                  <RiFileExcel2Line size={14} className="text-success" />
                  <span>Export Statement CSV</span>
                </Button>
              </div>
            </div>

            {/* DEDICATED FILTER BAR FOR REPORT 1 */}
            <div style={{ border: "1px solid #e2e8f0", borderTop: "none", padding: "16px", backgroundColor: "#ffffff" }}>
              <PeriodFilterBar
                activeFilter={r1ActiveFilter}
                fromDate={r1FromDate}
                toDate={r1ToDate}
                onPreset={handleR1Preset}
                onFromChange={(val) => {
                  setR1FromDate(val);
                  setR1ActiveFilter("custom");
                }}
                onToChange={(val) => {
                  setR1ToDate(val);
                  setR1ActiveFilter("custom");
                }}
                onFilter={() => {
                  refetchR1Report();
                  refetchR1Orders();
                }}
                onReset={handleR1Reset}
                isLoading={isR1Busy}
              />

              {/* Top Summary KPI Cards for Report 1 */}
              <Row className="g-3 mb-3 no-print">
                <Col sm="6" lg="3">
                  <div className="gst-kpi-card d-flex align-items-center justify-content-between">
                    <div>
                      <div className="text-muted font-weight-500 mb-1" style={{ fontSize: "12.5px" }}>
                        Total Sales (Invoice)
                      </div>
                      <h4 className="mb-0 font-weight-bold" style={{ color: "#0f172a" }}>
                        {convertCurrency(processedR1.grandTotalSale)}
                      </h4>
                      <small className="text-muted" style={{ fontSize: "11.5px" }}>
                        GST Inclusive Total
                      </small>
                    </div>
                    <div className="gst-kpi-icon" style={{ backgroundColor: "#eff6ff", color: "#2563eb" }}>
                      <RiMoneyDollarCircleLine />
                    </div>
                  </div>
                </Col>

                <Col sm="6" lg="3">
                  <div className="gst-kpi-card d-flex align-items-center justify-content-between">
                    <div>
                      <div className="text-muted font-weight-500 mb-1" style={{ fontSize: "12.5px" }}>
                        Total Taxable Value
                      </div>
                      <h4 className="mb-0 font-weight-bold" style={{ color: "#0f172a" }}>
                        {convertCurrency(processedR1.grandTaxable)}
                      </h4>
                      <small className="text-muted" style={{ fontSize: "11.5px" }}>
                        Sale × 100 ÷ (100 + Rate)
                      </small>
                    </div>
                    <div className="gst-kpi-icon" style={{ backgroundColor: "#f5f3ff", color: "#7c3aed" }}>
                      <RiFileListLine />
                    </div>
                  </div>
                </Col>

                <Col sm="6" lg="3">
                  <div className="gst-kpi-card d-flex align-items-center justify-content-between">
                    <div>
                      <div className="text-muted font-weight-500 mb-1" style={{ fontSize: "12.5px" }}>
                        Total Tax (CGST + SGST)
                      </div>
                      <h4 className="mb-0 font-weight-bold" style={{ color: "#0f172a" }}>
                        {convertCurrency(processedR1.grandCgst + processedR1.grandSgst)}
                      </h4>
                      <small className="text-muted" style={{ fontSize: "11.5px" }}>
                        CGST: {convertCurrency(processedR1.grandCgst)} | SGST: {convertCurrency(processedR1.grandSgst)}
                      </small>
                    </div>
                    <div className="gst-kpi-icon" style={{ backgroundColor: "#ecfdf5", color: "#059669" }}>
                      <RiPercentLine />
                    </div>
                  </div>
                </Col>

                <Col sm="6" lg="3">
                  <div className="gst-kpi-card d-flex align-items-center justify-content-between">
                    <div>
                      <div className="text-muted font-weight-500 mb-1" style={{ fontSize: "12.5px" }}>
                        Bill Activity
                      </div>
                      <h4 className="mb-0 font-weight-bold" style={{ color: "#0f172a" }}>
                        {processedR1.activeBills}{" "}
                        <span style={{ fontSize: "14px", fontWeight: "normal", color: "#16a34a" }}>Active</span>
                      </h4>
                      <small className="text-muted" style={{ fontSize: "11.5px" }}>
                        Total {processedR1.totalBills} • {processedR1.cancelledBills} Cancelled
                      </small>
                    </div>
                    <div className="gst-kpi-icon" style={{ backgroundColor: "#fef2f2", color: "#dc2626" }}>
                      <RiBillLine />
                    </div>
                  </div>
                </Col>
              </Row>

              {/* Slabs Table */}
              <div className="table-responsive" style={{ border: "1px solid #e2e8f0", borderRadius: "10px" }}>
                <Table className="gst-table mb-0 align-middle">
                  <thead>
                    <tr>
                      <th style={{ width: "24%" }}>Tax Slab / Name</th>
                      <th style={{ width: "16%", textAlign: "right" }}>Invoice Amount</th>
                      <th style={{ width: "15%", textAlign: "right" }}>Taxable Value</th>
                      <th style={{ width: "11%", textAlign: "right" }}>CGST</th>
                      <th style={{ width: "11%", textAlign: "right" }}>SGST</th>
                      <th style={{ width: "11%", textAlign: "right" }}>IGST</th>
                      <th style={{ width: "12%", textAlign: "right" }}>GST CESS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Header line for sales */}
                    <tr className="aggregate-row">
                      <td colSpan={7}>
                        <div className="d-flex align-items-center justify-content-between">
                          <span style={{ color: "#1e293b", fontWeight: "700" }}>Sales (b2c)</span>
                          <span style={{ color: "#0f172a", fontWeight: "700" }}>
                            {formatNum(processedR1.grandTotalSale)}
                          </span>
                        </div>
                      </td>
                    </tr>

                    {/* Dynamic Slabs */}
                    {processedR1.slabs.map((slab) => (
                      <tr key={slab.name}>
                        <td style={{ paddingLeft: "32px", color: "#334155" }}>
                          <span className="font-weight-500">{slab.name}</span>
                        </td>
                        <td style={{ textAlign: "right", fontWeight: "600" }}>
                          {slab.total_sale > 0 ? formatNum(slab.total_sale) : "-"}
                        </td>
                        <td style={{ textAlign: "right", color: slab.taxable_value > 0 ? "#0284c7" : "#64748b" }}>
                          {slab.taxable_value > 0 ? formatNum(slab.taxable_value) : "-"}
                        </td>
                        <td style={{ textAlign: "right", color: slab.cgst > 0 ? "#059669" : "#64748b" }}>
                          {slab.cgst > 0 ? formatNum(slab.cgst) : "-"}
                        </td>
                        <td style={{ textAlign: "right", color: slab.sgst > 0 ? "#059669" : "#64748b" }}>
                          {slab.sgst > 0 ? formatNum(slab.sgst) : "-"}
                        </td>
                        <td style={{ textAlign: "right", color: "#94a3b8" }}>-</td>
                        <td style={{ textAlign: "right", color: "#94a3b8" }}>-</td>
                      </tr>
                    ))}

                    {/* GRAND TOTAL ROW */}
                    <tr className="total-row">
                      <td>
                        <span className="font-weight-bold" style={{ color: "#172b4d", letterSpacing: "0.5px" }}>
                          TOTAL
                        </span>
                      </td>
                      <td style={{ textAlign: "right", fontWeight: "700", color: "#172b4d", fontSize: "14.5px" }}>
                        {formatNum(processedR1.grandTotalSale)}
                      </td>
                      <td style={{ textAlign: "right", fontWeight: "700", color: "#0284c7", fontSize: "14.5px" }}>
                        {formatNum(processedR1.grandTaxable)}
                      </td>
                      <td style={{ textAlign: "right", fontWeight: "700", color: "#059669", fontSize: "14.5px" }}>
                        {formatNum(processedR1.grandCgst)}
                      </td>
                      <td style={{ textAlign: "right", fontWeight: "700", color: "#059669", fontSize: "14.5px" }}>
                        {formatNum(processedR1.grandSgst)}
                      </td>
                      <td style={{ textAlign: "right", color: "#94a3b8" }}>-</td>
                      <td style={{ textAlign: "right", color: "#94a3b8" }}>-</td>
                    </tr>
                  </tbody>
                </Table>

                {/* Bottom Strip of Report 1 */}
                <div
                  className="d-flex flex-wrap justify-content-between align-items-center gap-2 p-3"
                  style={{
                    backgroundColor: "#f8fafc",
                    borderTop: "1px solid #e2e8f0",
                    fontSize: "12.5px",
                    color: "#475569",
                  }}
                >
                  <div className="d-flex align-items-center gap-2">
                    <span className="font-weight-600 text-dark">Bill Numbers:</span>
                    <span
                      className="badge px-2 py-1"
                      style={{
                        backgroundColor: "#f1f5f9",
                        color: "#0f172a",
                        border: "1px solid #cbd5e1",
                        fontSize: "12px",
                      }}
                    >
                      {processedR1.billStart} to {processedR1.billEnd}
                    </span>
                  </div>

                  <div className="d-flex align-items-center gap-3 flex-wrap">
                    <span
                      className="badge px-2.5 py-1.5"
                      style={{
                        backgroundColor: "#f8fafc",
                        color: "#334155",
                        border: "1px solid #e2e8f0",
                        fontSize: "12px",
                        borderRadius: "6px",
                      }}
                    >
                      No Of Bills: <strong>{processedR1.totalBills}</strong>
                    </span>

                    <span
                      className="badge px-2.5 py-1.5"
                      style={{
                        backgroundColor: "#fef2f2",
                        color: "#b91c1c",
                        border: "1px solid #fecaca",
                        fontSize: "12px",
                        borderRadius: "6px",
                      }}
                    >
                      No of Cancelled Bills: <strong>{processedR1.cancelledBills}</strong>
                    </span>

                    <span
                      className="badge px-2.5 py-1.5"
                      style={{
                        backgroundColor: "#f0fdf4",
                        color: "#15803d",
                        border: "1px solid #bbf7d0",
                        fontSize: "12px",
                        borderRadius: "6px",
                      }}
                    >
                      Active Valid Bills: <strong>{processedR1.activeBills}</strong>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION 2: HSN / SUBCATEGORY SALES SUMMARY REPORT (SHEET 2 SPECIFICATION) */}
          {/* WITH ITS OWN DEDICATED PERIOD FILTER                                      */}
          {/* Columns: HSN CODE | SUBCATEGORY NAME | TOTAL SALE QTY | GST | TAXABLE RATE | CGST | SGST */}
          {/* ========================================================================= */}
          <div className="mt-5">
            <div
              className="d-flex flex-wrap align-items-center justify-content-between p-3 rounded-top gap-3"
              style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderBottom: "none" }}
            >
              <div>
                <div className="d-flex align-items-center gap-2">
                  <RiStackLine size={18} className="text-primary" />
                  <span className="font-weight-bold text-dark" style={{ fontSize: "15px" }}>
                    2. HSN & Subcategory Sales Summary Report
                  </span>
                  <Badge
                    color="light"
                    className="px-2 py-0.5"
                    style={{
                      backgroundColor: "#e0e7ff",
                      color: "#4338ca",
                      border: "1px solid #c7d2fe",
                      fontSize: "11px",
                      fontWeight: "600",
                    }}
                  >
                    {filteredHsnData.length} Groupings
                  </Badge>
                </div>
                <small className="text-muted">
                  Sales consolidated by HSN Code, Subcategory, and GST Rate with Total Sale Quantity
                </small>
              </div>

              <div className="d-flex align-items-center gap-2 flex-wrap no-print">
                {/* Search Box */}
                <div
                  className="d-flex align-items-center bg-white px-2.5 py-1 rounded"
                  style={{ border: "1px solid #e2e8f0", minWidth: "220px" }}
                >
                  <RiSearchLine size={14} className="text-muted mr-1" />
                  <input
                    type="text"
                    placeholder="Search HSN or Subcategory..."
                    className="border-0 bg-transparent w-100"
                    style={{ fontSize: "12.5px", outline: "none", color: "#1e293b" }}
                    value={hsnSearchTerm}
                    onChange={(e) => setHsnSearchTerm(e.target.value)}
                  />
                  {hsnSearchTerm && (
                    <button
                      type="button"
                      className="border-0 bg-transparent text-muted p-0"
                      onClick={() => setHsnSearchTerm("")}
                    >
                      ×
                    </button>
                  )}
                </div>

                <Button
                  color="light"
                  size="sm"
                  className="d-flex align-items-center gap-1 border"
                  style={{ borderRadius: "6px", fontSize: "12px" }}
                  onClick={handleExportHsnCsv}
                >
                  <RiFileExcel2Line size={14} className="text-success" />
                  <span>Export HSN CSV</span>
                </Button>
              </div>
            </div>

            {/* DEDICATED FILTER BAR FOR REPORT 2 */}
            <div style={{ border: "1px solid #e2e8f0", borderTop: "none", padding: "16px", backgroundColor: "#ffffff" }}>
              <PeriodFilterBar
                activeFilter={r2ActiveFilter}
                fromDate={r2FromDate}
                toDate={r2ToDate}
                onPreset={handleR2Preset}
                onFromChange={(val) => {
                  setR2FromDate(val);
                  setR2ActiveFilter("custom");
                }}
                onToChange={(val) => {
                  setR2ToDate(val);
                  setR2ActiveFilter("custom");
                }}
                onFilter={() => {
                  refetchR2Report();
                  refetchR2Orders();
                }}
                onReset={handleR2Reset}
                isLoading={isR2Busy}
              />

              {/* Table of HSN & Subcategory Summary */}
              <div className="table-responsive" style={{ border: "1px solid #e2e8f0", borderRadius: "10px" }}>
                <Table className="gst-table mb-0 align-middle">
                  <thead>
                    <tr>
                      <th style={{ width: "16%" }}>
                        <div className="d-flex align-items-center gap-1">
                          <RiBarcodeLine size={14} />
                          <span>HSN CODE</span>
                        </div>
                      </th>
                      <th style={{ width: "24%" }}>
                        <div className="d-flex align-items-center gap-1">
                          <RiFoldersLine size={14} />
                          <span>SUBCATEGORY NAME</span>
                        </div>
                      </th>
                      <th style={{ width: "14%", textAlign: "right" }}>TOTAL SALE QTY</th>
                      <th style={{ width: "10%", textAlign: "center" }}>GST</th>
                      <th style={{ width: "14%", textAlign: "right" }}>TAXABLE RATE</th>
                      <th style={{ width: "11%", textAlign: "right" }}>CGST</th>
                      <th style={{ width: "11%", textAlign: "right" }}>SGST</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isR2Busy && filteredHsnData.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-4">
                          <Spinner size="sm" color="primary" />
                          <span className="ml-2" style={{ marginLeft: "8px", fontSize: "13px", color: "#64748b" }}>
                            Loading and consolidating HSN-wise sales...
                          </span>
                        </td>
                      </tr>
                    ) : filteredHsnData.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-4 text-muted" style={{ fontSize: "13px" }}>
                          {hsnSearchTerm
                            ? `No records found matching "${hsnSearchTerm}".`
                            : "No HSN / Subcategory sales recorded for the selected period."}
                        </td>
                      </tr>
                    ) : (
                      filteredHsnData.map((item, idx) => {
                        let badgeBg = "#f1f5f9";
                        let badgeColor = "#475569";
                        if (item.gst_rate === 0) {
                          badgeBg = "#f1f5f9";
                          badgeColor = "#475569";
                        } else if (item.gst_rate <= 5) {
                          badgeBg = "#eff6ff";
                          badgeColor = "#2563eb";
                        } else if (item.gst_rate <= 18) {
                          badgeBg = "#fffbeb";
                          badgeColor = "#b45309";
                        } else {
                          badgeBg = "#fef2f2";
                          badgeColor = "#b91c1c";
                        }

                        return (
                          <tr key={`${item.hsn_code}_${item.subcategory_name}_${item.gst_rate}_${idx}`}>
                            <td>
                              <span className="hsn-badge">{item.hsn_code}</span>
                            </td>
                            <td>
                              <span className="subcat-badge">{item.subcategory_name}</span>
                            </td>
                            <td style={{ textAlign: "right", fontWeight: "700", color: "#0f172a" }}>
                              {item.total_qty.toLocaleString("en-IN")}
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <span
                                className="badge px-2 py-1"
                                style={{
                                  backgroundColor: badgeBg,
                                  color: badgeColor,
                                  borderRadius: "6px",
                                  fontSize: "11.5px",
                                  fontWeight: "600",
                                }}
                              >
                                {item.gst_rate}%
                              </span>
                            </td>
                            <td style={{ textAlign: "right", fontWeight: "600", color: "#0284c7" }}>
                              {formatNum(item.taxable_value)}
                            </td>
                            <td style={{ textAlign: "right", color: item.cgst > 0 ? "#059669" : "#94a3b8" }}>
                              {item.cgst > 0 ? formatNum(item.cgst) : "-"}
                            </td>
                            <td style={{ textAlign: "right", color: item.sgst > 0 ? "#059669" : "#94a3b8" }}>
                              {item.sgst > 0 ? formatNum(item.sgst) : "-"}
                            </td>
                          </tr>
                        );
                      })
                    )}

                    {/* HSN Summary Totals Row */}
                    {filteredHsnData.length > 0 && (
                      <tr className="total-row">
                        <td colSpan={2}>
                          <span className="font-weight-bold" style={{ color: "#172b4d", letterSpacing: "0.5px" }}>
                            TOTAL CONSOLIDATED
                          </span>
                          <small className="text-muted ml-2" style={{ marginLeft: "6px" }}>
                            ({filteredHsnData.length} Groupings)
                          </small>
                        </td>
                        <td style={{ textAlign: "right", fontWeight: "700", color: "#172b4d", fontSize: "14px" }}>
                          {hsnTotals.totalQty.toLocaleString("en-IN")}
                        </td>
                        <td style={{ textAlign: "center", color: "#94a3b8" }}>-</td>
                        <td style={{ textAlign: "right", color: "#0284c7", fontSize: "14px" }}>
                          {formatNum(hsnTotals.totalTaxable)}
                        </td>
                        <td style={{ textAlign: "right", color: "#059669", fontSize: "14px" }}>
                          {formatNum(hsnTotals.totalCgst)}
                        </td>
                        <td style={{ textAlign: "right", color: "#059669", fontSize: "14px" }}>
                          {formatNum(hsnTotals.totalSgst)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>

                {/* Bottom Strip of Report 2 */}
                <div
                  className="d-flex flex-wrap justify-content-between align-items-center gap-2 px-3 py-2"
                  style={{
                    backgroundColor: "#f8fafc",
                    borderTop: "1px solid #e2e8f0",
                    fontSize: "12px",
                    color: "#64748b",
                  }}
                >
                  <span>
                    Showing <strong>{filteredHsnData.length}</strong> HSN/Subcategory groups for{" "}
                    <strong>{formatDisplayDate(r2FromDate)}</strong> to <strong>{formatDisplayDate(r2ToDate)}</strong>
                  </span>
                  <span className="font-weight-500">
                    Total Tax:{" "}
                    <strong style={{ color: "#059669" }}>
                      {convertCurrency(hsnTotals.totalCgst + hsnTotals.totalSgst)}
                    </strong>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </>
  );
};

export default SimpleGstReport;
