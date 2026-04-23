import MessageCreate from "./MessageCreate";
import { ToastNotification } from "./ToastNotification";

const SuccessHandle = (resData, router, path, message, pathname) => {
  if (resData.status === 201 || resData.status === 200) {
    // Show success toast first, then navigate back
    message !== 'No' && ToastNotification("success", message ? message : (router && MessageCreate(pathname)));
    // Use router.back() so locale prefix (/admin/en/) is preserved automatically
    path && router && router.back();
  } else {
    // Try to extract a human-readable error from the API response
    const apiMessage =
      resData?.response?.data?.message ||              // standard message field
      resData?.data?.errors?.[0]?.message ||           // GraphQL-style errors array
      (() => {                                          // Laravel 422 validation: {field: ["msg"]}
        const errs = resData?.response?.data?.errors;
        if (errs && typeof errs === 'object' && !Array.isArray(errs)) {
          const firstKey = Object.keys(errs)[0];
          return firstKey ? errs[firstKey][0] : null;
        }
        return null;
      })();
    message !== 'No' && ToastNotification("error", apiMessage || "Something went wrong — check API response");
  }
};

export default SuccessHandle;
