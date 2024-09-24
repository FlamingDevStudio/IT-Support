-- Delete all existing users
DELETE FROM Users;

-- Reset the auto-increment for Users table
DELETE FROM sqlite_sequence WHERE name='Users';

-- Insert new test user data
INSERT INTO Users (username, password, role) VALUES
('admin_user', 'Admin123!', 'admin'),
('it_support1', 'ITSupport123!', 'it_support'),
('it_support2', 'ITSupport456!', 'it_support'),
('regular_user1', 'User123!', 'user'),
('regular_user2', 'User456!', 'user'),
('regular_user3', 'User789!', 'user'),
('manager_user', 'Manager123!', 'user'),
('developer_user', 'Developer123!', 'user'),
('qa_user', 'QA123!', 'user'),
('intern_user', 'Intern123!', 'user');