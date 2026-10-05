// Express 4 doesn't catch rejected promises from async route handlers on its
// own — an unhandled rejection would just hang the request. Wrap every async
// handler with this so errors reach the app's error-handling middleware.
module.exports = function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
};
