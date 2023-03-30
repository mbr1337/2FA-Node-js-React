import { object, string, TypeOf } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, FormProvider, SubmitHandler } from "react-hook-form";
import { useEffect } from "react";
import FormInput from "../components/FormInput";
import { LoadingButton } from "../components/LoadingButton";
import { toast } from "react-toastify";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../api/authApi";
import useStore from "../store";
import { GenericResponse } from "../api/types";

const registerSchema = object({
  name: string().min(1, "Wymagane jest pełne imię i nazwisko").max(100),
  email: string()
    .min(1, "Adres email jest wymagany")
    .email("Adres email jest niepoprawny"),
  password: string()
    .min(1, "Hasło jest wymagane")
    .min(8, "Hasło musi mieć co najmniej 8 znaków")
    .max(32, "Hasło musi nie przekraczać 32 znaków"),
  passwordConfirm: string().min(1, "Proszę potwierdź swoje hasło"),
}).refine((data) => data.password === data.passwordConfirm, {
  path: ["passwordConfirm"],
  message: "Hasła się nie zgadzają",
});

export type RegisterInput = TypeOf<typeof registerSchema>;

const RegisterPage = () => {
  const navigate = useNavigate();
  const store = useStore();

  const methods = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  const {
    reset,
    handleSubmit,
    formState: { isSubmitSuccessful },
  } = methods;

  useEffect(() => {
    if (isSubmitSuccessful) {
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSubmitSuccessful]);

  const registerUser = async (data: RegisterInput) => {
    try {
      store.setRequestLoading(true);
      const response = await authApi.post<GenericResponse>(
        "auth/register",
        data
      );
      toast.success(response.data.message, {
        position: "top-right",
      });
      store.setRequestLoading(false);
      navigate("/login");
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

  const onSubmitHandler: SubmitHandler<RegisterInput> = (values) => {
    registerUser(values);
  };

  return (
    <section className="py-8 bg-ct-blue-600 min-h-screen grid place-items-center">
      <div className="w-full">
        <FormProvider {...methods}>
          <form
            onSubmit={handleSubmit(onSubmitHandler)}
            className="max-w-md w-full mx-auto overflow-hidden shadow-lg bg-ct-dark-200 rounded-2xl p-8 space-y-5"
          >
            <FormInput label="Imie i nazwisko" name="name" />
            <FormInput label="Email" name="email" type="email" />
            <FormInput label="Hasło" name="password" type="password" />
            <FormInput
              label="Potwierdz hasło"
              name="passwordConfirm"
              type="password"
            />
            <span className="block">
              Masz już konto?{" "}
              <Link to="/login" className="text-ct-blue-600">
                Zaloguj się tutaj
              </Link>
            </span>
            <LoadingButton
              loading={store.requestLoading}
              textColor="text-ct-blue-600"
            >
              Zarejestruj
            </LoadingButton>
          </form>
        </FormProvider>
      </div>
    </section>
  );
};

export default RegisterPage;
