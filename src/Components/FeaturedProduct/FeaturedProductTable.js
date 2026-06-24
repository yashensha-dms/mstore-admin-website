"use client";
import React, { useState, useEffect, useContext } from "react";
import { Table, Card, CardBody, Input, Row, Col, FormGroup, Label } from "reactstrap";
import { RiDeleteBinLine, RiArrowUpLine, RiArrowDownLine, RiSearchLine } from "react-icons/ri";
import request from "../../Utils/AxiosUtils";
import { featuredProduct, product } from "../../Utils/AxiosUtils/API";
import ShowModal from "../../Elements/Alerts&Modals/Modal";
import Btn from "../../Elements/Buttons/Btn";
import { ToastNotification } from "../../Utils/CustomFunctions/ToastNotification";
import I18NextContext from "@/Helper/I18NextContext";
import { useTranslation } from "@/app/i18n/client";
import Loader from "../CommonComponent/Loader";

const FeaturedProductTable = ({ isCheck, setIsCheck }) => {
  const { i18Lang } = useContext(I18NextContext);
  const { t } = useTranslation(i18Lang, "common");

  const [loading, setLoading] = useState(true);
  const [featuredList, setFeaturedList] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [allProducts, setAllProducts] = useState([]);
  const [searchVal, setSearchVal] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);

  // Fetch featured products
  const fetchFeatured = async () => {
    setLoading(true);
    try {
      const res = await request({ url: featuredProduct, method: "GET" });
      if (res?.status === 200 || res?.status === 201) {
        setFeaturedList(res.data || []);
      } else {
        console.error("Featured Product API error:", res);
        const errMsg = res?.response?.data?.message || res?.message || "Failed to load featured products";
        ToastNotification("error", errMsg);
      }
    } catch (error) {
      console.error("Featured Product catch error:", error);
      ToastNotification("error", error?.message || "Failed to load featured products");
    } finally {
      setLoading(false);
    }
  };

  // Fetch product pool for selection
  const fetchProductPool = async (searchQuery = "") => {
    setModalLoading(true);
    try {
      const res = await request({
        url: product,
        method: "GET",
        params: { paginate: 100, search: searchQuery }
      });
      if (res && res.data) {
        setAllProducts(res.data?.data || []);
      }
    } catch (error) {
      ToastNotification("error", "Failed to load products pool");
    } finally {
      setModalLoading(false);
    }
  };

  useEffect(() => {
    fetchFeatured();
  }, []);

  useEffect(() => {
    if (modalOpen) {
      fetchProductPool(searchVal);
    }
  }, [modalOpen, searchVal]);

  // Handle deletion (unfeaturing)
  const handleDelete = async (productId) => {
    if (window.confirm("Are you sure you want to remove this product from the featured list?")) {
      try {
        await request({ url: `${featuredProduct}/${productId}`, method: "DELETE" });
        ToastNotification("success", "Product removed from featured list");
        fetchFeatured();
      } catch (error) {
        ToastNotification("error", error?.message || "Failed to remove featured product");
      }
    }
  };

  // Reordering handlers (Up / Down)
  const handleMove = async (index, direction) => {
    const listCopy = [...featuredList];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= listCopy.length) return;

    // Swap items
    const temp = listCopy[index];
    listCopy[index] = listCopy[targetIndex];
    listCopy[targetIndex] = temp;

    setFeaturedList(listCopy);

    // Persist reorder to DB
    try {
      const ids = listCopy.map(item => item.id);
      await request({
        url: `${featuredProduct}/reorder`,
        method: "PATCH",
        data: { featured_product_ids: ids }
      });
      ToastNotification("success", "Order updated");
    } catch (error) {
      ToastNotification("error", "Failed to save reorder");
      fetchFeatured(); // revert
    }
  };

  // Save selected featured products
  const handleSaveSelection = async () => {
    if (selectedIds.length === 0) {
      setModalOpen(false);
      return;
    }
    try {
      await request({
        url: featuredProduct,
        method: "POST",
        data: { product_ids: selectedIds }
      });
      ToastNotification("success", "Featured products updated successfully");
      setSelectedIds([]);
      setModalOpen(false);
      fetchFeatured();
    } catch (error) {
      ToastNotification("error", error?.message || "Failed to feature products");
    }
  };

  // Filter pickable products (exclude already featured)
  const pickableProducts = allProducts.filter(
    (prod) => !featuredList.some((feat) => feat.product_id === prod.id)
  );

  return (
    <>
      <Card>
        <CardBody>
          <div className="title-header option-title">
            <h5>{t("Featured Products")}</h5>
            <div className="right-options">
              <Btn
                className="btn-solid"
                type="button"
                onClick={() => setModalOpen(true)}
                title="Add Featured Product"
              />
            </div>
          </div>

          {loading ? (
            <Loader />
          ) : featuredList.length === 0 ? (
            <div className="no-data-found-box text-center py-5">
              <p className="text-slate-500 mb-0">No featured products found. Click Add to feature some products!</p>
            </div>
          ) : (
            <div className="table-responsive border-table mt-4">
              <Table className="role-table all-package theme-table datatable-wrapper">
                <thead>
                  <tr>
                    <th className="sm-width">{t("No")}</th>
                    <th>{t("Image")}</th>
                    <th>{t("Name")}</th>
                    <th>{t("Action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {featuredList.map((item, index) => (
                    <tr key={item.id}>
                      <td className="sm-width">{index + 1}</td>
                      <td className="sm-width">
                        <img
                          src={item.product?.product_thumbnail?.original_url || "/assets/images/placeholder.png"}
                          alt={item.product?.name || ""}
                          style={{ width: "40px", height: "40px", objectFit: "cover", borderRadius: "8px" }}
                        />
                      </td>
                      <td>{item.product?.name || "-"}</td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <button
                            type="button"
                            className="btn btn-light btn-xs p-1"
                            disabled={index === 0}
                            onClick={() => handleMove(index, "up")}
                          >
                            <RiArrowUpLine />
                          </button>
                          <button
                            type="button"
                            className="btn btn-light btn-xs p-1"
                            disabled={index === featuredList.length - 1}
                            onClick={() => handleMove(index, "down")}
                          >
                            <RiArrowDownLine />
                          </button>
                          <button
                            type="button"
                            className="btn btn-link text-danger p-0 ms-2"
                            onClick={() => handleDelete(item.product_id)}
                          >
                            <RiDeleteBinLine size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Select Product Modal */}
      <ShowModal
        open={modalOpen}
        title="Select Products to Feature"
        setModal={setModalOpen}
        modalAttr={{ className: "modal-lg" }}
        buttons={
          <>
            <Btn className="btn-outline btn" onClick={() => setModalOpen(false)} title="Cancel" />
            <Btn className="btn-theme btn-primary btn" onClick={handleSaveSelection} title="Save" />
          </>
        }
      >
        <div className="search-box mb-3 position-relative">
          <Input
            type="search"
            placeholder="Search products pool..."
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            className="pl-5"
          />
          <RiSearchLine className="position-absolute" style={{ left: "15px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
        </div>

        {modalLoading ? (
          <div className="text-center py-4">
            <Loader />
          </div>
        ) : pickableProducts.length === 0 ? (
          <div className="text-center py-4 text-slate-500">
            No pickable products found in pool.
          </div>
        ) : (
          <div style={{ maxHeight: "400px", overflowY: "auto", paddingRight: "5px" }}>
            <Table className="theme-table mt-2">
              <thead>
                <tr>
                  <th className="sm-width">Select</th>
                  <th>Image</th>
                  <th>Name</th>
                </tr>
              </thead>
              <tbody>
                {pickableProducts.map((prod) => (
                  <tr
                    key={prod.id}
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      if (selectedIds.includes(prod.id)) {
                        setSelectedIds(selectedIds.filter((id) => id !== prod.id));
                      } else {
                        setSelectedIds([...selectedIds, prod.id]);
                      }
                    }}
                  >
                    <td>
                      <Input
                        type="checkbox"
                        checked={selectedIds.includes(prod.id)}
                        readOnly
                      />
                    </td>
                    <td>
                      <img
                        src={prod.product_thumbnail?.original_url || "/assets/images/placeholder.png"}
                        alt={prod.name || ""}
                        style={{ width: "35px", height: "35px", objectFit: "cover", borderRadius: "6px" }}
                      />
                    </td>
                    <td>{prod.name}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </ShowModal>
    </>
  );
};

export default FeaturedProductTable;
