"use client";
import React, { useContext } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { RiAlertLine } from "react-icons/ri";
import request from "../../Utils/AxiosUtils";
import { pearlXpProductUpdate } from "../../Utils/AxiosUtils/API";
import I18NextContext from "@/Helper/I18NextContext";
import { useTranslation } from "@/app/i18n/client";
import AccountContext from "@/Helper/AccountContext";

const PearlXpPendingBanner = () => {
  const router = useRouter();
  const { i18Lang } = useContext(I18NextContext);
  const { t } = useTranslation(i18Lang, "common");
  const { activeStore } = useContext(AccountContext);

  // Pearl XP updates belong strictly to the Grocery store
  const isGrocery =
    !activeStore?.id ||
    Number(activeStore.id) === 3 ||
    (activeStore.store_name || "").toLowerCase().includes("grocer");

  const { data: total } = useQuery(
    [pearlXpProductUpdate, "pending-count", isGrocery],
    () => isGrocery ? request({ url: pearlXpProductUpdate, method: "get", params: { status: "pending", paginate: 1 } }, router) : Promise.resolve({ data: { total: 0 } }),
    { enabled: isGrocery, refetchOnWindowFocus: false, refetchInterval: 60000, select: (res) => res?.data?.total || 0 }
  );

  if (!isGrocery || !total) return null;

  return (
    <div
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 mb-4"
      role="alert"
    >
      <div className="flex items-center gap-2.5">
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 border border-amber-200">
          <RiAlertLine className="w-4 h-4 text-amber-600" />
        </span>
        <p className="text-sm text-amber-800 mb-0">
          <strong>{total}</strong> {t("PendingPearlXpUpdates")}
        </p>
      </div>
      <Link
        href={`/${i18Lang}/pearl-xp-updates`}
        className="text-xs font-semibold px-3 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition text-center"
      >
        {t("ReviewAndAccept")} →
      </Link>
    </div>
  );
};

export default PearlXpPendingBanner;
