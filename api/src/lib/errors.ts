// An error we throw on purpose, with an HTTP status and a stable code the frontend can read.
export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}