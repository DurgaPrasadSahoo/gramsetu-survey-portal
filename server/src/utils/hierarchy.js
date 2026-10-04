const db = require('../db/connection');

const childrenStmt = db.prepare('SELECT id FROM users WHERE parent_id = ?');

// A user's own id plus every user beneath them in the reporting tree
// (children, grandchildren, ...).
function getDescendantIds(rootId) {
  const ids = [rootId];
  for (const child of childrenStmt.all(rootId)) {
    ids.push(...getDescendantIds(child.id));
  }
  return ids;
}

// The set of user ids whose data `user` is allowed to see.
// Returns null for developer/admin, meaning "no restriction — see everyone".
function getVisibleUserIds(user) {
  if (user.role === 'admin' || user.role === 'developer') return null;
  return getDescendantIds(user.id);
}

module.exports = { getDescendantIds, getVisibleUserIds };
