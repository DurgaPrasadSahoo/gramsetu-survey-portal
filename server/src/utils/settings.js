const { db } = require('../db/connection');

async function isMaintenanceMode() {
  const result = await db.execute('SELECT maintenance_mode FROM app_settings WHERE id = 1');
  return result.rows[0]?.maintenance_mode === 1;
}

async function setMaintenanceMode(enabled, updatedBy) {
  await db.execute({
    sql: "UPDATE app_settings SET maintenance_mode = @enabled, updated_by = @updatedBy, updated_at = datetime('now') WHERE id = 1",
    args: { enabled: enabled ? 1 : 0, updatedBy },
  });
}

module.exports = { isMaintenanceMode, setMaintenanceMode };
