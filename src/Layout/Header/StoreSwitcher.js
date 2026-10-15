"use client";
import React, { useContext, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ArrowRightLeft, Check, Store } from "lucide-react";
import { toast } from "sonner";

import AccountContext from "../../Helper/AccountContext";
import I18NextContext from "@/Helper/I18NextContext";
import { useTranslation } from "@/app/i18n/client";
import request from "../../Utils/AxiosUtils";
import { store } from "../../Utils/AxiosUtils/API";
import { getStoreTheme } from "../../Utils/StoreTheme";

/**
 * StoreSwitcher — "Switch Store" section inside the ProfileNav dropdown.
 *
 * Frontend contract:
 * - Lists "All Stores" option followed by stores from `accountData.stores`
 *   or GET `store`. Each item: { id, store_name, store_logo? }.
 * - On select: persists the active store in AccountContext + localStorage + cookie,
 *   which automatically injects `store_id` into query params and `X-Store-Id`
 *   header for all scoped API calls (see Utils/AxiosUtils), then reloads page.
 * - Selecting "All Stores" clears `activeStore` so unscoped data across all stores is shown.
 */
const TARGET_STORES = [
  { id: 3, store_name: "Grocery", slug: "grocery", icon: "🛒" },
  { id: 4, store_name: "Food Zone", slug: "food-zone", icon: "🍽️" },
  { id: 5, store_name: "Jewellery", slug: "jewellery", icon: "💎" },
];

const normalizeStores = (accountData, fetched) => {
  const allList = [
    ...(Array.isArray(fetched) ? fetched : []),
    ...(Array.isArray(accountData?.stores) ? accountData.stores : []),
  ];

  return TARGET_STORES.map((target) => {
    const found = allList.find((s) => {
      const name = (s.store_name || s.name || "").toLowerCase().trim();
      const sId = Number(s.id);
      if (target.id === 3 && (sId === 3 || name.includes("grocer"))) return true;
      if (target.id === 4 && (sId === 4 || name.includes("food"))) return true;
      if (target.id === 5 && (sId === 5 || name.includes("jewel"))) return true;
      return false;
    });
    return found
      ? { ...target, ...found, store_name: target.store_name, slug: found.slug || target.slug }
      : target;
  });
};

const StoreSwitcher = () => {
  const { i18Lang } = useContext(I18NextContext);
  const { t } = useTranslation(i18Lang, "common");
  const { accountData, activeStore, setActiveStore, role } = useContext(AccountContext);
  const [switchingId, setSwitchingId] = useState(null);
  const queryClient = useQueryClient();

  const isVendor = (role || "").toLowerCase() === "vendor";

  const { data: fetchedStores, isLoading } = useQuery(
    [store, "switcher-list"],
    () => request({ url: store, method: "get", params: { status: 1, paginate: 50 } }),
    {
      enabled: !isVendor,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
      select: (res) => res?.data?.data || res?.data || [],
      retry: 1,
    }
  );

  const stores = useMemo(() => normalizeStores(accountData, fetchedStores), [accountData, fetchedStores]);

  const effectiveActiveId = activeStore?.id ?? 3;

  const handleSwitch = async (selected) => {
    if (!selected?.id || Number(selected.id) === Number(effectiveActiveId)) return;
    setSwitchingId(selected.id);
    try {
      setActiveStore({
        id: selected.id,
        store_name: selected.store_name || selected.name,
        slug: selected.slug || (selected.id === 3 ? "grocery" : selected.id === 4 ? "food-zone" : "jewellery"),
        store_logo: selected.store_logo,
        icon: selected.icon,
      });
      toast.success(t("StoreSwitched") || `Switched to ${selected.store_name || selected.name || "store"}`);
      await queryClient.invalidateQueries();
      window.location.reload();
    } catch (e) {
      toast.error(t("SomethingWentWrong"));
    } finally {
      setSwitchingId(null);
    }
  };

  if (isVendor) {
    return (
      <>
        <div className="radix-profile-separator" />
        <div className="px-3 py-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            {t("Store") || "Store"}
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <span>{activeStore?.icon || "🏪"}</span>
            <span>{activeStore?.store_name || "Vendor Store"}</span>
          </div>
        </div>
      </>
    );
  }

  if (isLoading) {
    return (
      <>
        <div className="radix-profile-separator" />
        <div className="radix-profile-label">{t("SwitchStore") || "Switch Store"}…</div>
      </>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .radix-profile-separator { height: 1px; background: #f1f5f9; margin: 6px 0; }
        .radix-profile-label { font-size: 11px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: #94a3b8; padding: 6px 14px 2px; }
        .radix-store-list { max-height: 200px; overflow-y: auto; padding: 2px 0; }
        .radix-store-check { margin-left: auto; color: var(--theme-color, #0da89b); }
        .radix-store-logo { width: 22px; height: 22px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
        .radix-store-fallback { width: 22px; height: 22px; border-radius: 50%; background: #f1f5f9; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 12px; }
        .radix-store-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 140px; }
      `}} />
      <div className="radix-profile-separator" />
      <div className="radix-profile-label flex items-center gap-1.5">
        <ArrowRightLeft className="w-3 h-3" />
        <span>{t("SwitchStore") || "Switch Store"}</span>
      </div>
      <div className="radix-store-list">
        {stores.map((item) => {
          const id = item?.id;
          const name = item?.store_name || item?.name || `${t("Store")} #${id}`;
          const logo = item?.store_logo?.original_url || item?.store_logo?.url || null;
          const itemTheme = getStoreTheme(item);
          const isActive = Number(id) === Number(effectiveActiveId);
          const isSwitching = Number(switchingId) === Number(id);
          return (
            <DropdownMenu.Item
              key={id}
              className="radix-profile-item"
              disabled={isSwitching}
              onSelect={(e) => {
                e.preventDefault();
                handleSwitch(item);
              }}
            >
              <div className="flex items-center gap-[10px] w-full">
                {logo ? (
                  <img src={logo} alt={name} className="radix-store-logo" />
                ) : (
                  <span className="radix-store-fallback">
                    {itemTheme.icon || <Store className="w-3 h-3 text-slate-500" />}
                  </span>
                )}
                <span className="radix-store-name font-medium" title={name}>
                  {isSwitching ? `${t("Pleasewait")}…` : name}
                </span>
                {isActive && <Check className="w-4 h-4 radix-store-check" />}
              </div>
            </DropdownMenu.Item>
          );
        })}
      </div>
    </>
  );
};

export default StoreSwitcher;
