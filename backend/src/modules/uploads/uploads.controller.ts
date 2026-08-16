import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/apiResponse";
import * as uploadsService from "./uploads.service";
import type { SignUploadInput } from "./uploads.validation";

export const sign = asyncHandler(async (req: Request, res: Response) => {
  const signature = uploadsService.signUpload(req.body as SignUploadInput);
  sendSuccess(res, signature, "Upload signature generated.");
});
