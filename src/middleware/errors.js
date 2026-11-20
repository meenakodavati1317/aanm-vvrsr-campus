export const notFound = (req, res) => res.status(404).json({ message: `No route for ${req.method} ${req.originalUrl}` });

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let status = err.status || 500;
  let message = err.message || 'Something went wrong.';
  if (err.name === 'ValidationError') { status = 400; message = Object.values(err.errors).map((e) => e.message).join(' '); }
  if (err.code === 11000) { status = 409; message = 'That value is already in use: ' + Object.keys(err.keyValue || {}).join(', '); }
  if (err.name === 'CastError') { status = 400; message = 'That identifier is not valid.'; }
  if (err.code === 'LIMIT_FILE_SIZE') { status = 413; message = 'That file is too large.'; }
  if (status >= 500) console.error(err);
  res.status(status).json({ message });
}
