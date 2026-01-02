require('dotenv').config()

// server.js - Backend with member authentication and admin controls
const express = require('express');
const { Pool } = require('pg');
// const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');
const session = require('express-session');
//const SQLiteStore = require('connect-sqlite3')(session);
const pgSession = require('connect-pg-simple')(session);

const app = express();
const port = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${port}`;
const isProduction = process.env.NODE_ENV === 'production';


app.set('trust proxy', 1);


// Inititalize PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : false
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
      console.error('Error connecting to database:', err);
  } else {
      console.log('Connected to PostgreSQL database');
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Session configuration with PostgreSQL store
app.use(session({
  store: new pgSession({
      pool: pool,
      tableName: 'session'
  }),
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-this-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax'
  }
}));

// Middleware to check if user is authenticated
async function requireAuth(req, res, next) {
  if (req.session.userId) {
      try {
          const result = await pool.query(
              'SELECT * FROM members WHERE id = $1 AND status = $2',
              [req.session.userId, 'active']
          );
          
          if (result.rows.length === 0) {
              req.session.destroy();
              return res.status(401).json({ error: 'Not authenticated or access revoked' });
          }
          
          req.user = result.rows[0];
          next();
      } catch (err) {
          console.error('Auth check error:', err);
          res.status(500).json({ error: 'Server error' });
      }
  } else {
      res.status(401).json({ error: 'Not authenticated' });
  }
}

// Middleware to check if user is admin
async function requireAdmin(req, res, next) {
  if (req.session.userId) {
      try {
          const result = await pool.query(
              'SELECT * FROM members WHERE id = $1 AND role = $2 AND status = $3',
              [req.session.userId, 'admin', 'active']
          );
          
          if (result.rows.length === 0) {
              return res.status(403).json({ error: 'Admin access required' });
          }
          
          req.user = result.rows[0];
          next();
      } catch (err) {
          console.error('Admin check error:', err);
          res.status(500).json({ error: 'Server error' });
      }
  } else {
      res.status(401).json({ error: 'Not authenticated' });
  }
}

// Public Routes

// Request access to the club
app.post('/api/request-access', async (req, res) => {
  const { email, name, message } = req.body;

  if (!email || !name) {
      return res.status(400).json({ error: 'Email and name are required' });
  }

  try {
      // Check if already a member
      const memberCheck = await pool.query(
          'SELECT * FROM members WHERE email = $1',
          [email]
      );
      
      if (memberCheck.rows.length > 0) {
          return res.status(400).json({ error: 'This email is already registered' });
      }

      // Check if request already exists
      const requestCheck = await pool.query(
          'SELECT * FROM access_requests WHERE email = $1 AND status = $2',
          [email, 'pending']
      );
      
      if (requestCheck.rows.length > 0) {
          return res.status(400).json({ error: 'Access request already pending' });
      }

      // Insert new request
      const result = await pool.query(
          'INSERT INTO access_requests (email, name, message) VALUES ($1, $2, $3) RETURNING id',
          [email, name, message || '']
      );

      res.json({
          message: 'Access request submitted! Leadership will review your request.',
          requestId: result.rows[0].id
      });
  } catch (err) {
      console.error('Request access error:', err);
      res.status(500).json({ error: err.message });
  }
});

// Generate magic link for login
app.post('/api/generate-login-link', async (req, res) => {
  const { email } = req.body;

  if (!email) {
      return res.status(400).json({ error: 'Email is required' });
  }

  try {
      // Check if member is active
      const result = await pool.query(
          'SELECT * FROM members WHERE email = $1 AND status = $2',
          [email, 'active']
      );
      
      if (result.rows.length === 0) {
          return res.status(404).json({ error: 'No active member found with this email' });
      }

      // Generate magic link token
      const token = crypto.randomBytes(32).toString('hex');

      await pool.query(
          `INSERT INTO magic_links (email, token, expires_at) 
           VALUES ($1, $2, NOW() + INTERVAL '15 minutes')`,
          [email, token]
      );

      const loginLink = `${BASE_URL}/login/${token}`;
      
      res.json({
          message: 'Login link generated! (In production, this would be emailed)',
          loginLink: loginLink,
          expiresIn: '15 minutes'
      });
  } catch (err) {
      console.error('Generate login link error:', err);
      res.status(500).json({ error: err.message });
  }
});

// Verify magic link and log in
app.get('/api/verify-token/:token', async (req, res) => {
  const { token } = req.params;

  try {
      // Get valid magic link
      const linkResult = await pool.query(
          'SELECT * FROM magic_links WHERE token = $1 AND used = 0 AND expires_at > NOW()',
          [token]
      );
      
      if (linkResult.rows.length === 0) {
          return res.status(400).json({ error: 'Invalid or expired login link' });
      }

      const link = linkResult.rows[0];

      // Get member info
      const memberResult = await pool.query(
          'SELECT * FROM members WHERE email = $1 AND status = $2',
          [link.email, 'active']
      );
      
      if (memberResult.rows.length === 0) {
          return res.status(404).json({ error: 'Member not found or inactive' });
      }

      const member = memberResult.rows[0];

      // Mark link as used
      await pool.query('UPDATE magic_links SET used = 1 WHERE id = $1', [link.id]);

      // Update last login
      await pool.query(
          'UPDATE members SET last_login = NOW() WHERE id = $1',
          [member.id]
      );

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
  } catch (err) {
      console.error('Verify token error:', err);
      res.status(500).json({ error: err.message });
  }
});

// Check authentication status
app.get('/api/check-auth', async (req, res) => {
  if (req.session.userId) {
      try {
          const result = await pool.query(
              'SELECT id, name, email, role, member_since FROM members WHERE id = $1 AND status = $2',
              [req.session.userId, 'active']
          );
          
          if (result.rows.length === 0) {
              req.session.destroy();
              return res.json({ authenticated: false });
          }
          
          res.json({
              authenticated: true,
              user: result.rows[0]
          });
      } catch (err) {
          console.error('Check auth error:', err);
          res.json({ authenticated: false });
      }
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
app.get('/api/admin/access-requests', requireAdmin, async (req, res) => {
  try {
      const result = await pool.query(
          'SELECT * FROM access_requests WHERE status = $1 ORDER BY created_at DESC',
          ['pending']
      );
      
      res.json({ requests: result.rows });
  } catch (err) {
      console.error('Get access requests error:', err);
      res.status(500).json({ error: err.message });
  }
});

// Approve access request
app.post('/api/admin/approve-request/:id', requireAdmin, async (req, res) => {
  const requestId = req.params.id;

  try {
      // Get request
      const requestResult = await pool.query(
          'SELECT * FROM access_requests WHERE id = $1',
          [requestId]
      );
      
      if (requestResult.rows.length === 0) {
          return res.status(404).json({ error: 'Request not found' });
      }

      const request = requestResult.rows[0];

      // Add as member
      const memberResult = await pool.query(
          'INSERT INTO members (email, name, status, member_since) VALUES ($1, $2, $3, NOW()) RETURNING id',
          [request.email, request.name, 'active']
      );

      // Update request status
      await pool.query(
          'UPDATE access_requests SET status = $1 WHERE id = $2',
          ['approved', requestId]
      );

      res.json({
          message: 'Member approved successfully',
          memberId: memberResult.rows[0].id
      });
  } catch (err) {
      console.error('Approve request error:', err);
      res.status(500).json({ error: err.message });
  }
});

// Reject access request
app.post('/api/admin/reject-request/:id', requireAdmin, async (req, res) => {
  const requestId = req.params.id;

  try {
      const result = await pool.query(
          'UPDATE access_requests SET status = $1 WHERE id = $2',
          ['rejected', requestId]
      );
      
      res.json({ message: 'Request rejected' });
  } catch (err) {
      console.error('Reject request error:', err);
      res.status(500).json({ error: err.message });
  }
});

// Get all members
app.get('/api/admin/members', requireAdmin, async (req, res) => {
  try {
      const result = await pool.query(
          'SELECT id, name, email, role, status, member_since, last_login, created_at FROM members ORDER BY created_at DESC'
      );
      
      res.json({ members: result.rows });
  } catch (err) {
      console.error('Get members error:', err);
      res.status(500).json({ error: err.message });
  }
});

// Update member status
app.post('/api/admin/members/:id/status', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
  }

  try {
      const result = await pool.query(
          'UPDATE members SET status = $1 WHERE id = $2',
          [status, id]
      );
      
      res.json({ message: 'Member status updated', changes: result.rowCount });
  } catch (err) {
      console.error('Update member status error:', err);
      res.status(500).json({ error: err.message });
  }
});

// Delete member
app.delete('/api/admin/members/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;

  // Prevent deleting yourself
  if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
  }

  try {
      const result = await pool.query(
          'DELETE FROM members WHERE id = $1',
          [id]
      );
      
      res.json({ message: 'Member deleted', changes: result.rowCount });
  } catch (err) {
      console.error('Delete member error:', err);
      res.status(500).json({ error: err.message });
  }
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
  res.sendFile(path.join(__dirname, 'sw.js'));
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running at ${BASE_URL}`);
  console.log(`Admin login at ${BASE_URL}/admin-login`);
});

// Close database pool on exit
process.on('SIGINT', async () => {
  await pool.end();
  console.log('Database pool closed');
  process.exit(0);
});