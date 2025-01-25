const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

// 定义数据库文件路径
const dbPath = path.resolve(__dirname, 'database', 'pulse.db');

// 创建或连接 SQLite 数据库
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
  } else {
    console.log('Connected to SQLite database at', dbPath);
  }
});

// 初始化数据库表
db.serialize(() => {
  // 创建用户表（如果尚未存在）
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT, 
      name TEXT NOT NULL, 
      email TEXT UNIQUE NOT NULL, 
      password TEXT NOT NULL, 
      points INTEGER DEFAULT 0, 
      role TEXT DEFAULT 'user' -- 添加角色字段，默认为普通用户
    )
  `, (err) => {
    if (err) {
      console.error('Error creating users table:', err.message);
    } else {
      console.log('Users table created successfully!');
    }
  });

  // 创建交易记录表（如果尚未存在）
  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT, 
      user_id INTEGER NOT NULL, 
      type TEXT NOT NULL, 
      amount INTEGER NOT NULL, 
      date TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `, (err) => {
    if (err) {
      console.error('Error creating transactions table:', err.message);
    } else {
      console.log('Transactions table created successfully!');
    }
  });

  // 创建奖励表（如果尚未存在）
  db.run(`
    CREATE TABLE IF NOT EXISTS rewards (
      id INTEGER PRIMARY KEY AUTOINCREMENT, 
      name TEXT NOT NULL, 
      points_required INTEGER NOT NULL, 
      description TEXT, 
      stock INTEGER DEFAULT 0
    )
  `, (err) => {
    if (err) {
      console.error('Error creating rewards table:', err.message);
    } else {
      console.log('Rewards table created successfully!');
    }
  });

  // 添加默认的管理员账户（如果尚未存在）
  const adminEmail = 'admin@example.com';
  const adminPassword = 'testing123';
  const adminHashedPassword = bcrypt.hashSync(adminPassword, 10); // 同步加密密码

  db.run(`
    INSERT OR IGNORE INTO users (name, email, password, role) 
    VALUES ('Admin', ?, ?, 'admin')
  `, [adminEmail, adminHashedPassword], (err) => {
    if (err) {
      console.error('Error inserting admin user:', err.message);
    } else {
      console.log('Admin user added successfully!');
    }
  });

  // 添加一些默认的奖励（可选）
  db.run(`
    INSERT OR IGNORE INTO rewards (id, name, points_required, description, stock)
    VALUES
      (1, 'Gift Card', 1000, 'A $10 gift card', 10),
      (2, 'Discount Coupon', 500, '5% discount on your next purchase', 20),
      (3, 'Free Item', 2000, 'Get a free product of your choice', 5)
  `, (err) => {
    if (err) {
      console.error('Error inserting default rewards:', err.message);
    } else {
      console.log('Default rewards added successfully!');
    }
  });
});

module.exports = db;
