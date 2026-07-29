import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Application } from "express";
import helmet from "helmet";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler";
import { requestLogger } from "./middlewares/requestLogger";
import v1Routes from "./routes/v1";

export function createApp(): Application {
  const app = express();

  // Refresh tokens/session cookies aren't meaningful cross-CDN, so the app
  // trusts X-Forwarded-For only from its own reverse proxy hop. In this
  // deployment there is no reverse proxy yet, so this is a no-op today but
  // documents the intent for when one is added.
  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(
    cors({
      origin: env.frontendUrl,
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(requestLogger);

  app.use("/api/v1", v1Routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
