const db = require('../db/connection');

const childrenStmt = db.prepare('SELECT id FROM users WHERE parent_id = ?');
const userByIdStmt = db.prepare('SELECT id, name, role, parent_id FROM users WHERE id = ?');

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

// The full reporting chain for a user, from the topmost ancestor (Developer/Admin,
// or whoever has no parent) down to the user themselves, inclusive.
function getAncestorChain(userId) {
  const chain = [];
  let current = userByIdStmt.get(userId);
  while (current) {
    chain.unshift({ id: current.id, name: current.name, role: current.role });
    current = current.parent_id ? userByIdStmt.get(current.parent_id) : null;
  }
  return chain;
}

module.exports = { getDescendantIds, getVisibleUserIds, getAncestorChain };
