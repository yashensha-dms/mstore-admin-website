import { toast } from "sonner";

export const ToastNotification = (type, message) => {
  switch (type) {
    case "success":
      toast.success(message);
      break;
    case "error":
      toast.error(message);
      break;
    case "warn":
    case "warning":
      toast.warning(message);
      break;
    case "info":
    default:
      toast.info(message);
      break;
  }
  return true;
};
