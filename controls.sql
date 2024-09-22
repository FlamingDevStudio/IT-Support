-- Users Table
CREATE TABLE IF NOT EXISTS Users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL
);

-- Tickets Table
CREATE TABLE IF NOT EXISTS Tickets (
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
);

-- Equipment Table
CREATE TABLE IF NOT EXISTS Equipment (
    EquipmentID INTEGER PRIMARY KEY AUTOINCREMENT,
    Name TEXT NOT NULL,
    Description TEXT,
    TotalStock INTEGER NOT NULL,
    AvailableStock INTEGER NOT NULL,
    Category TEXT NOT NULL DEFAULT 'Miscellaneous'
);

-- EquipmentBorrowing Table
CREATE TABLE IF NOT EXISTS EquipmentBorrowing (
    BorrowingID INTEGER PRIMARY KEY AUTOINCREMENT,
    EquipmentID INTEGER,
    UserID INTEGER,
    Quantity INTEGER NOT NULL,
    BorrowDate TEXT NOT NULL,
    ReturnDate TEXT,
    Status TEXT NOT NULL DEFAULT 'Borrowed',
    FOREIGN KEY (EquipmentID) REFERENCES Equipment(EquipmentID),
    FOREIGN KEY (UserID) REFERENCES Users(user_id)
);

-- Knowledge Base Table
CREATE TABLE IF NOT EXISTS KnowledgeBase (
    ArticleID INTEGER PRIMARY KEY AUTOINCREMENT,
    Title TEXT NOT NULL,
    Content TEXT NOT NULL,
    Category TEXT NOT NULL,
    CreatedBy INTEGER,
    CreatedAt TEXT DEFAULT (datetime('now','localtime')),
    UpdatedAt TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (CreatedBy) REFERENCES Users(user_id)
);