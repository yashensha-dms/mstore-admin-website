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
      if (activeStoreId) {
        client.defaults.headers.common["X-Store-Id"] = activeStoreId;
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
