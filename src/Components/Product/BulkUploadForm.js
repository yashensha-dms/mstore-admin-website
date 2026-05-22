"use client";

import React, { useState, useContext, useRef, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  RiInformationLine
} from "react-icons/ri";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import I18NextContext from "@/Helper/I18NextContext";
import { useTranslation } from "@/app/i18n/client";
import request from "@/Utils/AxiosUtils";
import { Category, product } from "@/Utils/AxiosUtils/API";
import Button from "@/Components/CommonComponent/Button";

// CSV line parser supporting quoted fields and stripping Excel single quotes
const parseCSVLine = (line) => {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      let val = current.trim().replace(/^"|"$/g, "");
      if (val.startsWith("'")) val = val.substring(1);
      if (val.endsWith("'")) val = val.substring(0, val.length - 1);
      result.push(val);
      current = "";
    } else {
      current += char;
    }
  }
  let val = current.trim().replace(/^"|"$/g, "");
  if (val.startsWith("'")) val = val.substring(1);
  if (val.endsWith("'")) val = val.substring(0, val.length - 1);
  result.push(val);
  return result;
};

// Full CSV parser to read all rows in memory
const parseCSV = (text) => {
  const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
  if (lines.length === 0) return { headers: [], rows: [], totalRows: 0 };
  const headers = parseCSVLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const rowValues = parseCSVLine(lines[i]);
    if (rowValues.length === 0 || (rowValues.length === 1 && rowValues[0] === "")) continue;
    const rowObj = {};
    headers.forEach((header, index) => {
      rowObj[header] = rowValues[index] || "";
    });
    rows.push(rowObj);
  }
  return { headers, rows, totalRows: rows.length };
};

// Standard product fields mapping config
const DEFAULT_FIELDS = [
  { key: "name", label: "Product Name (Required)", detect: ["display name", "name"], required: true },
  { key: "sku", label: "SKU (Required)", detect: ["code", "sku"], required: true },
  { key: "barcode", label: "Barcode (Optional)", detect: ["code", "barcode"], required: false },
  { key: "price", label: "MRP / Base Price (Required)", detect: ["mrp", "price"], required: true },
  { key: "sale_price", label: "Selling Price / Rate (Optional)", detect: ["rate", "ccp", "sale price", "selling price"], required: false },
  { key: "hsn_code", label: "HSN Code (Optional)", detect: ["hsncode", "hsn code", "hsn_code"], required: false },
  { key: "short_description", label: "Short Description (Optional)", detect: ["short description", "short_description"], required: false },
  { key: "description", label: "Long Description (Optional)", detect: ["long description", "description"], required: false },
  { key: "image_url", label: "Image Link (Optional)", detect: ["image link", "image_url"], required: false },
  { key: "category_name", label: "Category Name (Optional)", detect: ["category", "categories"], required: false }
];

const BulkUploadForm = () => {
  const { i18Lang } = useContext(I18NextContext);
  const { t } = useTranslation(i18Lang, "common");
  const router = useRouter();
  const fileInputRef = useRef(null);
  const terminalBodyRef = useRef(null);
  const queryClient = useQueryClient();

  // Mode state: 'UPLOAD' | 'PREVIEW' | 'IMPORTING' | 'DONE'
  const [mode, setMode] = useState("UPLOAD");
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [mapping, setMapping] = useState({});

  // Import orchestrator states
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, success: 0, failure: 0 });
  const [importLogs, setImportLogs] = useState([]);
  const [isImporting, setIsImporting] = useState(false);

  // Fetch product categories to match against
  const { data: categoryData } = useQuery(
    [Category],
    () => request({ url: Category, params: { type: "product" } }),
    { refetchOnWindowFocus: false, select: (data) => data?.data?.data }
  );

  // Scroll terminal to bottom on log updates without affecting viewport
  useEffect(() => {
    if (terminalBodyRef.current) {
      terminalBodyRef.current.scrollTop = terminalBodyRef.current.scrollHeight;
    }
  }, [importLogs]);

  // Flattened categories mapping name -> id
  const flattenedCategories = useMemo(() => {
    if (!categoryData) return {};
    const map = {};
    const traverse = (cats) => {
      if (!cats || !Array.isArray(cats)) return;
      cats.forEach((cat) => {
        if (cat.name) {
          map[cat.name.trim().toLowerCase()] = cat.id;
        }
        if (cat.subcategories && cat.subcategories.length > 0) {
          traverse(cat.subcategories);
        }
      });
    };
    traverse(categoryData);
    return map;
  }, [categoryData]);

  // Handle Drag Events
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  // Run dynamic header detection with robust underscore removal
  const detectMappings = (headers) => {
    const newMapping = {};
    DEFAULT_FIELDS.forEach(field => {
      const matchedHeader = headers.find(h => {
        const hNorm = h.toLowerCase().trim().replace(/_/g, " ");
        return field.detect.some(keyword => {
          const kwNorm = keyword.toLowerCase().trim().replace(/_/g, " ");
          return hNorm === kwNorm || hNorm.includes(kwNorm) || kwNorm.includes(hNorm);
        });
      });
      newMapping[field.key] = matchedHeader || "";
    });
    setMapping(newMapping);
  };

  const handleFileChange = (selectedFile) => {
    if (!selectedFile) return;
    if (selectedFile.type !== "text/csv" && !selectedFile.name.endsWith(".csv")) {
      alert("Please select a CSV file.");
      return;
    }
    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const parsed = parseCSV(text);
      setParsedData(parsed);
      detectMappings(parsed.headers);
      setMode("PREVIEW");
    };
    reader.readAsText(selectedFile);
  };

  const handleClear = () => {
    setFile(null);
    setParsedData(null);
    setMapping({});
    setImportLogs([]);
    setMode("UPLOAD");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleMappingChange = (key, value) => {
    setMapping(prev => ({ ...prev, [key]: value }));
  };

  // Helper log emitter
  const addLog = (message) => {
    setImportLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${message}`]);
  };

  // Sequential importer runner
  const startImport = async () => {
    if (!parsedData || parsedData.rows.length === 0) return;
    
    // Check validation of required mappings
    const missingFields = DEFAULT_FIELDS.filter(f => f.required && !mapping[f.key]);
    if (missingFields.length > 0) {
      alert(`Please map all required fields: ${missingFields.map(f => f.label).join(", ")}`);
      return;
    }

    setMode("IMPORTING");
    setIsImporting(true);
    setImportProgress({ current: 0, total: parsedData.rows.length, success: 0, failure: 0 });
    setImportLogs([]);

    const categoryCache = { ...flattenedCategories };
    const imageUrlCache = {}; // Cache uploaded images to avoid double calls

    for (let i = 0; i < parsedData.rows.length; i++) {
      const row = parsedData.rows[i];
      const rowNum = i + 1;
      addLog(`[Row ${rowNum}] Processing product...`);

      try {
        // 1. Resolve Category ID
        let categoryIds = [];
        const mappedCategoryCol = mapping["category_name"];
        if (mappedCategoryCol && row[mappedCategoryCol]) {
          const catName = row[mappedCategoryCol].trim();
          const catNameLower = catName.toLowerCase();

          if (categoryCache[catNameLower]) {
            categoryIds = [categoryCache[catNameLower]];
            addLog(`[Row ${rowNum}] Resolved category "${catName}" to ID ${categoryCache[catNameLower]}`);
          } else {
            addLog(`[Row ${rowNum}] Category "${catName}" not found. Creating new root category...`);
            const catRes = await request({
              url: "/category",
              method: "post",
              data: {
                name: catName,
                type: "product",
                status: 1,
                parent_id: null
              }
            });
            if (catRes?.status === 200 || catRes?.status === 201) {
              const newCatId = catRes.data.id;
              categoryCache[catNameLower] = newCatId;
              categoryIds = [newCatId];
              addLog(`[Row ${rowNum}] Created root category "${catName}" (ID: ${newCatId})`);
            } else {
              addLog(`[Row ${rowNum}] WARNING: Could not create category "${catName}". Saving without category.`);
            }
          }
        }

        // 2. Resolve Image URL to Attachment ID
        let imageId = null;
        const mappedImageCol = mapping["image_url"];
        if (mappedImageCol && row[mappedImageCol]) {
          const imageUrl = row[mappedImageCol].trim();
          if (imageUrl.startsWith("http")) {
            if (imageUrlCache[imageUrl]) {
              imageId = imageUrlCache[imageUrl];
              addLog(`[Row ${rowNum}] Reusing cached image attachment ID ${imageId}`);
            } else {
              addLog(`[Row ${rowNum}] Uploading remote image attachment...`);
              const attachmentFormData = new FormData();
              attachmentFormData.append("url", imageUrl);
              attachmentFormData.append("name", row[mapping["name"]] || `product_img_${rowNum}`);
              
              const attachRes = await request({
                url: "/attachment",
                method: "post",
                data: attachmentFormData
              });

              if (attachRes?.status === 200 || attachRes?.status === 201) {
                const newImageId = attachRes.data?.id || (Array.isArray(attachRes.data) ? attachRes.data[0]?.id : null);
                if (newImageId) {
                  imageUrlCache[imageUrl] = newImageId;
                  imageId = newImageId;
                  addLog(`[Row ${rowNum}] Uploaded image (Attachment ID: ${newImageId})`);
                } else {
                  addLog(`[Row ${rowNum}] WARNING: Upload succeeded but ID missing. Proceeding without image.`);
                }
              } else {
                addLog(`[Row ${rowNum}] WARNING: Image upload failed. Proceeding without image.`);
              }
            }
          }
        }

        // 3. Construct Payload
        const nameVal = row[mapping["name"]];
        const skuVal = row[mapping["sku"]];
        const priceVal = parseFloat(row[mapping["price"]] || 0);

        if (!nameVal || !skuVal || isNaN(priceVal)) {
          throw new Error("Required field missing (Name, SKU, or MRP Price)");
        }

        const salePriceCol = mapping["sale_price"];
        const salePriceVal = salePriceCol && row[salePriceCol] ? parseFloat(row[salePriceCol]) : null;

        const productPayload = {
          name: nameVal,
          sku: skuVal,
          price: priceVal,
          sale_price: salePriceVal || priceVal,
          is_sale_enable: salePriceVal && salePriceVal < priceVal ? 1 : 0,
          type: "simple",
          unit: "1",
          stock_status: "in_stock",
          quantity: 9999,
          show_stock_quantity: 0,
          status: 1,
          is_approved: 1,
          is_featured: 0,
          safe_checkout: 1,
          secure_checkout: 1,
          social_share: 1,
          encourage_order: 1,
          encourage_view: 1,
          is_trending: 0,
          is_return: 1,
          is_free_shipping: 0,
          categories: categoryIds,
          product_thumbnail_id: imageId || null,
          hsn_code: mapping["hsn_code"] && row[mapping["hsn_code"]] ? row[mapping["hsn_code"]] : "",
          barcode: mapping["barcode"] && row[mapping["barcode"]] ? row[mapping["barcode"]] : skuVal,
          short_description: mapping["short_description"] && row[mapping["short_description"]] ? row[mapping["short_description"]] : "",
          description: mapping["description"] && row[mapping["description"]] ? row[mapping["description"]] : "",
          is_random_related_products: 1
        };

        // 4. Submit Product
        const prodRes = await request({
          url: "/product",
          method: "post",
          data: productPayload
        });

        if (prodRes?.status === 200 || prodRes?.status === 201) {
          addLog(`[Row ${rowNum}] SUCCESS: Product "${nameVal}" created.`);
          setImportProgress(prev => ({ ...prev, current: rowNum, success: prev.success + 1 }));
        } else {
          const errMsg = prodRes?.response?.data?.message || "Server validation error";
          throw new Error(errMsg);
        }

      } catch (err) {
        addLog(`[Row ${rowNum}] ERROR: ${err.message}`);
        setImportProgress(prev => ({ ...prev, current: rowNum, failure: prev.failure + 1 }));
      }
    }

    setIsImporting(false);
    setMode("DONE");
    addLog("Bulk import completed successfully.");
    queryClient.invalidateQueries([product]);
    queryClient.invalidateQueries([Category]);
  };

  const handleDownloadTemplate = () => {
    const headers = [
      "CATEGORY",
      "Code",
      "Hsncode",
      "MRP",
      "CCP",
      "Name",
      "DISPLAY NAME",
      "Rate",
      "Short description",
      "Long description",
      "image link"
    ];
    
    const sampleRow = [
      "Grocery",
      "TEA-GRN-001",
      "09021000",
      "29.99",
      "24.99",
      "Green Tea",
      "Premium Green Tea",
      "24.99",
      "Refreshing green tea leaves",
      "Premium organic green tea leaves sourced from tea estates.",
      "https://images.unsplash.com/photo-1597481499750-3e6b22637e12"
    ];

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), sampleRow.join(",")].join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "products_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] lg:h-[calc(100vh-125px)] min-h-0 w-full overflow-hidden text-slate-800">
      {/* Top Head Section */}
      <div className="flex-none mb-4 pb-2 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-900 ">{t("BulkProductUpload")}</h3>
          <p className="text-slate-500 text-xs mt-0.5">Import large quantities of products via CSV and map columns instantly</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
        {/* Main Workspace */}
        <div className={`${mode === "UPLOAD" ? "lg:col-span-8" : "lg:col-span-12"} flex flex-col h-full min-h-0 overflow-hidden`}>
          <div className="flex flex-col h-full min-h-0 bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex flex-col flex-1 min-h-0 p-4 lg:p-6">
              
              {/* UPLOAD MODE */}
              {mode === "UPLOAD" && (
                <div className="flex-1 flex flex-col justify-center min-h-0">
                  <div
                    className={`group flex flex-col justify-center items-center border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 h-full min-h-[300px] ${
                      isDragging 
                        ? "border-primary bg-primary/5 scale-[0.99]" 
                        : "border-slate-300 bg-slate-50/50 hover:border-primary/80 hover:bg-slate-50"
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept=".csv"
                      onChange={(e) => handleFileChange(e.target.files[0])}
                    />
                    <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/5 text-primary mb-4 transition-all duration-300 group-hover:bg-primary/10 group-hover:text-primary group-hover:scale-110 group-hover:shadow-md group-hover:shadow-primary/20">
                      <RiUploadCloud2Line size={32} className="animate-pulse" />
                    </div>
                    <h5 className="mb-1 font-bold text-slate-800 text-base">{t("DragDropCSV")}</h5>
                    <p className="text-slate-500 text-xs mb-5">
                      {t("CSVFilesOnly")} &bull; Max size: 10MB
                    </p>
                    <Button 
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                    >
                      Browse Files
                    </Button>
                  </div>
                </div>
              )}

              {/* PREVIEW & MAPPING MODE */}
              {mode === "PREVIEW" && parsedData && (
                <div className="flex flex-col h-full min-h-0">
                  {/* File Stats Summary Header */}
                  <div className="flex-none flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl text-primary bg-primary/10">
                        <RiFileList2Line size={24} />
                      </div>
                      <div>
                        <h6 className="m-0 font-bold text-slate-900 text-sm">{file?.name}</h6>
                        <div className="flex gap-2 items-center mt-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            {(file?.size / 1024).toFixed(1)} KB
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                            {parsedData.totalRows} {t("Records")}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button 
                      type="button"
                      variant="outline"
                      size="sm"
                      icon={RiCloseLine}
                      onClick={handleClear} 
                      title="Cancel"
                      className="!text-red-600 !border-red-200 hover:!bg-red-50"
                    >
                      {t("Cancel")}
                    </Button>
                  </div>

                  {/* Mapping Rules Info Banner */}
                  <div className="flex-none my-3 p-3 bg-slate-50 border border-slate-200/60 rounded-xl flex items-start gap-2.5">
                    <RiInformationLine className="text-primary mt-0.5 shrink-0" size={18} />
                    <div className="text-xs text-slate-600 leading-normal">
                      <strong className="text-slate-800">Dynamic Header Mapping:</strong> Columns were matched based on name proximity. Review and verify the selections below before running the importer.
                    </div>
                  </div>

                  {/* Scrolling Panel for Mapping Cards & Table */}
                  <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-5 custom-scrollbar">
                    {/* Columns Mapping Panel */}
                    <div className="bg-slate-50/50 border border-slate-200/50 rounded-2xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <h6 className="m-0 font-bold text-slate-800 text-sm">Configure Column Mapping</h6>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                        {DEFAULT_FIELDS.map((field) => {
                          const isMapped = !!mapping[field.key];
                          return (
                            <div 
                              key={field.key} 
                              className={`flex flex-col justify-between p-3 rounded-xl border bg-white transition-all h-full ${
                                isMapped 
                                  ? "border-emerald-200 bg-emerald-50/20 shadow-sm" 
                                  : field.required
                                    ? "border-l-4 border-l-red-500 border-slate-200"
                                    : "border-l-4 border-l-slate-400 border-slate-200"
                              }`}
                            >
                              <div className="w-full">
                                <span className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-2">
                                  <span className="flex items-center gap-1 truncate max-w-[75%]">
                                    {isMapped && <RiCheckLine className="text-emerald-600 shrink-0" size={14} />}
                                    <span className="truncate">{field.label.split(" (")[0]}</span>
                                  </span>
                                  {field.required ? (
                                    <span className="px-1.5 py-0.5 text-[10px] font-bold tracking-wide rounded-md bg-red-100 text-red-700 uppercase">Required</span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 text-[10px] font-bold tracking-wide rounded-md bg-slate-100 text-slate-500 uppercase">Optional</span>
                                  )}
                                </span>
                                <div className="relative mt-1">
                                  <select
                                    className="w-full pl-3 pr-8 py-1.5 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none appearance-none cursor-pointer"
                                    value={mapping[field.key] || ""}
                                    onChange={(e) => handleMappingChange(field.key, e.target.value)}
                                  >
                                    <option value="">-- Skip Field --</option>
                                    {parsedData.headers.map((h, i) => (
                                      <option key={i} value={h}>{h}</option>
                                    ))}
                                  </select>
                                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                                    </svg>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Data Preview Table */}
                    <div>
                      <h6 className="mb-2.5 font-bold text-slate-800 text-sm flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Data Preview
                        </span>
                        <span className="text-slate-500 text-xs font-normal">Showing first 5 rows</span>
                      </h6>
                      
                      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse align-middle">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">#</th>
                                <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Image</th>
                                <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Product Name</th>
                                <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">SKU & Barcode</th>
                                <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">MRP Price</th>
                                <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Selling Price</th>
                                <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Category Status</th>
                                <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">HSN Code</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {parsedData.rows.slice(0, 5).map((row, idx) => {
                                const nameVal = row[mapping["name"]] || "-";
                                const skuVal = row[mapping["sku"]] || "-";
                                const priceVal = row[mapping["price"]] || "-";
                                const salePriceVal = mapping["sale_price"] ? row[mapping["sale_price"]] : "";
                                const hsnVal = mapping["hsn_code"] ? row[mapping["hsn_code"]] : "";
                                const barcodeVal = mapping["barcode"] ? row[mapping["barcode"]] : "";
                                
                                const catVal = mapping["category_name"] ? row[mapping["category_name"]] : "";
                                const catExists = catVal ? !!flattenedCategories[catVal.trim().toLowerCase()] : null;
                                const imageVal = mapping["image_url"] ? row[mapping["image_url"]] : "";

                                return (
                                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="p-3 text-xs font-semibold text-slate-400">{idx + 1}</td>
                                    <td className="p-3">
                                      {imageVal && imageVal.startsWith("http") ? (
                                        <img 
                                          src={imageVal} 
                                          alt="preview" 
                                          className="w-10 h-10 rounded-lg object-cover border border-slate-200 shadow-sm hover:scale-125 transition-transform origin-center"
                                        />
                                      ) : (
                                        <span className="text-slate-400 text-xs">-</span>
                                      )}
                                    </td>
                                    <td className="p-3 text-xs font-semibold text-slate-800 truncate max-w-[200px]" title={nameVal}>{nameVal}</td>
                                    <td className="p-3">
                                      <div className="flex flex-col gap-1">
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-600 w-fit border border-slate-200/50">{skuVal}</span>
                                        {barcodeVal && (
                                          <span className="text-[10px] text-slate-500 font-mono">Bar: {barcodeVal}</span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="p-3 text-xs font-bold text-slate-900">{priceVal}</td>
                                    <td className="p-3 text-xs font-bold text-emerald-600">{salePriceVal || priceVal}</td>
                                    <td className="p-3">
                                      {catVal ? (
                                        catExists ? (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">{catVal} (Exists)</span>
                                        ) : (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100">{catVal} (New)</span>
                                        )
                                      ) : (
                                        <span className="text-slate-400 text-xs">-</span>
                                      )}
                                    </td>
                                    <td className="p-3 text-xs text-slate-600">{hsnVal || "-"}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions footer bar */}
                  <div className="flex-none flex justify-end mt-4 pt-3 border-t border-slate-100">
                    <Button
                      type="button"
                      variant="primary"
                      size="lg"
                      icon={RiPlayLine}
                      onClick={startImport}
                      title="Import Products"
                    >
                      Import {parsedData.totalRows} Products
                    </Button>
                  </div>
                </div>
              )}

              {/* IMPORT RUNNING OR DONE STATE */}
              {(mode === "IMPORTING" || mode === "DONE") && (
                <div className="flex flex-col h-full min-h-0">
                  <div className="flex-none flex items-center justify-between mb-3.5">
                    <h6 className="m-0 font-bold flex items-center text-slate-800 text-sm">
                      {mode === "IMPORTING" ? (
                        <>
                          <RiLoader4Line className="animate-spin mr-2 text-primary" size={22} />
                          Importing products sequentially...
                        </>
                      ) : (
                        <>
                          <RiCheckLine className="text-emerald-600 mr-2 border border-emerald-100 rounded-full p-1 bg-emerald-50" size={24} />
                          Import completed successfully!
                        </>
                      )}
                    </h6>
                    <div className="text-slate-500 text-xs font-semibold">
                      {importProgress.current} / {importProgress.total} products processed
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="flex-none h-2.5 bg-slate-100 rounded-full overflow-hidden mb-4 border border-slate-200/50">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${mode === 'DONE' ? 'bg-emerald-500' : 'bg-primary'}`}
                      style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                    />
                  </div>

                  {/* Metrics Summary Row */}
                  <div className="flex-none grid grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center justify-between p-3 bg-white border border-slate-200/60 border-l-4 border-l-emerald-500 rounded-xl hover:translate-y-[-1px] transition-transform shadow-xs">
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Success</span>
                        <h4 className="text-lg font-extrabold text-emerald-600 leading-tight">{importProgress.success}</h4>
                      </div>
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600">
                        <RiCheckLine size={18} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white border border-slate-200/60 border-l-4 border-l-red-500 rounded-xl hover:translate-y-[-1px] transition-transform shadow-xs">
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Failure</span>
                        <h4 className="text-lg font-extrabold text-red-600 leading-tight">{importProgress.failure}</h4>
                      </div>
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-600">
                        <RiAlertLine size={18} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white border border-slate-200/60 border-l-4 border-l-primary rounded-xl hover:translate-y-[-1px] transition-transform shadow-xs">
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Remaining</span>
                        <h4 className="text-lg font-extrabold text-primary leading-tight">{importProgress.total - importProgress.current}</h4>
                      </div>
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary">
                        <RiFileList2Line size={18} />
                      </div>
                    </div>
                  </div>

                  {/* Live Status Log console */}
                  <div className="flex-1 min-h-0 flex flex-col border border-slate-800 rounded-xl bg-slate-950 overflow-hidden shadow-lg">
                    <div className="flex-none bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center justify-between">
                      <div className="flex gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      </div>
                      <span className="text-slate-500 text-[10px] font-semibold font-mono tracking-wider">IMPORT CONSOLE LOGS</span>
                      {mode === "IMPORTING" ? (
                        <span className="px-1.5 py-0.5 text-[9px] font-bold tracking-wide rounded bg-blue-600 text-white font-mono">RUNNING</span>
                      ) : (
                        <span className="px-1.5 py-0.5 text-[9px] font-bold tracking-wide rounded bg-emerald-600 text-white font-mono">COMPLETED</span>
                      )}
                    </div>
                    
                    <div className="flex-1 min-h-0 overflow-y-auto p-4 font-mono text-[11px] leading-relaxed text-slate-400 select-text" ref={terminalBodyRef}>
                      {importLogs.map((log, idx) => {
                        let textClass = "text-slate-400";
                        if (log.includes("SUCCESS:")) textClass = "text-emerald-400";
                        else if (log.includes("ERROR:") || log.includes("WARNING: Could not create")) textClass = "text-red-400";
                        else if (log.includes("WARNING:")) textClass = "text-amber-400";
                        else if (log.includes("Created root category") || log.includes("Resolved category")) textClass = "text-sky-400";

                        const time = log.substring(0, 8);
                        const message = log.substring(11);

                        return (
                          <div key={idx} className="flex items-start gap-2 mb-1">
                            <span className="text-slate-600 select-none">[{time}]</span>
                            <span className={textClass}>{message}</span>
                          </div>
                        );
                      })}
                      {isImporting && (
                        <div className="flex items-start gap-2">
                          <span className="text-slate-600 select-none">[{new Date().toLocaleTimeString()}]</span>
                          <span className="text-slate-400 flex items-center gap-1">
                            System processing... <span className="inline-block w-1.5 h-3 bg-emerald-500 animate-[ping_1.5s_infinite]" />
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer options */}
                  {mode === "DONE" && (
                    <div className="flex-none flex justify-center gap-3 pt-4 border-t border-slate-100 mt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleClear}
                        title="Import Another File"
                      >
                        Import Another File
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        icon={RiArrowRightLine}
                        iconPosition="right"
                        onClick={() => router.push(`/${i18Lang}/product`)}
                        title="View Products Table"
                      >
                        View Products
                      </Button>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>

        {/* Right Guideline Box — Only displayed in initial UPLOAD screen */}
        {mode === "UPLOAD" && (
          <div className="lg:col-span-4 flex flex-col h-full min-h-0 overflow-hidden">
            <div className="flex flex-col h-full min-h-0 bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
              <div className="flex flex-col flex-1 min-h-0 p-4 lg:p-6">
                <div className="flex-none">
                  <h5 className="font-bold text-slate-800 text-base flex items-center gap-2 mb-2">
                    <RiInformationLine className="text-primary" size={20} />
                    {t("Guidelines")}
                  </h5>
                  <p className="text-slate-500 text-xs mb-4">
                    Follow these guidelines to import your product master list seamlessly. Click below to download the official CSV template.
                  </p>

                  <Button
                    type="button"
                    variant="outline"
                    icon={RiDownload2Line}
                    onClick={handleDownloadTemplate}
                    className="w-full !border-primary/20 hover:!bg-primary/5 !text-primary"
                  >
                    {t("DownloadTemplate")}
                  </Button>
                </div>

                <h6 className="flex-none border-b border-slate-100 pb-2 mt-5 mb-3 font-bold text-slate-800 text-sm">{t("CSVFieldsGuidelines")}</h6>
                
                {/* Scrollable rules list */}
                <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3.5 custom-scrollbar">
                  <div className="bg-slate-50 border border-slate-200/60 border-l-4 border-l-red-500 rounded-xl p-3.5 hover:translate-x-1 transition-transform">
                    <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-extrabold tracking-wide bg-red-100 text-red-700 uppercase mb-2">Required Fields</span>
                    <p className="text-slate-600 text-xs leading-normal">
                      <strong>DISPLAY NAME</strong> (or Name), <strong>Code</strong> (maps to SKU/Barcode), and <strong>MRP</strong> (Base Price) must be mapped to proceed.
                    </p>
                  </div>
                  
                  <div className="bg-slate-50 border border-slate-200/60 border-l-4 border-l-blue-500 rounded-xl p-3.5 hover:translate-x-1 transition-transform">
                    <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-extrabold tracking-wide bg-blue-100 text-blue-700 uppercase mb-2">Dynamic Categories</span>
                    <p className="text-slate-600 text-xs leading-normal">
                      Categories are checked dynamically. If the category name doesn't match any existing one, a new root-level category is created automatically.
                    </p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200/60 border-l-4 border-l-emerald-500 rounded-xl p-3.5 hover:translate-x-1 transition-transform">
                    <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-extrabold tracking-wide bg-emerald-100 text-emerald-700 uppercase mb-2">Media Attachments</span>
                    <p className="text-slate-600 text-xs leading-normal">
                      Providing image URLs will automatically upload them to media attachments first and link them as the main product thumbnail.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Global CSS scrollbar styling for neat custom scrollbars inside cards */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}} />
    </div>
  );
};

export default BulkUploadForm;
