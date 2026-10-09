import { useQuery } from "@tanstack/react-query";
import { Form, Formik } from "formik";
import React, { useContext, useEffect, useState } from "react";
import { AlertCircle, Image as ImageIcon, X } from "lucide-react";
import FormBtn from "../../Elements/Buttons/FormBtn";
import request from "../../Utils/AxiosUtils";
import { pushBroadcast } from "../../Utils/AxiosUtils/API";
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
              {!values.image_id && (
                <input
                  name="image_url"
                  type="text"
                  value={values.image_url}
                  onChange={(e) => setFieldValue("image_url", e.target.value)}
                  placeholder={t("EnterImageUrl")}
                  className={inputCls(false)}
                />
              )}
            </div>

            {/* Tap action */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700">{t("TapAction")}</label>
                <select value={values.redirect_type} onChange={(e) => setFieldValue("redirect_type", e.target.value)} className={inputCls(false)}>
                  <option value="">—</option>
                  <option value="product">Product</option>
                  <option value="category">Category</option>
                  <option value="url">URL</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700">{t("TapTarget")}</label>
                <input
                  name="redirect_target"
                  type="text"
                  value={values.redirect_target}
                  onChange={(e) => setFieldValue("redirect_target", e.target.value)}
                  placeholder={t("EnterTapTarget")}
                  className={inputCls(false)}
                />
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
  );
};

export default PushBroadcastForm;
