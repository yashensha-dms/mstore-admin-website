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
import Btn from "@/Elements/Buttons/Btn";

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
    <Container fluid className="bulk-upload-container pb-5">
      <Row className="page-title-container align-items-center mb-4">
        <Col xs="12">
          <div className="title-header option-title">
            <h3 className="header-gradient-accent">{t("BulkProductUpload")}</h3>
            <p className="text-muted small mb-0">Import large quantities of products via CSV and map columns instantly</p>
          </div>
        </Col>
      </Row>

      <Row>
        {/* Main Workspace */}
        <Col lg={mode === "UPLOAD" ? "8" : "12"}>
          <Card className="glass-card-premium border-0 shadow-sm overflow-hidden mb-4">
            <CardBody className="p-4">
              
              {/* UPLOAD MODE */}
              {mode === "UPLOAD" && (
                <div className="py-2">
                  <div
                    className={`drag-drop-zone-premium ${
                      isDragging ? "drag-active" : ""
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="d-none"
                      accept=".csv"
                      onChange={(e) => handleFileChange(e.target.files[0])}
                    />
                    <div className="upload-cloud-icon-box">
                      <RiUploadCloud2Line size={36} />
                    </div>
                    <h5 className="mb-2 fw-bold text-dark">{t("DragDropCSV")}</h5>
                    <p className="text-muted small mb-4">
                      {t("CSVFilesOnly")} &bull; Max size: 10MB
                    </p>
                    <Btn 
                      className="btn btn-theme px-4 py-2 border-0 shadow-xs" 
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                    >
                      Browse Files
                    </Btn>
                  </div>
                </div>
              )}

              {/* PREVIEW & MAPPING MODE */}
              {mode === "PREVIEW" && parsedData && (
                <div>
                  {/* File Stats Summary Header */}
                  <div className="d-flex align-items-center justify-content-between mb-4 border-bottom pb-3">
                    <div className="d-flex align-items-center gap-3">
                      <div className="p-3 rounded-3 text-primary" style={{ background: "rgba(99, 102, 241, 0.08)" }}>
                        <RiFileList2Line size={24} />
                      </div>
                      <div>
                        <h6 className="m-0 fw-bold text-dark">{file?.name}</h6>
                        <div className="d-flex gap-2 align-items-center mt-1">
                          <span className="badge-custom-pill badge-custom-neutral">
                            {(file?.size / 1024).toFixed(1)} KB
                          </span>
                          <span className="badge-custom-pill badge-custom-info">
                            {parsedData.totalRows} {t("Records")}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Btn className="btn btn-outline-danger btn-sm px-3 py-2" onClick={handleClear} title="Cancel">
                      <RiCloseLine className="me-1" size={16} /> {t("Cancel")}
                    </Btn>
                  </div>

                  {/* Mapping Rules Info Banner */}
                  <Alert color="light" className="d-flex align-items-start border border-light-subtle rounded-3 mb-4 shadow-xs" style={{ background: "rgba(248, 250, 252, 0.8)" }}>
                    <RiInformationLine className="text-info me-2 mt-1" size={20} />
                    <div className="small text-muted">
                      <strong>Dynamic Header Mapping:</strong> Columns were matched based on name proximity. Review and verify the selections below before running the importer.
                    </div>
                  </Alert>

                  {/* Columns Mapping Panel */}
                  <div className="mapping-panel-premium mb-5">
                    <div className="d-flex align-items-center gap-2 mb-4 border-bottom pb-2">
                      <h6 className="m-0 fw-bold text-dark">Configure Column Mapping</h6>
                    </div>
                    <Row className="g-3">
                      {DEFAULT_FIELDS.map((field) => {
                        const isMapped = !!mapping[field.key];
                        return (
                          <Col xl="3" lg="4" md="6" key={field.key}>
                            <div className={`mapping-card-premium ${field.required ? "required" : "optional"} ${isMapped ? "matched" : ""}`}>
                              <div className="w-100">
                                <span className="mapping-field-label">
                                  <span className="d-flex align-items-center gap-1">
                                    {isMapped && <RiCheckLine className="text-success" size={14} />}
                                    {field.label.split(" (")[0]}
                                  </span>
                                  {field.required ? (
                                    <span className="badge-custom-pill badge-custom-danger py-0 px-2" style={{ fontSize: '0.65rem' }}>Required</span>
                                  ) : (
                                    <span className="badge-custom-pill badge-custom-neutral py-0 px-2" style={{ fontSize: '0.65rem' }}>Optional</span>
                                  )}
                                </span>
                                <select
                                  className="mapping-field-select"
                                  value={mapping[field.key] || ""}
                                  onChange={(e) => handleMappingChange(field.key, e.target.value)}
                                >
                                  <option value="">-- Skip Field --</option>
                                  {parsedData.headers.map((h, i) => (
                                    <option key={i} value={h}>{h}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </Col>
                        );
                      })}
                    </Row>
                  </div>

                  {/* Data Preview Table */}
                  <div className="preview-table-container mb-4">
                    <h6 className="mb-3 fw-bold text-dark d-flex align-items-center">
                      <span className="badge-custom-pill badge-custom-success me-2" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>Data Preview</span>
                      <small className="text-muted">Showing first 5 rows</small>
                    </h6>
                    
                    <div className="preview-table-card">
                      <div className="table-responsive">
                        <Table className="preview-table-premium align-middle">
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>Image</th>
                              <th>Product Name</th>
                              <th>SKU & Barcode</th>
                              <th>MRP Price</th>
                              <th>Selling Price</th>
                              <th>Category Status</th>
                              <th>HSN Code</th>
                            </tr>
                          </thead>
                          <tbody>
                            {parsedData.rows.slice(0, 5).map((row, idx) => {
                              const nameVal = row[mapping["name"]] || "-";
                              const skuVal = row[mapping["sku"]] || "-";
                              const priceVal = row[mapping["price"]] || "-";
                              const salePriceVal = mapping["sale_price"] ? row[mapping["sale_price"]] : "";
                              const hsnVal = mapping["hsn_code"] ? row[mapping["hsn_code"]] : "";
                              const barcodeVal = mapping["barcode"] ? row[mapping["barcode"]] : "";
                              
                              // Category resolution check
                              const catVal = mapping["category_name"] ? row[mapping["category_name"]] : "";
                              const catExists = catVal ? !!flattenedCategories[catVal.trim().toLowerCase()] : null;

                              // Image link check
                              const imageVal = mapping["image_url"] ? row[mapping["image_url"]] : "";

                              return (
                                <tr key={idx} className="table-hover-row">
                                  <td className="fw-semibold text-muted">{idx + 1}</td>
                                  <td>
                                    {imageVal && imageVal.startsWith("http") ? (
                                      <img 
                                        src={imageVal} 
                                        alt="preview" 
                                        className="image-preview-thumb"
                                      />
                                    ) : (
                                      <span className="text-muted small">-</span>
                                    )}
                                  </td>
                                  <td className="text-truncate fw-semibold text-dark" style={{ maxWidth: "220px" }}>{nameVal}</td>
                                  <td>
                                    <div className="d-flex flex-column gap-1">
                                      <span className="badge-custom-pill badge-custom-neutral font-monospace w-fit">{skuVal}</span>
                                      {barcodeVal && (
                                        <span className="text-muted small font-monospace" style={{ fontSize: '0.725rem' }}>Bar: {barcodeVal}</span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="text-dark fw-bold">{priceVal}</td>
                                  <td className="text-success fw-bold">{salePriceVal || priceVal}</td>
                                  <td>
                                    {catVal ? (
                                      catExists ? (
                                        <span className="badge-custom-pill badge-custom-success">{catVal} (Exists)</span>
                                      ) : (
                                        <span className="badge-custom-pill badge-custom-warning">{catVal} (New)</span>
                                      )
                                    ) : (
                                      <span className="text-muted small">-</span>
                                    )}
                                  </td>
                                  <td>{hsnVal || "-"}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </Table>
                      </div>
                    </div>
                  </div>

                  <div className="d-flex justify-content-end mt-4 pt-3 border-top">
                    <Btn
                      className="btn btn-theme px-5 py-2 d-flex align-items-center border-0 shadow-sm"
                      onClick={startImport}
                      title="Import Products"
                    >
                      <RiPlayLine className="me-2" size={18} /> Import {parsedData.totalRows} Products
                    </Btn>
                  </div>
                </div>
              )}

              {/* IMPORT RUNNING OR DONE STATE */}
              {(mode === "IMPORTING" || mode === "DONE") && (
                <div className="py-2">
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <h6 className="m-0 fw-bold d-flex align-items-center text-dark">
                      {mode === "IMPORTING" ? (
                        <>
                          <RiLoader4Line className="spinner me-2 text-primary" size={24} />
                          Importing products sequentially...
                        </>
                      ) : (
                        <>
                          <RiCheckLine className="text-success me-2 border rounded-circle p-1 bg-light-success" size={28} />
                          Import completed successfully!
                        </>
                      )}
                    </h6>
                    <div className="text-muted small fw-semibold">
                      {importProgress.current} / {importProgress.total} products processed
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="progress-bar-glow-container mb-4">
                    <div 
                      className={`progress-bar-glow-fill ${mode === 'DONE' ? 'bg-success' : 'bg-primary'}`}
                      style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                    />
                  </div>

                  {/* Metrics Summary Row */}
                  <Row className="g-3 mb-4">
                    <Col sm="4">
                      <div className="metric-box-premium success">
                        <div>
                          <span className="metric-box-title">Success</span>
                          <h4 className="metric-box-value text-success">{importProgress.success}</h4>
                        </div>
                        <div className="metric-icon-box success">
                          <RiCheckLine size={20} />
                        </div>
                      </div>
                    </Col>
                    <Col sm="4">
                      <div className="metric-box-premium danger">
                        <div>
                          <span className="metric-box-title">Failure</span>
                          <h4 className="metric-box-value text-danger">{importProgress.failure}</h4>
                        </div>
                        <div className="metric-icon-box danger">
                          <RiAlertLine size={20} />
                        </div>
                      </div>
                    </Col>
                    <Col sm="4">
                      <div className="metric-box-premium info">
                        <div>
                          <span className="metric-box-title">Remaining</span>
                          <h4 className="metric-box-value text-primary">{importProgress.total - importProgress.current}</h4>
                        </div>
                        <div className="metric-icon-box info">
                          <RiFileList2Line size={20} />
                        </div>
                      </div>
                    </Col>
                  </Row>

                  {/* Live Status Log console */}
                  <div className="terminal-window mb-4">
                    <div className="terminal-header">
                      <div className="terminal-controls">
                        <span className="terminal-control-dot red" />
                        <span className="terminal-control-dot yellow" />
                        <span className="terminal-control-dot green" />
                      </div>
                      <span className="terminal-title">Import Console Logs</span>
                      {mode === "IMPORTING" ? (
                        <span className="badge-custom-pill badge-custom-info py-0 px-2 text-white" style={{ fontSize: '0.65rem', border: 'none', background: '#3b82f6' }}>RUNNING</span>
                      ) : (
                        <span className="badge-custom-pill badge-custom-success py-0 px-2 text-white" style={{ fontSize: '0.65rem', border: 'none', background: '#10b981' }}>COMPLETED</span>
                      )}
                    </div>
                    
                    <div className="terminal-body custom-scrollbar" ref={terminalBodyRef}>
                      {importLogs.map((log, idx) => {
                        let textClass = "terminal-text-default";
                        if (log.includes("SUCCESS:")) textClass = "terminal-text-success";
                        else if (log.includes("ERROR:") || log.includes("WARNING: Could not create")) textClass = "terminal-text-error";
                        else if (log.includes("WARNING:")) textClass = "terminal-text-warning";
                        else if (log.includes("Created root category") || log.includes("Resolved category")) textClass = "terminal-text-info";

                        const time = log.substring(0, 8);
                        const message = log.substring(11);

                        return (
                          <div key={idx} className="terminal-line">
                            <span className="terminal-time">[{time}]</span>
                            <span className={textClass}>{message}</span>
                          </div>
                        );
                      })}
                      {isImporting && (
                        <div className="terminal-line">
                          <span className="terminal-time">[{new Date().toLocaleTimeString()}]</span>
                          <span className="terminal-text-default d-flex align-items-center gap-1">
                            System processing... <span className="terminal-cursor" />
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer options */}
                  {mode === "DONE" && (
                    <div className="d-flex justify-content-center gap-3 pt-2">
                      <Btn
                        className="btn btn-outline-secondary px-4 py-2 border border-secondary"
                        onClick={handleClear}
                        title="Import Another File"
                      >
                        Import Another File
                      </Btn>
                      <Btn
                        className="btn btn-theme px-4 py-2 border-0 d-flex align-items-center"
                        onClick={() => router.push(`/${i18Lang}/product`)}
                        title="View Products Table"
                      >
                        View Products <RiArrowRightLine className="ms-2" />
                      </Btn>
                    </div>
                  )}
                </div>
              )}

            </CardBody>
          </Card>
        </Col>

        {/* Right Info Box — Only displayed in initial UPLOAD screen */}
        {mode === "UPLOAD" && (
          <Col lg="4">
            <Card className="glass-card-premium border-0 shadow-sm h-100">
              <CardBody className="p-4 d-flex flex-column justify-content-between">
                <div>
                  <h5 className="instruction-title">
                    <RiInformationLine className="text-primary" size={22} />
                    {t("Instructions")}
                  </h5>
                  <p className="text-muted small mb-4">
                    Follow these guidelines to import your product master list seamlessly. Click below to download the official CSV template.
                  </p>

                  <button
                    className="btn btn-outline-primary w-100 mb-4 d-flex align-items-center justify-content-center py-2 border-primary"
                    onClick={handleDownloadTemplate}
                    style={{ borderRadius: '10px', fontSize: '0.9rem', fontWeight: '600' }}
                  >
                    <RiDownload2Line className="me-2" size={18} />
                    {t("DownloadTemplate")}
                  </button>

                  <h6 className="border-bottom pb-2 mb-3 fw-bold text-dark">{t("CSVFieldsGuidelines")}</h6>
                  
                  <div className="field-rules">
                    <div className="instruction-step-card required">
                      <span className="step-label required">Required Fields</span>
                      <p className="text-muted small mb-0">
                        <strong>DISPLAY NAME</strong> (or Name), <strong>Code</strong> (maps to SKU/Barcode), and <strong>MRP</strong> (Base Price) must be mapped to proceed.
                      </p>
                    </div>
                    
                    <div className="instruction-step-card category">
                      <span className="step-label category">Dynamic Categories</span>
                      <p className="text-muted small mb-0">
                        Categories are checked dynamically. If the category name doesn't match any existing one, a new root-level category is created automatically.
                      </p>
                    </div>

                    <div className="instruction-step-card image">
                      <span className="step-label image">Media Attachments</span>
                      <p className="text-muted small mb-0">
                        Providing image URLs will automatically upload them to media attachments first and link them as the main product thumbnail.
                      </p>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </Col>
        )}
      </Row>

      {/* Global CSS spinner and visual polish rules */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .spinner {
          animation: spin 1s linear infinite;
        }
        .bg-light-dark {
          background-color: #f1f5f9 !important;
          color: #334155 !important;
        }
        .shadow-xs {
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        }
        .w-fit {
          width: fit-content;
        }
        /* Custom scoped styles */
        .glass-card-premium {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(226, 232, 240, 0.8) !important;
          box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.02);
          border-radius: 16px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .glass-card-premium:hover {
          box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.06);
        }
        .header-gradient-accent {
          font-size: 1.6rem;
          font-weight: 700;
          color: #0f172a;
          background: linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 0.25rem;
        }
        .drag-drop-zone-premium {
          border: 2.5px dashed #cbd5e1;
          background: #f8fafc;
          border-radius: 16px;
          padding: 4rem 2rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }
        .drag-drop-zone-premium::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: radial-gradient(circle at center, rgba(99, 102, 241, 0.03) 0%, transparent 70%);
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        .drag-drop-zone-premium:hover::before {
          opacity: 1;
        }
        .drag-drop-zone-premium:hover {
          border-color: #4f46e5;
          background: #f5f7ff;
          box-shadow: 0 10px 25px -10px rgba(99, 102, 241, 0.15);
        }
        .drag-drop-zone-premium.drag-active {
          border-color: #4f46e5;
          background: rgba(79, 70, 229, 0.06);
          box-shadow: 0 0 0 5px rgba(79, 70, 229, 0.12);
          transform: scale(0.995);
        }
        .upload-cloud-icon-box {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 80px;
          height: 80px;
          border-radius: 24px;
          background: #f0f3ff;
          color: #4f46e5;
          margin-bottom: 1.5rem;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          animation: bounce-slow 3s ease-in-out infinite;
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .drag-drop-zone-premium:hover .upload-cloud-icon-box {
          background: #4f46e5;
          color: #ffffff;
          transform: scale(1.05) translateY(-4px);
          box-shadow: 0 12px 20px -8px rgba(79, 70, 229, 0.4);
        }
        .instruction-title {
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 1.25rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .instruction-step-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-left: 4px solid #64748b;
          border-radius: 4px 12px 12px 4px;
          padding: 1.25rem 1rem;
          margin-bottom: 1rem;
          transition: all 0.25s ease;
          position: relative;
        }
        .instruction-step-card:hover {
          transform: translateX(4px);
          background: #ffffff;
          box-shadow: 0 8px 20px -8px rgba(0, 0, 0, 0.05);
        }
        .instruction-step-card.required {
          border-left-color: #ef4444;
        }
        .instruction-step-card.category {
          border-left-color: #3b82f6;
        }
        .instruction-step-card.image {
          border-left-color: #10b981;
        }
        .step-label {
          display: inline-flex;
          align-items: center;
          padding: 0.15rem 0.5rem;
          font-size: 0.725rem;
          font-weight: 700;
          text-transform: uppercase;
          border-radius: 4px;
          margin-bottom: 0.5rem;
          letter-spacing: 0.05em;
        }
        .step-label.required { background: #fee2e2; color: #b91c1c; }
        .step-label.category { background: #dbeafe; color: #1e40af; }
        .step-label.image { background: #d1fae5; color: #065f46; }

        .mapping-panel-premium {
          background: rgba(248, 250, 252, 0.6);
          border: 1px solid rgba(226, 232, 240, 0.8);
          border-radius: 16px;
          padding: 1.5rem;
          margin-bottom: 2rem;
        }
        .mapping-card-premium {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 1.25rem 1rem;
          transition: all 0.25s ease;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
        }
        .mapping-card-premium:hover {
          border-color: #cbd5e1;
          box-shadow: 0 8px 20px -8px rgba(0, 0, 0, 0.04);
        }
        .mapping-card-premium.required {
          border-top: 3px solid #ef4444;
        }
        .mapping-card-premium.optional {
          border-top: 3px solid #94a3b8;
        }
        .mapping-card-premium.matched {
          border-color: #10b981;
          background-color: #f0fdf4;
        }
        .mapping-card-premium.matched.required {
          border-top-color: #10b981;
        }
        .mapping-card-premium.matched.optional {
          border-top-color: #10b981;
        }
        .mapping-card-premium.matched .mapping-field-label {
          color: #065f46;
        }
        .mapping-field-label {
          font-size: 0.8rem;
          font-weight: 600;
          color: #475569;
          margin-bottom: 0.75rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .mapping-field-select {
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 0.6rem 2rem 0.6rem 0.75rem;
          font-size: 0.85rem;
          font-weight: 500;
          color: #1e293b;
          width: 100%;
          transition: all 0.2s ease;
          background-color: #ffffff;
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
          background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
          background-repeat: no-repeat;
          background-position: right 0.75rem center;
          background-size: 1rem;
        }
        .mapping-field-select:focus {
          border-color: #4f46e5;
          outline: 0;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15);
        }

        .preview-table-card {
          border: 1px solid rgba(226, 232, 240, 0.8);
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 15px -3px rgba(0, 0, 0, 0.01);
        }
        .preview-table-premium {
          margin-bottom: 0;
        }
        .preview-table-premium th {
          background: #f8fafc !important;
          color: #475569 !important;
          font-weight: 600;
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 1rem 1.25rem;
          border-bottom: 1px solid #e2e8f0;
        }
        .preview-table-premium td {
          padding: 1rem 1.25rem;
          font-size: 0.875rem;
          color: #334155;
          border-bottom: 1px solid #f1f5f9;
        }
        .preview-table-premium tbody tr {
          transition: background-color 0.2s ease;
        }
        .preview-table-premium tbody tr:hover {
          background-color: rgba(99, 102, 241, 0.04);
        }
        .image-preview-thumb {
          width: 46px;
          height: 46px;
          border-radius: 8px;
          object-fit: cover;
          transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s ease;
          border: 1px solid #e2e8f0;
        }
        .image-preview-thumb:hover {
          transform: scale(1.25);
          box-shadow: 0 8px 16px -4px rgba(0, 0, 0, 0.15);
          z-index: 10;
          position: relative;
        }

        .badge-custom-pill {
          display: inline-flex;
          align-items: center;
          padding: 0.35rem 0.75rem;
          font-weight: 600;
          font-size: 0.725rem;
          line-height: 1;
          border-radius: 9999px;
          border-width: 1px;
          border-style: solid;
        }
        .badge-custom-success {
          background-color: rgba(16, 185, 129, 0.06);
          color: #047857;
          border-color: rgba(16, 185, 129, 0.2);
        }
        .badge-custom-warning {
          background-color: rgba(245, 158, 11, 0.06);
          color: #b45309;
          border-color: rgba(245, 158, 11, 0.2);
        }
        .badge-custom-danger {
          background-color: rgba(239, 68, 68, 0.06);
          color: #b91c1c;
          border-color: rgba(239, 68, 68, 0.2);
        }
        .badge-custom-info {
          background-color: rgba(59, 130, 246, 0.06);
          color: #1d4ed8;
          border-color: rgba(59, 130, 246, 0.2);
        }
        .badge-custom-neutral {
          background-color: rgba(100, 116, 139, 0.06);
          color: #475569;
          border-color: rgba(100, 116, 139, 0.2);
        }

        .progress-bar-glow-container {
          height: 14px;
          background: #e2e8f0;
          border-radius: 9999px;
          overflow: hidden;
          box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05);
        }
        .progress-bar-glow-fill {
          height: 100%;
          border-radius: 9999px;
          transition: width 0.3s ease;
          position: relative;
        }
        @keyframes progress-bar-stripes-move {
          0% { background-position: 1rem 0; }
          100% { background-position: 0 0; }
        }
        .progress-bar-glow-fill::after {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background-image: linear-gradient(
            45deg,
            rgba(255, 255, 255, 0.15) 25%,
            transparent 25%,
            transparent 50%,
            rgba(255, 255, 255, 0.15) 50%,
            rgba(255, 255, 255, 0.15) 75%,
            transparent 75%,
            transparent
          );
          background-size: 1rem 1rem;
          animation: progress-bar-stripes-move 1s linear infinite;
        }
        .metric-box-premium {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 1.25rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          transition: all 0.2s ease;
        }
        .metric-box-premium:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px -8px rgba(0, 0, 0, 0.03);
        }
        .metric-box-premium.success { border-left: 4px solid #10b981; }
        .metric-box-premium.danger { border-left: 4px solid #ef4444; }
        .metric-box-premium.info { border-left: 4px solid #3b82f6; }
        .metric-box-title {
          font-size: 0.75rem;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.25rem;
          display: block;
        }
        .metric-box-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #0f172a;
          line-height: 1.2;
        }
        .metric-icon-box {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 10px;
          transition: all 0.2s ease;
        }
        .metric-icon-box.success { background: rgba(16, 185, 129, 0.1); color: #10b981; }
        .metric-icon-box.danger { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
        .metric-icon-box.info { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }

        .terminal-window {
          background: #090e1a;
          border: 1px solid #1e293b;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2), inset 0 2px 4px rgba(255, 255, 255, 0.03);
        }
        .terminal-header {
          background: #111827;
          padding: 0.75rem 1.25rem;
          border-bottom: 1px solid #1e293b;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .terminal-controls {
          display: flex;
          gap: 6px;
        }
        .terminal-control-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }
        .terminal-control-dot.red { background: #ef4444; }
        .terminal-control-dot.yellow { background: #f59e0b; }
        .terminal-control-dot.green { background: #10b981; }
        .terminal-title {
          color: #64748b;
          font-size: 0.725rem;
          font-weight: 600;
          font-family: ui-monospace, monospace;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .terminal-body {
          padding: 1.25rem;
          height: 280px;
          overflow-y: auto;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 0.8rem;
          line-height: 1.6;
          background: radial-gradient(circle at center, rgba(16, 185, 129, 0.02) 0%, transparent 100%), #090e1a;
        }
        .terminal-line {
          margin-bottom: 0.35rem;
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
        }
        .terminal-time {
          color: #475569;
          user-select: none;
          font-size: 0.75rem;
        }
        .terminal-text-success { color: #34d399; }
        .terminal-text-error { color: #f87171; }
        .terminal-text-warning { color: #fbbf24; }
        .terminal-text-info { color: #60a5fa; }
        .terminal-text-default { color: #94a3b8; }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #475569;
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .terminal-cursor {
          display: inline-block;
          width: 8px;
          height: 15px;
          background: #10b981;
          animation: blink 1s step-end infinite;
          vertical-align: middle;
        }
      `}} />
    </Container>
  );
};

export default BulkUploadForm;
