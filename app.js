const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const session = require('express-session');
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

// Sign-up route
app.post('/signup', (req, res) => {
    const { username, password, role } = req.body;
    const validRoles = ['admin', 'user', 'it_support'];
    const userRole = validRoles.includes(role.toLowerCase()) ? role : 'user';

    if (username && password && username.length >= 5) {
        db.run('INSERT INTO Users(username, password, role) VALUES(?, ?, ?)', [username, password, userRole], (err) => {
            if (err) {
                console.error(err.message);
                res.status(500).send("Failed to create new user.");
            } else {
                res.redirect('/login.html');
            }
        });
    } else {
        res.status(400).send('Username must be at least 5 characters.');
    }
});

// Login route
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.get('SELECT user_id, username, role, password AS hashedPassword FROM Users WHERE username = ?', [username], (err, user) => {
        if (err) {
            console.error(err.message);
            res.status(500).send("An error occurred during login.");
        } else if (user && password === user.hashedPassword) {
            req.session.user = { userId: user.user_id, role: user.role };
            switch (user.role) {
                case 'admin':
                    res.redirect('/admin_home.html');
                    break;
                case 'it_support':
                    res.redirect('/it_support_home.html');
                    break;
                default:
                    res.redirect('/user_home.html');
            }
        } else {
            res.status(401).send('Invalid username or password');
        }
    });
});

// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Failed to destroy session:', err);
            res.status(500).send('Failed to log out.');
        } else {
            res.redirect('/login.html');
        }
    });
});

// Ticket submission route
app.post('/submit_ticket', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: "Unauthorized access." });
    }
    const { title, description, location, priority, status } = req.body;
    const userId = req.session.user.userId;
    if (title && description && location && priority && status) {
        db.run('INSERT INTO Tickets(title, description, location, priority, status, userId) VALUES(?, ?, ?, ?, ?, ?)',
               [title, description, location, priority, status, userId], function(err) {
            if (err) {
                console.error('Error inserting ticket:', err.message);
                res.status(500).json({ message: "Failed to submit ticket." });
            } else {
                res.json({ message: "Ticket submitted successfully!", ticketId: this.lastID });
            }
        });
    } else {
        res.status(400).json({ message: 'All fields are required.' });
    }
});

// Get tickets route
app.get('/tickets', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: "Unauthorized access." });
    }

    db.all("SELECT * FROM Tickets", (err, tickets) => {
        if (err) {
            console.error('Error fetching tickets:', err.message);
            res.status(500).json({ message: "Failed to retrieve tickets." });
        } else {
            res.json({ tickets }); // Corrected syntax
        }
    });
});

// Edit ticket route
app.put('/edit_ticket/:ticketId', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: "Unauthorized access." });
    }
    const { ticketId } = req.params;
    const { title, description, location, priority, status } = req.body;
    if (title && description && location && priority && status) {
        db.run('UPDATE Tickets SET title = ?, description = ?, location = ?, priority = ?, status = ? WHERE ticketId = ?',
               [title, description, location, priority, status, ticketId], function(err) {
            if (err) {
                console.error('Error updating ticket:', err.message);
                res.status(500).json({ message: "Failed to update ticket." });
            } else {
                if (this.changes > 0) {
                    res.json({ message: "Ticket updated successfully!" });
                } else {
                    res.status(404).json({ message: "No ticket found or you do not have permission to edit this ticket." });
                }
            }
        });
    } else {
        res.status(400).json({ message: 'All fields are required.' });
    }
});

// Delete ticket route
app.delete('/delete_ticket/:ticketId', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: "Unauthorized access." });
    }
    const { ticketId } = req.params;
    db.run('DELETE FROM Tickets WHERE ticketId = ?', [ticketId], function(err) {
        if (err) {
            console.error('Error deleting ticket:', err.message);
            res.status(500).json({ message: "Failed to delete ticket." });
        } else {
            if (this.changes > 0) {
                res.json({ message: "Ticket deleted successfully!" });
            } else {
                res.status(404).json({ message: "No ticket found or you do not have permission to delete this ticket." });
            }
        }
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});