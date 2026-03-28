import { ZodError } from "zod";

export const validate = (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    // Write parsed values (with defaults/transforms applied) back to req
    req.body = parsed.body ?? req.body;
    req.query = parsed.query ?? req.query;
    req.params = parsed.params ?? req.params;
    next();
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(400).json({
        status: "fail",
        message: "Validation Error",
        errors: err.errors,
      });
    }
    next(err);
  }
};
