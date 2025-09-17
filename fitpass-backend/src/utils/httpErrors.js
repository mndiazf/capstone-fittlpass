export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}
export const BadRequest = (msg, d) => new HttpError(400, msg, d);
export const Unauthorized = (msg, d) => new HttpError(401, msg, d);
export const Forbidden = (msg, d) => new HttpError(403, msg, d);
export const Conflict = (msg, d) => new HttpError(409, msg, d);
export const PreconditionFailed = (msg, d) => new HttpError(412, msg, d);
export const Unprocessable = (msg, d) => new HttpError(422, msg, d);
export const Locked = (msg, d) => new HttpError(423, msg, d);
