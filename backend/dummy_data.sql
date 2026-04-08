-- Dummy Data for Attendance System

USE attendance;

-- 1. Insert Admin Account
-- Plaintext Password: admin123
INSERT INTO admin (username, hashed_password) VALUES 
('admin', '$2b$10$3zI1lK.pUu2uJ6p8oU6p8u7zI1lK.pUu2uJ6p8oU6p8u7zI1lK.pU');

-- 2. Insert Staff/Department Accounts
-- Plaintext Password: password123 for all
INSERT INTO departments (department_name, department_password) VALUES 
('bsc_cs', '$2b$10$7zI1lK.pUu2uJ6p8oU6p8u7zI1lK.pUu2uJ6p8oU6p8u7zI1lK.pU'),
('bcom', '$2b$10$7zI1lK.pUu2uJ6p8oU6p8u7zI1lK.pUu2uJ6p8oU6p8u7zI1lK.pU'),
('bba', '$2b$10$7zI1lK.pUu2uJ6p8oU6p8u7zI1lK.pUu2uJ6p8oU6p8u7zI1lK.pU'),
('bca', '$2b$10$7zI1lK.pUu2uJ6p8oU6p8u7zI1lK.pUu2uJ6p8oU6p8u7zI1lK.pU');

-- 3. Insert Dummy Students
-- Generating 5 students per course-year-semester combination

-- BSC CS
-- 1st Year
INSERT INTO students (name, course, year, semester) VALUES 
('Aravind Kumar', 'bsc_cs', '1st year', 'semester 1'),
('Bala Mani', 'bsc_cs', '1st year', 'semester 1'),
('Catherine S', 'bsc_cs', '1st year', 'semester 1'),
('Divya R', 'bsc_cs', '1st year', 'semester 1'),
('Eswar P', 'bsc_cs', '1st year', 'semester 1'),
('Farhana B', 'bsc_cs', '1st year', 'semester 2'),
('Ganesh T', 'bsc_cs', '1st year', 'semester 2'),
('Hari Krishnan', 'bsc_cs', '1st year', 'semester 2'),
('Indu M', 'bsc_cs', '1st year', 'semester 2'),
('Jegan V', 'bsc_cs', '1st year', 'semester 2');

-- 2nd Year
INSERT INTO students (name, course, year, semester) VALUES 
('Kavya S', 'bsc_cs', '2nd year', 'semester 3'),
('Logesh K', 'bsc_cs', '2nd year', 'semester 3'),
('Mani R', 'bsc_cs', '2nd year', 'semester 3'),
('Nivetha P', 'bsc_cs', '2nd year', 'semester 3'),
('Oviya S', 'bsc_cs', '2nd year', 'semester 3'),
('Priya B', 'bsc_cs', '2nd year', 'semester 4'),
('Qadir A', 'bsc_cs', '2nd year', 'semester 4'),
('Ramya T', 'bsc_cs', '2nd year', 'semester 4'),
('Surya M', 'bsc_cs', '2nd year', 'semester 4'),
('Tharun K', 'bsc_cs', '2nd year', 'semester 4');

-- 3rd Year
INSERT INTO students (name, course, year, semester) VALUES 
('Uma S', 'bsc_cs', '3rd year', 'semester 5'),
('Vidya R', 'bsc_cs', '3rd year', 'semester 5'),
('Wilson P', 'bsc_cs', '3rd year', 'semester 5'),
('Xavier S', 'bsc_cs', '3rd year', 'semester 5'),
('Yamuna B', 'bsc_cs', '3rd year', 'semester 5'),
('Zain A', 'bsc_cs', '3rd year', 'semester 6'),
('Abhishek T', 'bsc_cs', '3rd year', 'semester 6'),
('Bharath M', 'bsc_cs', '3rd year', 'semester 6'),
('Chitra K', 'bsc_cs', '3rd year', 'semester 6'),
('Deepak R', 'bsc_cs', '3rd year', 'semester 6');

-- BCOM
-- 1st Year
INSERT INTO students (name, course, year, semester) VALUES 
('Arun K', 'bcom', '1st year', 'semester 1'),
('Babu M', 'bcom', '1st year', 'semester 1'),
('Chandru S', 'bcom', '1st year', 'semester 1'),
('Dinesh R', 'bcom', '1st year', 'semester 1'),
('Elango P', 'bcom', '1st year', 'semester 1'),
('Franklin B', 'bcom', '1st year', 'semester 2'),
('Gopi T', 'bcom', '1st year', 'semester 2'),
('Hemanth K', 'bcom', '1st year', 'semester 2'),
('Ishwarya M', 'bcom', '1st year', 'semester 2'),
('Janani V', 'bcom', '1st year', 'semester 2');

-- BBA
-- 1st Year
INSERT INTO students (name, course, year, semester) VALUES 
('Karthik S', 'bba', '1st year', 'semester 1'),
('Lokesh K', 'bba', '1st year', 'semester 1'),
('Manoj R', 'bba', '1st year', 'semester 1'),
('Naveen P', 'bba', '1st year', 'semester 1'),
('Oscar S', 'bba', '1st year', 'semester 1'),
('Prabhu B', 'bba', '1st year', 'semester 2'),
('Raghu T', 'bba', '1st year', 'semester 2'),
('Sathish K', 'bba', '1st year', 'semester 2'),
('Tamizh M', 'bba', '1st year', 'semester 2'),
('Udhaya V', 'bba', '1st year', 'semester 2');

-- BCA
-- 1st Year
INSERT INTO students (name, course, year, semester) VALUES 
('Vignesh S', 'bca', '1st year', 'semester 1'),
('Wasim K', 'bca', '1st year', 'semester 1'),
('Yasin R', 'bca', '1st year', 'semester 1'),
('Zubair P', 'bca', '1st year', 'semester 1'),
('Aakash S', 'bca', '1st year', 'semester 1'),
('Bala B', 'bca', '1st year', 'semester 2'),
('Charan T', 'bca', '1st year', 'semester 2'),
('Dharun K', 'bca', '1st year', 'semester 2'),
('Eren M', 'bca', '1st year', 'semester 2'),
('Faizal V', 'bca', '1st year', 'semester 2');
