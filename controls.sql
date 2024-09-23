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

-- Insert test users
INSERT INTO Users (username, password, role) VALUES
('yylam123', 'password123', 'admin'),
('jtteach', 'teachpass', 'it_support'),
('sabrina123', 'sabrina123', 'it_support'),
('kclam123', 'kclam1234', 'user'),
('pchan123', 'pchan1234', 'user'),
('billyng123', 'billy1234', 'user'),
('koopa123', 'koopa1234', 'user'),
('cwsham123', 'cwsham123', 'user'),
('bonlam123', 'bonlam123', 'user');

-- Insert test equipment
INSERT INTO Equipment (Name, Description, TotalStock, AvailableStock) VALUES
('Laptop', 'Standard work laptop', 50, 45),
('Desktop PC', 'High-performance desktop computer', 30, 28),
('Monitor', '24-inch LED monitor', 60, 55),
('Keyboard', 'Ergonomic keyboard', 100, 95),
('Mouse', 'Wireless optical mouse', 100, 90),
('Headset', 'Noise-cancelling headset', 40, 35),
('Webcam', 'HD webcam', 30, 25),
('Docking Station', 'Universal docking station', 25, 20),
('Projector', 'Portable HD projector', 15, 12),
('Tablet', 'Educational tablet', 40, 35);

-- Insert test tickets
INSERT INTO Tickets (UserID, Title, Description, Status, Priority, Category, CreatedAt) VALUES
(4, 'Cannot access LMS', 'Unable to log into the Learning Management System', 'Open', 'High', 'Software', '2023-05-01 09:00:00'),
(5, 'Projector not working', 'Classroom projector not turning on', 'In Progress', 'High', 'Hardware', '2023-05-02 10:30:00'),
(6, 'Need software for virtual lab', 'Request installation of virtual science lab software', 'Open', 'Medium', 'Software', '2023-05-03 11:45:00'),
(7, 'Wi-Fi connectivity issues', 'Intermittent Wi-Fi connection in classroom', 'Open', 'Medium', 'Network', '2023-05-04 14:00:00'),
(8, 'Update antivirus software', 'Request to update antivirus on office computer', 'In Progress', 'Low', 'Software', '2023-05-05 16:30:00'),
(9, 'Interactive whiteboard malfunction', 'Touch function not working on interactive whiteboard', 'Open', 'High', 'Hardware', '2023-05-06 08:15:00'),
(4, 'Email storage full', 'Need assistance clearing email storage', 'Open', 'Low', 'Software', '2023-05-07 11:20:00'),
(5, 'Request for educational software', 'Need math visualization software for class', 'In Progress', 'Medium', 'Software', '2023-05-08 13:45:00');

-- Insert test equipment borrowing records
INSERT INTO EquipmentBorrowing (EquipmentID, UserID, Quantity, BorrowDate, Status) VALUES
(1, 4, 1, '2023-05-01', 'Borrowed'),
(3, 5, 2, '2023-05-02', 'Borrowed'),
(5, 6, 1, '2023-05-03', 'Borrowed'),
(6, 7, 1, '2023-05-04', 'Borrowed'),
(2, 8, 1, '2023-05-05', 'Borrowed'),
(9, 9, 1, '2023-05-06', 'Borrowed'),
(10, 4, 2, '2023-05-07', 'Borrowed'),
(7, 5, 1, '2023-05-08', 'Borrowed');

-- Insert test knowledge base articles
INSERT INTO KnowledgeBase (Title, Content, Category, CreatedBy, CreatedAt, UpdatedAt) VALUES
('Accessing the Learning Management System', 'To access the LMS: 1. Go to lms.school.edu.hk. 2. Enter your school email and password. 3. If you forget your password, click on "Forgot Password" and follow the instructions.', 'Software', 2, '2023-05-01 10:00:00', '2023-05-01 10:00:00'),
('Setting up classroom projector', 'To set up the projector: 1. Ensure it''s plugged in and turned on. 2. Connect your device using HDMI or VGA. 3. Select the correct input source on the projector. 4. Adjust focus and keystone if necessary.', 'Hardware', 3, '2023-05-02 11:00:00', '2023-05-02 11:00:00'),
('Using virtual science lab software', 'Getting started with virtual lab: 1. Open the software from the Start menu. 2. Select your subject area (Biology, Chemistry, Physics). 3. Choose an experiment. 4. Follow on-screen instructions to conduct the virtual experiment.', 'Software', 2, '2023-05-03 14:00:00', '2023-05-03 14:00:00'),
('Connecting to school Wi-Fi', 'To connect to school Wi-Fi: 1. Go to Wi-Fi settings on your device. 2. Select "School_Network" from the list. 3. Enter your school email as username and your network password. 4. Click Connect.', 'Network', 3, '2023-05-04 15:30:00', '2023-05-04 15:30:00'),
('Best practices for online teaching', 'Enhance your online teaching: 1. Use interactive tools like polls and quizzes. 2. Encourage student participation through chat or video. 3. Break content into smaller, manageable chunks. 4. Provide clear instructions for assignments. 5. Offer regular feedback and support.', 'Education', 2, '2023-05-05 16:45:00', '2023-05-05 16:45:00'),
('Troubleshooting interactive whiteboard', 'If the touch function isn''t working: 1. Ensure the USB cable is securely connected. 2. Restart the computer and whiteboard. 3. Recalibrate the board using the calibration tool. 4. Update whiteboard drivers if available.', 'Hardware', 3, '2023-05-06 09:30:00', '2023-05-06 09:30:00'),
('Managing email storage', 'To manage your email storage: 1. Regularly delete unnecessary emails. 2. Empty your trash folder. 3. Archive important old emails. 4. Unsubscribe from newsletters you don''t read. 5. Use cloud storage for large attachments instead of keeping them in your email.', 'Software', 2, '2023-05-07 13:15:00', '2023-05-07 13:15:00'),
('Using math visualization software', 'Getting started with math software: 1. Open the application. 2. Select the type of graph or function you want to visualize. 3. Input your equation or data points. 4. Use the tools to manipulate and explore the visualization. 5. Save or export your work as needed.', 'Software', 3, '2023-05-08 11:00:00