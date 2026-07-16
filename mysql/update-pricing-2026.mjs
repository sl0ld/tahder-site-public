import 'dotenv/config';
import fs from 'fs';
import mysql from 'mysql2/promise';

const sql = fs.readFileSync('mysql/update-pricing-2026.sql', 'utf8');

const db = await mysql.createConnection({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE || process.env.MYSQL_DB,
  charset: 'utf8mb4',
  multipleStatements: true,
});

await db.query(sql);

const [rows] = await db.query(
  'select id, name_ar, price_sar, duration_days, is_active from plans order by price_sar asc',
);

console.log(JSON.stringify(rows, null, 2));
await db.end();
