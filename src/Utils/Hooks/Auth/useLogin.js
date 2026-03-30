import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCookies } from "react-cookie";
import request from "../../AxiosUtils";
import { emailSchema, passwordSchema, YupObject, recaptchaSchema } from "../../Validation/ValidationSchemas";
import { login } from "../../AxiosUtils/API";

export const LogInSchema = YupObject({
  email: emailSchema,
  password: passwordSchema,
  recaptcha: recaptchaSchema
});

const LoginHandle = (responseData, router, setShowBoxMessage, setCookie) => {
  if (responseData.status === 200) {
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    setCookie("uat", responseData.data?.access_token, {
      path: "/",
      expires: tokenExpiry,
    });
    if (typeof window !== "undefined") {
      // Store account cookie with same expiry as token — middleware reads this to skip API call
      setCookie("account", JSON.stringify(responseData.data), {
        path: "/",
        expires: tokenExpiry,
      });
      localStorage.setItem("account", JSON.stringify(responseData.data));
    }
    router.push("/en/dashboard");
  } else {
    setShowBoxMessage(responseData.response.data.message);
  }
};

const useHandleLogin = (setShowBoxMessage) => {
  const [cookies, setCookie] = useCookies(["ue", "uat", "account"]);
  const router = useRouter();
  return useMutation(
    (data) =>
      request({
        url: login,
        method: "post",
        data,
      }),
    {
      onSuccess: (responseData) => LoginHandle(responseData, router, setShowBoxMessage, setCookie),
    },
  );
};

export default useHandleLogin;
