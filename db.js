// db.js
const mysql = require('mysql2');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '22102001',
  database: 'nhanmac'
});

db.connect(err => {
  if (err) {
    console.error('❌ Lỗi kết nối:', err.message);
    process.exit(1);
  }
  console.log('✅ Kết nối MySQL thành công!');
});

module.exports = db;


