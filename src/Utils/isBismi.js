/**
 * Helper to determine if the application is running in the Bismi environment.
 * Checks build-time environment flags, API URL, and browser hostnames.
 */
export const isBismi = () => {
  if (process.env.IS_BISMI === "true" || process.env.IS_BISMI === true) {
    return true;
  }
  const apiUrl = process.env.API_PROD_URL || "";
  if (apiUrl.toLowerCase().includes("bismi")) {
    return true;
  }
  if (typeof window !== "undefined") {
    const host = (window.location.hostname || "").toLowerCase();
    if (host.includes("bismi")) {
      return true;
    }
    try {
      const activeStoreName = (localStorage.getItem("active_store_name") || "").toLowerCase();
      if (activeStoreName.includes("bismi")) {
        return true;
      }
    } catch (e) {
      // Ignore storage access errors
    }
  }
  return false;
};

export default isBismi;

