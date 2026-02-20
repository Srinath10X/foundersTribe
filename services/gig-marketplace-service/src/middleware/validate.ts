import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

export const validate = (schema: ZodSchema) => (req: Request, _res: Response, next: NextFunction) => {
  const parsed = schema.safeParse({
    body: req.body,
    params: req.params,
    query: req.query,
  });

  if (!parsed.success) {
    return next(parsed.error);
  }

  req.body = parsed.data.body || {};
  req.params = parsed.data.params || {};
  req.query = parsed.data.query || {};
  next();
};
