
require('dotenv').config();

const express = require('express')
const { createClient } = require('@supabase/supabase-js');

const app = express();

const port = process.env.PORT || 3000;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY; 

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("missing url or anon key environment variable");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

app.use(express.static('public'));


app.get('/', (req, res) => {
    res.send('Server is running and connected to Supabase environment variables.');
  });

  app.get('/api/config', (req, res) => {
    res.json({
        supabaseUrl: process.env.SUPABASE_URL,
        supabaseAnonKey: process.env.SUPABASE_ANON_KEY
    });
});

  // Route to fetch example data from a 'posts' table (replace with your table name)
  app.get('/profiles', async (req, res) => {
    try {
      // Example query: select all rows from 'posts' table
      const { data, error } = await supabase
        .from('profiles')
        .select('*');

      if (error) throw error;
  
      res.status(200).json(data);
    } catch (error) {
      console.error("Error fetching posts:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
  console.log('4')
  // Start the server
  app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
console.log('5')

app.get('/main_portal', (req, res) => {
  res.render('main_portal', {
      vapidKey: process.env.FIREBASE_KEY
  });
});

app.post('/api/save-fcm-token', async (req, res) => {
  try {
      const { token, userId } = req.body;
      
      console.log('Received FCM token:', token);
      
      
      res.json({ success: true });
  } catch (error) {
      console.error('Error saving token:', error);
      res.status(500).json({ error: 'Failed to save token' });
  }
});
