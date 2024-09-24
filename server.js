const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const session = require('express-session');
const path = require('path');
const fs = require('fs').promises;
const app = express();
const port = 3000;

// Connect to SQLite database
let db;

function connectToDatabase() {
    return new Promise((resolve, reject) => {
        db = new sqlite3.Database('./database.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
            if (err) {
                console.error('Error connecting to database:', err);
                reject(err);
            } else {
                console.log('Connected to the SQLite database.');
                resolve();
            }
        });
    });
}

// Call this function when your server starts
connectToDatabase().catch(err => {
    console.error('Failed to connect to database:', err);
    process.exit(1);
});

// Initialize database tables
function initializeDatabase() {
    db.run(`CREATE TABLE IF NOT EXISTS Users (
        user_id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS Tickets (
        TicketID INTEGER PRIMARY KEY AUTOINCREMENT,
        Title TEXT NOT NULL,
        Description TEXT NOT NULL,
        UserID INTEGER,
        Priority TEXT NOT NULL,
        Status TEXT NOT NULL,
        Category TEXT NOT NULL DEFAULT 'General',
        AssignedTo INTEGER,
        CreatedAt TEXT DEFAULT (datetime('now','localtime')),
        UpdatedAt TEXT DEFAULT (datetime('now','localtime')),
        FOREIGN KEY (UserID) REFERENCES Users(user_id),
        FOREIGN KEY (AssignedTo) REFERENCES Users(user_id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS Equipment (
        EquipmentID INTEGER PRIMARY KEY AUTOINCREMENT,
        Name TEXT NOT NULL,
        Description TEXT,
        TotalStock INTEGER NOT NULL,
        AvailableStock INTEGER NOT NULL,
        Category TEXT NOT NULL DEFAULT 'Miscellaneous'
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS EquipmentBorrowing (
        BorrowingID INTEGER PRIMARY KEY AUTOINCREMENT,
        EquipmentID INTEGER,
        UserID INTEGER,
        Quantity INTEGER NOT NULL,
        BorrowDate TEXT NOT NULL,
        ReturnDate TEXT,
        Status TEXT NOT NULL DEFAULT 'Borrowed',
        FOREIGN KEY (EquipmentID) REFERENCES Equipment(EquipmentID),
        FOREIGN KEY (UserID) REFERENCES Users(user_id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS KnowledgeBase (
        ArticleID INTEGER PRIMARY KEY AUTOINCREMENT,
        Title TEXT NOT NULL,
        Content TEXT NOT NULL,
        Category TEXT NOT NULL,
        CreatedBy INTEGER,
        CreatedAt TEXT DEFAULT (datetime('now','localtime')),
        UpdatedAt TEXT DEFAULT (datetime('now','localtime')),
        FOREIGN KEY (CreatedBy) REFERENCES Users(user_id)
    )`);
}

app.use(express.json());
app.use(express.static('public'));

// Configure express-session
app.use(session({
    secret: '1023520827Bob!',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, httpOnly: true }
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

// Routes for different dashboards
app.get('/admin', isLoggedIn, isAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin_dashboard.html'));
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
app.post('/signup', (req, res) => {
    const { username, password, role } = req.body;
    const validRoles = ['admin', 'user', 'it_support'];

    // Username validation
    if (typeof username !== 'string' || username.length < 5) {
        return res.status(400).json({ message: "Username must be at least 5 characters long." });
    }

    // Password validation
    if (typeof password !== 'string' || password.length < 8 || 
        !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
        return res.status(400).json({ message: "Password must be at least 8 characters long and contain uppercase, lowercase, and number." });
    }

    // Role validation
    if (!validRoles.includes(role)) {
        return res.status(400).json({ message: "Invalid role." });
    }

    // Insert the new user into the database
    db.run('INSERT INTO Users(username, password, role) VALUES(?, ?, ?)', [username, password, role], function(err) {
        if (err) {
            console.error(err.message);
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(409).json({ message: "Username already exists." });
            }
            return res.status(500).json({ message: "Failed to create new user." });
        } else {
            res.status(201).json({ message: "User created successfully." });
        }
    });
});
// Login route
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    console.log(`Login attempt: username=${username}, password=${password}`); // Debug log

    db.get('SELECT * FROM Users WHERE username = ?', [username], (err, user) => {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({ message: "An error occurred during login." });
        }
        
        console.log('User found:', user); // Debug log

        if (user && user.password === password) {
            req.session.user = { userId: user.user_id, username: user.username, role: user.role };
            console.log('Login successful:', req.session.user); // Debug log
            res.json({ role: user.role });
        } else {
            console.log('Login failed: Invalid username or password'); // Debug log
            res.status(401).json({ message: 'Invalid username or password' });
        }
    });
});

// Update user (admin route)
app.patch('/admin/users/:userId', isAdmin, (req, res) => {
    const { userId } = req.params;
    const { username, role, password } = req.body;

    let query = 'UPDATE Users SET ';
    let params = [];
    let updates = [];

    if (username !== undefined) {
        updates.push('username = ?');
        params.push(username);
    }
    if (role !== undefined) {
        updates.push('role = ?');
        params.push(role);
    }
    if (password !== undefined) {
        updates.push('password = ?');
        params.push(password);
    }

    if (updates.length === 0) {
        return res.status(400).json({ message: "No updates provided." });
    }

    query += updates.join(', ');
    query += ' WHERE user_id = ?';
    params.push(userId);

    db.run(query, params, function(err) {
        if (err) {
            console.error('Error updating user:', err.message);
            res.status(500).json({ message: "Failed to update user." });
        } else {
            res.json({ message: "User updated successfully." });
        }
    });
});

// Update admin's own profile
app.patch('/admin/update_profile', isAdmin, (req, res) => {
    const { username, password } = req.body;
    const userId = req.session.user.userId;

    let query = 'UPDATE Users SET ';
    let params = [];
    let updates = [];

    if (username) {
        updates.push('username = ?');
        params.push(username);
    }

    if (password) {
        updates.push('password = ?');
        params.push(password);
    }

    if (updates.length === 0) {
        return res.status(400).json({ message: "No updates provided." });
    }

    query += updates.join(', ');
    query += ' WHERE user_id = ?';
    params.push(userId);

    db.run(query, params, function(err) {
        if (err) {
            console.error('Error updating profile:', err.message);
            res.status(500).json({ message: "Failed to update profile." });
        } else {
            if (username) {
                req.session.user.username = username;
            }
            res.json({ message: "Profile updated successfully." });
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

// Submit ticket route
app.post('/submit_ticket', isLoggedIn, (req, res) => {
    const { Title, Description, Priority, Category } = req.body;
    const UserID = req.session.user.userId;
    const Status = 'Open';

    db.run('INSERT INTO Tickets(Title, Description, UserID, Priority, Status, Category) VALUES(?, ?, ?, ?, ?, ?)',
           [Title, Description, UserID, Priority, Status, Category], function(err) {
        if (err) {
            console.error('Error inserting ticket:', err.message);
            res.status(500).json({ message: "Failed to submit ticket." });
        } else {
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

// Get single ticket route
app.get('/tickets/:TicketID', isLoggedIn, (req, res) => {
    const { TicketID } = req.params;
    db.get('SELECT Tickets.*, Users.username AS Username FROM Tickets INNER JOIN Users ON Tickets.UserID = Users.user_id WHERE TicketID = ?', [TicketID], (err, ticket) => {
        if (err) {
            console.error('Error fetching ticket:', err.message);
            res.status(500).json({ message: "Failed to retrieve ticket." });
        } else if (ticket) {
            res.json(ticket);
        } else {
            res.status(404).json({ message: "Ticket not found." });
        }
    });
});

// Update ticket route
app.patch('/update_ticket/:TicketID', isLoggedIn, (req, res) => {
    const { TicketID } = req.params;
    const { Status } = req.body;
    const UpdatedAt = new Date().toISOString();
    console.log(Status)
    let query = 'UPDATE Tickets SET Status = ? , UpdatedAt = ? WHERE TicketID = ?';
    let params = [Status, UpdatedAt, TicketID];

    if (req.session.user.role === 'user') {
        query += ' AND UserID = ?';
        params.push(req.session.user.userId);
    }

    db.run(query, params, function(err) {
        if (err) {
            console.error('Error updating ticket:', err.message);
            res.status(500).json({ message: "Failed to update ticket." });
        } else {
            if (this.changes > 0) {
                res.json({ message: "Ticket updated successfully!" });
            } else {
                res.status(404).json({ message: "Ticket not found or you don't have permission to update." });
            }
        }
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
// Get single equipment route
app.get('/equipment/:EquipmentID', isLoggedIn, (req, res) => {
    const { EquipmentID } = req.params;
    db.get('SELECT * FROM Equipment WHERE EquipmentID = ?', [EquipmentID], (err, equipment) => {
        if (err) {
            console.error('Error fetching equipment:', err.message);
            res.status(500).json({ message: "Failed to retrieve equipment." });
        } else if (equipment) {
            res.json(equipment);
        } else {
            res.status(404).json({ message: "Equipment not found." });
        }
    });
});
// Update equipment route
app.patch('/update_equipment/:EquipmentID', isAdminOrIT, (req, res) => {
    const { EquipmentID } = req.params;
    const { TotalStock } = req.body;
    db.run('UPDATE Equipment SET TotalStock = ? WHERE EquipmentID = ?', [TotalStock, EquipmentID], function(err) {
        if (err) {
            console.error('Error updating equipment:', err.message);
            res.status(500).json({ message: "Failed to update equipment." });
        } else {
            if (this.changes > 0) {
                res.json({ message: "Equipment updated successfully!" });
            } else {
                res.status(404).json({ message: "Equipment not found or you don't have permission to update." });
            }
        }
    });
});
// Add equipment route
app.post('/add_equipment', isAdminOrIT, (req, res) => {
    const { Name, Description, TotalStock, Category } = req.body;
    db.run('INSERT INTO Equipment (Name, Description, TotalStock, AvailableStock, Category) VALUES (?, ?, ?,?, ?)',
        [Name, Description, TotalStock, TotalStock, Category], function(err) {
        if (err) {
            console.error('Error adding equipment:', err.message);
            res.status(500).json({ message: "Failed to add equipment." });
        } else {
            res.json({ message: "Equipment added successfully.", EquipmentID: this.lastID });
        }
    });
});


// Borrow equipment route
app.post('/borrow_equipment', isLoggedIn, (req, res) => {
    const { EquipmentID, Quantity } = req.body;
    const UserID = req.session.user.userId;
    const BorrowDate = new Date().toISOString();

    db.get('SELECT AvailableStock FROM Equipment WHERE EquipmentID = ?', [EquipmentID], (err, row) => {
        if (err) {
            console.error('Error checking equipment availability:', err.message);
            return res.status(500).json({ success: false, message: "Failed to check equipment availability." });
        }
        if (!row || row.AvailableStock < Quantity) {
            return res.status(400).json({ success: false, message: "Insufficient stock available." });
        }

        db.run('BEGIN TRANSACTION');

        db.run('INSERT INTO EquipmentBorrowing (EquipmentID, UserID, Quantity, BorrowDate, Status) VALUES (?, ?, ?, ?, ?)',
            [EquipmentID, UserID, Quantity, BorrowDate, 'Borrowed'], function(err) {
            if (err) {
                console.error('Error inserting borrowing record:', err.message);
                db.run('ROLLBACK');
                return res.status(500).json({ success: false, message: "Failed to borrow equipment." });
            }

            db.run('UPDATE Equipment SET AvailableStock = AvailableStock - ? WHERE EquipmentID = ?',
                [Quantity, EquipmentID], function(err) {
                if (err) {
                    console.error('Error updating equipment stock:', err.message);
                    db.run('ROLLBACK');
                    return res.status(500).json({ success: false, message: "Failed to update equipment stock." });
                }

                db.run('COMMIT');
                res.json({ success: true, message: "Equipment borrowed successfully." });
            });
        });
    });
});

// Get borrowed equipment
app.get('/borrowed_equipment', isLoggedIn, (req, res) => {
    const UserID = req.session.user.userId;
    db.all(`
        SELECT EquipmentBorrowing.*, Equipment.Name as EquipmentName
        FROM EquipmentBorrowing
        JOIN Equipment ON EquipmentBorrowing.EquipmentID = Equipment.EquipmentID
        WHERE EquipmentBorrowing.UserID = ? AND EquipmentBorrowing.Status = 'Borrowed'
    `, [UserID], (err, borrowedEquipment) => {
        if (err) {
            console.error('Error fetching borrowed equipment:', err.message);
            res.status(500).json({ message: "Failed to retrieve borrowed equipment." });
        } else {
            res.json(borrowedEquipment);
        }
    });
});

// Return equipment route
app.post('/return_equipment', isLoggedIn, (req, res) => {
    const { BorrowingID } = req.body;
    const ReturnDate = new Date().toISOString();

    db.get('SELECT EquipmentID, Quantity FROM EquipmentBorrowing WHERE BorrowingID = ? AND Status = "Borrowed"',
        [BorrowingID], (err, row) => {
        if (err) {
            console.error('Error fetching borrowing record:', err.message);
            return res.status(500).json({ success: false, message: "Failed to process equipment return." });
        }
        if (!row) {
            return res.status(404).json({ success: false, message: "Borrowing record not found or already returned." });
        }

        db.run('BEGIN TRANSACTION');

        db.run('UPDATE EquipmentBorrowing SET Status = ?, ReturnDate = ? WHERE BorrowingID = ?',
            ['Returned', ReturnDate, BorrowingID], function(err) {
            if (err) {
                console.error('Error updating borrowing record:', err.message);
                db.run('ROLLBACK');
                return res.status(500).json({ success: false, message: "Failed to update borrowing record." });
            }

            db.run('UPDATE Equipment SET AvailableStock = AvailableStock + ? WHERE EquipmentID = ?',
                [row.Quantity, row.EquipmentID], function(err) {
                if (err) {
                    console.error('Error updating equipment stock:', err.message);
                    db.run('ROLLBACK');
                    return res.status(500).json({ success: false, message: "Failed to update equipment stock." });
                }

                db.run('COMMIT');
                res.json({ success: true, message: "Equipment returned successfully." });
            });
        });
    });
});

// Get all knowledge base articles
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

// Get single knowledge base article
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

// Add knowledge base article
app.post('/add_article', isAdminOrIT, (req, res) => {
    const { Title, Content, Category } = req.body;
    const CreatedBy = req.session.user.userId;
    const CreatedAt = new Date().toISOString();

    db.run('INSERT INTO KnowledgeBase (Title, Content, Category, CreatedBy, CreatedAt, UpdatedAt) VALUES (?, ?, ?, ?, ?, ?)',
        [Title, Content, Category, CreatedBy, CreatedAt, CreatedAt], function(err) {
        if (err) {
            console.error('Error adding knowledge base article:', err.message);
            res.status(500).json({ message: "Failed to add article." });
        } else {
            res.json({ message: "Article added successfully.", ArticleID: this.lastID });
        }
    });
});

// Update knowledge base article
app.patch('/update_article/:ArticleID', isAdminOrIT, (req, res) => {
    const { ArticleID } = req.params;
    const { Title, Content, Category } = req.body;
    const UpdatedAt = new Date().toISOString();

    db.run('UPDATE KnowledgeBase SET Title = ?, Content = ?, Category = ?, UpdatedAt = ? WHERE ArticleID = ?',
        [Title, Content, Category, UpdatedAt, ArticleID], function(err) {
        if (err) {
            console.error('Error updating article:', err.message);
            res.status(500).json({ message: "Failed to update article." });
        } else {
            if (this.changes > 0) {
                res.json({ message: "Article updated successfully!" });
            } else {
                res.status(404).json({ message: "Article not found." });
            }
        }
    });
});

// Delete knowledge base article
app.delete('/delete_article/:ArticleID', isAdminOrIT, (req, res) => {
    const { ArticleID } = req.params;

    db.run('DELETE FROM KnowledgeBase WHERE ArticleID = ?', [ArticleID], function(err) {
        if (err) {
            console.error('Error deleting article:', err.message);
            res.status(500).json({ message: "Failed to delete article." });
        } else {
            if (this.changes > 0) {
                res.json({ message: "Article deleted successfully." });
            } else {
                res.status(404).json({ message: "Article not found." });
            }
        }
    });
});

// Admin routes for database management
app.get('/admin/users', isAdmin, (req, res) => {
    db.all('SELECT user_id, username, password, role FROM Users', [], (err, users) => {
        if (err) {
            console.error('Error fetching users:', err.message);
            res.status(500).json({ message: "Failed to retrieve users." });
        } else {
            res.json(users);
        }
    });
});

app.get('/admin/users/:userId', isAdmin, (req, res) => {
    const { userId } = req.params;
    db.get('SELECT user_id, username, password, role FROM Users WHERE user_id = ?', [userId], (err, user) => {
        if (err) {
            console.error('Error fetching user:', err.message);
            res.status(500).json({ message: "Failed to retrieve user." });
        } else if (user) {
            res.json(user);
        } else {
            res.status(404).json({ message: "User not found." });
        }
    });
});


app.delete('/admin/users/:userId', isAdmin, (req, res) => {
    const { userId } = req.params;

    db.run('DELETE FROM Users WHERE user_id = ?', [userId], function(err) {
        if (err) {
            console.error('Error deleting user:', err.message);
            res.status(500).json({ message: "Failed to delete user." });
        } else {
            res.json({ message: "User deleted successfully." });
        }
    });
});

app.get('/admin/tickets', isAdmin, (req, res) => {
    db.all(`
        SELECT t.*, u1.username AS Username, u2.username AS AssignedToName 
        FROM Tickets t 
        LEFT JOIN Users u1 ON t.UserID = u1.user_id 
        LEFT JOIN Users u2 ON t.AssignedTo = u2.user_id
    `, [], (err, tickets) => {
        if (err) {
            console.error('Error fetching tickets:', err.message);
            res.status(500).json({ message: "Failed to retrieve tickets." });
        } else {
            res.json({ tickets });
        }
    });
});

app.get('/admin/tickets/:ticketId', isAdmin, (req, res) => {
    const { ticketId } = req.params;
    db.get(`
        SELECT t.*, u1.username AS Username, u2.username AS AssignedToName 
        FROM Tickets t 
        LEFT JOIN Users u1 ON t.UserID = u1.user_id 
        LEFT JOIN Users u2 ON t.AssignedTo = u2.user_id 
        WHERE t.TicketID = ?
    `, [ticketId], (err, ticket) => {
        if (err) {
            console.error('Error fetching ticket:', err.message);
            res.status(500).json({ message: "Failed to retrieve ticket." });
        } else if (ticket) {
            res.json(ticket);
        } else {
            res.status(404).json({ message: "Ticket not found." });
        }
    });
});

app.patch('/admin/tickets/:ticketId', isAdmin, (req, res) => {
    const { ticketId } = req.params;
    const { Status, Priority, AssignedTo } = req.body;
    const UpdatedAt = new Date().toISOString();

    db.run('UPDATE Tickets SET Status = ?, Priority = ?, AssignedTo = ?, UpdatedAt = ? WHERE TicketID = ?',
        [Status, Priority, AssignedTo, UpdatedAt, ticketId], function(err) {
        if (err) {
            console.error('Error updating ticket:', err.message);
            res.status(500).json({ message: "Failed to update ticket." });
        } else {
            res.json({ message: "Ticket updated successfully." });
        }
    });
});

app.get('/admin/equipment', isAdmin, (req, res) => {
    db.all('SELECT * FROM Equipment', [], (err, equipment) => {
        if (err) {
            console.error('Error fetching equipment:', err.message);
            res.status(500).json({ message: "Failed to retrieve equipment." });
        } else {
            res.json(equipment);
        }
    });
});

app.post('/admin/equipment', isAdmin, (req, res) => {
    const { Name, Description, TotalStock, Category } = req.body;
    db.run('INSERT INTO Equipment (Name, Description, TotalStock, AvailableStock, Category) VALUES (?, ?, ?, ?, ?)',
        [Name, Description, TotalStock, TotalStock, Category], function(err) {
        if (err) {
            console.error('Error adding equipment:', err.message);
            res.status(500).json({ message: "Failed to add equipment." });
        } else {
            res.json({ message: "Equipment added successfully.", EquipmentID: this.lastID });
        }
    });
});

app.get('/admin/equipment/:equipmentId', isAdmin, (req, res) => {
    const { equipmentId } = req.params;
    db.get('SELECT * FROM Equipment WHERE EquipmentID = ?', [equipmentId], (err, equipment) => {
        if (err) {
            console.error('Error fetching equipment:', err.message);
            res.status(500).json({ message: "Failed to retrieve equipment." });
        } else if (equipment) {
            res.json(equipment);
        } else {
            res.status(404).json({ message: "Equipment not found." });
        }
    });
});

app.patch('/admin/equipment/:equipmentId', isAdmin, (req, res) => {
    const { equipmentId } = req.params;
    const { Name, Description, TotalStock, Category } = req.body;

    db.run('UPDATE Equipment SET Name = ?, Description = ?, TotalStock = ?, Category = ? WHERE EquipmentID = ?',
        [Name, Description, TotalStock, Category, equipmentId], function(err) {
        if (err) {
            console.error('Error updating equipment:', err.message);
            res.status(500).json({ message: "Failed to update equipment." });
        } else {
            res.json({ message: "Equipment updated successfully." });
        }
    });
});

app.get('/admin/knowledge_base', isAdmin, (req, res) => {
    db.all(`
        SELECT kb.*, u.username AS AuthorName 
        FROM KnowledgeBase kb 
        LEFT JOIN Users u ON kb.CreatedBy = u.user_id
    `, [], (err, articles) => {
        if (err) {
            console.error('Error fetching knowledge base articles:', err.message);
            res.status(500).json({ message: "Failed to retrieve articles." });
        } else {
            res.json({ articles });
        }
    });
});

app.post('/admin/knowledge_base', isAdmin, (req, res) => {
    const { Title, Content, Category } = req.body;
    const CreatedBy = req.session.user.userId;
    const CreatedAt = new Date().toISOString();

    db.run('INSERT INTO KnowledgeBase (Title, Content, Category, CreatedBy, CreatedAt, UpdatedAt) VALUES (?, ?, ?, ?, ?, ?)',
        [Title, Content, Category, CreatedBy, CreatedAt, CreatedAt], function(err) {
        if (err) {
            console.error('Error adding knowledge base article:', err.message);
            res.status(500).json({ message: "Failed to add article." });
        } else {
            res.json({ message: "Article added successfully.", ArticleID: this.lastID });
        }
    });
});

app.get('/admin/knowledge_base/:articleId', isAdmin, (req, res) => {
    const { articleId } = req.params;
    db.get(`
        SELECT kb.*, u.username AS AuthorName 
        FROM KnowledgeBase kb 
        LEFT JOIN Users u ON kb.CreatedBy = u.user_id 
        WHERE kb.ArticleID = ?
    `, [articleId], (err, article) => {
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

app.patch('/admin/knowledge_base/:articleId', isAdmin, (req, res) => {
    const { articleId } = req.params;
    const { Title, Content, Category } = req.body;
    const UpdatedAt = new Date().toISOString();

    db.run('UPDATE KnowledgeBase SET Title = ?, Content = ?, Category = ?, UpdatedAt = ? WHERE ArticleID = ?',
        [Title, Content, Category, UpdatedAt, articleId], function(err) {
        if (err) {
            console.error('Error updating knowledge base article:', err.message);
            res.status(500).json({ message: "Failed to update article." });
        } else {
            res.json({ message: "Article updated successfully." });
        }
    });
});

app.delete('/admin/knowledge_base/:articleId', isAdmin, (req, res) => {
    const { articleId } = req.params;

    db.run('DELETE FROM KnowledgeBase WHERE ArticleID = ?', [articleId], function(err) {
        if (err) {
            console.error('Error deleting knowledge base article:', err.message);
            res.status(500).json({ message: "Failed to delete article." });
        } else {
            res.json({ message: "Article deleted successfully." });
        }
    });
});

// Update user's own account info
app.patch('/update_user_info', isLoggedIn, (req, res) => {
    const userId = req.session.user.userId;
    const { username, password } = req.body;

    let query = 'UPDATE Users SET ';
    let params = [];
    let updates = [];

    // Username validation
    if (username) {
        if (typeof username !== 'string' || username.length < 5) {
            return res.status(400).json({ message: "Username must be at least 5 characters long." });
        }
        updates.push('username = ?');
        params.push(username);
    }

    // Password validation
    if (password) {
        if (typeof password !== 'string' || password.length < 8 || 
            !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
            return res.status(400).json({ message: "Password must be at least 8 characters long and contain uppercase, lowercase, and number." });
        }
        updates.push('password = ?');
        params.push(password);
    }

    if (updates.length === 0) {
        return res.status(400).json({ message: "No updates provided." });
    }

    query += updates.join(', ');
    query += ' WHERE user_id = ?';
    params.push(userId);

    db.run(query, params, function(err) {
        if (err) {
            console.error('Error updating user info:', err.message);
            res.status(500).json({ message: "Failed to update user information." });
        } else {
            if (username) {
                req.session.user.username = username;
            }
            res.json({ message: "User information updated successfully." });
        }
    });
});

// Function to create a backup of the database
async function createBackup() {
    const backupDir = path.join(__dirname, 'backups');
    
    try {
        await fs.access(backupDir);
    } catch (error) {
        if (error.code === 'ENOENT') {
            await fs.mkdir(backupDir, { recursive: true });
        } else {
            throw error;
        }
    }

    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `backup-${timestamp}.db`);
    
    try {
        await fs.copyFile('./database.db', backupPath);
        console.log('Backup created at:', backupPath);
        return backupPath;
    } catch (error) {
        console.error('Error creating backup:', error);
        throw error;
    }
}
async function listBackups() {
    const backupDir = path.join(__dirname, 'backups');
    console.log('Backup directory:', backupDir);
    
    try {
        await fs.access(backupDir);
        console.log('Backup directory exists');
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('Backup directory does not exist, creating it');
            await fs.mkdir(backupDir, { recursive: true });
            console.log('Backups directory created');
            return [];
        } else {
            console.error('Error accessing backup directory:', error);
            throw error;
        }
    }

    try {
        const files = await fs.readdir(backupDir);
        console.log('Files in backup directory:', files);
        
        const backups = files
            .filter(file => file.startsWith('backup-') && file.endsWith('.db'))
            .map(file => {
                try {
                    // Extract date parts from filename
                    const [datePart, timePart] = file.slice(7, -3).split('T');
                    const [year, month, day] = datePart.split('-');
                    const [hour, minute, second, millisecond] = timePart.split('-');
                    
                    // Construct a valid date string
                    const dateString = `${year}-${month}-${day}T${hour}:${minute}:${second}.${millisecond}Z`;
                    
                    return {
                        name: file,
                        path: path.join(backupDir, file),
                        timestamp: dateString
                    };
                } catch (error) {
                    console.error(`Error parsing date for file ${file}:`, error);
                    return {
                        name: file,
                        path: path.join(backupDir, file),
                        timestamp: 'Invalid Date'
                    };
                }
            })
            .filter(backup => backup.timestamp !== 'Invalid Date')
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        console.log('Processed backups:', backups);
        return backups;
    } catch (error) {
        console.error('Error reading backup directory:', error);
        throw error;
    }
}
// Admin route to create a backup
app.post('/admin/create-backup', isAdmin, (req, res) => {
    try {
        const backupPath = createBackup();
        res.json({ message: "Backup created successfully", path: backupPath });
    } catch (error) {
        console.error('Error creating backup:', error);
        res.status(500).json({ message: "Failed to create backup", error: error.message });
    }
});

app.get('/admin/list-backups', isAdmin, async (req, res) => {
    console.log('List backups route hit');
    try {
        const backups = await listBackups();
        console.log('Backups retrieved:', backups);
        res.json({ backups: backups });
    } catch (error) {
        console.error('Error listing backups:', error);
        res.status(500).json({ message: "Failed to list backups", error: error.message });
    }
});

// Admin route to rollback to a specific backup
app.post('/admin/rollback', isAdmin, async (req, res) => {
    const { backupName } = req.body;
    const backupPath = path.join(__dirname, 'backups', backupName);

    try {
        await fs.access(backupPath);
    } catch (error) {
        return res.status(404).json({ message: "Backup not found" });
    }

    try {
        // Close the current database connection
        await new Promise((resolve, reject) => {
            db.close((err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        // Replace the current database with the backup
        await fs.copyFile(backupPath, './database.db');

        // Reconnect to the database
        await connectToDatabase();
        
        res.json({ message: "Rollback successful" });
    } catch (error) {
        console.error('Error during rollback:', error);
        res.status(500).json({ message: "Rollback failed", error: error.message });
        
        // Attempt to reconnect to the original database if rollback fails
        try {
            await connectToDatabase();
        } catch (reconnectError) {
            console.error('Failed to reconnect to database after rollback error:', reconnectError);
        }
    }
});
// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});