const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');
const app = express();
const port = 3000;

// Connect to SQLite database
const db = new sqlite3.Database('./database.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error('Error when connecting to the database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
    }
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

// Configure express-session
app.use(session({
    secret: '1023520827Bob!',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, httpOnly: true } // Set secure to true in production with HTTPS
}));

// Middleware to check if user is logged in
const isLoggedIn = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.status(401).json({ message: "Unauthorized access." });
    }
};

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: "Access forbidden. Admin rights required." });
    }
};

// Middleware to check if user is admin or IT support
const isAdminOrIT = (req, res, next) => {
    if (req.session.user && (req.session.user.role === 'admin' || req.session.user.role === 'it_support')) {
        next();
    } else {
        res.status(403).json({ message: "Access forbidden. Admin or IT Support rights required." });
    }
};

// Create a table to log actions
db.run(`CREATE TABLE IF NOT EXISTS ActionLog (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    tableName TEXT NOT NULL,
    recordId INTEGER,
    oldData TEXT,
    newData TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// Middleware to log actions
function logAction(action, tableName, recordId, oldData, newData) {
    return new Promise((resolve, reject) => {
        db.run('INSERT INTO ActionLog (action, tableName, recordId, oldData, newData) VALUES (?, ?, ?, ?, ?)',
            [action, tableName, recordId, JSON.stringify(oldData), JSON.stringify(newData)],
            function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            }
        );
    });
}

// Routes for different dashboards
app.get('/admin', isLoggedIn, (req, res) => {
    if (req.session.user.role === 'admin') {
        res.sendFile(path.join(__dirname, 'public', 'admin_dashboard.html'));
    } else {
        res.status(403).send('Access denied');
    }
});

app.get('/it_support', isLoggedIn, (req, res) => {
    if (req.session.user.role === 'it_support') {
        res.sendFile(path.join(__dirname, 'public', 'it_support_dashboard.html'));
    } else {
        res.status(403).send('Access denied');
    }
});

app.get('/user', isLoggedIn, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'user_dashboard.html'));
});

// Signup route
app.post('/signup', async (req, res) => {
    const { username, password, role } = req.body;
    const validRoles = ['admin', 'user', 'it_support'];

    if (username.length < 5 || password.length < 8 || !validRoles.includes(role)) {
        return res.status(400).json({ message: "Invalid input data." });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.run('INSERT INTO Users(username, password, role) VALUES(?, ?, ?)', [username, hashedPassword, role], async function(err) {
            if (err) {
                console.error(err.message);
                res.status(500).json({ message: "Failed to create new user." });
            } else {
                await logAction('INSERT', 'Users', this.lastID, null, { username, role });
                res.status(201).json({ message: "User created successfully." });
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error creating user." });
    }
});

// Login route
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.get('SELECT * FROM Users WHERE username = ?', [username], async (err, user) => {
        if (err) {
            console.error(err.message);
            res.status(500).json({ message: "An error occurred during login." });
        } else if (user) {
            const match = await bcrypt.compare(password, user.password);
            if (match) {
                req.session.user = { userId: user.user_id, username: user.username, role: user.role };
                res.json({ role: user.role });
            } else {
                res.status(401).json({ message: 'Invalid username or password' });
            }
        } else {
            res.status(401).json({ message: 'Invalid username or password' });
        }
    });
});

// Logout route
app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Failed to destroy session:', err);
            res.status(500).json({ message: 'Failed to log out.' });
        } else {
            res.json({ message: 'Logged out successfully.' });
        }
    });
});

// Get user info
app.get('/user_info', isLoggedIn, (req, res) => {
    res.json({ username: req.session.user.username, role: req.session.user.role });
});

// Update user info
app.patch('/update_user_info', isLoggedIn, async (req, res) => {
    const { username, password } = req.body;
    const userId = req.session.user.userId;

    if (username && username.length < 5) {
        return res.status(400).json({ message: "Username must be at least 5 characters long." });
    }

    if (password && password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters long." });
    }

    try {
        let query = 'UPDATE Users SET ';
        let params = [];
        let updates = [];

        if (username) {
            updates.push('username = ?');
            params.push(username);
        }

        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            updates.push('password = ?');
            params.push(hashedPassword);
        }

        query += updates.join(', ');
        query += ' WHERE user_id = ?';
        params.push(userId);

        db.run(query, params, async function(err) {
            if (err) {
                console.error('Error updating user info:', err.message);
                res.status(500).json({ message: "Failed to update user info." });
            } else {
                await logAction('UPDATE', 'Users', userId, null, { username, passwordChanged: !!password });
                res.json({ message: "User info updated successfully." });
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error updating user info." });
    }
});

// Submit ticket route
app.post('/submit_ticket', isLoggedIn, async (req, res) => {
    const { Title, Description, Priority, Category } = req.body;
    const UserID = req.session.user.userId;
    const Status = 'Open';

    db.run('INSERT INTO Tickets(Title, Description, UserID, Priority, Status, Category) VALUES(?, ?, ?, ?, ?, ?)',
           [Title, Description, UserID, Priority, Status, Category], async function(err) {
        if (err) {
            console.error('Error inserting ticket:', err.message);
            res.status(500).json({ message: "Failed to submit ticket." });
        } else {
            await logAction('INSERT', 'Tickets', this.lastID, null, { Title, Description, UserID, Priority, Status, Category });
            res.json({ message: "Ticket submitted successfully!", TicketID: this.lastID });
        }
    });
});

// Get tickets route
app.get('/tickets', isLoggedIn, (req, res) => {
    let query = "SELECT Tickets.*, Users.username AS Username FROM Tickets INNER JOIN Users ON Tickets.UserID = Users.user_id";
    let params = [];

    if (req.session.user.role === 'user') {
        query += " WHERE Tickets.UserID = ?";
        params.push(req.session.user.userId);
    }

    db.all(query, params, (err, tickets) => {
        if (err) {
            console.error('Error fetching tickets:', err.message);
            res.status(500).json({ message: "Failed to retrieve tickets." });
        } else {
            res.json({ tickets });
        }
    });
});

// Update ticket route
app.patch('/update_ticket/:TicketID', isLoggedIn, async (req, res) => {
    const { TicketID } = req.params;
    const { Title, Description, Priority, Status, Category, AssignedTo } = req.body;
    const UpdatedAt = new Date().toISOString();

    let query = 'UPDATE Tickets SET Title = ?, Description = ?, Priority = ?, Status = ?, Category = ?, AssignedTo = ?, UpdatedAt = ? WHERE TicketID = ?';
    let params = [Title, Description, Priority, Status, Category, AssignedTo, UpdatedAt, TicketID];

    if (req.session.user.role === 'user') {
        query += ' AND UserID = ?';
        params.push(req.session.user.userId);
    }

    db.get('SELECT * FROM Tickets WHERE TicketID = ?', [TicketID], async (err, oldTicket) => {
        if (err) {
            console.error('Error fetching old ticket data:', err.message);
            return res.status(500).json({ message: "Failed to update ticket." });
        }

        db.run(query, params, async function(err) {
            if (err) {
                console.error('Error updating ticket:', err.message);
                res.status(500).json({ message: "Failed to update ticket." });
            } else {
                if (this.changes > 0) {
                    await logAction('UPDATE', 'Tickets', TicketID, oldTicket, { Title, Description, Priority, Status, Category, AssignedTo, UpdatedAt });
                    res.json({ message: "Ticket updated successfully!" });
                } else {
                    res.status(404).json({ message: "Ticket not found or you don't have permission to update." });
                }
            }
        });
    });
});

// Get equipment route
app.get('/equipment', isLoggedIn, (req, res) => {
    db.all('SELECT * FROM Equipment', [], (err, equipment) => {
        if (err) {
            console.error('Error fetching equipment:', err.message);
            res.status(500).json({ message: "Failed to retrieve equipment." });
        } else {
            res.json(equipment);
        }
    });
});

// Borrow equipment route
app.post('/borrow_equipment', isLoggedIn, async (req, res) => {
    const { EquipmentID, Quantity } = req.body;
    const UserID = req.session.user.userId;
    const BorrowDate = new Date().toISOString();

    db.get('SELECT AvailableStock FROM Equipment WHERE EquipmentID = ?', [EquipmentID], async (err, row) => {
        if (err) {
            console.error('Error checking equipment availability:', err.message);
            return res.status(500).json({ message: "Failed to check equipment availability." });
        }
        if (!row || row.AvailableStock < Quantity) {
            return res.status(400).json({ message: "Insufficient stock available." });
        }

        db.run('BEGIN TRANSACTION');

        try {
            await new Promise((resolve, reject) => {
                db.run('INSERT INTO EquipmentBorrowing (EquipmentID, UserID, Quantity, BorrowDate, Status) VALUES (?, ?, ?, ?, ?)',
                    [EquipmentID, UserID, Quantity, BorrowDate, 'Borrowed'], async function(err) {
                    if (err) reject(err);
                    else {
                        await logAction('INSERT', 'EquipmentBorrowing', this.lastID, null, { EquipmentID, UserID, Quantity, BorrowDate, Status: 'Borrowed' });
                        resolve();
                    }
                });
            });

            await new Promise((resolve, reject) => {
                db.run('UPDATE Equipment SET AvailableStock = AvailableStock - ? WHERE EquipmentID = ?',
                    [Quantity, EquipmentID], async function(err) {
                    if (err) reject(err);
                    else {
                        await logAction('UPDATE', 'Equipment', EquipmentID, { AvailableStock: row.AvailableStock }, { AvailableStock: row.AvailableStock - Quantity });
                        resolve();
                    }
                });
            });

            db.run('COMMIT');
            res.json({ message: "Equipment borrowed successfully." });
        } catch (error) {
            db.run('ROLLBACK');
            console.error('Error in borrowing process:', error);
            res.status(500).json({ message: "Failed to borrow equipment." });
        }
    });
});

// Return equipment route
app.post('/return_equipment', isLoggedIn, async (req, res) => {
    const { BorrowingID } = req.body;
    const ReturnDate = new Date().toISOString();

    db.get('SELECT EquipmentID, Quantity FROM EquipmentBorrowing WHERE BorrowingID = ? AND Status = "Borrowed"',
        [BorrowingID], async (err, row) => {
        if (err) {
            console.error('Error fetching borrowing record:', err.message);
            return res.status(500).json({ message: "Failed to process equipment return." });
        }
        if (!row) {
            return res.status(404).json({ message: "Borrowing record not found or already returned." });
        }

        db.run('BEGIN TRANSACTION');

        try {
            await new Promise((resolve, reject) => {
                db.run('UPDATE EquipmentBorrowing SET Status = ?, ReturnDate = ? WHERE BorrowingID = ?',
                    ['Returned', ReturnDate, BorrowingID], async function(err) {
                    if (err) reject(err);
                    else {
                        await logAction('UPDATE', 'EquipmentBorrowing', BorrowingID, { Status: 'Borrowed', ReturnDate: null }, { Status: 'Returned', ReturnDate });
                        resolve();
                    }
                });
            });

            await new Promise((resolve, reject) => {
                db.run('UPDATE Equipment SET AvailableStock = AvailableStock + ? WHERE EquipmentID = ?',
                    [row.Quantity, row.EquipmentID], async function(err) {
                    if (err) reject(err);
                    else {
                        await logAction('UPDATE', 'Equipment', row.EquipmentID, null, { AvailableStock: `Increased by ${row.Quantity}` });
                        resolve();
                    }
                });
            });

            db.run('COMMIT');
            res.json({ message: "Equipment returned successfully." });
        } catch (error) {
            db.run('ROLLBACK');
            console.error('Error in return process:', error);
            res.status(500).json({ message: "Failed to return equipment." });
        }
    });
});

// Add knowledge base article route
app.post('/add_article', isAdminOrIT, async (req, res) => {
    const { Title, Content, Category } = req.body;
    const CreatedBy = req.session.user.userId;
    const CreatedAt = new Date().toISOString();

    db.run('INSERT INTO KnowledgeBase (Title, Content, Category, CreatedBy, CreatedAt, UpdatedAt) VALUES (?, ?, ?, ?, ?, ?)',
        [Title, Content, Category, CreatedBy, CreatedAt, CreatedAt], async function(err) {
        if (err) {
            console.error('Error adding knowledge base article:', err.message);
            res.status(500).json({ message: "Failed to add article." });
        } else {
            await logAction('INSERT', 'KnowledgeBase', this.lastID, null, { Title, Content, Category, CreatedBy, CreatedAt });
            res.json({ message: "Article added successfully.", ArticleID: this.lastID });
        }
    });
});

// Get knowledge base articles route
app.get('/knowledge_base', isLoggedIn, (req, res) => {
    db.all('SELECT KnowledgeBase.*, Users.username AS AuthorName FROM KnowledgeBase INNER JOIN Users ON KnowledgeBase.CreatedBy = Users.user_id', [], (err, articles) => {
        if (err) {
            console.error('Error fetching knowledge base articles:', err.message);
            res.status(500).json({ message: "Failed to retrieve articles." });
        } else {
            res.json({ articles });
        }
    });
});

// Get single knowledge base article route
app.get('/knowledge_base/:ArticleID', isLoggedIn, (req, res) => {
    const { ArticleID } = req.params;
    db.get('SELECT KnowledgeBase.*, Users.username AS AuthorName FROM KnowledgeBase INNER JOIN Users ON KnowledgeBase.CreatedBy = Users.user_id WHERE ArticleID = ?', [ArticleID], (err, article) => {
        if (err) {
            console.error('Error fetching knowledge base article:', err.message);
            res.status(500).json({ message: "Failed to retrieve article." });
        } else if (article) {
            res.json(article);
        } else {
            res.status(404).json({ message: "Article not found." });
        }
    });
});

// Admin routes for database management
app.get('/admin/users', isAdmin, (req, res) => {
    db.all('SELECT * FROM Users', [], (err, users) => {
        if (err) {
            console.error('Error fetching users:', err.message);
            res.status(500).json({ message: "Failed to retrieve users." });
        } else {
            res.json(users);
        }
    });
});

app.patch('/admin/users/:userId', isAdmin, async (req, res) => {
    const { userId } = req.params;
    const { username, role, password } = req.body;

    let query = 'UPDATE Users SET ';
    let params = [];
    let updates = [];

    if (username) {
        updates.push('username = ?');
        params.push(username);
    }

    if (role) {
        updates.push('role = ?');
        params.push(role);
    }

    if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        updates.push('password = ?');
        params.push(hashedPassword);
    }

    query += updates.join(', ');
    query += ' WHERE user_id = ?';
    params.push(userId);

    db.run(query, params, async function(err) {
        if (err) {
            console.error('Error updating user:', err.message);
            res.status(500).json({ message: "Failed to update user." });
        } else {
            await logAction('UPDATE', 'Users', userId, null, { username, role, passwordChanged: !!password });
            res.json({ message: "User updated successfully." });
        }
    });
});

app.delete('/admin/users/:userId', isAdmin, async (req, res) => {
    const { userId } = req.params;

    db.run('DELETE FROM Users WHERE user_id = ?', [userId], async function(err) {
        if (err) {
            console.error('Error deleting user:', err.message);
            res.status(500).json({ message: "Failed to delete user." });
        } else {
            await logAction('DELETE', 'Users', userId, null, null);
            res.json({ message: "User deleted successfully." });
        }
    });
});

// Rollback route for admin
app.post('/admin/rollback', isAdmin, (req, res) => {
    db.get('SELECT * FROM ActionLog ORDER BY id DESC LIMIT 1', [], (err, lastAction) => {
        if (err) {
            console.error('Error fetching last action:', err.message);
            return res.status(500).json({ message: "Failed to fetch last action." });
        }
        if (!lastAction) {
            return res.status(404).json({ message: "No action to rollback." });
        }

        switch (lastAction.action) {
            case 'INSERT':
                db.run(`DELETE FROM ${lastAction.tableName} WHERE id = ?`, [lastAction.recordId], (err) => {
                    if (err) {
                        console.error('Rollback error:', err.message);
                        return res.status(500).json({ message: "Rollback failed." });
                    }
                    res.json({ message: "Last insert action rolled back successfully." });
                });
                break;
            case 'UPDATE':
                const oldData = JSON.parse(lastAction.oldData);
                const setClause = Object.keys(oldData).map(key => `${key} = ?`).join(', ');
                const values = Object.values(oldData);
                values.push(lastAction.recordId);
                
                db.run(`UPDATE ${lastAction.tableName} SET ${setClause} WHERE id = ?`, values, (err) => {
                    if (err) {
                        console.error('Rollback error:', err.message);
                        return res.status(500).json({ message: "Rollback failed." });
                    }
                    res.json({ message: "Last update action rolled back successfully." });
                });
                break;
            case 'DELETE':
                const newData = JSON.parse(lastAction.newData);
                const columns = Object.keys(newData).join(', ');
                const placeholders = Object.keys(newData).map(() => '?').join(', ');
                const insertValues = Object.values(newData);
                
                db.run(`INSERT INTO ${lastAction.tableName} (${columns}) VALUES (${placeholders})`, insertValues, (err) => {
                    if (err) {
                        console.error('Rollback error:', err.message);
                        return res.status(500).json({ message: "Rollback failed." });
                    }
                    res.json({ message: "Last delete action rolled back successfully." });
                });
                break;
            default:
                res.status(400).json({ message: "Unknown action type, cannot rollback." });
        }
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});