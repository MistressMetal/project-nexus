// server.js - Backend with member authentication and admin controls
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);

const app = express();
const port = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Session configuration
app.use(session({
  store: new SQLiteStore({ db: 'sessions.db' }),
  secret: 'your-secret-key-change-this-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
//    httpOnly: true,
    secure: true // Set to true if using HTTPS
  }
}));

// Initialize SQLite database
const db = new sqlite3.Database('./database.db', (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    
    // Create members table
    db.run(`CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'member',
      status TEXT DEFAULT 'pending',
      member_since DATETIME,
      last_login DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create magic links table for authentication
    db.run(`CREATE TABLE IF NOT EXISTS magic_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      used INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create access requests table
    db.run(`CREATE TABLE IF NOT EXISTS access_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      name TEXT NOT NULL,
      message TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create a default admin if none exists
    db.get('SELECT * FROM members WHERE role = "admin"', [], (err, row) => {
      if (!row) {
        db.run(`INSERT INTO members (email, name, role, status, member_since) 
                VALUES (?, ?, ?, ?, ?)`, 
                ['admin@club.com', 'Admin User', 'admin', 'active', new Date().toISOString()],
                (err) => {
                  if (!err) {
                    console.log('Default admin created: admin@club.com');
                    console.log('Visit /admin-login to access admin panel');
                  }
                });
      }
    });
  }
});

// Middleware to check if user is authenticated
function requireAuth(req, res, next) {
  if (req.session.userId) {
    // Check if member is still active
    db.get('SELECT * FROM members WHERE id = ? AND status = "active"', 
      [req.session.userId], 
      (err, member) => {
        if (err || !member) {
          req.session.destroy();
          return res.status(401).json({ error: 'Not authenticated or access revoked' });
        }
        req.user = member;
        next();
      });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
}

// Middleware to check if user is admin
function requireAdmin(req, res, next) {
  if (req.session.userId) {
    db.get('SELECT * FROM members WHERE id = ? AND role = "admin" AND status = "active"', 
      [req.session.userId], 
      (err, admin) => {
        if (err || !admin) {
          return res.status(403).json({ error: 'Admin access required' });
        }
        req.user = admin;
        next();
      });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
}

// Public Routes

// Request access to the club
app.post('/api/request-access', (req, res) => {
  const { email, name, message } = req.body;
  
  if (!email || !name) {
    return res.status(400).json({ error: 'Email and name are required' });
  }

  // Check if already a member
  db.get('SELECT * FROM members WHERE email = ?', [email], (err, member) => {
    if (member) {
      return res.status(400).json({ error: 'This email is already registered' });
    }

    // Check if request already exists
    db.get('SELECT * FROM access_requests WHERE email = ? AND status = "pending"', 
      [email], 
      (err, request) => {
        if (request) {
          return res.status(400).json({ error: 'Access request already pending' });
        }

        db.run(`INSERT INTO access_requests (email, name, message) VALUES (?, ?, ?)`,
          [email, name, message || ''],
          function(err) {
            if (err) {
              return res.status(500).json({ error: err.message });
            }
            res.json({ 
              message: 'Access request submitted! Leadership will review your request.',
              requestId: this.lastID 
            });
          });
      });
  });
});

// Generate magic link for login (simulated - in production, send via email)
app.post('/api/generate-login-link', (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  // Check if member is active
  db.get('SELECT * FROM members WHERE email = ? AND status = "active"', [email], (err, member) => {
    if (err || !member) {
      return res.status(404).json({ error: 'No active member found with this email' });
    }

    // Generate magic link token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    db.run(`INSERT INTO magic_links (email, token, expires_at) VALUES (?, ?, ?)`,
      [email, token, expiresAt.toISOString()],
      function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        // In production, send this link via email
        const loginLink = `https://localhost:${port}/login/${token}`;
        res.json({ 
          message: 'Login link generated! (In production, this would be emailed)',
          loginLink: loginLink,
          expiresIn: '15 minutes'
        });
      });
  });
});

// Verify magic link and log in
app.get('/api/verify-token/:token', (req, res) => {
  const { token } = req.params;

  db.get(`SELECT * FROM magic_links WHERE token = ? AND used = 0 AND expires_at > datetime('now')`,
    [token],
    (err, link) => {
      if (err || !link) {
        return res.status(400).json({ error: 'Invalid or expired login link' });
      }

      // Get member info
      db.get('SELECT * FROM members WHERE email = ? AND status = "active"', 
        [link.email], 
        (err, member) => {
          if (err || !member) {
            return res.status(404).json({ error: 'Member not found or inactive' });
          }

          // Mark link as used
          db.run('UPDATE magic_links SET used = 1 WHERE id = ?', [link.id]);

          // Update last login
          db.run('UPDATE members SET last_login = ? WHERE id = ?', 
            [new Date().toISOString(), member.id]);

          // Create session
          req.session.userId = member.id;
          req.session.email = member.email;
          req.session.role = member.role;

          res.json({ 
            success: true,
            member: {
              id: member.id,
              name: member.name,
              email: member.email,
              role: member.role
            }
          });
        });
    });
});

// Check authentication status
app.get('/api/check-auth', (req, res) => {
  if (req.session.userId) {
    db.get('SELECT id, name, email, role, member_since FROM members WHERE id = ? AND status = "active"',
      [req.session.userId],
      (err, member) => {
        if (err || !member) {
          req.session.destroy();
          return res.json({ authenticated: false });
        }
        res.json({ 
          authenticated: true, 
          user: member 
        });
      });
  } else {
    res.json({ authenticated: false });
  }
});

// Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// Protected Member Routes

// Get personalized data for logged-in member
app.get('/api/member/dashboard', requireAuth, (req, res) => {
  res.json({
    message: `Welcome back, ${req.user.name}!`,
    memberData: {
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      memberSince: req.user.member_since,
      lastLogin: req.user.last_login
    }
  });
});

// Admin Routes

// Get all access requests
app.get('/api/admin/access-requests', requireAdmin, (req, res) => {
  db.all('SELECT * FROM access_requests WHERE status = "pending" ORDER BY created_at DESC', 
    [], 
    (err, requests) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ requests });
    });
});

// Approve access request
app.post('/api/admin/approve-request/:id', requireAdmin, (req, res) => {
  const requestId = req.params.id;

  db.get('SELECT * FROM access_requests WHERE id = ?', [requestId], (err, request) => {
    if (err || !request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Add as member
    db.run(`INSERT INTO members (email, name, status, member_since) VALUES (?, ?, ?, ?)`,
      [request.email, request.name, 'active', new Date().toISOString()],
      function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        // Update request status
        db.run('UPDATE access_requests SET status = "approved" WHERE id = ?', [requestId]);

        res.json({ 
          message: 'Member approved successfully',
          memberId: this.lastID 
        });
      });
  });
});

// Reject access request
app.post('/api/admin/reject-request/:id', requireAdmin, (req, res) => {
  const requestId = req.params.id;

  db.run('UPDATE access_requests SET status = "rejected" WHERE id = ?', 
    [requestId], 
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Request rejected' });
    });
});

// Get all members
app.get('/api/admin/members', requireAdmin, (req, res) => {
  db.all('SELECT id, name, email, role, status, member_since, last_login, created_at FROM members ORDER BY created_at DESC',
    [],
    (err, members) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ members });
    });
});

// Update member status
app.post('/api/admin/members/:id/status', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['active', 'inactive'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  db.run('UPDATE members SET status = ? WHERE id = ?',
    [status, id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Member status updated', changes: this.changes });
    });
});

// Delete member
app.delete('/api/admin/members/:id', requireAdmin, (req, res) => {
  const { id } = req.params;

  // Prevent deleting yourself
  if (parseInt(id) === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }

  db.run('DELETE FROM members WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'Member deleted', changes: this.changes });
  });
});

// Serve HTML pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/login/:token', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'verify.html'));
});

app.get('/admin-login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-login.html'));
});

app.get('/manifest.json', (req, res) => {
    res.sendFile(path.join(__dirname, 'manifest.json'));
});

app.get('/sw.js', (req, res) => {
    res.set('Content-Type', 'application/javascript');
    res.sendFile(path.join(__dirname, 'service-worker.js'));
});

// Start server
app.listen(port, () => {
  console.log(`Server running at https://localhost:${port}`);
  console.log(`Admin login at https://localhost:${port}/admin-login`);
});

// Close database on exit
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Database connection closed');
    process.exit(0);
  });
});
