import { object, string, TypeOf } from "zod";
import { useEffect } from "react";
import { useForm, FormProvider, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import FormInput from "../components/FormInput";
import { LoadingButton } from "../components/LoadingButton";
import { toast } from "react-toastify";
import { Link, useLocation, useNavigate } from "react-router-dom";
import useStore from "../store";
import { authApi } from "../api/authApi";
import { ILoginResponse } from "../api/types";

const loginSchema = object({
  email: string()
    .min(1, "Adres email jest wymagany")
    .email("Adres email jest niepoprawny"),
  password: string()
    .min(1, "Hasło jest wymagane")
    .min(8, "Hasło musi mieć co najmniej 8 znaków")
    .max(32, "Hasło musi nie przekraczać 32 znaków"),
});

export type LoginInput = TypeOf<typeof loginSchema>;

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const methods = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const store = useStore();

  const {
    reset,
    handleSubmit,
    formState: { isSubmitSuccessful },
  } = methods;

  useEffect(() => {
    if (isSubmitSuccessful) {
      reset();
    }
  }, [isSubmitSuccessful]);

  const loginUser = async (data: LoginInput) => {
    try {
      store.setRequestLoading(true);
      const {
        data: { user },
      } = await authApi.post<ILoginResponse>("/auth/login", data);
      store.setRequestLoading(false);
      store.setAuthUser(user);
      if (user.otp_enabled) {
        navigate("/login/validateOtp");
      } else {
        navigate("/profile");
      }
    } catch (error: any) {
      store.setRequestLoading(false);
      const resMessage =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.response.data.detail ||
        error.message ||
        error.toString();
      toast.error(resMessage, {
        position: "top-right",
      });
    }
  };

  const onSubmitHandler: SubmitHandler<LoginInput> = (values) => {
    loginUser(values);
  };

  return (
    <section className="bg-ct-blue-600 min-h-screen grid place-items-center">
      <div className="w-full">
        <FormProvider {...methods}>
          <form
            onSubmit={handleSubmit(onSubmitHandler)}
            className="max-w-md w-full mx-auto overflow-hidden shadow-lg bg-ct-dark-200 rounded-2xl p-8 space-y-5"
          >
            <FormInput label="Email" name="email" type="email" />
            <FormInput label="Password" name="password" type="password" />

            <div className="text-right">
              <Link to="/forgotpassword" className="">
                Zapomniałem hasło?
              </Link>
            </div>
            <LoadingButton
              loading={store.requestLoading}
              textColor="text-ct-blue-600"
            >
              Zaloguj
            </LoadingButton>
            <span className="block">
              Nie masz konta?{" "}
              <Link to="/register" className="text-ct-blue-600">
                Zarejestruj się
              </Link>
            </span>
          </form>
        </FormProvider>
      </div>
    </section>
  );
};

export default LoginPage;
