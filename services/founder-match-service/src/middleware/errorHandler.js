import { AppError } from "../utils/AppError.js";
import { ZodError } from "zod";
import { logger } from "../utils/logger.js";

export const errorHandler = (err, req, res, _next) => {
  logger.error(
    {
      err,
      method: req.method,
      url: req.url,
      body: req.body,
      query: req.query,
      params: req.params,
    },
    "Unhandled Error",
  );

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: "error",
      message: err.message,
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      status: "fail",
      message: "Validation Error",
      errors: err.errors,
    });
  }

  res.status(500).json({
    status: "error",
    message: "Internal Server Error",
  });
};

