import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import request from "../AxiosUtils";
import SuccessHandle from "../CustomFunctions/SuccessHandle";

const useUpdate = (url, updateId, path, message, extraFunction) => {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  return useMutation((data) => request({ url: `${url}/${Array.isArray(updateId) ? updateId.join("/") : updateId}`, method: "put", data }), {
    onSuccess: (resData) => {
      // Invalidate the list query so the product list refreshes on navigate back
      queryClient.invalidateQueries([url]);
      SuccessHandle(resData, router, path, message, pathname);
      extraFunction && extraFunction();
    },
  });
};
export default useUpdate;
