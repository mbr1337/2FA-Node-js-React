import { PrismaClient } from "@prisma/client";
import express, { Request, Response } from "express";
import cors from "cors";
import authRouter from "./routes/auth.route";
import morgan from "morgan";

export const prisma = new PrismaClient();
const app = express();

async function main() {
  // Middleware
  app.use(morgan("dev"));
  // Oprogramowanie pośredniczące morgan („dev”) skonfiguruje Express do rejestrowania informacji o żądaniu HTTP w terminalu.
  
  app.use(
    cors({
      origin: ["http://localhost:3000"],
      credentials: true,
    })
  );
  // Oprogramowanie pośredniczące cors() skonfiguruje serwer Express do akceptowania żądań z domen pochodzących z różnych źródeł.

  app.use(express.json());
  // Oprogramowanie pośredniczące express.json() przeanalizuje ładunek JSON przychodzącego żądania HTTP POST i ujawni go jako req.body.

  //   Health Checker
  app.get("/api/healthchecker", (req: Request, res: Response) => {
    res.status(200).json({
      status: "success",
      message: "Witaj w 2FA w node js",
    });
  });

  app.use("/api/auth", authRouter);

  app.all("*", (req: Request, res: Response) => {
    return res.status(404).json({
      status: "fail",
      message: `Route: ${req.originalUrl} not found`,
    });
  });

  const PORT = 8000;
  app.listen(PORT, () => {
    console.info(`Server started on port: ${PORT}`);
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
