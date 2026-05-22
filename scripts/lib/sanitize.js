export const sanitizeMessage = (msg) =>
  String(msg ?? '').replace(/vercel_blob_rw_[A-Za-z0-9_]+/g, 'vercel_blob_rw_[REDACTED]');
