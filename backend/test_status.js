require('dotenv').config();
const pool = require('./config/db');

async function main() {
  try {
    const res = await pool.query("SELECT id, booking_date, start_time, end_time, status, payment_status FROM bookings ORDER BY id DESC LIMIT 5");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err.message);
  }
  process.exit(0);
}
main();
