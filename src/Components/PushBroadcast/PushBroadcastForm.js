import { useQuery } from "@tanstack/react-query";
import { Form, Formik } from "formik";
import React, { useContext, useEffect, useMemo, useState } from "react";
import { AlertCircle, Image as ImageIcon, X, ChevronDown, Check, Search } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import FormBtn from "../../Elements/Buttons/FormBtn";
import request from "../../Utils/AxiosUtils";
import { pushBroadcast, product, Category } from "../../Utils/AxiosUtils/API";
import Loader from "../CommonComponent/Loader";
import AttachmentModal from "../Attachment/AttachmentModal";
import I18NextContext from "@/Helper/I18NextContext";
import { useTranslation } from "@/app/i18n/client";
import * as Yup from "yup";
import Image from "next/image";
import { useRouter } from "next/navigation";

const toInputDateTime = (val) => {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d)) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const toBackendDateTime = (val) => {
  if (!val) return null;
  return val.replace("T", ":00").length === 16 ? val.replace("T", " ") + ":00" : val.replace("T", " ");
};

const toInputTime = (val) => {
  if (!val) return "";
  return String(val).slice(0, 5);
};

const SCHEDULE_TYPES = ["immediate", "once", "daily", "interval"];

const PushBroadcastForm = ({ mutate, updateId, loading }) => {
  const router = useRouter();
  const { i18Lang } = useContext(I18NextContext);
  const { t } = useTranslation(i18Lang, "common");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState([]);
  const [targetSearch, setTargetSearch] = useState("");
  const [debouncedProductSearch, setDebouncedProductSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Debounce product search for backend API query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedProductSearch(targetSearch);
    }, 350);
    return () => clearTimeout(timer);
  }, [targetSearch]);

  // Fetch product list (dynamic search with paginate: 100)
  const { data: productData, isLoading: isProductsLoading } = useQuery(
    [product, debouncedProductSearch],
    () =>
      request({
        url: product,
        params: {
          status: 1,
          paginate: 100,
          search: debouncedProductSearch || undefined,
        },
      }),
    {
      refetchOnWindowFocus: false,
      select: (res) =>
        (res?.data?.data || []).map((p) => ({
          id: String(p.id),
          name: p.name,
        })),
    }
  );

  // Fetch category list (supports nested data structures)
  const { data: categoryData, isLoading: isCategoriesLoading } = useQuery(
    [Category],
    () => request({ url: Category, params: { type: "product", status: 1 } }),
    {
      refetchOnWindowFocus: false,
      select: (res) => {
        const rawList = Array.isArray(res?.data?.data)
          ? res.data.data
          : Array.isArray(res?.data)
          ? res.data
          : [];
        let result = [];
        const recurse = (list, parentName = "") => {
          if (!Array.isArray(list)) return;
          list.forEach((item) => {
            if (!item) return;
            const displayName = parentName ? `${parentName} → ${item.name}` : item.name;
            result.push({ id: String(item.id), name: displayName });
            const subs = item.subcategories || item.child || item.children;
            if (Array.isArray(subs) && subs.length > 0) {
              recurse(subs, displayName);
            }
          });
        };
        recurse(rawList);
        return result;
      },
    }
  );

  const { data: oldData, isLoading, refetch } = useQuery(
    [updateId],
    () => request({ url: pushBroadcast + "/" + updateId }),
    { refetchOnMount: false, enabled: false }
  );

  useEffect(() => {
    updateId && refetch();
  }, [updateId]);

  useEffect(() => {
    if (oldData?.data?.image) {
      setSelectedImage([oldData.data.image]);
    }
  }, [oldData]);

  if (updateId && isLoading) return <Loader />;

  const old = oldData?.data;

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
        .premium-select-trigger:focus, .premium-select-trigger:focus-visible {
          border-color: #0da89b;
          box-shadow: 0 0 0 2px rgba(13, 168, 155, 0.1);
        }
        .target-dropdown-content {
          width: var(--radix-dropdown-menu-trigger-width) !important;
          min-width: 260px;
          max-width: 95vw;
          background-color: white;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          box-shadow: 0px 10px 38px -10px rgba(22, 23, 24, 0.2), 0px 10px 20px -15px rgba(22, 23, 24, 0.1);
          z-index: 1000;
          overflow: hidden;
        }
        .target-dropdown-item {
          font-size: 13px;
          color: #334155;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          user-select: none;
          outline: none;
          cursor: pointer;
          transition: background-color 100ms ease;
        }
        .target-dropdown-item:hover, .target-dropdown-item:focus {
          background-color: #f1f5f9;
          color: #0f172a;
        }
      `}} />

      <Formik
      enableReinitialize
      initialValues={{
        title: updateId ? old?.title || "" : "",
        body: updateId ? old?.body || "" : "",
        image_id: updateId ? old?.image_id || "" : "",
        image: updateId ? old?.image || null : null,
        image_url: updateId ? old?.image_url || "" : "",
        redirect_type: updateId ? old?.redirect_type || "" : "",
        redirect_target: updateId ? old?.redirect_target || "" : "",
        schedule_type: updateId ? old?.schedule_type || "immediate" : "immediate",
        scheduled_at: updateId ? toInputDateTime(old?.scheduled_at) : "",
        daily_time: updateId ? toInputTime(old?.daily_time) : "",
        interval_minutes: updateId ? old?.interval_minutes || "" : "",
        starts_at: updateId ? toInputDateTime(old?.starts_at) : "",
        ends_at: updateId ? toInputDateTime(old?.ends_at) : "",
      }}
      validationSchema={Yup.object({
        title: Yup.string().max(255).required("Title is required"),
        body: Yup.string().max(500).required("Subtitle / message is required"),
        image_id: Yup.mixed().nullable(),
        image_url: Yup.string().max(1000).nullable(),
        schedule_type: Yup.string().oneOf(SCHEDULE_TYPES).required(),
        scheduled_at: Yup.string().when("schedule_type", {
          is: "once",
          then: (s) => s.required("Date & time is required for one-time send"),
        }),
        daily_time: Yup.string().when("schedule_type", {
          is: "daily",
          then: (s) => s.required("Daily time is required"),
        }),
        interval_minutes: Yup.number().when("schedule_type", {
          is: "interval",
          then: (s) => s.typeError("Minutes must be a number").min(5, "Minimum 5 minutes").required("Interval is required"),
        }),
      })}
      onSubmit={(values) => {
        const payload = {
          title: values.title,
          body: values.body,
          image_id: values.image_id ? Number(values.image_id) : null,
          image_url: !values.image_id && values.image_url ? values.image_url : null,
          redirect_type: values.redirect_type || null,
          redirect_target: values.redirect_target || null,
          schedule_type: values.schedule_type,
          scheduled_at: values.schedule_type === "once" ? toBackendDateTime(values.scheduled_at) : null,
          daily_time: values.schedule_type === "daily" ? (values.daily_time?.length === 5 ? values.daily_time + ":00" : values.daily_time) : null,
          interval_minutes: values.schedule_type === "interval" ? Number(values.interval_minutes) : null,
          starts_at: values.starts_at && values.schedule_type !== "immediate" && values.schedule_type !== "once" ? toBackendDateTime(values.starts_at) : null,
          ends_at: values.ends_at && values.schedule_type !== "immediate" && values.schedule_type !== "once" ? toBackendDateTime(values.ends_at) : null,
        };
        mutate(payload);
      }}
    >
      {({ values, setFieldValue, errors, touched }) => {
        const handleRemoveImage = () => {
          setFieldValue("image_id", "");
          setFieldValue("image", null);
          setSelectedImage([]);
        };

        const inputCls = (bad) =>
          `w-full px-4 py-2.5 border rounded-lg text-sm transition focus:outline-none focus:ring-2 focus:ring-[#0da89b]/10 ${
            bad ? "border-red-400" : "border-slate-300 focus:border-[#0da89b]"
          }`;

        return (
          <Form className="space-y-6 max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-slate-100">
            {/* Title */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700">
                {t("NotificationTitle")} <span className="text-red-500">*</span>
              </label>
              <input
                name="title"
                type="text"
                maxLength={255}
                value={values.title}
                onChange={(e) => setFieldValue("title", e.target.value)}
                placeholder={t("EnterNotificationTitle")}
                className={inputCls(errors.title && touched.title)}
              />
              {errors.title && touched.title && (
                <div className="text-xs text-red-500 flex items-center gap-1.5 mt-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.title}
                </div>
              )}
            </div>

            {/* Body */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700">
                {t("NotificationBody")} <span className="text-red-500">*</span>
              </label>
              <textarea
                name="body"
                rows={3}
                maxLength={500}
                value={values.body}
                onChange={(e) => setFieldValue("body", e.target.value)}
                placeholder={t("EnterNotificationBody")}
                className={inputCls(errors.body && touched.body)}
              />
              <div className="text-xs text-slate-400 text-right">{values.body?.length || 0}/500</div>
              {errors.body && touched.body && (
                <div className="text-xs text-red-500 flex items-center gap-1.5 mt-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.body}
                </div>
              )}
            </div>

            {/* Image */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700">{t("NotificationImage")}</label>
              {values.image ? (
                <div className="relative w-full h-48 rounded-lg overflow-hidden group border border-slate-200 bg-slate-50">
                  <Image src={values.image?.original_url} alt="Notification preview" fill className="object-cover" unoptimized />
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setModalOpen(true)}
                      className="px-4 py-2 bg-white text-slate-800 text-xs font-semibold rounded-md shadow hover:bg-slate-50 transition"
                    >
                      {t("Change")}
                    </button>
                    <button type="button" onClick={handleRemoveImage} className="p-2 bg-red-600 text-white rounded-md shadow hover:bg-red-700 transition">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => setModalOpen(true)}
                  className="w-full h-40 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer transition bg-slate-50 hover:bg-slate-100/50 border-slate-300 hover:border-[#0da89b]"
                >
                  <ImageIcon className="w-8 h-8 text-slate-400" />
                  <span className="text-sm font-medium text-slate-600">{t("SelectImageFromLibrary")}</span>
                  <span className="text-xs text-slate-400">{t("ClickToBrowse")}</span>
                </div>
              )}
            </div>

                                    {/* Tap action */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700">{t("TapAction")}</label>
                <select
                  value={values.redirect_type}
                  onChange={(e) => {
                    setFieldValue("redirect_type", e.target.value);
                    setFieldValue("redirect_target", "");
                    setTargetSearch("");
                  }}
                  className={inputCls(false)}
                >
                  <option value="">None</option>
                  <option value="product">Product</option>
                  <option value="category">Category</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700">{t("TapTarget")}</label>
                {values.redirect_type === "product" || values.redirect_type === "category" ? (
                  <DropdownMenu.Root
                    open={dropdownOpen}
                    onOpenChange={(open) => {
                      setDropdownOpen(open);
                      if (!open) setTargetSearch("");
                    }}
                  >
                    <DropdownMenu.Trigger asChild>
                      <button type="button" className="premium-select-trigger text-left">
                        <span className="truncate">
                          {(() => {
                            if (!values.redirect_target) {
                              return values.redirect_type === "product"
                                ? "Select Product..."
                                : "Select Category...";
                            }
                            const items = values.redirect_type === "product" ? productData : categoryData;
                            const found = items?.find((item) => String(item.id) === String(values.redirect_target));
                            return found ? found.name : `#${values.redirect_target}`;
                          })()}
                        </span>
                        <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0 ml-2" />
                      </button>
                    </DropdownMenu.Trigger>

                    <DropdownMenu.Portal>
                      <DropdownMenu.Content
                        position="popper"
                        sideOffset={4}
                        align="start"
                        className="target-dropdown-content"
                      >
                        <div
                          className="p-2 border-b border-slate-100 sticky top-0 bg-white z-10 flex items-center gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <input
                            type="text"
                            placeholder={t("Search") + "..."}
                            value={targetSearch}
                            onChange={(e) => setTargetSearch(e.target.value)}
                            onKeyDown={(e) => e.stopPropagation()}
                            autoFocus
                            className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#0da89b]"
                          />
                          {targetSearch && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setTargetSearch("");
                              }}
                              className="text-slate-400 hover:text-slate-600 focus:outline-none"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="max-h-[260px] overflow-y-auto p-1.5">
                          {values.redirect_type === "product" && isProductsLoading ? (
                            <div className="p-3 text-center text-xs text-slate-400">Loading products...</div>
                          ) : values.redirect_type === "category" && isCategoriesLoading ? (
                            <div className="p-3 text-center text-xs text-slate-400">Loading categories...</div>
                          ) : (() => {
                            const list = (values.redirect_type === "product" ? productData : categoryData) || [];
                            const filtered = list.filter((item) =>
                              !targetSearch || item.name.toLowerCase().includes(targetSearch.toLowerCase())
                            );

                            if (filtered.length === 0) {
                              return <div className="p-3 text-center text-xs text-slate-400">No results found</div>;
                            }

                            return filtered.slice(0, 100).map((item) => {
                              const isSelected = String(values.redirect_target) === String(item.id);
                              return (
                                <DropdownMenu.Item
                                  key={item.id}
                                  className="target-dropdown-item"
                                  onSelect={() => {
                                    setFieldValue("redirect_target", item.id);
                                    setDropdownOpen(false);
                                  }}
                                >
                                  <span className="truncate pr-2">{item.name}</span>
                                  {isSelected && <Check className="w-4 h-4 text-[#0da89b] flex-shrink-0" />}
                                </DropdownMenu.Item>
                              );
                            });
                          })()}
                        </div>
                      </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                  </DropdownMenu.Root>
                ) : (
                  <input
                    name="redirect_target"
                    type="text"
                    disabled
                    value=""
                    placeholder="Select Product or Category above"
                    className="w-full px-4 py-2.5 border rounded-lg text-sm bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed"
                  />
                )}
              </div>
            </div>

            {/* Schedule type */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700">
                {t("ScheduleType")} <span className="text-red-500">*</span>
              </label>
              <select value={values.schedule_type} onChange={(e) => setFieldValue("schedule_type", e.target.value)} className={inputCls(false)}>
                <option value="immediate">{t("SendImmediately")}</option>
                <option value="once">{t("SendOnce")}</option>
                <option value="daily">{t("RepeatDaily")}</option>
                <option value="interval">{t("RepeatInterval")}</option>
              </select>
              {values.schedule_type === "immediate" && (
                <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">{t("ImmediateSendNote")}</p>
              )}
            </div>

            {values.schedule_type === "once" && (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700">
                  {t("ScheduledAt")} <span className="text-red-500">*</span>
                </label>
                <input type="datetime-local" value={values.scheduled_at} onChange={(e) => setFieldValue("scheduled_at", e.target.value)} className={inputCls(errors.scheduled_at)} />
                {errors.scheduled_at && (
                  <div className="text-xs text-red-500 flex items-center gap-1.5 mt-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {errors.scheduled_at}
                  </div>
                )}
              </div>
            )}

            {values.schedule_type === "daily" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-700">
                    {t("DailyTime")} <span className="text-red-500">*</span>
                  </label>
                  <input type="time" value={values.daily_time} onChange={(e) => setFieldValue("daily_time", e.target.value)} className={inputCls(errors.daily_time)} />
                  {errors.daily_time && (
                    <div className="text-xs text-red-500 flex items-center gap-1.5 mt-1">
                      <AlertCircle className="w-3.5 h-3.5" /> {errors.daily_time}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-700">{t("StartsAt")}</label>
                  <input type="datetime-local" value={values.starts_at} onChange={(e) => setFieldValue("starts_at", e.target.value)} className={inputCls(false)} />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-700">{t("EndsAt")}</label>
                  <input type="datetime-local" value={values.ends_at} onChange={(e) => setFieldValue("ends_at", e.target.value)} className={inputCls(false)} />
                </div>
              </div>
            )}

            {values.schedule_type === "interval" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-700">
                    {t("IntervalMinutes")} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={5}
                    value={values.interval_minutes}
                    onChange={(e) => setFieldValue("interval_minutes", e.target.value)}
                    placeholder="360"
                    className={inputCls(errors.interval_minutes)}
                  />
                  {errors.interval_minutes && (
                    <div className="text-xs text-red-500 flex items-center gap-1.5 mt-1">
                      <AlertCircle className="w-3.5 h-3.5" /> {errors.interval_minutes}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-700">{t("StartsAt")}</label>
                  <input type="datetime-local" value={values.starts_at} onChange={(e) => setFieldValue("starts_at", e.target.value)} className={inputCls(false)} />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-700">{t("EndsAt")}</label>
                  <input type="datetime-local" value={values.ends_at} onChange={(e) => setFieldValue("ends_at", e.target.value)} className={inputCls(false)} />
                </div>
              </div>
            )}

            {/* Actions */}
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

            <AttachmentModal
              modal={modalOpen}
              name="image_id"
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

export default PushBroadcastForm;
