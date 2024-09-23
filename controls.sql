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

-- Insert test data into Tickets table
INSERT INTO Tickets (Title, Description, UserID, Priority, Status, Category, AssignedTo) VALUES
('Laptop not booting', 'My laptop won''t start up', 3, 'High', 'Open', 'Hardware', 2),
('Email not working', 'Cannot send or receive emails', 4, 'Medium', 'In Progress', 'Software', 2),
('Printer offline', 'Office printer is not responding', 3, 'Low', 'Open', 'Hardware', NULL),
('Software installation', 'Need help installing new software', 4, 'Low', 'Closed', 'Software', 5),
('Network connectivity issues', 'Intermittent internet connection', 3, 'High', 'In Progress', 'Network', 5);

-- Insert test data into Equipment table
INSERT INTO Equipment (Name, Description, TotalStock, AvailableStock, Category) VALUES
('Dell Laptop', 'Dell Latitude 5420', 10, 8, 'Computer'),
('HP Printer', 'HP LaserJet Pro MFP M428fdw', 5, 4, 'Printer'),
('Logitech Webcam', 'Logitech C920 HD Pro', 15, 12, 'Accessory'),
('iPhone 12', 'Apple iPhone 12 64GB', 8, 6, 'Mobile Device'),
('HDMI Cable', '2m HDMI Cable', 20, 18, 'Accessory');

-- Insert test data into EquipmentBorrowing table
INSERT INTO EquipmentBorrowing (EquipmentID, UserID, Quantity, BorrowDate, ReturnDate, Status) VALUES
(1, 3, 1, '2023-06-01', NULL, 'Borrowed'),
(2, 4, 1, '2023-06-02', '2023-06-10', 'Returned'),
(3, 3, 2, '2023-06-03', NULL, 'Borrowed'),
(4, 4, 1, '2023-06-04', NULL, 'Borrowed'),
(5, 3, 1, '2023-06-05', '2023-06-12', 'Returned');

-- Insert test data into KnowledgeBase table
INSERT INTO KnowledgeBase (Title, Content, Category, CreatedBy) VALUES
('How to reset your password', 'Follow these steps to reset your password...', 'Account Management', 2),
('Connecting to VPN', 'To connect to the company VPN, use these settings...', 'Network', 5),
('Printer troubleshooting', 'Common printer issues and their solutions...', 'Hardware', 2),
('Using the new CRM system', 'A guide to navigating and using our new CRM...', 'Software', 5),
('Data backup procedure', 'Steps to backup your data to our cloud storage...', 'Data Management', 2);
