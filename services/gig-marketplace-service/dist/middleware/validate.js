export const validate = (schema) => (req, _res, next) => {
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
