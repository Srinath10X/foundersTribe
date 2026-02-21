import { AppError } from "../utils/AppError.js";
export function mapSupabaseError(error, fallback = "Database error") {
    if (!error)
        return new AppError(fallback, 500, "internal_error");
    if (error instanceof AppError)
        return error;
    const code = error.code || error.status || "";
    const message = error.message || fallback;
    if (code === "23505")
        return new AppError(message, 409, "conflict");
    if (code === "23503")
        return new AppError(message, 400, "bad_request");
    if (code === "42501")
        return new AppError("Forbidden", 403, "forbidden");
    if (code === "P0002")
        return new AppError(message, 404, "not_found");
    if (code === "P0001")
        return new AppError(message, 422, "validation_error");
    return new AppError(message, 400, "bad_request");
}
