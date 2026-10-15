import axios from "axios";
import getCookie from "../CustomFunctions/GetCookie";

const client = axios.create({
  baseURL: process.env.API_PROD_URL,
  headers: {
    Accept: "application/json",
  },
});

const request = async ({ ...options }, router) => {
  client.defaults.headers.common.Authorization = `Bearer ${getCookie("uat")}`;
  // Attach active store so the backend (shopping backend folder) can scope
  // dashboard / orders / products to the switched store.
  // Expected backend contract: read `X-Store-Id` header (fallback: `store_id`
  // query/body param) and return data scoped to that store. See StoreSwitcher.
  if (typeof window !== "undefined") {
    try {
      const activeStoreId = localStorage.getItem("active_store_id");
      const activeStoreSlug = localStorage.getItem("active_store_slug");
      if (activeStoreId) {
        client.defaults.headers.common["X-Store-Id"] = activeStoreId;

        // Auto-inject store_id & store_slug into query params for store-scoped endpoints (e.g. /product, /out-of-stock-product, /order, /statistics/count, /dashboard/chart)
        const unscopedEndpoints = [
          "store",
          "self",
          "backend/settings",
          "settings",
          "themeOptions",
          "theme",
          "module",
          "role",
          "country",
          "state",
          "currency",
          "tax",
          "category",
          "tag",
          "attribute",
          "attachment",
          "backend/login",
          "login",
          "register",
          "forgot-password",
          "verify-token",
          "update-password",
          "logout",
          "notifications",
          "push-broadcast",
        ];

        const rawUrl = (options.url || "").split("?")[0].replace(/^\//, "");
        const isUnscoped = unscopedEndpoints.some((p) => {
          const cleanP = p.replace(/^\//, "");
          return rawUrl === cleanP || rawUrl.startsWith(cleanP + "/");
        });

        if (!isUnscoped) {
          options.params = { ...options.params };
          if (options.params.store_id === undefined && options.params.store_slug === undefined) {
            // The live database's existing catalog has store_id: null and represents "grocery".
            // If the active store is grocery (ID 3), do not filter out store_id: null products.
            // For Food Zone (ID 4), Jewellery (ID 5), and other stores, scope strictly to that store_id & store_slug.
            const rawStore = localStorage.getItem("active_store");
            let isGrocery = String(activeStoreId) === "3";
            let resolvedSlug = activeStoreSlug;
            if (rawStore) {
              try {
                const parsed = JSON.parse(rawStore);
                const sName = (parsed.store_name || parsed.name || "").toLowerCase();
                const sSlug = (parsed.slug || "").toLowerCase();
                if (sName.includes("grocer") || sSlug === "grocery" || Number(parsed.id) === 3) {
                  isGrocery = true;
                }
                if (!resolvedSlug && parsed.slug) {
                  resolvedSlug = parsed.slug;
                }
              } catch (e) {}
            }

            if (!isGrocery) {
              options.params.store_id = activeStoreId;
              if (resolvedSlug) {
                options.params.store_slug = resolvedSlug;
              }
            }
          }
        }
      } else {
        delete client.defaults.headers.common["X-Store-Id"];
      }
    } catch (e) {}
  }
  const onSuccess = (response) => response;
  const onError = (error) => {
    if (error?.response?.status == 403) {
      router && router.push("/403")
    }
    return error;
  };
  try {
    const response = await client(options);
    return onSuccess(response);
  } catch (error) {
    return onError(error);
  }
};

export default request;
