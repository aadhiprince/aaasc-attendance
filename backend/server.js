const express = require("express");
const mysql = require("mysql2");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const dotenv = require("dotenv");
const cors = require("cors");
const logger = require("morgan");

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Enable CORS for trusted domains
app.use(cors());
app.use(express.json());
app.use(logger("dev"));

// Secret key for JWT
const SECRET_KEY = process.env.SECRET_KEY || "your-secret-key";

// Database Configuration - MySQL Connection Pool
const db = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: process.env.MYSQL_PORT,
  ssl: { rejectUnauthorized: false }, // Aiven requires SSL
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Auto-Initialize Database function
async function initializeDatabase() {
  try {
    const adminHash = await bcrypt.hash("admin123", 10);
    const staffHash = await bcrypt.hash("password123", 10);

    const schemaQueries = [
      "CREATE TABLE IF NOT EXISTS departments (id INT AUTO_INCREMENT PRIMARY KEY, department_name VARCHAR(255) NOT NULL UNIQUE, department_password VARCHAR(255) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)",
      "CREATE TABLE IF NOT EXISTS admin (id INT AUTO_INCREMENT PRIMARY KEY, username VARCHAR(255) NOT NULL UNIQUE, hashed_password VARCHAR(255) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)",
      "CREATE TABLE IF NOT EXISTS students (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL, course VARCHAR(100) NOT NULL, year VARCHAR(20) NOT NULL, semester VARCHAR(20) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)",
      "CREATE TABLE IF NOT EXISTS attendance (id INT AUTO_INCREMENT PRIMARY KEY, student_id INT NOT NULL, date DATE NOT NULL, course VARCHAR(100) NOT NULL, year VARCHAR(20) NOT NULL, semester VARCHAR(20) NOT NULL, status ENUM('present', 'absent', 'on_duty') NOT NULL, name VARCHAR(255) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE)"
    ];

    for (const sql of schemaQueries) {
      await db.promise().query(sql);
    }

    // FORCE RESET: Clear old hashes to ensure new ones are used
    await db.promise().query("DELETE FROM admin");
    await db.promise().query("DELETE FROM departments");

    // Seed Admin
    await db.promise().query("INSERT INTO admin (username, hashed_password) VALUES (?, ?)", ["admin", adminHash]);

    // Seed Departments
    const departments = [["bsc_cs", staffHash], ["bcom", staffHash], ["bba", staffHash], ["bca", staffHash]];
    for (const [name, pass] of departments) {
      await db.promise().query("INSERT INTO departments (department_name, department_password) VALUES (?, ?)", [name, pass]);
    }

    // Comprehensive Student Seeding: 10 students per semester per year per department (Total 240)
    console.log("Generating 240 students for testing...");
    await db.promise().query("DELETE FROM students");
    const courses = ["bsc_cs", "bcom", "bba", "bca"];
    const yearSemMap = [
      { year: "1st year", semesters: ["semester 1", "semester 2"] },
      { year: "2nd year", semesters: ["semester 3", "semester 4"] },
      { year: "3rd year", semesters: ["semester 5", "semester 6"] }
    ];

    for (const course of courses) {
      for (const mapping of yearSemMap) {
        for (const semester of mapping.semesters) {
          for (let i = 1; i <= 10; i++) {
            const studentName = `${course.toUpperCase()} Student ${mapping.year.charAt(0)}${semester.slice(-1)} - ${String(i).padStart(2, '0')}`;
            await db.promise().query("INSERT INTO students (name, course, year, semester) VALUES (?, ?, ?, ?)", [studentName, course, mapping.year, semester]);
          }
        }
      }
    }

    console.log("Database initialized: 240 students seeded.");
  } catch (err) {
    console.error("Database initialization failed:", err);
  }
}

// Initialize on start
initializeDatabase();

function generateToken(department, expiresIn = "1h") {
  return jwt.sign({ department }, SECRET_KEY, {
    expiresIn,
    algorithm: "HS256",
  });
}

function validateToken(req, res) {
  const token = req.headers["authorization"];
  if (!token || !token.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authorization token is missing or invalid.",
    });
  }

  try {
    const decodedToken = jwt.verify(token.split(" ")[1], SECRET_KEY, {
      algorithms: ["HS256"],
    });
    const department = decodedToken.department;
    if (!department) {
      res.status(401).json({ success: false, message: "Unauthorized access." });
      return false;
    }
  } catch (err) {
    res.status(401).json({ success: false, message: "Invalid token. Please log in again." });
    return false;
  }
  return true;
}
app.get("/api/health-check", (req, res) => {
  res.status(200).json({ message: "Server is online" });
});

app.post("/login", async (req, res) => {
  const { department, password } = req.body;

  try {
    const [results] = await db.promise().query("SELECT department_password FROM departments WHERE department_name = ?", [department]);

    if (results.length === 0) {
      return res.status(401).json({ success: false, message: "Invalid department or password." });
    }

    const storedHash = results[0].department_password;
    const isPasswordValid = await bcrypt.compare(password, storedHash);

    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: "Invalid department or password." });
    }

    const token = generateToken(department);
    res.status(200).json({ success: true, message: "Login successful!", token });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});

// Admin login endpoint
app.post("/admin_login", (req, res) => {
  const { username, password } = req.body;
  // Retrieve the stored hash from the database
  db.query(
    "SELECT hashed_password FROM admin WHERE username = ?",
    [username],
    (err, results) => {
      if (err) {
        console.error("Error during admin login:", err);
        return res.status(500).json({
          success: false,
          message: "An error occurred during admin login.",
        });
      }

      // Check if the admin exists
      if (results.length === 0) {
        return res.status(401).json({
          success: false,
          message: "Invalid username or password.",
        });
      }

      // Compare the provided password with the stored hash
      const storedHash = results[0].hashed_password;
      const isPasswordValid = bcrypt.compareSync(password, storedHash);

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: "Invalid username or password.",
        });
      }

      // Generate a token
      const token = jwt.sign(
        {
          username: username,
          role: "admin",
        },
        SECRET_KEY,
        { expiresIn: "1hr", algorithm: "HS256" },
      );

      // Return success response
      res.status(200).json({ success: true, token });
    },
  );
});
// Update department password route (Admin access only)
app.post("/update_department_password", (req, res) => {
  const token = req.headers["authorization"];
  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "Token is missing!" });
  }

  // Verify the token
  try {
    const decodedToken = jwt.verify(token, SECRET_KEY, {
      algorithms: ["HS256"],
    });
    if (decodedToken.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access. Admin role required.",
      });
    }
  } catch (err) {
    return res
      .status(401)
      .json({ success: false, message: "Invalid or expired token!" });
  }

  const { department, new_password } = req.body;

  // Hash the new password
  const hashed_password = bcrypt.hashSync(new_password, 10);

  // Update the department password in the database
  db.query(
    "UPDATE departments SET department_password = ? WHERE department_name = ?",
    [hashed_password, department],
    (err, results) => {
      if (err) {
        console.error("Error updating department password:", err);
        return res.status(500).json({
          success: false,
          message: "An error occurred while updating the password.",
        });
      }
      console.log(results);
      // Check if the department exists
      if (results.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "Department not found.",
        });
      }

      // Return success response
      res.status(200).json({
        success: true,
        message: "Password updated successfully!",
      });
    },
  );
});

app.get("/students", (req, res) => {
  db.query("SELECT * FROM students", (err, results) => {
    if (err) {
      console.log(err);
    } else {
      res.send(results);
    }
  });
});

// Route to fetch students based on course, year, and semester
app.get("/get_students", (req, res) => {
  if (validateToken(req, res)) {
    const { course, year, semester } = req.query;

    db.query(
      "SELECT id, name, course, year, semester FROM students WHERE course = ? AND year = ? AND semester = ?",
      [course, year, semester],
      (err, results) => {
        if (err) {
          console.error("Error fetching students:", err);
          return res.status(500).json({
            success: false,
            message: "Error occurred while fetching students.",
          });
        }

        if (results.length === 0) {
          return res
            .status(404)
            .json({ success: false, message: "No students found." });
        }
        const studentList = results.map((student) => ({
          id: student.id,
          name: student.name,
          course: student.course,
          year: student.year,
          semester: student.semester,
        }));

        res.status(200).json({ success: true, students: studentList });
      },
    );
  }
});
// Route to view attendance
app.get("/view_attendance", (req, res) => {
  if (validateToken(req, res)) {
    const { date, course, year, semester } = req.query;

    const query = `
            SELECT date, course, year, semester, name, status
            FROM attendance
            WHERE date = ? AND course = ? AND year = ? AND semester = ?
        `;

    db.query(query, [date, course, year, semester], (err, results) => {
      if (err) {
        console.error("Error during attendance retrieval:", err);
        return res.status(500).json({
          success: false,
          message: "An error occurred while fetching attendance records.",
        });
      }

      if (results.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No attendance records found for the given filters.",
        });
      }

      const attendanceData = results.map((record) => ({
        date: record.date,
        course: record.course,
        year: record.year,
        semester: record.semester,
        name: record.name,
        status: record.status,
      }));

      res.status(200).json({ success: true, attendance: attendanceData });
    });
  }
});
// Route to view summary of attendance
app.get("/view_summary", (req, res) => {
  if (validateToken(req, res)) {
    const { start_date, end_date, course, year, semester } = req.query;

    const query = `
        SELECT name, year, semester, 
               SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) AS present_days,
               SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) AS absent_days,
               SUM(CASE WHEN status = 'on_duty' THEN 1 ELSE 0 END) AS on_duty_days
        FROM attendance
        WHERE course = ? 
          AND year = ? 
          AND semester = ? 
          AND date BETWEEN ? AND ?
        GROUP BY name, year, semester
    `;

    db.query(
      query,
      [course, year, semester, start_date, end_date],
      (err, results) => {
        if (err) {
          console.error("Error during attendance summary retrieval:", err);
          return res.status(500).json({
            success: false,
            message: "An error occurred while fetching attendance summary.",
          });
        }

        if (results.length === 0) {
          return res.status(404).json({
            success: false,
            message: "No attendance records found for the given filters.",
          });
        }

        const summaryData = results.map((result) => ({
          name: result.name,
          year: result.year,
          semester: result.semester,
          start_date,
          end_date,
          present_days: result.present_days,
          absent_days: result.absent_days,
          on_duty_days: result.on_duty_days,
        }));

        res.status(200).json({ success: true, summary: summaryData });
      },
    );
  }
});

// Route to add a student to the database
app.post("/add_student", (req, res) => {
  if (validateToken(req, res)) {
    const { name, course, year, semester } = req.body;

    db.query(
      "INSERT INTO students (name, course, year, semester) VALUES (?, ?, ?, ?)",
      [name, course, year, semester],
      (err, results) => {
        if (err) {
          console.error("Error during student addition:", err);
          return res.status(500).json({
            success: false,
            message: "An error occurred while adding the student.",
          });
        }

        res
          .status(201)
          .json({ success: true, message: "Student added successfully" });
      },
    );
  }
});

// Route to update a student in the database
app.put("/update_student", (req, res) => {
  if (validateToken(req, res)) {
    const { id, name, course, year, semester } = req.body;

    db.query(
      "UPDATE students SET name = ?, course = ?, year = ?, semester = ? WHERE id = ?",
      [name, course, year, semester, id],
      (err, results) => {
        if (err) {
          console.error("Error during student update:", err);
          return res.status(500).json({
            success: false,
            message: "An error occurred while updating the student.",
          });
        }

        res
          .status(200)
          .json({ success: true, message: "Student updated successfully" });
      },
    );
  }
});

// Route to delete a student from the database
app.delete("/delete_student", (req, res) => {
  if (validateToken(req, res)) {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Student ID is required for deletion.",
      });
    }

    // Delete associated attendance records first
    db.query(
      "DELETE FROM attendance WHERE student_id = ?",
      [id],
      (err, results) => {
        if (err) {
          console.error("Error during attendance records deletion:", err);
          return res.status(500).json({
            success: false,
            message:
              "An error occurred while deleting associated attendance records.",
          });
        }

        // Now delete the student
        db.query("DELETE FROM students WHERE id = ?", [id], (err, results) => {
          if (err) {
            console.error("Error during student deletion:", err);
            return res.status(500).json({
              success: false,
              message: "An error occurred while deleting the student.",
            });
          }

          res.status(200).json({
            success: true,
            message:
              "Student and associated attendance records deleted successfully.",
          });
        });
      },
    );
  }
});
// Route to submit attendance
app.post("/submit_attendance", (req, res) => {
  if (validateToken(req, res)) {
    const { date, course, year, semester, students } = req.body;

    // Validate students data
    if (!Array.isArray(students)) {
      return res.status(400).json({
        success: false,
        message: "Students data should be an array of student objects.",
      });
    }

    // Check if attendance records already exist for the given date, course, year, and semester
    db.query(
      "SELECT * FROM attendance WHERE date = ? AND course = ? AND year = ? AND semester = ?",
      [date, course, year, semester],
      (err, results) => {
        if (err) {
          console.error("Error during attendance submission:", err);
          return res.status(500).json({
            success: false,
            message: "An error occurred while submitting attendance.",
          });
        }

        // If records exist, delete them
        if (results.length > 0) {
          db.query(
            "DELETE FROM attendance WHERE date = ? AND course = ? AND year = ? AND semester = ?",
            [date, course, year, semester],
            (err) => {
              if (err) {
                console.error(
                  "Error deleting existing attendance records:",
                  err,
                );
                return res.status(500).json({
                  success: false,
                  message: "An error occurred while submitting attendance.",
                });
              }
            },
          );
        }

        // Process each student and insert attendance records
        let studentsProcessed = 0;
        let errorsOccurred = false;

        students.forEach((student) => {
          db.query(
            "SELECT * FROM students WHERE name = ? AND course = ? AND year = ? AND semester = ?",
            [student.name, course, year, semester],
            (err, results) => {
              if (err) {
                console.error("Error fetching student record:", err);
                errorsOccurred = true;
                return res.status(500).json({
                  success: false,
                  message: "An error occurred while submitting attendance.",
                });
              }

              if (results.length > 0) {
                const student_id = results[0].id;
                db.query(
                  "INSERT INTO attendance (student_id, date, course, year, semester, status, name) VALUES (?, ?, ?, ?, ?, ?, ?)",
                  [
                    student_id,
                    date,
                    course,
                    year,
                    semester,
                    student.status,
                    student.name, // Include the name field
                  ],
                  (err) => {
                    if (err) {
                      console.error("Error inserting attendance record:", err);
                      errorsOccurred = true;
                      return res.status(500).json({
                        success: false,
                        message:
                          "An error occurred while submitting attendance.",
                      });
                    }
                  },
                );
              } else {
                console.warn(`Student not found: ${student.name}`);
              }

              studentsProcessed++;

              // If all students are processed, send the response
              if (studentsProcessed === students.length) {
                if (errorsOccurred) {
                  return res.status(500).json({
                    success: false,
                    message: "An error occurred while submitting attendance.",
                  });
                }

                res.status(200).json({
                  success: true,
                  message: "Attendance submitted successfully.",
                });
              }
            },
          );
        });
      },
    );
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
