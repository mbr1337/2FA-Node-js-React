import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { Request, Response, NextFunction } from "express";
import { prisma } from "../server";
import speakeasy from "speakeasy";

const RegisterUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, email, password } = req.body;

    await prisma.user.create({
      data: {
        name,
        email,
        password: crypto.createHash("sha256").update(password).digest("hex"),
      },
    });

    res.status(201).json({
      status: "success",
      message: "Pomyślnie zarejestrowano, zaloguj się",
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return res.status(409).json({
          status: "fail",
          message: "E-mail już istnieje, użyj innego adresu e-mail",
        });
      }
    }
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

// Najpierw wyodrębniliśmy poświadczenia z treści żądania
// Wywołaliśmy metodę .create() Prismy, aby dodać nowy rekord do bazy danych.
// Następnie zwróciliśmy klientowi wiadomość o powodzeniu
// Na koniec użyliśmy bloku catch do obsługi ewentualnych błędów.
// Gdy żądanie zostanie wysłane do punktu końcowego /api/auth/register z poświadczeniami zawartymi w treści żądania, program obsługi RegisterUser zostanie wywołany w celu zarejestrowania użytkownika.

const LoginUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "Nie istnieje żaden użytkownik z tym adresem e-mail",
      });
    }

    res.status(200).json({
      status: "success",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        otp_enabled: user.otp_enabled,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

const GenerateOTP = async (req: Request, res: Response) => {
  try {
    const { user_id } = req.body;
    const { ascii, hex, base32, otpauth_url } = speakeasy.generateSecret({
      issuer: "mbryndal.com",
      name: "admin@admin.com",
      length: 15,
    });

    await prisma.user.update({
      where: { id: user_id },
      data: {
        otp_ascii: ascii,
        otp_auth_url: otpauth_url,
        otp_base32: base32,
        otp_hex: hex,
      },
    });

    res.status(200).json({
      base32,
      otpauth_url,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};
// Tworzenie procedurę obsługi, która wygeneruje tajny klucz. Tajny klucz połączy serwer i aplikację, która wygeneruje tokeny uwierzytelniania dwuskładnikowego.
// Aby wygenerować tajny klucz, wykorzystamy metodę .generateSecret() od Speakeasy.
// Ta metoda zwraca obiekt, który przechowuje tajny klucz w formacie ASCII, szesnastkowym, base32 i otpauth_url.
// Otpauth_url ma zakodowane w nim tajemnice jako adres URL, który zostanie użyty do wygenerowania kodu QR.
// Ponadto użytkownik może użyć ciągu base32 do wygenerowania kodu QR.

// Po wygenerowaniu sekretów 2FA wywołaliśmy metodę Prisma .update() w celu zapisania ich w bazie danych.
// Gdy żądanie zostanie wysłane do punktu końcowego /api/auth/otp/generate, procedura obsługi GenerateOTP
// zostanie wywołana w celu wygenerowania tajnych uwierzytelnień dwuskładnikowych i zwrócenia ich.

const VerifyOTP = async (req: Request, res: Response) => {
  try {
    const { user_id, token } = req.body;

    const user = await prisma.user.findUnique({ where: { id: user_id } });
    const message = "Token jest nieprawidłowy lub użytkownik nie istnieje";
    if (!user) {
      return res.status(401).json({
        status: "fail",
        message,
      });
    }

    const verified = speakeasy.totp.verify({
      secret: user.otp_base32!,
      encoding: "base32",
      token,
    });

    if (!verified) {
      return res.status(401).json({
        status: "fail",
        message,
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id: user_id },
      data: {
        otp_enabled: true,
        otp_verified: true,
      },
    });

    res.status(200).json({
      otp_verified: true,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        otp_enabled: updatedUser.otp_enabled,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

// Następnie moduł obsługi sprawdzi bazę danych, aby zobaczyć, czy użytkownik o tym identyfikatorze istnieje, zanim metoda .totp.verify() Speakeasy
// zostanie wywołana w celu zweryfikowania tokena. Po pomyślnej weryfikacji zaktualizujemy dane użytkownika w bazie danych.
// Aby zweryfikować token TOTP, wyślij żądanie POST do punktu końcowego /api/auth/otp/verify z identyfikatorem użytkownika i tokenem zawartymi w treści żądania.

const ValidateOTP = async (req: Request, res: Response) => {
  try {
    const { user_id, token } = req.body;
    const user = await prisma.user.findUnique({ where: { id: user_id } });

    const message = "Token jest nieprawidłowy lub użytkownik nie istnieje";
    if (!user) {
      return res.status(401).json({
        status: "fail",
        message,
      });
    }

    const validToken = speakeasy.totp.verify({
      secret: user?.otp_base32!,
      encoding: "base32",
      token,
      window: 1,
    });

    if (!validToken) {
      return res.status(401).json({
        status: "fail",
        message,
      });
    }

    res.status(200).json({
      otp_valid: true,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

// Ta funkcja zweryfikuje token pod kątem tajnego klucza przechowywanego w bazie danych.
// Aby zweryfikować token TOTP, wywołaj funkcję .totp.verify() Speakeasy, ale tym razem oprócz innych argumentów podaj parametr okna.
// Okno określa okres ważności tokena TOTP.
// Teraz wyślij żądanie POST do punktu końcowego /api/auth/otp/validate z user_id i tokenem podanymi w treści żądania, aby zweryfikować token.

const DisableOTP = async (req: Request, res: Response) => {
  try {
    const { user_id } = req.body;

    const user = await prisma.user.findUnique({ where: { id: user_id } });
    if (!user) {
      return res.status(401).json({
        status: "fail",
        message: "Użytkownik nie istnieje",
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id: user_id },
      data: {
        otp_enabled: false,
      },
    });

    res.status(200).json({
      otp_disabled: true,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        otp_enabled: updatedUser.otp_enabled,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

export default {
  RegisterUser,
  LoginUser,
  GenerateOTP,
  VerifyOTP,
  ValidateOTP,
  DisableOTP,
};
