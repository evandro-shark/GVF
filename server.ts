import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-for-saas';

const db = new Database('database.sqlite');

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cnpj TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    client_id INTEGER,
    type TEXT NOT NULL CHECK(type IN ('sale', 'payment', 'expense', 'income')),
    amount REAL NOT NULL,
    description TEXT,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    due_date DATETIME,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(client_id) REFERENCES clients(id)
  );
`);

// Add user_id to existing tables if they don't exist
const clientsTableInfo = db.pragma('table_info(clients)') as any[];
if (!clientsTableInfo.some(col => col.name === 'user_id')) {
  db.exec('ALTER TABLE clients ADD COLUMN user_id INTEGER REFERENCES users(id)');
}

const txTableInfo = db.pragma('table_info(transactions)') as any[];
if (!txTableInfo.some(col => col.name === 'user_id')) {
  db.exec('ALTER TABLE transactions ADD COLUMN user_id INTEGER REFERENCES users(id)');
}

// Check if due_date exists, if not add it
const hasDueDate = txTableInfo.some(col => col.name === 'due_date');
if (!hasDueDate) {
  db.exec('ALTER TABLE transactions ADD COLUMN due_date DATETIME');
  db.exec('UPDATE transactions SET due_date = date WHERE type = "sale"');
}

// Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (token == null) return res.status(401).json({ error: 'Unauthorized' });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'Forbidden' });
    req.user = user;
    next();
  });
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes

  // --- Auth ---
  app.post('/api/auth/register', async (req, res) => {
    const { cnpj, name, email, password } = req.body;
    if (!cnpj || !name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    try {
      const password_hash = await bcrypt.hash(password, 10);
      const stmt = db.prepare('INSERT INTO users (cnpj, name, email, password_hash) VALUES (?, ?, ?, ?)');
      const info = stmt.run(cnpj, name, email, password_hash);
      
      // Assign existing orphaned records to the first user created (for smooth transition)
      const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as any).count;
      if (userCount === 1) {
        db.exec(`UPDATE clients SET user_id = ${info.lastInsertRowid} WHERE user_id IS NULL`);
        db.exec(`UPDATE transactions SET user_id = ${info.lastInsertRowid} WHERE user_id IS NULL`);
      }

      const token = jwt.sign({ id: info.lastInsertRowid, cnpj, name, email }, JWT_SECRET);
      res.json({ token, user: { id: info.lastInsertRowid, cnpj, name, email } });
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(400).json({ error: 'CNPJ or Email already exists' });
      }
      res.status(500).json({ error: 'Failed to register user' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    const { cnpj, password } = req.body;
    if (!cnpj || !password) return res.status(400).json({ error: 'CNPJ and password are required' });

    try {
      const user = db.prepare('SELECT * FROM users WHERE cnpj = ?').get(cnpj) as any;
      if (!user) return res.status(400).json({ error: 'Invalid credentials' });

      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) return res.status(400).json({ error: 'Invalid credentials' });

      const token = jwt.sign({ id: user.id, cnpj: user.cnpj, name: user.name, email: user.email }, JWT_SECRET);
      res.json({ token, user: { id: user.id, cnpj: user.cnpj, name: user.name, email: user.email } });
    } catch (error) {
      res.status(500).json({ error: 'Failed to login' });
    }
  });

  app.get('/api/auth/me', authenticateToken, (req: any, res) => {
    res.json({ user: req.user });
  });

  // --- Clients ---
  app.get('/api/clients', authenticateToken, (req: any, res) => {
    const userId = req.user.id;
    try {
      const clients = db.prepare('SELECT * FROM clients WHERE user_id = ? ORDER BY name').all(userId);
      
      // Calculate balance for each client
      const clientsWithBalance = clients.map((client: any) => {
        const sales = db.prepare("SELECT SUM(amount) as total FROM transactions WHERE client_id = ? AND type = 'sale' AND user_id = ?").get(client.id, userId) as any;
        const payments = db.prepare("SELECT SUM(amount) as total FROM transactions WHERE client_id = ? AND type = 'payment' AND user_id = ?").get(client.id, userId) as any;
        
        const totalSales = sales.total || 0;
        const totalPayments = payments.total || 0;
        const balance = totalSales - totalPayments; // Positive means they owe money
        
        return { ...client, balance };
      });
      
      res.json(clientsWithBalance);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch clients' });
    }
  });

  app.post('/api/clients', authenticateToken, (req: any, res) => {
    const { name, phone, email } = req.body;
    const userId = req.user.id;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    try {
      const stmt = db.prepare('INSERT INTO clients (user_id, name, phone, email) VALUES (?, ?, ?, ?)');
      const info = stmt.run(userId, name, phone || null, email || null);
      res.json({ id: info.lastInsertRowid, user_id: userId, name, phone, email });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create client' });
    }
  });

  app.get('/api/clients/:id', authenticateToken, (req: any, res) => {
    const userId = req.user.id;
    try {
      const client = db.prepare('SELECT * FROM clients WHERE id = ? AND user_id = ?').get(req.params.id, userId);
      if (!client) return res.status(404).json({ error: 'Client not found' });
      res.json(client);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch client' });
    }
  });

  // --- Transactions ---
  app.get('/api/transactions', authenticateToken, (req: any, res) => {
    const { client_id } = req.query;
    const userId = req.user.id;
    try {
      let transactions;
      if (client_id) {
        transactions = db.prepare(`
          SELECT t.*, c.name as client_name 
          FROM transactions t 
          LEFT JOIN clients c ON t.client_id = c.id 
          WHERE t.client_id = ? AND t.user_id = ?
          ORDER BY t.date DESC
        `).all(client_id, userId);
      } else {
        transactions = db.prepare(`
          SELECT t.*, c.name as client_name 
          FROM transactions t 
          LEFT JOIN clients c ON t.client_id = c.id 
          WHERE t.user_id = ?
          ORDER BY t.date DESC
        `).all(userId);
      }
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch transactions' });
    }
  });

  app.post('/api/transactions', authenticateToken, (req: any, res) => {
    const { client_id, type, amount, description, date, due_date } = req.body;
    const userId = req.user.id;
    
    if (!type || !amount) return res.status(400).json({ error: 'Type and amount are required' });
    if (amount <= 0) return res.status(400).json({ error: 'Amount must be positive' });
    
    // Validate client belongs to user if client_id is provided
    if (client_id) {
      const client = db.prepare('SELECT id FROM clients WHERE id = ? AND user_id = ?').get(client_id, userId);
      if (!client) return res.status(403).json({ error: 'Invalid client' });
    }
    
    try {
      const stmt = db.prepare('INSERT INTO transactions (user_id, client_id, type, amount, description, date, due_date) VALUES (?, ?, ?, ?, ?, ?, ?)');
      const info = stmt.run(
        userId,
        client_id || null, 
        type, 
        amount, 
        description || null, 
        date || new Date().toISOString(),
        type === 'sale' ? (due_date || date || new Date().toISOString()) : null
      );
      res.json({ id: info.lastInsertRowid, user_id: userId, client_id, type, amount, description, date, due_date });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create transaction' });
    }
  });

  app.delete('/api/transactions/:id', authenticateToken, (req: any, res) => {
    const userId = req.user.id;
    try {
      const stmt = db.prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?');
      const info = stmt.run(req.params.id, userId);
      if (info.changes === 0) return res.status(404).json({ error: 'Transaction not found or unauthorized' });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete transaction' });
    }
  });

  // --- Dashboard Stats ---
  app.get('/api/stats', authenticateToken, (req: any, res) => {
    const userId = req.user.id;
    try {
      // Total sales (all time)
      const totalSales = (db.prepare("SELECT SUM(amount) as total FROM transactions WHERE type = 'sale' AND user_id = ?").get(userId) as any).total || 0;
      
      // Total received (payments from clients + general income)
      const totalReceived = (db.prepare("SELECT SUM(amount) as total FROM transactions WHERE type IN ('payment', 'income') AND user_id = ?").get(userId) as any).total || 0;
      
      // Total expenses
      const totalExpenses = (db.prepare("SELECT SUM(amount) as total FROM transactions WHERE type = 'expense' AND user_id = ?").get(userId) as any).total || 0;
      
      // Accounts receivable (Total Sales - Total Payments)
      const totalPayments = (db.prepare("SELECT SUM(amount) as total FROM transactions WHERE type = 'payment' AND user_id = ?").get(userId) as any).total || 0;
      const accountsReceivable = totalSales - totalPayments;
      
      // Net Balance (Total Received - Total Expenses)
      const netBalance = totalReceived - totalExpenses;

      // Calculate receivables by period using FIFO allocation
      let receivableToday = 0;
      let receivableMonth = 0;
      let receivableYear = 0;

      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const monthStr = todayStr.substring(0, 7);
      const yearStr = todayStr.substring(0, 4);

      const clients = db.prepare('SELECT id FROM clients WHERE user_id = ?').all(userId);
      
      for (const client of clients as any[]) {
        const sales = db.prepare("SELECT amount, due_date FROM transactions WHERE client_id = ? AND type = 'sale' AND user_id = ? ORDER BY due_date ASC").all(client.id, userId) as any[];
        const payments = db.prepare("SELECT SUM(amount) as total FROM transactions WHERE client_id = ? AND type = 'payment' AND user_id = ?").get(client.id, userId) as any;
        
        const totalClientSales = sales.reduce((sum, s) => sum + s.amount, 0);
        const totalClientPayments = payments.total || 0;
        let unpaidBalance = totalClientSales - totalClientPayments;
        
        if (unpaidBalance > 0) {
          const salesDesc = [...sales].sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime());
          
          for (const sale of salesDesc) {
            if (unpaidBalance <= 0) break;
            
            const unpaidAmount = Math.min(sale.amount, unpaidBalance);
            unpaidBalance -= unpaidAmount;
            
            const saleDateStr = sale.due_date ? sale.due_date.split('T')[0] : '';
            
            if (saleDateStr === todayStr) {
              receivableToday += unpaidAmount;
            }
            if (saleDateStr.startsWith(monthStr)) {
              receivableMonth += unpaidAmount;
            }
            if (saleDateStr.startsWith(yearStr)) {
              receivableYear += unpaidAmount;
            }
          }
        }
      }

      // Recent transactions
      const recentTransactions = db.prepare(`
        SELECT t.*, c.name as client_name 
        FROM transactions t 
        LEFT JOIN clients c ON t.client_id = c.id 
        WHERE t.user_id = ?
        ORDER BY t.date DESC LIMIT 5
      `).all(userId);

      res.json({
        totalSales,
        totalReceived,
        totalExpenses,
        accountsReceivable,
        netBalance,
        receivableToday,
        receivableMonth,
        receivableYear,
        recentTransactions
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
