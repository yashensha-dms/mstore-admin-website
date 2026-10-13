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
import { store, switchStore } from "../../Utils/AxiosUtils/API";

/**
 * StoreSwitcher — "Switch Store" section inside the ProfileNav dropdown.
 *
 * Frontend contract:
 * - Lists stores from `accountData.stores` (if /self returns them) falling
 *   back to GET `store` (paginated). Each item: { id, store_name, store_logo? }.
 * - On select: POST `switchStore` ({ store_id }) so the backend can rotate
 *   permissions/scoping, then persists the active store in AccountContext +
 *   localStorage (`active_store` / `active_store_id`) + cookie, sends it as
 *   `X-Store-Id` on every request (see Utils/AxiosUtils), invalidates queries
 *   and reloads so dashboard/orders/products re-scope.
 *
 * Backend to implement in the shopping backend folder:
 * - POST /switch-store { store_id } -> validate the logged-in user has access
 *   to the store, return { store: {...} }. Optionally also accept/store the
 *   `X-Store-Id` header per request and scope listings to it.
 */
const normalizeStores = (accountData, fetched) => {
  if (Array.isArray(accountData?.stores) && accountData.stores.length) return accountData.stores;
  if (Array.isArray(accountData?.vendor_stores) && accountData.vendor_stores.length) return accountData.vendor_stores;
  if (Array.isArray(fetched) && fetched.length) return fetched;
  // Single-store fallback: vendor profile embeds one store object
  if (accountData?.store?.id) return [accountData.store];
  return [];
};

const StoreSwitcher = () => {
  const { i18Lang } = useContext(I18NextContext);
  const { t } = useTranslation(i18Lang, "common");
  const { accountData, activeStore, setActiveStore } = useContext(AccountContext);
  const [switchingId, setSwitchingId] = useState(null);
  const queryClient = useQueryClient();

  const { data: fetchedStores, isLoading } = useQuery(
    [store, "switcher-list"],
    () => request({ url: store, method: "get", params: { status: 1, paginate: 50 } }),
    {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
      select: (res) => res?.data?.data || res?.data || [],
      // Don't error-toast here; dropdown just hides if list is unavailable
      retry: 1,
    }
  );

  const stores = useMemo(() => normalizeStores(accountData, fetchedStores), [accountData, fetchedStores]);

  const effectiveActiveId = activeStore?.id ?? accountData?.store?.id ?? null;

  const handleSwitch = async (selected) => {
    if (!selected?.id || Number(selected.id) === Number(effectiveActiveId)) return;
    setSwitchingId(selected.id);
    try {
      // Let backend validate + scope the session. Tolerate 404 (endpoint not
      // implemented yet in shopping backend folder) — still switch locally.
      await request({ url: switchStore, method: "post", data: { store_id: selected.id } }).catch((err) => err);
      setActiveStore({ id: selected.id, store_name: selected.store_name || selected.name, store_logo: selected.store_logo });
      toast.success(t("StoreSwitched") || `Switched to ${selected.store_name || selected.name || "store"}`);
      await queryClient.invalidateQueries();
      window.location.reload();
    } catch (e) {
      toast.error(t("SomethingWentWrong"));
    } finally {
      setSwitchingId(null);
    }
  };

  if (isLoading) {
    return (
      <>
        <div className="radix-profile-separator" />
        <div className="radix-profile-label">{t("SwitchStore") || "Switch Store"}…</div>
      </>
    );
  }

  // If stores list is empty or unavailable, render notice
  if (!stores || stores.length === 0) {
    return (
      <>
        <div className="radix-profile-separator" />
        <div className="radix-profile-label flex items-center gap-1.5">
          <ArrowRightLeft className="w-3 h-3" />
          <span>{t("SwitchStore") || "Switch Store"}</span>
        </div>
        <div className="px-3 py-2 text-xs text-slate-400 italic">
          {t("NoStoresFound") || "No stores available"}
        </div>
      </>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .radix-profile-separator { height: 1px; background: #f1f5f9; margin: 6px 0; }
        .radix-profile-label { font-size: 11px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: #94a3b8; padding: 6px 14px 2px; }
        .radix-store-list { max-height: 200px; overflow-y: auto; padding: 2px 0; }
        .radix-store-check { margin-left: auto; color: #0da89b; }
        .radix-store-logo { width: 22px; height: 22px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
        .radix-store-fallback { width: 22px; height: 22px; border-radius: 50%; background: #f1f5f9; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
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
          const isActive = effectiveActiveId != null && Number(id) === Number(effectiveActiveId);
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
                    <Store className="w-3 h-3 text-slate-500" />
                  </span>
                )}
                <span className="radix-store-name" title={name}>
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
