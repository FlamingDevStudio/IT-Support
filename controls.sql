-- Users Table
CREATE TABLE IF NOT EXISTS Users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT
);

-- Tickets Table
CREATE TABLE IF NOT EXISTS Tickets (
    TicketID INTEGER PRIMARY KEY AUTOINCREMENT,
    Title TEXT NOT NULL,
    Description TEXT NOT NULL,
    Location TEXT,
    UserID INTEGER,
    Priority TEXT NOT NULL,  -- e.g., Urgent, High, Medium, Low
    Status TEXT NOT NULL,   -- e.g., Open, Closed, Pending
    FOREIGN KEY (UserID) REFERENCES Users(user_id)
);

-- Equipment Table
CREATE TABLE IF NOT EXISTS Equipment (
    EquipmentID INTEGER PRIMARY KEY AUTOINCREMENT,
    Name TEXT NOT NULL,
    Description TEXT,
    TotalStock INTEGER NOT NULL,
    AvailableStock INTEGER NOT NULL
);

-- Equipment Borrowing Table
CREATE TABLE IF NOT EXISTS EquipmentBorrowing (
    BorrowingID INTEGER PRIMARY KEY AUTOINCREMENT,
    EquipmentID INTEGER,
    UserID INTEGER,
    Quantity INTEGER NOT NULL,
    BorrowDate TEXT NOT NULL,  -- SQLite uses TEXT for dates
    ReturnDate TEXT,
    Status TEXT NOT NULL,  -- e.g., Borrowed, Returned
    FOREIGN KEY (EquipmentID) REFERENCES Equipment(EquipmentID),
    FOREIGN KEY (UserID) REFERENCES Users(user_id)
);

