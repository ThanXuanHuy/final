const pool = require('./config/db');

async function migrate() {
  try {
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='end_date') THEN
          ALTER TABLE bookings ADD COLUMN end_date DATE;
          UPDATE bookings SET end_date = booking_date;
        END IF;
      END
      $$;
    `);
    console.log('Migration successful.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
migrate();
