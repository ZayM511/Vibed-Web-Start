// Rate limiting placeholder
// To enable rate limiting, install @convex-dev/rate-limiter and configure it
// For now, rate limiting is disabled

export const checkRateLimit = async () => {
  // Placeholder - no rate limiting for now
  return { ok: true };
};

export const ratelimit = {
  scanJob: async () => ({ ok: true }),
  submitReview: async () => ({ ok: true }),
};
