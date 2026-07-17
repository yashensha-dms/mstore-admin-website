import { useQuery } from "@tanstack/react-query";
import { Form, Formik } from "formik";
import React, { useContext, useEffect, useState } from "react";
import * as Select from "@radix-ui/react-select";
import { ChevronDown, Check, Image as ImageIcon, X, AlertCircle } from "lucide-react";
import FormBtn from "../../Elements/Buttons/FormBtn";
import request from "../../Utils/AxiosUtils";
import { offerBanner, product, Category } from "../../Utils/AxiosUtils/API";
import Loader from "../CommonComponent/Loader";
import AttachmentModal from "../Attachment/AttachmentModal";
import I18NextContext from "@/Helper/I18NextContext";
import { useTranslation } from "@/app/i18n/client";
import * as Yup from "yup";
import Image from "next/image";
import { useRouter } from "next/navigation";

const OfferBannerForm = ({ mutate, updateId, loading }) => {
  const router = useRouter();
  const { i18Lang } = useContext(I18NextContext);
  const { t } = useTranslation(i18Lang, 'common');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState([]);
  const [targetSearch, setTargetSearch] = useState("");

  // Fetch product list
  const { data: productData } = useQuery([product], () => request({ url: product }), {
    refetchOnWindowFocus: false,
    select: (res) => res?.data?.data?.map((p) => ({ id: String(p.id), name: p.name })) || [],
  });

  // Fetch category list
  const { data: categoryData } = useQuery([Category], () => request({ url: Category, params: { type: "product", status: 1 } }), {
    refetchOnWindowFocus: false,
    select: (res) => {
      let result = [];
      const recurse = (list, parentName = "") => {
          list?.forEach((item) => {
              const displayName = parentName ? `${parentName} → ${item.name}` : item.name;
              result.push({ id: String(item.id), name: displayName });
              if (item.subcategories && item.subcategories.length > 0) {
                  recurse(item.subcategories, displayName);
              }
          });
      };
      recurse(res?.data?.data);
      return result;
    },
  });

  // Fetch banner detail if editing
  const { data: oldData, isLoading, refetch } = useQuery(
    [updateId],
    () => request({ url: offerBanner + "/" + updateId }),
    { refetchOnMount: false, enabled: false }
  );

  useEffect(() => {
    updateId && refetch();
  }, [updateId]);

  // Set initially selected image when editing
  useEffect(() => {
    if (oldData?.data?.banner_image) {
      setSelectedImage([oldData.data.banner_image]);
    }
  }, [oldData]);

  if (updateId && isLoading) return <Loader />;

  return (
    <>
      {/* Styles for Radix components */}
      <style dangerouslySetInnerHTML={{ __html: `
        .premium-select-trigger {
          display: inline-flex;
          align-items: center;
          justify-content: space-between;
          border-radius: 8px;
          padding: 10px 14px;
          font-size: 14px;
          background-color: white;
          color: #1e293b;
          border: 1px solid #cbd5e1;
          outline: none;
          transition: all 150ms ease;
          width: 100%;
          cursor: pointer;
        }
        .premium-select-trigger:focus {
          border-color: #0da89b;
          box-shadow: 0 0 0 2px rgba(13, 168, 155, 0.1);
        }
        .premium-select-content {
          width: var(--radix-select-trigger-width) !important;
          overflow: hidden;
          background-color: white;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          box-shadow: 0px 10px 38px -10px rgba(22, 23, 24, 0.2), 0px 10px 20px -15px rgba(22, 23, 24, 0.1);
          z-index: 1000;
        }
        .premium-select-viewport {
          padding: 6px;
        }
        .premium-select-item {
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
        }
        .premium-select-item[data-highlighted] {
          background-color: #f1f5f9;
          color: #0f172a;
        }
        .premium-select-indicator {
          position: absolute;
          right: 8px;
          width: 16px;
          height: 16px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
      `}} />

      <Formik
        enableReinitialize
        initialValues={{
          name: updateId ? oldData?.data?.name || "" : "",
          banner_image_id: updateId ? oldData?.data?.banner_image_id || "" : "",
          banner_image: updateId ? oldData?.data?.banner_image || null : null,
          redirect_type: updateId ? oldData?.data?.redirect_type || "product" : "product",
          redirect_id: updateId ? String(oldData?.data?.redirect_id) || "" : "",
          status: updateId ? Boolean(Number(oldData?.data?.status)) : true,
        }}
        validationSchema={Yup.object({
          name: Yup.string().required("Banner name is required"),
          banner_image_id: Yup.number().required("Banner image is required"),
          redirect_type: Yup.string().required("Redirect type is required"),
          redirect_id: Yup.string().required("Redirect target item is required"),
        })}
        onSubmit={(values) => {
          mutate({
            ...values,
            status: Number(values.status),
            banner_image_id: Number(values.banner_image_id),
            redirect_id: Number(values.redirect_id)
          });
        }}
      >
        {({ values, setFieldValue, errors, touched }) => {
          // Sync state image with formik fields
          const handleRemoveImage = () => {
            setFieldValue("banner_image_id", "");
            setFieldValue("banner_image", null);
            setSelectedImage([]);
          };

          return (
            <Form className="space-y-6 max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-slate-100">
              
              {/* Banner Name Field */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700">
                  {t("BannerName")} <span className="text-red-500">*</span>
                </label>
                <input
                  name="name"
                  type="text"
                  value={values.name}
                  onChange={(e) => setFieldValue("name", e.target.value)}
                  placeholder={t("EnterBannerName")}
                  className={`w-full px-4 py-2.5 border rounded-lg text-sm transition focus:outline-none focus:ring-2 focus:ring-[#0da89b]/10 ${
                    errors.name && touched.name ? "border-red-400 focus:border-red-400" : "border-slate-300 focus:border-[#0da89b]"
                  }`}
                />
                {errors.name && touched.name && (
                  <div className="text-xs text-red-500 flex items-center gap-1.5 mt-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.name}
                  </div>
                )}
              </div>

              {/* Banner Image Uploader */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700">
                  {t("BannerImage")} <span className="text-red-500">*</span>
                </label>

                {values.banner_image ? (
                  <div className="relative w-full h-48 rounded-lg overflow-hidden group border border-slate-200 bg-slate-50">
                    <Image
                      src={values.banner_image?.original_url}
                      alt="Banner preview"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setModalOpen(true)}
                        className="px-4 py-2 bg-white text-slate-800 text-xs font-semibold rounded-md shadow hover:bg-slate-50 transition"
                      >
                        {t("Change")}
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="p-2 bg-red-600 text-white rounded-md shadow hover:bg-red-700 transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => setModalOpen(true)}
                    className={`w-full h-40 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer transition bg-slate-50 hover:bg-slate-100/50 ${
                      errors.banner_image_id ? "border-red-300" : "border-slate-300 hover:border-[#0da89b]"
                    }`}
                  >
                    <ImageIcon className="w-8 h-8 text-slate-400" />
                    <span className="text-sm font-medium text-slate-600">{t("SelectImageFromLibrary")}</span>
                    <span className="text-xs text-slate-400">{t("ClickToBrowse")}</span>
                  </div>
                )}

                {errors.banner_image_id && (
                  <div className="text-xs text-red-500 flex items-center gap-1.5 mt-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.banner_image_id}
                  </div>
                )}
              </div>

              {/* Redirect Type Dropdown using Radix UI Select */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700">
                  {t("RedirectType")} <span className="text-red-500">*</span>
                </label>
                <Select.Root
                  value={values.redirect_type}
                  onValueChange={(val) => {
                    setFieldValue("redirect_type", val);
                    setFieldValue("redirect_id", "");
                    setTargetSearch("");
                  }}
                >
                  <Select.Trigger className="premium-select-trigger">
                    <Select.Value />
                    <Select.Icon>
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    </Select.Icon>
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Content position="popper" sideOffset={4} className="premium-select-content">
                      <Select.Viewport className="premium-select-viewport">
                        <Select.Item value="product" className="premium-select-item">
                          <Select.ItemText>{t("Product")}</Select.ItemText>
                          <Select.ItemIndicator className="premium-select-indicator">
                            <Check className="w-4 h-4 text-slate-800" />
                          </Select.ItemIndicator>
                        </Select.Item>
                        <Select.Item value="category" className="premium-select-item">
                          <Select.ItemText>{t("Category") + " / " + t("SubCategory")}</Select.ItemText>
                          <Select.ItemIndicator className="premium-select-indicator">
                            <Check className="w-4 h-4 text-slate-800" />
                          </Select.ItemIndicator>
                        </Select.Item>
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
              </div>

              {/* Redirect Target Dropdown using Radix UI Select */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700">
                  {t("RedirectTarget")} <span className="text-red-500">*</span>
                </label>
                <Select.Root
                  value={values.redirect_id}
                  onValueChange={(val) => setFieldValue("redirect_id", val)}
                >
                  <Select.Trigger className="premium-select-trigger">
                    <Select.Value placeholder={t("SelectTargetItem")} />
                    <Select.Icon>
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    </Select.Icon>
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Content position="popper" sideOffset={4} className="premium-select-content max-h-[300px] overflow-y-auto">
                      <div className="p-2 border-b border-slate-100 sticky top-0 bg-white z-10" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          placeholder={t("Search") + "..."}
                          value={targetSearch}
                          onChange={(e) => setTargetSearch(e.target.value)}
                          onKeyDown={(e) => e.stopPropagation()}
                          className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#0da89b]"
                        />
                      </div>
                      <Select.Viewport className="premium-select-viewport">
                        {((values.redirect_type === "product" ? productData : categoryData) || [])
                          ?.filter((item) => !targetSearch || item.name.toLowerCase().includes(targetSearch.toLowerCase()))
                          ?.slice(0, 30)
                          ?.map((item) => (
                            <Select.Item key={item.id} value={item.id} className="premium-select-item">
                              <Select.ItemText>{item.name}</Select.ItemText>
                              <Select.ItemIndicator className="premium-select-indicator">
                                <Check className="w-4 h-4 text-slate-800" />
                              </Select.ItemIndicator>
                            </Select.Item>
                          ))}
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
                {errors.redirect_id && touched.redirect_id && (
                  <div className="text-xs text-red-500 flex items-center gap-1.5 mt-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.redirect_id}
                  </div>
                )}
              </div>

              {/* Actions Submit / Cancel */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 transition cursor-pointer"
                >
                  {t("Cancel")}
                </button>
                <FormBtn loading={loading} />
              </div>

              {/* Attachment Select Modal */}
              <AttachmentModal
                modal={modalOpen}
                name="banner_image_id"
                multiple={false}
                values={values}
                setModal={setModalOpen}
                setFieldValue={setFieldValue}
                setSelectedImage={setSelectedImage}
                showImage={false}
                redirectToTabs={true}
              />

            </Form>
          );
        }}
      </Formik>
    </>
  );
};

export default OfferBannerForm;
