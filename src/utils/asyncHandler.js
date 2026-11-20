// Wraps an async route so rejected promises reach the error handler.
export const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}
