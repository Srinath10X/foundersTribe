import { ZodError } from "zod";
import { AppError } from "../utils/AppError.js";
import { logger } from "../utils/logger.js";

const mapStatusToCode = (status) => {
  if (status === 400) return "bad_request";
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 409) return "conflict";
  if (status === 422) return "validation_error";
  return "internal_error";
};

export const errorHandler = (err, req, res, _next) => {
  logger.error(
    {
      err,
      method: req.method,
      url: req.url,
      body: req.body,
      query: req.query,
      params: req.params,
      user_id: req.user?.id,
    },
    "Unhandled request error",
  );

  if (err instanceof ZodError) {
    return res.status(422).json({
      error: {
        code: "validation_error",
        message: "Validation failed",
        details: err.errors,
      },
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code || mapStatusToCode(err.statusCode),
        message: err.message,
        details: null,
      },
    });
  }

  return res.status(500).json({
    error: {
      code: "internal_error",
      message: "Internal Server Error",
      details: null,
    },
  });
};
