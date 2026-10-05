"use client";
import React, { useContext, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "reactstrap";
import { RiSearchLine, RiCloseLine, RiPencilLine, RiCheckLine, RiCloseFill } from "react-icons/ri";
import ShowModal from "../../Elements/Alerts&Modals/Modal";
import Btn from "../../Elements/Buttons/Btn";
import request from "../../Utils/AxiosUtils";
import { pearlXpProductUpdate } from "../../Utils/AxiosUtils/API";
import { ToastNotification } from "../../Utils/CustomFunctions/ToastNotification";
import NoDataFound from "../CommonComponent/NoDataFound";
import PearlXpReviewModal from "./PearlXpReviewModal";
import I18NextContext from "@/Helper/I18NextContext";
import { useTranslation } from "@/app/i18n/client";

const STATUS_TABS = ["pending", "approved", "rejected", "failed", "all"];

const diffCell = (oldVal, newVal) => {
  const dash = (v) => (v === null || v === undefined || v === "" ? "-" : v);
  if (newVal === null || newVal === undefined) return <span className="text-slate-400">-</span>;
  return (
    <span>
      <span className="text-slate-400 line-through mr-1.5">{dash(oldVal)}</span>
      <span className="font-semibold text-emerald-700">{newVal}</span>
    </span>
  );
};

const PearlXpUpdateTable = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { i18Lang } = useContext(I18NextContext);
  const { t } = useTranslation(i18Lang, "common");

  const [status, setStatus] = useState("pending");
  const [barcode, setBarcode] = useState("");
  const [appliedBarcode, setAppliedBarcode] = useState("");
  const [page, setPage] = useState(1);
  const [paginate, setPaginate] = useState(15);

  const [reviewId, setReviewId] = useState(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [confirmApproveId, setConfirmApproveId] = useState(null);
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [acting, setActing] = useState(false);

  const { data, isLoading, refetch } = useQuery(
    [pearlXpProductUpdate, status, appliedBarcode, page, paginate],
    () =>
      request(
        {
          url: pearlXpProductUpdate,
          method: "get",
          params: { status, barcode: appliedBarcode || undefined, page, paginate },
        },
        router
      ),
    { refetchOnWindowFocus: false, keepPreviousData: true, select: (res) => res?.data }
  );

  const list = data?.data || [];
  const total = data?.total || 0;
  const lastPage = data?.last_page || 1;

  const invalidate = () => {
    queryClient.invalidateQueries([pearlXpProductUpdate]);
    refetch();
  };

  const openReview = (id) => {
    setReviewId(id);
    setReviewOpen(true);
  };

  const handleApprove = async (id) => {
    setActing(true);
    const res = await request({ url: `${pearlXpProductUpdate}/${id}/approve`, method: "post" }, router);
    setActing(false);
    setConfirmApproveId(null);
    if (res?.status === 200) {
      ToastNotification("success", t("UpdateAppliedToProduct"));
      invalidate();
    } else {
      ToastNotification("error", res?.response?.data?.message || t("SomethingWentWrong"));
    }
  };

  const handleReject = async () => {
    if (!rejectId) return;
    setActing(true);
    const res = await request(
      { url: `${pearlXpProductUpdate}/${rejectId}/reject`, method: "post", data: rejectReason ? { reason: rejectReason } : {} },
      router
    );
    setActing(false);
    if (res?.status === 200) {
      ToastNotification("success", t("UpdateRejected"));
      setRejectId(null);
      setRejectReason("");
      invalidate();
    } else {
      ToastNotification("error", res?.response?.data?.message || t("SomethingWentWrong"));
    }
  };

  return (
    <>
      <Card>
        <CardBody>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
            <div>
              <h4 className="font-bold text-slate-800 mb-0">{t("PearlXPUpdates")}</h4>
              <p className="text-sm text-slate-500 mb-0">{t("PearlXPUpdatesSubtitle")}</p>
            </div>
            <div className="relative w-full lg:w-72">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <RiSearchLine className="w-4 h-4 text-slate-400" />
              </span>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setAppliedBarcode(barcode.trim());
                    setPage(1);
                  }
                }}
                placeholder={`${t("Search")} ${t("Barcode")}...`}
                className="w-full pl-9 pr-8 h-[38px] border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-500"
              />
              {barcode && (
                <button
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                  onClick={() => {
                    setBarcode("");
                    setAppliedBarcode("");
                    setPage(1);
                  }}
                >
                  <RiCloseLine className="w-4 h-4 text-slate-400" />
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {STATUS_TABS.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setStatus(s);
                  setPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition ${
                  status === s
                    ? "bg-slate-800 border-slate-800 text-white"
                    : "border-slate-200 text-slate-500 hover:bg-slate-50"
                }`}
              >
                {t(s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1))}
              </button>
            ))}
            <button
              onClick={() => {
                setBarcode("");
                setAppliedBarcode("");
                setPage(1);
                refetch();
              }}
              className="px-3 py-1.5 text-xs font-semibold rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 ml-auto"
            >
              {t("Refresh")}
            </button>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-slate-500">{t("Loading")}...</span>
            </div>
          ) : list.length === 0 ? (
            <div className="py-16">
              <NoDataFound noImage={true} />
              <p className="text-center text-sm text-slate-400 mt-2">{t("NoPendingPearlXpUpdates")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase text-left">
                    <th className="p-3 font-semibold">{t("Product")}</th>
                    <th className="p-3 font-semibold">{t("Barcode")}</th>
                    <th className="p-3 font-semibold">{t("MRP")}</th>
                    <th className="p-3 font-semibold">{t("Price")}</th>
                    <th className="p-3 font-semibold">{t("Stock")}</th>
                    <th className="p-3 font-semibold">{t("Status")}</th>
                    <th className="p-3 font-semibold">{t("ReceivedAt")}</th>
                    <th className="p-3 font-semibold text-right">{t("Action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((item) => (
                    <tr key={item.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                      <td className="p-3 font-medium text-slate-800">{item?.product?.name || `#${item.product_id}`}</td>
                      <td className="p-3 text-slate-500 font-mono text-xs">{item.barcode}</td>
                      <td className="p-3">{diffCell(item.old_mrp, item.new_mrp)}</td>
                      <td className="p-3">{diffCell(item.old_price, item.new_price)}</td>
                      <td className="p-3">{diffCell(item.old_stock, item.new_stock)}</td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold status-${item.status}`}>{item.status}</span>
                      </td>
                      <td className="p-3 text-xs text-slate-500">
                        {item.created_at ? new Date(item.created_at).toLocaleString() : "-"}
                      </td>
                      <td className="p-3">
                        {item.status === "pending" ? (
                          <div className="flex justify-end gap-1.5">
                            <button
                              title={t("ReviewAndAccept")}
                              onClick={() => openReview(item.id)}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition"
                            >
                              <RiPencilLine className="w-3.5 h-3.5" /> {t("Review")}
                            </button>
                            <button
                              title={t("Accept")}
                              onClick={() => setConfirmApproveId(item.id)}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition"
                            >
                              <RiCheckLine className="w-3.5 h-3.5" /> {t("Accept")}
                            </button>
                            <button
                              title={t("Reject")}
                              onClick={() => {
                                setRejectId(item.id);
                                setRejectReason("");
                              }}
                              className="p-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition"
                            >
                              <RiCloseFill className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end">
                            <button
                              onClick={() => openReview(item.id)}
                              className="text-xs font-semibold text-slate-500 hover:text-slate-800 underline"
                            >
                              {t("View")}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!isLoading && list.length > 0 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-slate-500">
                {t("Showing")} {Math.min((page - 1) * paginate + 1, total)} {t("to")} {Math.min(page * paginate, total)} {t("of")} {total}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm disabled:opacity-40"
                >
                  {t("Previous")}
                </button>
                <span className="text-sm text-slate-500">
                  {page} / {lastPage}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(p + 1, lastPage))}
                  disabled={page === lastPage}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm disabled:opacity-40"
                >
                  {t("Next")}
                </button>
                <select
                  value={paginate}
                  onChange={(e) => {
                    setPaginate(Number(e.target.value));
                    setPage(1);
                  }}
                  className="border border-slate-200 rounded-lg text-sm px-2 py-1.5"
                >
                  {[15, 30, 50, 100].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      <PearlXpReviewModal open={reviewOpen} setModal={setReviewOpen} updateId={reviewId} onSuccess={invalidate} />

      <ShowModal
        open={!!confirmApproveId}
        setModal={() => setConfirmApproveId(null)}
        title="Accept"
        buttons={
          <>
            <Btn title="No" className="btn--no" onClick={() => setConfirmApproveId(null)} />
            <Btn title="Yes" className="btn-theme" loading={Number(acting)} onClick={() => handleApprove(confirmApproveId)} />
          </>
        }
      >
        <div className="remove-box">
          <RiCheckLine className="icon-box wo-bg" style={{ fontSize: 32 }} />
          <h2>{t("AcceptUpdate")}?</h2>
          <p>{t("AcceptUpdateConfirm")}</p>
        </div>
      </ShowModal>

      <ShowModal open={!!rejectId} setModal={() => setRejectId(null)} title="Reject">
        <input
          type="text"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder={t("RejectReasonPlaceholder")}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-500"
        />
        <div className="flex items-center justify-end gap-3 mt-4">
          <Btn title="No" className="btn--no" onClick={() => setRejectId(null)} />
          <Btn title="Reject" className="btn-theme" loading={Number(acting)} onClick={handleReject} />
        </div>
      </ShowModal>
    </>
  );
};

export default PearlXpUpdateTable;
