let addToastFn = null;

export const registerToastContainer = (fn) => {
  addToastFn = fn;
};

export const ToastNotification = (type, message) => {
  if (addToastFn) {
    addToastFn({ type, message });
  } else {
    console.log(`[Toast ${type}]: ${message}`);
  }
  return true;
};
