"use client";

import React, { useState, useContext, useRef, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Container, Row, Col, Card, CardBody, Table, Alert, Progress, FormGroup, Label, Input } from "reactstrap";
import {
  RiUploadCloud2Line,
  RiDownload2Line,
  RiCloseLine,
  RiCheckLine,
  RiAlertLine,
  RiFileList2Line,
  RiPlayLine,
  RiLoader4Line,
  RiArrowRightLine,
  RiInformationLine,
  RiRefreshLine,
  RiFilter3Line,
  RiStore3Line,
  RiFolderLine,
  RiEyeLine,
  RiEyeOffLine,
  RiSparklingLine
} from "react-icons/ri";
import * as Switch from "@radix-ui/react-switch";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import I18NextContext from "@/Helper/I18NextContext";
import { useTranslation } from "@/app/i18n/client";
import request from "@/Utils/AxiosUtils";
import { Category, product, tax } from "@/Utils/AxiosUtils/API";
import Button from "@/Components/CommonComponent/Button";
import { ToastNotification } from "@/Utils/CustomFunctions/ToastNotification";

// Smart delimiter detector (, ; \t |)
const detectDelimiter = (firstLine) => {
  const delimiters = [",", ";", "\t", "|"];
  let bestDelim = ",";
  let maxCount = 0;
  for (const d of delimiters) {
    const count = (firstLine.match(new RegExp(`\\${d}`, "g")) || []).length;
    if (count > maxCount) {
      maxCount = count;
      bestDelim = d;
    }
  }
  return bestDelim;
};

// CSV Line parser respecting quotes and escaping
const parseCSVLine = (line, delimiter = ",") => {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      let val = current.trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.substring(1, val.length - 1);
      if (val.startsWith("'")) val = val.substring(1);
      if (val.endsWith("'")) val = val.substring(0, val.length - 1);
      result.push(val.trim());
      current = "";
    } else {
      current += char;
    }
  }
  let val = current.trim();
  if (val.startsWith('"') && val.endsWith('"')) val = val.substring(1, val.length - 1);
  if (val.startsWith("'")) val = val.substring(1);
  if (val.endsWith("'")) val = val.substring(0, val.length - 1);
  result.push(val.trim());
  return result;
};

// Full CSV text parser
const parseCSVText = (text) => {
  // Strip BOM if present
  let cleanText = text.replace(/^\uFEFF/, "");
  const lines = cleanText.split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length === 0) return { headers: [], rows: [], totalRows: 0 };
  const delimiter = detectDelimiter(lines[0]);
  const headers = parseCSVLine(lines[0], delimiter);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const rowValues = parseCSVLine(lines[i], delimiter);
    if (rowValues.length === 0 || (rowValues.length === 1 && rowValues[0] === "")) continue;
    const rowObj = {};
    headers.forEach((header, index) => {
      rowObj[header] = rowValues[index] !== undefined ? rowValues[index] : "";
    });
    rows.push(rowObj);
  }
  return { headers, rows, totalRows: rows.length };
};

// Title Case conversion with unit & acronym retention
const toTitleCase = (str) => {
  if (!str) return "";
  const minorWords = new Set(["and", "or", "the", "in", "on", "at", "to", "for", "with", "a", "an", "of"]);
  const keepUpper = new Set(["MRP", "SKU", "HSN", "GST", "VAT", "CCP", "UPC", "EAN", "GTIN", "QR"]);
  return str
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((word, idx) => {
      const upperWord = word.toUpperCase();
      if (keepUpper.has(upperWord)) return upperWord;
      // Preserve measurements e.g. 500g, 1kg, 250ml, 1l, 10pc
      if (/^\d+(\.\d+)?(kg|g|gm|ml|l|ltr|pc|pcs|oz|lb|m|cm|mm)$/i.test(word)) {
        return word.toLowerCase();
      }
      if (idx > 0 && minorWords.has(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
};

// Fix Excel scientific notation for barcodes (e.g. 8.90105E+12 -> 8901050000000)
const cleanScientificBarcode = (val) => {
  if (!val) return "";
  let str = String(val).trim().replace(/^'|'$/g, "");
  if (/^[0-9]+\.?[0-9]*[eE][+-]?[0-9]+$/i.test(str)) {
    const num = Number(str);
    if (!isNaN(num)) {
      str = BigInt(Math.round(num)).toString();
    }
  }
  return str;
};

// Clean prices & rates
const parseNumericValue = (val, fallback = 0) => {
  if (val === undefined || val === null) return fallback;
  const cleaned = String(val).replace(/[^0-9.-]+/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? fallback : num;
};

// Standard Fields Definition
const DEFAULT_FIELDS = [
  { key: "category_name", label: "Category Name", detect: ["category", "category name", "category_name", "group", "department", "dept", "categories", "product category", "main category"], required: true },
  { key: "name", label: "Product Name", detect: ["display name", "display_name", "product name", "product_name", "item name", "item_name", "name", "description"], required: true },
  { key: "sku", label: "SKU / Item Code", detect: ["code", "item code", "item_code", "product code", "product_code", "sku", "sku code", "sku_code"], required: true },
  { key: "barcode", label: "Barcode", detect: ["barcode", "bar code", "bar_code", "ean", "ean code", "upc", "upc code", "gtin"], required: false },
  { key: "price", label: "MRP / Base Price", detect: ["mrp", "base price", "base_price", "price", "unit price", "unit_price", "retail price"], required: true },
  { key: "sale_price", label: "Selling Price / Rate", detect: ["rate", "ccp", "sale price", "sale_price", "selling price", "selling_price", "offer price", "discounted price"], required: false },
  { key: "quantity", label: "Stock / Quantity (Positive Stock)", detect: ["stock", "quantity", "qty", "positive stock", "positive_stock", "inventory", "stock quantity", "available qty", "balance stock", "closing stock"], required: false },
  { key: "hsn_code", label: "HSN Code", detect: ["hsn code", "hsn_code", "hsncode", "hsn", "sac code", "sac", "hsn no"], required: false },
  { key: "tax_id", label: "Tax / GST Rate", detect: ["tax", "gst", "tax rate", "tax_rate", "tax percentage", "gst rate", "vat"], required: false },
  { key: "short_description", label: "Short Description", detect: ["short description", "short_description", "short desc", "summary"], required: false },
  { key: "image_url", label: "Image Link", detect: ["image link", "image_link", "image url", "image_url", "photo", "thumbnail"], required: false }
];

const MasterDataUpload = () => {
  const { i18Lang } = useContext(I18NextContext);
  const { t } = useTranslation(i18Lang, "common");
  const router = useRouter();
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const terminalBodyRef = useRef(null);

  // Flow Step: 'UPLOAD' | 'NORMALIZE_PREVIEW' | 'IMPORTING' | 'COMPLETED'
  const [step, setStep] = useState("UPLOAD");
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [mapping, setMapping] = useState({});

  // Active Tab in Preview: 'categories' | 'products'
  const [previewTab, setPreviewTab] = useState("categories");

  // Normalization Rule Toggles
  const [normRules, setNormRules] = useState({
    titleCaseNames: true,
    titleCaseCategories: true,
    stripExcelArtifacts: true,
    fixScientificBarcodes: true,
    filterPositiveStockOnly: false, // User requested positive stock filter
    defaultProductActive: true, // Master flag: active products shown in app
    defaultCategoryActive: true // Master flag: active categories shown in app
  });

  // Dynamic Category Mapping & Status overrides from normalization
  // key: normalizedCatName -> { name, targetId, status (1: Active, 0: Inactive), isNew, productCount }
  const [categoryOverrides, setCategoryOverrides] = useState({});

  // Importer state
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, success: 0, failure: 0 });
  const [importLogs, setImportLogs] = useState([]);
  const [importSummary, setImportSummary] = useState(null);

  // Fetch existing categories from DB
  const { data: dbCategories, isLoading: categoriesLoading } = useQuery(
    [Category],
    () => request({ url: Category, params: { type: "product" } }),
    { refetchOnWindowFocus: false, select: (res) => res?.data?.data || [] }
  );

  // Fetch taxes from DB
  const { data: dbTaxes } = useQuery(
    [tax],
    () => request({ url: tax, params: { status: 1 } }),
    { refetchOnWindowFocus: false, select: (res) => res?.data?.data || [] }
  );

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalBodyRef.current) {
      terminalBodyRef.current.scrollTop = terminalBodyRef.current.scrollHeight;
    }
  }, [importLogs]);

  // Flatten DB categories for instant matching
  const flattenedDbCategories = useMemo(() => {
    if (!dbCategories || !Array.isArray(dbCategories)) return {};
    const map = {};
    const traverse = (cats) => {
      cats.forEach((cat) => {
        if (cat.name) {
          map[cat.name.trim().toLowerCase()] = cat;
        }
        if (cat.subcategories && cat.subcategories.length > 0) {
          traverse(cat.subcategories);
        }
      });
    };
    traverse(dbCategories);
    return map;
  }, [dbCategories]);

  // Flatten taxes
  const flattenedDbTaxes = useMemo(() => {
    if (!dbTaxes || !Array.isArray(dbTaxes)) return {};
    const map = {};
    dbTaxes.forEach((tItem) => {
      const rateNum = parseFloat(tItem.rate);
      if (!isNaN(rateNum)) {
        map[rateNum] = tItem.id;
        map[String(rateNum)] = tItem.id;
        map[`${rateNum}%`] = tItem.id;
      }
      if (tItem.name) {
        const clean = tItem.name.trim().toLowerCase();
        map[clean] = tItem.id;
      }
    });
    return map;
  }, [dbTaxes]);

  // Two-pass column auto-mapping
  const detectMappings = (headers) => {
    const newMapping = {};
    const claimed = new Set();
    const norm = (s) => s.toLowerCase().trim().replace(/[_-\s]+/g, " ");

    // Pass 1: exact matches
    DEFAULT_FIELDS.forEach((field) => {
      const matched = headers.find((h) => {
        if (claimed.has(h)) return false;
        const hNorm = norm(h);
        return field.detect.some((kw) => norm(kw) === hNorm);
      });
      if (matched) {
        newMapping[field.key] = matched;
        claimed.add(matched);
      }
    });

    // Pass 2: substring matches for unclaimed
    DEFAULT_FIELDS.forEach((field) => {
      if (newMapping[field.key]) return;
      const matched = headers.find((h) => {
        if (claimed.has(h)) return false;
        const hNorm = norm(h);
        return field.detect.some((kw) => {
          const kwNorm = norm(kw);
          return hNorm.includes(kwNorm) || kwNorm.includes(hNorm);
        });
      });
      if (matched) {
        newMapping[field.key] = matched;
        claimed.add(matched);
      } else {
        newMapping[field.key] = "";
      }
    });

    setMapping(newMapping);
  };

  // Handle file input
  const handleFileChange = (selectedFile) => {
    if (!selectedFile) return;
    if (!selectedFile.name.endsWith(".csv") && selectedFile.type !== "text/csv") {
      ToastNotification("error", "Please upload a CSV file (.csv). Excel files can be saved as CSV before uploading.");
      return;
    }
    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const parsed = parseCSVText(text);
        if (parsed.rows.length === 0) {
          ToastNotification("error", "Uploaded CSV file contains no data rows.");
          return;
        }
        setParsedData(parsed);
        detectMappings(parsed.headers);
        setStep("NORMALIZE_PREVIEW");
        ToastNotification("success", `Parsed ${parsed.rows.length} rows successfully.`);
      } catch (err) {
        ToastNotification("error", `Failed to parse CSV: ${err.message}`);
      }
    };
    reader.readAsText(selectedFile);
  };

  // Compute normalized products and discovered categories
  const { normalizedProducts, discoveredCategories } = useMemo(() => {
    if (!parsedData || !parsedData.rows) {
      return { normalizedProducts: [], discoveredCategories: [] };
    }

    const catCol = mapping["category_name"];
    const nameCol = mapping["name"];
    const skuCol = mapping["sku"];
    const barcodeCol = mapping["barcode"];
    const priceCol = mapping["price"];
    const salePriceCol = mapping["sale_price"];
    const qtyCol = mapping["quantity"];
    const hsnCol = mapping["hsn_code"];
    const taxCol = mapping["tax_id"];
    const shortDescCol = mapping["short_description"];
    const imgCol = mapping["image_url"];

    const catCounts = {};
    const prods = [];

    parsedData.rows.forEach((row, idx) => {
      // 1. Category normalization
      let rawCat = catCol && row[catCol] ? String(row[catCol]).trim() : "General";
      if (!rawCat) rawCat = "General";
      let normCat = normRules.titleCaseCategories ? toTitleCase(rawCat) : rawCat;
      if (normRules.stripExcelArtifacts) {
        normCat = normCat.replace(/^['"]|['"]$/g, "").trim();
      }

      catCounts[normCat] = (catCounts[normCat] || 0) + 1;

      // 2. Product Name normalization
      let rawName = nameCol && row[nameCol] ? String(row[nameCol]).trim() : `Item-${idx + 1}`;
      let normName = normRules.titleCaseNames ? toTitleCase(rawName) : rawName;
      if (normRules.stripExcelArtifacts) {
        normName = normName.replace(/^['"]|['"]$/g, "").trim();
      }

      // 3. SKU normalization
      let rawSku = skuCol && row[skuCol] ? String(row[skuCol]).trim() : `SKU-${idx + 1}`;
      let normSku = rawSku.replace(/^['"]|['"]$/g, "").trim();

      // 4. Barcode normalization
      let rawBarcode = barcodeCol && row[barcodeCol] ? String(row[barcodeCol]).trim() : normSku;
      let normBarcode = normRules.fixScientificBarcodes ? cleanScientificBarcode(rawBarcode) : rawBarcode;
      if (!normBarcode) normBarcode = normSku;

      // 5. Price & Selling Price
      const rawPrice = priceCol && row[priceCol] ? row[priceCol] : 0;
      const normPrice = parseNumericValue(rawPrice, 0);

      const rawSalePrice = salePriceCol && row[salePriceCol] ? row[salePriceCol] : null;
      let normSalePrice = rawSalePrice !== null ? parseNumericValue(rawSalePrice, normPrice) : normPrice;
      if (normSalePrice <= 0 || normSalePrice > normPrice) {
        normSalePrice = normPrice;
      }

      // 6. Quantity / Positive Stock
      const rawQty = qtyCol && row[qtyCol] !== undefined ? row[qtyCol] : 100;
      const normQty = Math.max(0, parseInt(parseNumericValue(rawQty, 0), 10));
      const isPositiveStock = normQty > 0;

      // Check positive stock filter rule
      if (normRules.filterPositiveStockOnly && !isPositiveStock) {
        return; // Skip non-positive stock
      }

      // 7. HSN & Tax
      const normHsn = hsnCol && row[hsnCol] ? String(row[hsnCol]).replace(/[^0-9A-Za-z]/g, "").trim() : "";
      const rawTax = taxCol && row[taxCol] ? row[taxCol] : "";
      const normTaxRate = rawTax ? parseNumericValue(rawTax, null) : null;

      prods.push({
        id: idx + 1,
        rawRow: row,
        name: normName,
        rawName,
        sku: normSku,
        barcode: normBarcode,
        rawBarcode,
        category: normCat,
        rawCategory: rawCat,
        price: normPrice,
        sale_price: normSalePrice,
        is_sale_enable: normSalePrice < normPrice ? 1 : 0,
        quantity: normQty,
        stock_status: normQty > 0 ? "in_stock" : "out_of_stock",
        isPositiveStock,
        hsn_code: normHsn,
        tax_rate: normTaxRate,
        short_description: shortDescCol && row[shortDescCol] ? String(row[shortDescCol]).trim() : "",
        image_url: imgCol && row[imgCol] ? String(row[imgCol]).trim() : "",
        status: normRules.defaultProductActive ? 1 : 0 // Active flag (shown in app)
      });
    });

    // Build unique categories list
    const cats = Object.keys(catCounts).map((catName) => {
      const dbMatch = flattenedDbCategories[catName.toLowerCase()];
      return {
        name: catName,
        productCount: catCounts[catName],
        dbMatch: dbMatch || null,
        targetId: dbMatch ? dbMatch.id : "new",
        status: normRules.defaultCategoryActive ? 1 : 0 // Active flag for category
      };
    });

    return { normalizedProducts: prods, discoveredCategories: cats };
  }, [parsedData, mapping, normRules, flattenedDbCategories]);

  // Synchronize category overrides state when discoveredCategories change
  useEffect(() => {
    if (discoveredCategories.length > 0) {
      setCategoryOverrides((prev) => {
        const next = { ...prev };
        discoveredCategories.forEach((cat) => {
          if (!next[cat.name]) {
            next[cat.name] = {
              name: cat.name,
              targetId: cat.targetId,
              status: cat.status,
              isNew: !cat.dbMatch
            };
          }
        });
        return next;
      });
    }
  }, [discoveredCategories]);

  // Toggle Category Active/Inactive
  const handleCategoryStatusToggle = (catName, newStatus) => {
    setCategoryOverrides((prev) => ({
      ...prev,
      [catName]: {
        ...prev[catName],
        status: newStatus ? 1 : 0
      }
    }));
  };

  // Update target category mapping
  const handleCategoryTargetChange = (catName, targetId) => {
    setCategoryOverrides((prev) => ({
      ...prev,
      [catName]: {
        ...prev[catName],
        targetId,
        isNew: targetId === "new"
      }
    }));
  };

  // Update category renamed name
  const handleCategoryRename = (oldName, newName) => {
    if (!newName.trim()) return;
    setCategoryOverrides((prev) => {
      const copy = { ...prev };
      const current = copy[oldName] || { targetId: "new", status: 1 };
      delete copy[oldName];
      copy[newName.trim()] = { ...current, name: newName.trim() };
      return copy;
    });
  };

  // Helper log
  const addLog = (message) => {
    setImportLogs((prev) => [...prev, `${new Date().toLocaleTimeString()} - ${message}`]);
  };

  // Download Sample Positive Stock CSV Template
  const handleDownloadTemplate = () => {
    const headers = [
      "CATEGORY",
      "Code",
      "Barcode",
      "DISPLAY NAME",
      "MRP",
      "Rate",
      "Stock",
      "Hsncode",
      "Tax Rate",
      "Short description"
    ];
    const sampleRows = [
      [
        "Grocery & Staples",
        "GRO-001",
        "8901052003693",
        "Tata Tea Gold 250g",
        "160.00",
        "148.00",
        "45",
        "09021000",
        "5%",
        "Premium quality whole leaf tea blend"
      ],
      [
        "Dairy & Frozen",
        "DAI-002",
        "8901262010053",
        "Amul Butter Pasteurized 500g",
        "275.00",
        "265.00",
        "80",
        "04029990",
        "12%",
        "Pure salted fresh butter"
      ],
      [
        "Snacks & Biscuits",
        "SNK-003",
        "8901719114120",
        "Parle-G Glucose Biscuit 800g Super Saver",
        "85.00",
        "80.00",
        "120",
        "19053100",
        "18%",
        "Crunchy glucose milk biscuits"
      ],
      [
        "Beverages",
        "BEV-004",
        "8901030382710",
        "Bru Instant Coffee Jar 100g",
        "220.00",
        "199.00",
        "30",
        "21011110",
        "18%",
        "Aromatic chicory and coffee blend"
      ]
    ];

    const csvContent = [headers.join(","), ...sampleRows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "positive_stock_sample.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    ToastNotification("info", "Sample CSV template downloaded.");
  };

  // Sequential Importer Execution
  const executeMasterImport = async () => {
    if (!normalizedProducts || normalizedProducts.length === 0) {
      ToastNotification("error", "No normalized products to import.");
      return;
    }

    setStep("IMPORTING");
    setIsImporting(true);
    setImportProgress({ current: 0, total: normalizedProducts.length, success: 0, failure: 0 });
    setImportLogs([]);
    addLog("=== Master Data Import Initiated ===");
    addLog(`Total Products queued: ${normalizedProducts.length}`);

    // Category cache: catName (lowercase) -> DB id
    const categoryCache = {};
    Object.entries(flattenedDbCategories).forEach(([k, cat]) => {
      categoryCache[k] = cat.id;
    });

    const taxCache = { ...flattenedDbTaxes };

    // Step A: Synchronize/Create Master Categories with their Active/Inactive flags
    addLog("--- Step 1: Synchronizing Master Categories & Visibility Flags ---");
    const uniqueCatNames = Object.keys(categoryOverrides);
    let createdCatsCount = 0;

    for (const catName of uniqueCatNames) {
      const config = categoryOverrides[catName];
      const catLower = catName.toLowerCase();
      const desiredStatus = config?.status !== undefined ? config.status : normRules.defaultCategoryActive ? 1 : 0;

      if (config?.targetId && config.targetId !== "new") {
        categoryCache[catLower] = config.targetId;
        addLog(`Category "${catName}" mapped to existing ID ${config.targetId}. Updating app visibility status to: ${desiredStatus === 1 ? "ACTIVE" : "INACTIVE"}...`);
        try {
          await request({
            url: `${Category}/${config.targetId}/${desiredStatus}`,
            method: "put",
            data: Boolean(desiredStatus)
          });
        } catch (e) {
          // Fallback if status endpoint is standard update
          try {
            await request({
              url: `${Category}/${config.targetId}`,
              method: "put",
              data: { status: desiredStatus }
            });
          } catch (err) {
            // non-fatal
          }
        }
      } else {
        // Need to create new category with desired status
        if (!categoryCache[catLower]) {
          addLog(`Creating new Master Category "${catName}" with Status: ${desiredStatus === 1 ? "ACTIVE (Visible in App)" : "INACTIVE (Hidden)"}...`);
          try {
            const catRes = await request({
              url: Category,
              method: "post",
              data: {
                name: catName,
                type: "product",
                status: desiredStatus,
                parent_id: null
              }
            });
            const newId = catRes?.data?.id || catRes?.data?.data?.id;
            if (newId) {
              categoryCache[catLower] = newId;
              createdCatsCount++;
              addLog(`Created category "${catName}" (ID: ${newId}). App Visibility: ${desiredStatus === 1 ? "ACTIVE" : "INACTIVE"}`);
            }
          } catch (catErr) {
            addLog(`WARNING: Failed to create category "${catName}": ${catErr.message}`);
          }
        }
      }
    }

    addLog(`--- Step 2: Importing ${normalizedProducts.length} Normalized Master Products ---`);
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < normalizedProducts.length; i++) {
      const prod = normalizedProducts[i];
      const rowNum = i + 1;
      const catOverride = categoryOverrides[prod.category];
      const catName = catOverride?.name || prod.category;
      const catId = categoryCache[catName.toLowerCase()] || null;

      // Resolve Tax
      let resolvedTaxId = null;
      if (prod.tax_rate !== null) {
        resolvedTaxId = taxCache[prod.tax_rate] || taxCache[String(prod.tax_rate)] || taxCache[`${prod.tax_rate}%`] || null;
      }

      // Desired product visibility flag (Active: 1 -> Shown in App, Inactive: 0 -> Hidden)
      const prodStatus = normRules.defaultProductActive ? 1 : 0;

      const payload = {
        name: prod.name,
        sku: prod.sku,
        price: prod.price,
        sale_price: prod.sale_price,
        is_sale_enable: prod.is_sale_enable,
        type: "simple",
        unit: "1",
        stock_status: prod.stock_status,
        quantity: prod.quantity,
        show_stock_quantity: 1,
        status: prodStatus, // Active in App or Inactive
        is_approved: 1,
        is_featured: 0,
        is_trending: 0,
        categories: catId ? [catId] : [],
        tax_id: resolvedTaxId,
        hsn_code: prod.hsn_code,
        barcode: prod.barcode,
        short_description: prod.short_description || "",
        description: prod.short_description || prod.name,
        is_random_related_products: 1
      };

      try {
        const res = await request({
          url: product,
          method: "post",
          data: payload
        });

        if (res?.status === 200 || res?.status === 201) {
          successCount++;
          addLog(`[Row ${rowNum}/${normalizedProducts.length}] SUCCESS: "${prod.name}" (SKU: ${prod.sku}, Stock: ${prod.quantity}, Status: ${prodStatus === 1 ? "Active" : "Inactive"})`);
        } else {
          throw new Error(res?.response?.data?.message || "Product submission rejected");
        }
      } catch (err) {
        failureCount++;
        addLog(`[Row ${rowNum}/${normalizedProducts.length}] ERROR on "${prod.name}": ${err.message}`);
      }

      setImportProgress({
        current: rowNum,
        total: normalizedProducts.length,
        success: successCount,
        failure: failureCount
      });
    }

    // Finished
    setIsImporting(false);
    setStep("COMPLETED");
    addLog("=== Master Data Import Completed ===");
    addLog(`Summary: ${successCount} Products Imported, ${failureCount} Failures, ${createdCatsCount} Categories Created.`);

    // Invalidate react-query caches
    queryClient.invalidateQueries([product]);
    queryClient.invalidateQueries([Category]);

    const summary = {
      importedAt: new Date().toISOString(),
      fileName: file?.name || "positive_stock.csv",
      totalProducts: normalizedProducts.length,
      successCount,
      failureCount,
      createdCatsCount,
      defaultProductActive: normRules.defaultProductActive,
      defaultCategoryActive: normRules.defaultCategoryActive
    };
    setImportSummary(summary);

    // Save snapshot of last master import batch for quick lookup
    try {
      localStorage.setItem("master_data_last_import", JSON.stringify(summary));
    } catch (e) {
      // ignore
    }

    ToastNotification("success", `Master Data import completed: ${successCount} products imported successfully!`);
  };

  const handleReset = () => {
    setFile(null);
    setParsedData(null);
    setMapping({});
    setCategoryOverrides({});
    setImportLogs([]);
    setStep("UPLOAD");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

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

      {/* Page Header */}
      <div className="mb-4 d-flex justify-content-between align-items-center flex-wrap gap-3">
        <div>
          <h3 className="fw-bold text-slate-800 mb-1">{t("MasterDataUploadTitle")}</h3>
          <p className="text-muted mb-0">{t("MasterDataUploadSubtitle")}</p>
        </div>
        <div className="d-flex gap-2">
          <Button
            className="btn btn-outline-secondary d-flex align-items-center gap-2"
            onClick={handleDownloadTemplate}
          >
            <RiDownload2Line /> Download Sample CSV
          </Button>
          <Link href={`/${i18Lang}/master-data/products`} className="btn btn-outline-primary d-flex align-items-center gap-2">
            <RiStore3Line /> View Master Products
          </Link>
          <Link href={`/${i18Lang}/master-data/categories`} className="btn btn-outline-primary d-flex align-items-center gap-2">
            <RiFolderLine /> View Categories
          </Link>
        </div>
      </div>

      {/* Step 1: Upload Zone */}
      {step === "UPLOAD" && (
        <Row>
          <Col xl="8" className="mx-auto">
            <Card className="shadow-sm border-0">
              <CardBody className="p-4 p-md-5">
                <div
                  className={`border-2 border-dashed rounded-4 p-5 text-center cursor-pointer transition-all ${
                    isDragging ? "border-primary bg-primary-subtle" : "border-slate-300 bg-slate-50"
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleFileChange(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  style={{ cursor: "pointer", transition: "all 0.2s ease" }}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".csv,text/csv"
                    className="d-none"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileChange(e.target.files[0]);
                      }
                    }}
                  />
                  <div className="mb-3">
                    <span className="badge bg-primary-subtle text-primary p-3 rounded-circle">
                      <RiUploadCloud2Line size={48} />
                    </span>
                  </div>
                  <h4 className="fw-bold text-slate-800 mb-2">Upload Master Data CSV</h4>
                  <p className="text-muted mb-3">
                    Drag and drop your <strong>positive stock.csv</strong> or product master list here, or click to browse.
                  </p>
                  <div className="d-inline-flex align-items-center gap-2 px-3 py-1.5 rounded-pill bg-white border text-xs text-slate-600 shadow-sm">
                    <RiInformationLine className="text-primary" /> Supported: CSV with comma, semicolon, or tab delimiters
                  </div>
                </div>

                <div className="mt-4 p-3 bg-light rounded-3 border">
                  <h6 className="fw-bold mb-2 d-flex align-items-center gap-2 text-slate-700">
                    <RiSparklingLine className="text-warning" /> Automatic Normalization Highlights:
                  </h6>
                  <ul className="mb-0 text-sm text-muted ps-3">
                    <li><strong>Categories Normalization:</strong> Auto Title-cases names, deduplicates similar categories, and configures active/inactive app visibility flags.</li>
                    <li><strong>Product Normalization:</strong> Standardizes names, sanitizes barcodes and scientific notations, handles prices and stock.</li>
                    <li><strong>Positive Stock Matching:</strong> Designed to process POS / ERP stock lists (like positive stock.csv) with automatic inventory and MRP/rate mapping.</li>
                  </ul>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>
      )}

      {/* Step 2: Normalization Engine & Preview */}
      {step === "NORMALIZE_PREVIEW" && (
        <Row className="g-4">
          {/* Normalization Controls & Column Mapping */}
          <Col xl="4">
            <Card className="shadow-sm border-0 h-100">
              <CardBody className="p-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="fw-bold text-slate-800 mb-0 d-flex align-items-center gap-2">
                    <RiSparklingLine className="text-primary" /> Normalization Engine
                  </h5>
                  <button className="btn btn-sm btn-outline-danger" onClick={handleReset}>
                    <RiCloseLine /> Change File
                  </button>
                </div>

                <div className="p-2 mb-3 bg-slate-50 border rounded text-xs text-muted">
                  File: <strong>{file?.name}</strong> ({parsedData?.rows?.length} rows detected)
                </div>

                {/* Normalization Rules Toggles */}
                <h6 className="fw-bold text-xs text-uppercase text-muted mb-2 tracking-wide">Category & Product Rules</h6>
                <div className="d-flex flex-column gap-3 mb-4">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <div className="fw-semibold text-sm">Title Case Product Names</div>
                      <small className="text-muted text-xs">Converts "PARLE-G 250G" to "Parle-G 250g"</small>
                    </div>
                    <Switch.Root
                      className="radix-switch-root"
                      checked={normRules.titleCaseNames}
                      onCheckedChange={(val) => setNormRules((p) => ({ ...p, titleCaseNames: val }))}
                    >
                      <Switch.Thumb className="radix-switch-thumb" />
                    </Switch.Root>
                  </div>

                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <div className="fw-semibold text-sm">Title Case Categories</div>
                      <small className="text-muted text-xs">Standardizes "GROCERY" to "Grocery"</small>
                    </div>
                    <Switch.Root
                      className="radix-switch-root"
                      checked={normRules.titleCaseCategories}
                      onCheckedChange={(val) => setNormRules((p) => ({ ...p, titleCaseCategories: val }))}
                    >
                      <Switch.Thumb className="radix-switch-thumb" />
                    </Switch.Root>
                  </div>

                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <div className="fw-semibold text-sm">Sanitize Barcodes & Quotes</div>
                      <small className="text-muted text-xs">Fixes '890.. and 8.90E+12 notation</small>
                    </div>
                    <Switch.Root
                      className="radix-switch-root"
                      checked={normRules.fixScientificBarcodes}
                      onCheckedChange={(val) => setNormRules((p) => ({ ...p, fixScientificBarcodes: val }))}
                    >
                      <Switch.Thumb className="radix-switch-thumb" />
                    </Switch.Root>
                  </div>

                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <div className="fw-semibold text-sm">Filter Positive Stock Only</div>
                      <small className="text-muted text-xs">Only import products with stock &gt; 0</small>
                    </div>
                    <Switch.Root
                      className="radix-switch-root"
                      checked={normRules.filterPositiveStockOnly}
                      onCheckedChange={(val) => setNormRules((p) => ({ ...p, filterPositiveStockOnly: val }))}
                    >
                      <Switch.Thumb className="radix-switch-thumb" />
                    </Switch.Root>
                  </div>

                  <hr className="my-2" />

                  {/* App Visibility Flags */}
                  <h6 className="fw-bold text-xs text-uppercase text-muted mb-1 tracking-wide">Customer App Visibility Flags</h6>

                  <div className="d-flex justify-content-between align-items-center p-2 rounded bg-light border">
                    <div>
                      <div className="fw-semibold text-sm text-slate-800">Default Category Active</div>
                      <small className="text-muted text-xs">Active categories appear in app menu</small>
                    </div>
                    <Switch.Root
                      className="radix-switch-root"
                      checked={normRules.defaultCategoryActive}
                      onCheckedChange={(val) => {
                        setNormRules((p) => ({ ...p, defaultCategoryActive: val }));
                        // update all category overrides
                        setCategoryOverrides((prev) => {
                          const updated = {};
                          Object.keys(prev).forEach((k) => {
                            updated[k] = { ...prev[k], status: val ? 1 : 0 };
                          });
                          return updated;
                        });
                      }}
                    >
                      <Switch.Thumb className="radix-switch-thumb" />
                    </Switch.Root>
                  </div>

                  <div className="d-flex justify-content-between align-items-center p-2 rounded bg-light border">
                    <div>
                      <div className="fw-semibold text-sm text-slate-800">Default Product Active</div>
                      <small className="text-muted text-xs">Active products are visible to customers</small>
                    </div>
                    <Switch.Root
                      className="radix-switch-root"
                      checked={normRules.defaultProductActive}
                      onCheckedChange={(val) => setNormRules((p) => ({ ...p, defaultProductActive: val }))}
                    >
                      <Switch.Thumb className="radix-switch-thumb" />
                    </Switch.Root>
                  </div>
                </div>

                {/* Column Mapping Section */}
                <h6 className="fw-bold text-xs text-uppercase text-muted mb-2 tracking-wide">Column Mappings</h6>
                <div className="d-flex flex-column gap-2" style={{ maxHeight: "280px", overflowY: "auto" }}>
                  {DEFAULT_FIELDS.map((f) => (
                    <FormGroup key={f.key} className="mb-2">
                      <Label className="text-xs fw-semibold mb-1 d-flex justify-content-between">
                        <span>{f.label} {f.required && <span className="text-danger">*</span>}</span>
                        {mapping[f.key] && <span className="text-success text-xs"><RiCheckLine /> Mapped</span>}
                      </Label>
                      <Input
                        type="select"
                        bsSize="sm"
                        value={mapping[f.key] || ""}
                        onChange={(e) => setMapping((prev) => ({ ...prev, [f.key]: e.target.value }))}
                      >
                        <option value="">-- Select Column --</option>
                        {parsedData?.headers?.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </Input>
                    </FormGroup>
                  ))}
                </div>

                <div className="mt-4 pt-3 border-top">
                  <Button
                    className="btn btn-theme w-100 py-2.5 fw-bold d-flex justify-content-center align-items-center gap-2"
                    onClick={executeMasterImport}
                  >
                    <RiPlayLine size={18} /> Apply & Import Master Data ({normalizedProducts.length})
                  </Button>
                </div>
              </CardBody>
            </Card>
          </Col>

          {/* Normalization Preview Tabs */}
          <Col xl="8">
            <Card className="shadow-sm border-0 h-100">
              <CardBody className="p-4">
                {/* Tabs Header */}
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3 border-bottom pb-3">
                  <div className="d-flex gap-2">
                    <button
                      className={`btn btn-sm ${previewTab === "categories" ? "btn-primary" : "btn-outline-secondary"}`}
                      onClick={() => setPreviewTab("categories")}
                    >
                      <RiFolderLine className="me-1" /> Normalized Categories ({discoveredCategories.length})
                    </button>
                    <button
                      className={`btn btn-sm ${previewTab === "products" ? "btn-primary" : "btn-outline-secondary"}`}
                      onClick={() => setPreviewTab("products")}
                    >
                      <RiStore3Line className="me-1" /> Normalized Products ({normalizedProducts.length})
                    </button>
                  </div>
                  <div className="text-xs text-muted">
                    {previewTab === "categories"
                      ? "Toggle active/inactive flag for categories shown in app"
                      : "Preview of standardized product values before import"}
                  </div>
                </div>

                {/* Tab Content: Categories Normalization */}
                {previewTab === "categories" && (
                  <div>
                    <Alert color="info" className="py-2 px-3 text-xs d-flex align-items-center gap-2 mb-3">
                      <RiInformationLine size={16} />
                      <span>
                        <strong>Category App Visibility:</strong> Categories toggled to <strong>Active</strong> will be displayed on the customer mobile app & storefront. Inactive categories remain hidden.
                      </span>
                    </Alert>

                    <div className="table-responsive" style={{ maxHeight: "550px", overflowY: "auto" }}>
                      <Table className="table align-middle table-hover text-sm mb-0">
                        <thead className="table-light sticky-top">
                          <tr>
                            <th>Category Name (Normalized)</th>
                            <th className="text-center">Products Count</th>
                            <th>Database Match</th>
                            <th className="text-center">Active in App?</th>
                          </tr>
                        </thead>
                        <tbody>
                          {discoveredCategories.map((cat) => {
                            const override = categoryOverrides[cat.name] || {};
                            const isActive = override.status === 1;
                            const isMatched = cat.dbMatch !== null;

                            return (
                              <tr key={cat.name}>
                                <td>
                                  <div className="fw-bold text-slate-800">{cat.name}</div>
                                  {isMatched && (
                                    <small className="text-muted text-xs">Matches existing DB category: #{cat.dbMatch.id}</small>
                                  )}
                                </td>
                                <td className="text-center">
                                  <span className="badge bg-secondary-subtle text-secondary px-2.5 py-1 rounded-pill">
                                    {cat.productCount} items
                                  </span>
                                </td>
                                <td>
                                  {isMatched ? (
                                    <span className="badge bg-success-subtle text-success px-2 py-1 rounded-pill">
                                      <RiCheckLine className="me-1" /> Existing (#{cat.dbMatch.id})
                                    </span>
                                  ) : (
                                    <span className="badge bg-info-subtle text-info px-2 py-1 rounded-pill">
                                      + Will be created
                                    </span>
                                  )}
                                </td>
                                <td className="text-center">
                                  <div className="d-inline-flex align-items-center gap-2">
                                    <Switch.Root
                                      className="radix-switch-root"
                                      checked={isActive}
                                      onCheckedChange={(checked) => handleCategoryStatusToggle(cat.name, checked)}
                                    >
                                      <Switch.Thumb className="radix-switch-thumb" />
                                    </Switch.Root>
                                    <span className={`text-xs fw-semibold ${isActive ? "text-success" : "text-muted"}`}>
                                      {isActive ? "Active (In App)" : "Inactive (Hidden)"}
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </Table>
                    </div>
                  </div>
                )}

                {/* Tab Content: Products Normalization */}
                {previewTab === "products" && (
                  <div>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <small className="text-muted">Showing first {Math.min(normalizedProducts.length, 50)} of {normalizedProducts.length} items</small>
                      <span className="badge bg-primary-subtle text-primary">
                        Default Status: {normRules.defaultProductActive ? "Active (Shown in App)" : "Inactive (Hidden)"}
                      </span>
                    </div>

                    <div className="table-responsive" style={{ maxHeight: "550px", overflowY: "auto" }}>
                      <Table className="table align-middle table-hover text-sm mb-0">
                        <thead className="table-light sticky-top">
                          <tr>
                            <th>Product Name</th>
                            <th>SKU & Barcode</th>
                            <th>Category</th>
                            <th className="text-end">MRP / Rate</th>
                            <th className="text-center">Stock</th>
                            <th className="text-center">App Visibility</th>
                          </tr>
                        </thead>
                        <tbody>
                          {normalizedProducts.slice(0, 50).map((p) => (
                            <tr key={p.id}>
                              <td>
                                <div className="fw-semibold text-slate-800">{p.name}</div>
                                {p.rawName !== p.name && (
                                  <small className="text-muted text-xs line-through">{p.rawName}</small>
                                )}
                              </td>
                              <td>
                                <div className="font-monospace text-xs">{p.sku}</div>
                                <small className="text-muted text-xs">{p.barcode}</small>
                              </td>
                              <td>
                                <span className="badge bg-light text-dark border">
                                  {p.category}
                                </span>
                              </td>
                              <td className="text-end">
                                <div className="fw-semibold text-slate-800">₹{p.sale_price.toFixed(2)}</div>
                                {p.sale_price < p.price && (
                                  <small className="text-muted text-xs line-through">MRP: ₹{p.price.toFixed(2)}</small>
                                )}
                              </td>
                              <td className="text-center">
                                <span className={`badge ${p.quantity > 0 ? "bg-success-subtle text-success" : "bg-danger-subtle text-danger"}`}>
                                  {p.quantity > 0 ? `${p.quantity} (Positive)` : "0 (Out of stock)"}
                                </span>
                              </td>
                              <td className="text-center">
                                <span className={`badge ${normRules.defaultProductActive ? "bg-success" : "bg-secondary"}`}>
                                  {normRules.defaultProductActive ? "Active" : "Inactive"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>
          </Col>
        </Row>
      )}

      {/* Step 3: Importing Progress & Realtime Logs */}
      {step === "IMPORTING" && (
        <Row>
          <Col xl="8" className="mx-auto">
            <Card className="shadow-sm border-0">
              <CardBody className="p-4 p-md-5">
                <div className="text-center mb-4">
                  <RiLoader4Line size={48} className="text-primary animate-spin mb-2" />
                  <h4 className="fw-bold text-slate-800">Importing Master Data</h4>
                  <p className="text-muted mb-0">Synchronizing products and categories with your store database...</p>
                </div>

                <div className="mb-4">
                  <div className="d-flex justify-content-between text-sm mb-1">
                    <span>Processing {importProgress.current} of {importProgress.total} products</span>
                    <span className="fw-bold">{Math.round((importProgress.current / (importProgress.total || 1)) * 100)}%</span>
                  </div>
                  <Progress
                    value={(importProgress.current / (importProgress.total || 1)) * 100}
                    color="primary"
                    className="progress-lg"
                    style={{ height: "10px", borderRadius: "8px" }}
                  />
                  <div className="d-flex justify-content-between mt-2 text-xs text-muted">
                    <span className="text-success"><RiCheckLine /> {importProgress.success} Success</span>
                    <span className="text-danger"><RiCloseLine /> {importProgress.failure} Errors</span>
                  </div>
                </div>

                {/* Live Console Terminal */}
                <div
                  ref={terminalBodyRef}
                  className="bg-dark text-light p-3 rounded-3 font-monospace text-xs"
                  style={{ maxHeight: "300px", overflowY: "auto", whiteSpace: "pre-wrap" }}
                >
                  {importLogs.map((log, i) => (
                    <div key={i} className="mb-1">{log}</div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>
      )}

      {/* Step 4: Completed Summary */}
      {step === "COMPLETED" && (
        <Row>
          <Col xl="8" className="mx-auto">
            <Card className="shadow-sm border-0 text-center">
              <CardBody className="p-5">
                <div className="mb-3">
                  <span className="badge bg-success-subtle text-success p-3 rounded-circle">
                    <RiCheckLine size={56} />
                  </span>
                </div>
                <h3 className="fw-bold text-slate-800 mb-2">Master Data Imported Successfully!</h3>
                <p className="text-muted mb-4">
                  Your products and categories have been normalized and saved to your catalog.
                </p>

                <Row className="g-3 justify-content-center mb-4">
                  <Col sm="4">
                    <div className="p-3 bg-light rounded-3 border">
                      <div className="fs-3 fw-bold text-success">{importSummary?.successCount || 0}</div>
                      <div className="text-xs text-muted">Products Created</div>
                    </div>
                  </Col>
                  <Col sm="4">
                    <div className="p-3 bg-light rounded-3 border">
                      <div className="fs-3 fw-bold text-primary">{importSummary?.createdCatsCount || 0}</div>
                      <div className="text-xs text-muted">Categories Created</div>
                    </div>
                  </Col>
                  <Col sm="4">
                    <div className="p-3 bg-light rounded-3 border">
                      <div className="fs-3 fw-bold text-dark">{normRules.defaultProductActive ? "ACTIVE" : "INACTIVE"}</div>
                      <div className="text-xs text-muted">App Visibility Flag</div>
                    </div>
                  </Col>
                </Row>

                <div className="d-flex justify-content-center gap-3 flex-wrap">
                  <Link href={`/${i18Lang}/master-data/products`} className="btn btn-theme px-4 py-2 fw-semibold d-flex align-items-center gap-2">
                    <RiStore3Line /> View Master Products
                  </Link>
                  <Link href={`/${i18Lang}/master-data/categories`} className="btn btn-outline-primary px-4 py-2 fw-semibold d-flex align-items-center gap-2">
                    <RiFolderLine /> View Categories
                  </Link>
                  <Button className="btn btn-outline-secondary px-4 py-2 fw-semibold" onClick={handleReset}>
                    Upload Another CSV
                  </Button>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>
      )}
    </Container>
  );
};

export default MasterDataUpload;

