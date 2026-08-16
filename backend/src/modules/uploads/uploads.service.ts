import { createHash } from "crypto";
import { env } from "../../config/env";
import { ApiError } from "../../utils/ApiError";
import type { SignUploadInput } from "./uploads.validation";

export interface UploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
}

export function computeSignature(folder: string, timestamp: number, apiSecret: string): string {
  const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
  return createHash("sha1").update(`${paramsToSign}${apiSecret}`).digest("hex");
}

export function signUpload(input: SignUploadInput): UploadSignature {
  const { cloudName, apiKey, apiSecret } = env.cloudinary;
  if (!cloudName || !apiKey || !apiSecret) {
    throw ApiError.serviceUnavailable(
      "Image uploads aren't configured yet.",
      "UPLOADS_NOT_CONFIGURED"
    );
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const signature = computeSignature(input.folder, timestamp, apiSecret);

  return { cloudName, apiKey, timestamp, signature, folder: input.folder };
}
