export class AppError extends Error {
  public statusCode: number;
  public code: string;

  constructor(message: string, statusCode: number = 500, code: string = "internal_error") {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
  }
}
