"use client";

import React, { useState, useContext, useRef } from "react";
import { useRouter } from "next/navigation";
import { Container, Row, Col, Card, CardBody, Table, Alert } from "reactstrap";
import { RiUploadCloud2Line, RiDownload2Line, RiCloseLine, RiCheckLine, RiAlertLine, RiFileList2Line } from "react-icons/ri";
import I18NextContext from "@/Helper/I18NextContext";
import { useTranslation } from "@/app/i18n/client";
import useCreate from "@/Utils/Hooks/useCreate";
import { ProductImportAPI } from "@/Utils/AxiosUtils/API";
import Btn from "@/Elements/Buttons/Btn";

const parseCSVLine = (line) => {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, ""));
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^"|"$/g, ""));
  return result;
};

const parseCSV = (text) => {
  const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
  if (lines.length === 0) return { headers: [], rows: [], totalRows: 0 };
  const headers = parseCSVLine(lines[0]);
  const rows = [];
  for (let i = 1; i < Math.min(lines.length, 6); i++) {
    const rowValues = parseCSVLine(lines[i]);
    const rowObj = {};
    headers.forEach((header, index) => {
      rowObj[header] = rowValues[index] || "";
    });
    rows.push(rowObj);
  }
  return { headers, rows, totalRows: lines.length - 1 };
};

const formatScientific = (value) => {
  if (!value) return "";
  let str = String(value).trim();
  if (str.startsWith("'")) {
    str = str.substring(1);
  }
  if (/^[+-]?\d+(\.\d+)?[eE][+-]?\d+$/.test(str)) {
    try {
      return Number(str).toFixed(0);
    } catch (e) {
      return str;
    }
  }
  return str;
};

const BulkUploadForm = () => {
  const { i18Lang } = useContext(I18NextContext);
  const { t } = useTranslation(i18Lang, "common");
  const router = useRouter();
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [uploadErrors, setUploadErrors] = useState(null);
  const [successResponse, setSuccessResponse] = useState(null);

  const { mutate, isLoading } = useCreate(
    ProductImportAPI,
    false,
    false,
    false,
    (resData) => {
      if (resData?.status === 200 || resData?.status === 201) {
        setSuccessResponse(resData?.data || []);
        setUploadErrors(null);
      } else {
        // Extract validation errors
        const errs = [];
        if (resData?.response?.data?.errors) {
          const apiErrors = resData.response.data.errors;
          if (Array.isArray(apiErrors)) {
            errs.push(...apiErrors);
          } else if (typeof apiErrors === "object") {
            Object.keys(apiErrors).forEach((key) => {
              if (Array.isArray(apiErrors[key])) {
                errs.push(...apiErrors[key]);
              } else {
                errs.push(apiErrors[key]);
              }
            });
          }
        } else if (resData?.response?.data?.message) {
          errs.push(resData.response.data.message);
        } else {
          errs.push(t("Something went wrong — check API response"));
        }
        setUploadErrors(errs);
        setSuccessResponse(null);
      }
    }
  );

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileChange = (selectedFile) => {
    if (!selectedFile) return;
    if (selectedFile.type !== "text/csv" && !selectedFile.name.endsWith(".csv")) {
      alert("Please select a CSV file.");
      return;
    }
    setFile(selectedFile);
    setUploadErrors(null);
    setSuccessResponse(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const parsed = parseCSV(text);
      setParsedData(parsed);
    };
    reader.readAsText(selectedFile);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleClear = () => {
    setFile(null);
    setParsedData(null);
    setUploadErrors(null);
    setSuccessResponse(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDownloadTemplate = () => {
    const headers = [
      "name",
      "hsn_code",
      "mrp",
      "selling_price",
      "cost",
      "sku",
      "barcode"
    ];
    
    // Prefix HSN code and Barcode with a single quote (') so Excel treats them as text
    const sampleRow = [
      "Sample Premium Tea",
      "'09021000",
      "29.99",
      "24.99",
      "15.00",
      "TEA-GRN-001",
      "'8901234567890"
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

  const handleUpload = () => {
    if (!file) return;
    const formData = new FormData();
    formData.append("products", file);
    mutate(formData);
  };

  return (
    <Container fluid className="bulk-upload-container">
      <Row>
        <Col xs="12">
          <div className="title-header option-title">
            <h5>{t("BulkProductUpload")}</h5>
          </div>
        </Col>
      </Row>

      <Row>
        {/* Left Section: Uploader & Preview */}
        <Col xl="8" lg="7">
          <Card className="card-glass shadow-sm mb-4">
            <CardBody className="p-4">
              {!successResponse ? (
                <>
                  <div
                    className={`drag-drop-zone p-5 text-center rounded-3 border-2 border-dashed ${
                      isDragging ? "drag-active border-primary bg-light" : "border-muted"
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    style={{ cursor: "pointer", transition: "all 0.2s ease" }}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="d-none"
                      accept=".csv"
                      onChange={(e) => handleFileChange(e.target.files[0])}
                    />
                    <RiUploadCloud2Line className="text-secondary mb-3" size={60} />
                    <h5 className="mb-2">{t("DragDropCSV")}</h5>
                    <p className="text-muted small mb-0">
                      {t("CSVFilesOnly")} (Max: 10MB)
                    </p>
                  </div>

                  {file && (
                    <div className="file-info-bar d-flex justify-content-between align-items-center bg-light p-3 mt-3 rounded">
                      <div className="d-flex align-items-center">
                        <RiFileList2Line size={24} className="text-primary me-2" />
                        <div>
                          <strong className="d-block text-truncate" style={{ maxWidth: "250px" }}>
                            {file.name}
                          </strong>
                          <span className="text-muted small">
                            {(file.size / 1024).toFixed(1)} KB &bull; {parsedData?.totalRows || 0} {t("Records")}
                          </span>
                        </div>
                      </div>
                      <button
                        className="btn btn-sm btn-outline-danger p-1 rounded-circle"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClear();
                        }}
                      >
                        <RiCloseLine size={18} />
                      </button>
                    </div>
                  )}

                  {parsedData && (
                    <div className="preview-section mt-4">
                      <h6 className="mb-3 d-flex align-items-center">
                        <span className="badge bg-info me-2">{t("PreviewParsedData")}</span>
                        <span className="text-muted small">({t("ShowingFirst5Rows")})</span>
                      </h6>
                      <div className="table-responsive border rounded">
                        <Table size="sm" className="mb-0 theme-table table-striped align-middle">
                          <thead className="bg-light">
                            <tr>
                              <th>#</th>
                              <th>Name</th>
                              <th>HSN Code</th>
                              <th>MRP</th>
                              <th>Selling Price</th>
                              <th>Discount</th>
                              <th>Cost</th>
                              <th>SKU</th>
                              <th>Barcode</th>
                            </tr>
                          </thead>
                          <tbody>
                            {parsedData.rows.map((row, idx) => {
                              const mrp = parseFloat(row.mrp || row.price || 0);
                              const selling = parseFloat(row.selling_price || row.sale_price || row["selling price"] || 0);
                              const discountAmount = Math.max(0, mrp - selling);
                              return (
                                <tr key={idx}>
                                  <td>{idx + 1}</td>
                                  <td className="text-truncate" style={{ maxWidth: "150px" }}>{row.name}</td>
                                  <td>{formatScientific(row.hsn_code || row.hsncode || row["hsn code"]) || "-"}</td>
                                  <td>{row.mrp || row.price || "-"}</td>
                                  <td>{row.selling_price || row.sale_price || row["selling price"] || "-"}</td>
                                  <td>{discountAmount > 0 ? discountAmount.toFixed(2) : "0.00"}</td>
                                  <td>{row.cost || "-"}</td>
                                  <td>{formatScientific(row.sku) || "-"}</td>
                                  <td>{formatScientific(row.barcode) || "-"}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </Table>
                      </div>
                    </div>
                  )}

                  {uploadErrors && (
                    <Alert color="danger" className="mt-4 border-0 shadow-sm">
                      <h6 className="d-flex align-items-center mb-2">
                        <RiAlertLine className="me-2" size={20} />
                        {t("ImportErrorsFound")}
                      </h6>
                      <ul className="mb-0 text-start scroll-box" style={{ maxHeight: "200px", overflowY: "auto" }}>
                        {uploadErrors.map((err, idx) => (
                          <li key={idx} className="small">{err}</li>
                        ))}
                      </ul>
                    </Alert>
                  )}

                  {file && (
                    <div className="d-flex justify-content-end mt-4">
                      <Btn
                        className="btn btn-theme px-4"
                        onClick={handleUpload}
                        loading={isLoading}
                        title="UploadCSV"
                      >
                        <RiUploadCloud2Line className="me-2" />
                      </Btn>
                    </div>
                  )}
                </>
              ) : (
                <div className="success-state text-center py-5">
                  <div className="success-icon-bg bg-light-success d-inline-flex justify-content-center align-items-center rounded-circle mb-4" style={{ width: "80px", height: "80px" }}>
                    <RiCheckLine className="text-success" size={48} />
                  </div>
                  <h4 className="mb-3">{t("ImportSuccess")}</h4>
                  <p className="text-muted mb-4">
                    {t("SuccessfullyImported")} <strong>{successResponse.length}</strong> {t("ProductsCapital")}.
                  </p>

                  <div className="table-responsive border rounded text-start mb-4" style={{ maxHeight: "300px" }}>
                    <Table size="sm" className="mb-0 theme-table align-middle">
                      <thead className="bg-light">
                        <tr>
                          <th>ID</th>
                          <th>Name</th>
                          <th>HSN Code</th>
                          <th>MRP</th>
                          <th>Selling Price</th>
                          <th>Discount</th>
                          <th>Cost</th>
                          <th>SKU</th>
                          <th>Barcode</th>
                        </tr>
                      </thead>
                      <tbody>
                        {successResponse.map((prod, idx) => (
                          <tr key={idx}>
                            <td>{prod.id}</td>
                            <td>{prod.name}</td>
                            <td>{formatScientific(prod.hsn_code) || "-"}</td>
                            <td>{prod.price || "-"}</td>
                            <td>{prod.sale_price || "-"}</td>
                            <td>{prod.discount !== null && prod.discount !== undefined ? parseFloat(prod.discount).toFixed(2) : "0.00"}</td>
                            <td>{prod.cost || "-"}</td>
                            <td>{formatScientific(prod.sku) || "-"}</td>
                            <td>{formatScientific(prod.barcode) || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>

                  <div className="d-flex justify-content-center gap-3">
                    <button
                      className="btn btn-outline-secondary"
                      onClick={handleClear}
                    >
                      {t("ImportAnotherFile")}
                    </button>
                    <button
                      className="btn btn-theme"
                      onClick={() => router.push(`/${i18Lang}/product`)}
                    >
                      {t("ViewAllProducts")}
                    </button>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </Col>

        {/* Right Section: Field Guidelines & Download Template */}
        <Col xl="4" lg="5">
          <Card className="card-glass border-0 shadow-sm mb-4">
            <CardBody className="p-4">
              <h5 className="mb-3">{t("Instructions")}</h5>
              <p className="text-muted small mb-4">
                {t("InstructionsDescription")}
              </p>

              <button
                className="btn btn-outline-primary w-100 mb-4 d-flex align-items-center justify-content-center py-2"
                onClick={handleDownloadTemplate}
              >
                <RiDownload2Line className="me-2" size={18} />
                {t("DownloadTemplate")}
              </button>

              <h6 className="border-bottom pb-2 mb-3">{t("CSVFieldsGuidelines")}</h6>
              <div className="field-rules small">
                <div className="mb-3">
                  <span className="badge bg-danger me-2">name</span>
                  <p className="text-muted mb-0 mt-1"><strong>Required.</strong> The name of the product.</p>
                </div>
                <div className="mb-3">
                  <span className="badge bg-danger me-2">sku</span>
                  <p className="text-muted mb-0 mt-1"><strong>Required.</strong> Unique Stock Keeping Unit for simple products.</p>
                </div>
                <div className="mb-3">
                  <span className="badge bg-danger me-2">mrp</span>
                  <p className="text-muted mb-0 mt-1"><strong>Required.</strong> Maximum Retail Price (Base Price) for simple products.</p>
                </div>
                <div className="mb-3">
                  <span className="badge bg-info me-2">selling_price</span>
                  <p className="text-muted mb-0 mt-1"><strong>Optional.</strong> Selling Price. Defaults to MRP if not provided.</p>
                </div>
                <div className="mb-3">
                  <span className="badge bg-info me-2">cost</span>
                  <p className="text-muted mb-0 mt-1"><strong>Optional.</strong> Purchase/cost price of the product.</p>
                </div>
                <div className="mb-3">
                  <span className="badge bg-info me-2">hsn_code</span>
                  <p className="text-muted mb-0 mt-1"><strong>Optional.</strong> HSN Code for taxation mapping.</p>
                </div>
                <div className="mb-3">
                  <span className="badge bg-info me-2">barcode</span>
                  <p className="text-muted mb-0 mt-1"><strong>Optional.</strong> Product barcode number (EAN/UPC).</p>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default BulkUploadForm;
