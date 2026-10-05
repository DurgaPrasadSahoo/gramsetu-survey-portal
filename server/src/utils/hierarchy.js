const { db } = require('../db/connection');

async function getChildren(parentId) {
  const result = await db.execute({ sql: 'SELECT id FROM users WHERE parent_id = @parentId', args: { parentId } });
  return result.rows;
}

async function getUserById(id) {
  const result = await db.execute({
    sql: 'SELECT id, name, role, parent_id FROM users WHERE id = @id',
    args: { id },
  });
  return result.rows[0];
}

// A user's own id plus every user beneath them in the reporting tree
// (children, grandchildren, ...).
async function getDescendantIds(rootId) {
  const ids = [rootId];
  for (const child of await getChildren(rootId)) {
    ids.push(...(await getDescendantIds(child.id)));
  }
  return ids;
}

// The set of user ids whose data `user` is allowed to see.
// Returns null for developer/admin, meaning "no restriction — see everyone".
async function getVisibleUserIds(user) {
  if (user.role === 'admin' || user.role === 'developer') return null;
  return getDescendantIds(user.id);
}

// The full reporting chain for a user, from the topmost ancestor (Developer/Admin,
// or whoever has no parent) down to the user themselves, inclusive.
async function getAncestorChain(userId) {
  const chain = [];
  let current = await getUserById(userId);
  while (current) {
    chain.unshift({ id: current.id, name: current.name, role: current.role });
    current = current.parent_id ? await getUserById(current.parent_id) : null;
  }
  return chain;
}

module.exports = { getDescendantIds, getVisibleUserIds, getAncestorChain };
