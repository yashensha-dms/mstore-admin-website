"use client";
import React, { useContext, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import ShowModal from "../../Elements/Alerts&Modals/Modal";
import Btn from "../../Elements/Buttons/Btn";
import request from "../../Utils/AxiosUtils";
import { pearlXpProductUpdate } from "../../Utils/AxiosUtils/API";
import { ToastNotification } from "../../Utils/CustomFunctions/ToastNotification";
import I18NextContext from "@/Helper/I18NextContext";
import { useTranslation } from "@/app/i18n/client";

const fmt = (v) => (v === null || v === undefined || v === "" ? "-" : v);

const PearlXpReviewModal = ({ open, setModal, updateId, onSuccess }) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { i18Lang } = useContext(I18NextContext);
  const { t } = useTranslation(i18Lang, "common");

  const [form, setForm] = useState({ mrp: "", price: "", stock: "" });
  const [rejectReason, setRejectReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const { data: detail, isLoading } = useQuery(
    [pearlXpProductUpdate, updateId],
    () => request({ url: `${pearlXpProductUpdate}/${updateId}` }, router),
    {
      enabled: !!open && !!updateId,
      refetchOnWindowFocus: false,
      select: (res) => res?.data,
    }
  );

  const update = detail?.data || detail;
  const current = detail?.current_product;

  useEffect(() => {
    if (update) {
      setForm({
        mrp: update.new_mrp ?? "",
        price: update.new_price ?? "",
        stock: update.new_stock ?? "",
      });
      setRejectReason("");
    }
  }, [update?.id]);

  const close = () => setModal(false);

  const invalidate = () => {
    queryClient.invalidateQueries([pearlXpProductUpdate]);
    onSuccess && onSuccess();
  };

  const parsePayload = () => {
    const payload = {};
    if (form.mrp !== "" && form.mrp !== null) payload.mrp = Number(form.mrp);
    if (form.price !== "" && form.price !== null) payload.price = Number(form.price);
    if (form.stock !== "" && form.stock !== null) payload.stock = Number(form.stock);
    return payload;
  };

  const handleSave = async () => {
    const payload = parsePayload();
    if (Object.keys(payload).length === 0) {
      ToastNotification("error", t("ProvideAtLeastOneValue"));
      return;
    }
    setSaving(true);
    const res = await request({ url: `${pearlXpProductUpdate}/${updateId}`, method: "put", data: payload }, router);
    setSaving(false);
    if (res?.status === 200) {
      ToastNotification("success", t("PendingUpdateRevised"));
      queryClient.invalidateQueries([pearlXpProductUpdate, updateId]);
      invalidate();
    } else {
      ToastNotification(
        "error",
        res?.response?.data?.message ||
          (res?.response?.data?.errors ? Object.values(res.response.data.errors).flat()[0] : null) ||
          t("SomethingWentWrong")
      );
    }
  };

  const handleApprove = async () => {
    setApproving(true);
    const res = await request({ url: `${pearlXpProductUpdate}/${updateId}/approve`, method: "post" }, router);
    setApproving(false);
    if (res?.status === 200) {
      ToastNotification("success", t("UpdateAppliedToProduct"));
      invalidate();
      close();
    } else {
      ToastNotification("error", res?.response?.data?.message || t("SomethingWentWrong"));
    }
  };

  const handleSaveAndApprove = async () => {
    const payload = parsePayload();
    if (Object.keys(payload).length === 0) {
      ToastNotification("error", t("ProvideAtLeastOneValue"));
      return;
    }
    setApproving(true);
    const saveRes = await request({ url: `${pearlXpProductUpdate}/${updateId}`, method: "put", data: payload }, router);
    if (saveRes?.status !== 200) {
      setApproving(false);
      ToastNotification("error", saveRes?.response?.data?.message || t("SomethingWentWrong"));
      return;
    }
    const res = await request({ url: `${pearlXpProductUpdate}/${updateId}/approve`, method: "post" }, router);
    setApproving(false);
    if (res?.status === 200) {
      ToastNotification("success", t("UpdateAppliedToProduct"));
      invalidate();
      close();
    } else {
      ToastNotification("error", res?.response?.data?.message || t("SomethingWentWrong"));
    }
  };

  const handleReject = async () => {
    setRejecting(true);
    const res = await request(
      { url: `${pearlXpProductUpdate}/${updateId}/reject`, method: "post", data: rejectReason ? { reason: rejectReason } : {} },
      router
    );
    setRejecting(false);
    if (res?.status === 200) {
      ToastNotification("success", t("UpdateRejected"));
      invalidate();
      close();
    } else {
      ToastNotification("error", res?.response?.data?.message || t("SomethingWentWrong"));
    }
  };

  const rows = [
    { key: "mrp", label: t("MRP"), oldVal: update?.old_mrp, liveVal: current?.mrp, type: "number", step: "0.01" },
    { key: "price", label: t("Price"), oldVal: update?.old_price, liveVal: current?.price, type: "number", step: "0.01" },
    { key: "stock", label: t("StockQuantity"), oldVal: update?.old_stock, liveVal: current?.stock, type: "number", step: "1" },
  ];

  const isPending = update?.status === "pending";

  return (
    <ShowModal open={open} setModal={setModal} title="ReviewPearlXpUpdate" modalAttr={{ className: "modal-lg" }}>
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-slate-500">{t("Loading")}...</span>
        </div>
      ) : !update ? (
        <p className="text-center text-slate-500 py-6">{t("NoDataFound")}</p>
      ) : (
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="font-semibold text-slate-800">{update?.product?.name || `${t("Product")} #${update?.product_id}`}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600">
              {t("Barcode")}: {update?.barcode || "-"}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold status-${update?.status}`}>
              {update?.status}
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase">
                  <th className="text-left p-3 font-semibold">{t("Field")}</th>
                  <th className="text-left p-3 font-semibold">{t("OldValue")}</th>
                  <th className="text-left p-3 font-semibold">{t("PearlXPValue")}</th>
                  <th className="text-left p-3 font-semibold">{t("EditValue")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const stagedKey = row.key === "mrp" ? "new_mrp" : row.key === "price" ? "new_price" : "new_stock";
                  const staged = update?.[stagedKey];
                  const changed = staged !== null && staged !== undefined;
                  return (
                    <tr key={row.key} className="border-t border-slate-100">
                      <td className="p-3 font-medium text-slate-700">{row.label}</td>
                      <td className="p-3 text-slate-500">{fmt(row.oldVal ?? row.liveVal)}</td>
                      <td className="p-3">
                        {changed ? (
                          <span className="font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-0.5">
                            {staged}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="p-3">
                        <input
                          type={row.type}
                          step={row.step}
                          min="0"
                          disabled={!isPending}
                          value={form[row.key]}
                          onChange={(e) => setForm((p) => ({ ...p, [row.key]: e.target.value }))}
                          placeholder="-"
                          className="w-32 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-slate-500 disabled:bg-slate-50 disabled:text-slate-400"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {!isPending && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3">
              {t("OnlyPendingCanBeEdited")} ({update?.status})
            </p>
          )}

          {isPending && (
            <>
              <div className="flex flex-wrap gap-2 mt-4">
                <Btn title="SaveChanges" className="btn-outline" loading={Number(saving)} disabled={saving || approving} onClick={handleSave} />
                <Btn title="SaveAndApprove" className="btn-theme" loading={Number(approving)} disabled={saving || approving} onClick={handleSaveAndApprove} />
                <Btn title="Approve" className="btn-theme" disabled={saving || approving} onClick={handleApprove} />
              </div>
              <div className="mt-4 border-t pt-3">
                <label className="text-xs font-semibold text-slate-500 uppercase">{t("RejectWithReason")}</label>
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder={t("RejectReasonPlaceholder")}
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-500"
                  />
                  <Btn title="Reject" className="btn-outline" loading={Number(rejecting)} disabled={rejecting} onClick={handleReject} />
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </ShowModal>
  );
};

export default PearlXpReviewModal;
