require('dotenv').config(); // 加载 .env 文件中的环境变量
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL || './pulse.db';
const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_key';

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Database connection
const db = new sqlite3.Database(DATABASE_URL, (err) => {
    if (err) {
        console.error('Error connecting to the database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
    }
});

// Middleware for token authentication
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access denied. Token missing.' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token.' });
        req.user = user;
        next();
    });
};

// Routes

// Register user
app.post('/register', (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const query = `INSERT INTO users (name, email, password, role, points) VALUES (?, ?, ?, 'user', 0)`;

    db.run(query, [name, email, hashedPassword], function (err) {
        if (err) {
            console.error('Error registering user:', err.message);
            return res.status(500).json({ error: 'Database error.' });
        }

        res.status(201).json({ message: 'User registered successfully!', userId: this.lastID });
    });
});

// Login user
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    const query = `SELECT * FROM users WHERE email = ?`;
    db.get(query, [email], (err, user) => {
        if (err) {
            console.error('Error querying user:', err.message);
            return res.status(500).json({ error: 'Database error.' });
        }

        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });

        // Log the login action
        const logQuery = `INSERT INTO logs (user_id, action, details) VALUES (?, 'login', 'User logged in successfully')`;
        db.run(logQuery, [user.id], (err) => {
            if (err) {
                console.error('Error logging action:', err.message);
            }
        });

        res.status(200).json({ token, user: { id: user.id, name: user.name, email: user.email } });
    });
});
// Get user points
app.get('/points', authenticateToken, (req, res) => {
  const userId = req.user.id;

  const query = `SELECT points FROM users WHERE id = ?`;
  db.get(query, [userId], (err, row) => {
      if (err) {
          console.error('Error fetching points:', err.message);
          return res.status(500).json({ error: 'Database error.' });
      }

      if (!row) return res.status(404).json({ error: 'User not found.' });

      res.status(200).json({ points: row.points });
  });
});

// Add points to a user
app.post('/add-points', authenticateToken, (req, res) => {
  const { points } = req.body;
  const userId = req.user.id;

  if (!points || points <= 0) {
      return res.status(400).json({ error: 'Invalid points value.' });
  }

  const query = `UPDATE users SET points = points + ? WHERE id = ?`;
  db.run(query, [points, userId], function (err) {
      if (err) {
          console.error('Error updating points:', err.message);
          return res.status(500).json({ error: 'Database error.' });
      }

      res.status(200).json({ message: `Added ${points} points successfully!` });
  });
});

// Redeem reward
app.post('/redeem-reward', authenticateToken, (req, res) => {
  const { rewardId } = req.body;
  const userId = req.user.id;

  const getRewardQuery = `SELECT * FROM rewards WHERE id = ? AND stock > 0`;
  db.get(getRewardQuery, [rewardId], (err, reward) => {
      if (err) {
          console.error('Error fetching reward:', err.message);
          return res.status(500).json({ error: 'Database error.' });
      }

      if (!reward) return res.status(404).json({ error: 'Reward not found or out of stock.' });

      const getUserQuery = `SELECT points FROM users WHERE id = ?`;
      db.get(getUserQuery, [userId], (err, user) => {
          if (err) {
              console.error('Error fetching user points:', err.message);
              return res.status(500).json({ error: 'Database error.' });
          }

          if (user.points < reward.points_required) {
              return res.status(400).json({ error: 'Insufficient points.' });
          }

          const updatePointsQuery = `UPDATE users SET points = points - ? WHERE id = ?`;
          const updateStockQuery = `UPDATE rewards SET stock = stock - 1 WHERE id = ?`;

          db.run(updatePointsQuery, [reward.points_required, userId], (err) => {
              if (err) {
                  console.error('Error updating user points:', err.message);
                  return res.status(500).json({ error: 'Database error.' });
              }

              db.run(updateStockQuery, [rewardId], (err) => {
                  if (err) {
                      console.error('Error updating reward stock:', err.message);
                      return res.status(500).json({ error: 'Database error.' });
                  }

                  // Log the redemption action
                  const logQuery = `
                      INSERT INTO logs (user_id, action, details)
                      VALUES (?, 'redeem-reward', ?)
                  `;
                  const details = `Redeemed reward: ${reward.name}, Points Required: ${reward.points_required}`;
                  db.run(logQuery, [userId, details], (err) => {
                      if (err) {
                          console.error('Error logging action:', err.message);
                      }
                  });

                  res.status(200).json({ message: 'Reward redeemed successfully!', reward: reward.name });
              });
          });
      });
  });
});

// View transaction history
app.get('/transactions', authenticateToken, (req, res) => {
  const userId = req.user.id;

  const query = `SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC`;
  db.all(query, [userId], (err, rows) => {
      if (err) {
          console.error('Error fetching transactions:', err.message);
          return res.status(500).json({ error: 'Database error.' });
      }

      res.status(200).json({ transactions: rows });
  });
});
// Get user points
app.get('/points', authenticateToken, (req, res) => {
  const userId = req.user.id;

  const query = `SELECT points FROM users WHERE id = ?`;
  db.get(query, [userId], (err, row) => {
      if (err) {
          console.error('Error fetching points:', err.message);
          return res.status(500).json({ error: 'Database error.' });
      }

      if (!row) return res.status(404).json({ error: 'User not found.' });

      res.status(200).json({ points: row.points });
  });
});

// Add points to a user
app.post('/add-points', authenticateToken, (req, res) => {
  const { points } = req.body;
  const userId = req.user.id;

  if (!points || points <= 0) {
      return res.status(400).json({ error: 'Invalid points value.' });
  }

  const query = `UPDATE users SET points = points + ? WHERE id = ?`;
  db.run(query, [points, userId], function (err) {
      if (err) {
          console.error('Error updating points:', err.message);
          return res.status(500).json({ error: 'Database error.' });
      }

      res.status(200).json({ message: `Added ${points} points successfully!` });
  });
});

// Redeem reward
app.post('/redeem-reward', authenticateToken, (req, res) => {
  const { rewardId } = req.body;
  const userId = req.user.id;

  const getRewardQuery = `SELECT * FROM rewards WHERE id = ? AND stock > 0`;
  db.get(getRewardQuery, [rewardId], (err, reward) => {
      if (err) {
          console.error('Error fetching reward:', err.message);
          return res.status(500).json({ error: 'Database error.' });
      }

      if (!reward) return res.status(404).json({ error: 'Reward not found or out of stock.' });

      const getUserQuery = `SELECT points FROM users WHERE id = ?`;
      db.get(getUserQuery, [userId], (err, user) => {
          if (err) {
              console.error('Error fetching user points:', err.message);
              return res.status(500).json({ error: 'Database error.' });
          }

          if (user.points < reward.points_required) {
              return res.status(400).json({ error: 'Insufficient points.' });
          }

          const updatePointsQuery = `UPDATE users SET points = points - ? WHERE id = ?`;
          const updateStockQuery = `UPDATE rewards SET stock = stock - 1 WHERE id = ?`;

          db.run(updatePointsQuery, [reward.points_required, userId], (err) => {
              if (err) {
                  console.error('Error updating user points:', err.message);
                  return res.status(500).json({ error: 'Database error.' });
              }

              db.run(updateStockQuery, [rewardId], (err) => {
                  if (err) {
                      console.error('Error updating reward stock:', err.message);
                      return res.status(500).json({ error: 'Database error.' });
                  }

                  // Log the redemption action
                  const logQuery = `
                      INSERT INTO logs (user_id, action, details)
                      VALUES (?, 'redeem-reward', ?)
                  `;
                  const details = `Redeemed reward: ${reward.name}, Points Required: ${reward.points_required}`;
                  db.run(logQuery, [userId, details], (err) => {
                      if (err) {
                          console.error('Error logging action:', err.message);
                      }
                  });

                  res.status(200).json({ message: 'Reward redeemed successfully!', reward: reward.name });
              });
          });
      });
  });
});

// View transaction history
app.get('/transactions', authenticateToken, (req, res) => {
  const userId = req.user.id;

  const query = `SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC`;
  db.all(query, [userId], (err, rows) => {
      if (err) {
          console.error('Error fetching transactions:', err.message);
          return res.status(500).json({ error: 'Database error.' });
      }

      res.status(200).json({ transactions: rows });
  });
});
