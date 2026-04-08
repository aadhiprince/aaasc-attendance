// Warm up the backend on page load
window.addEventListener("load", () => {
  fetch(`${API_BASE_URL}/api/health-check`, {
    method: "GET",
    cache: "no-cache",
  })
    .then((response) => {
      if (response.ok) {
        console.log("Backend warmed up!");
      } else {
        console.error("Warm-up failed: ", response.statusText);
      }
    })
    .catch((error) => {
      console.error("Error warming up backend:", error);
    });
});

// Main functionality after DOM content is loaded
document.addEventListener("DOMContentLoaded", function () {
  const token = localStorage.getItem("auth_token");

  // Check for token and redirect if not logged in
  if (!token) {
    alert("Unauthorized access. Please log in.");
    window.location.href = "login.html";
    return;
  }

  // Hamburger menu toggle
  const hamburger = document.getElementById("hamburger");
  const menuLinks = document.getElementById("menuLinks");
  if (hamburger && menuLinks) {
    hamburger.addEventListener("click", () => {
      menuLinks.classList.toggle("active");
    });
  }

  const studentTableBody = document.getElementById("studentTableBody");
  const showStudentsButton = document.getElementById("showStudentsButton");
  const submitAttendanceButton = document.getElementById(
    "submitAttendanceButton",
  );
  const attendanceDate = document.getElementById("attendanceDate");
  const loadingIndicator = document.createElement("div");
  const loadingOverlay = document.createElement("div");

  // Add spinner and overlay to the body
  loadingIndicator.className = "loading-spinner";
  loadingOverlay.className = "loading-overlay";
  document.body.appendChild(loadingIndicator);
  document.body.appendChild(loadingOverlay);

  const messageOverlay = document.getElementById("messageOverlay");
  const messageContent = document.getElementById("messageContent");

  const showMessage = (message) => {
    messageContent.textContent = message;
    messageOverlay.classList.add("active");
  };

  const hideMessage = () => {
    messageOverlay.classList.remove("active");
  };

  const showLoading = (isLoading) => {
    if (isLoading) {
      loadingOverlay.classList.add("active");
    } else {
      loadingOverlay.classList.remove("active");
    }

    // Disable/enable buttons
    const buttons = document.querySelectorAll("button");
    buttons.forEach((button) => {
      button.disabled = isLoading;
    });
  };

  // Set today's date as the default for attendance
  const today = new Date().toISOString().split("T")[0];
  if (attendanceDate) {
    attendanceDate.setAttribute("max", today);
    attendanceDate.value = today;
  }

  const course = document.getElementById("course");
  const year = document.getElementById("year");
  const semester = document.getElementById("semester");

  if (!course.value || !year.value || !semester.value) {
    studentTableBody.innerHTML = `
      <tr>
        <td colspan="3">Please select a valid course, year, and semester.</td>
      </tr>
    `;
  }

  // Define the button toggle function
  const enableShowStudentsButton = () => {
    if (course.value && year.value && semester.value) {
      showStudentsButton.disabled = false;
    } else {
      showStudentsButton.disabled = true;
    }
  };

  // Function to load students (Dynamic Fetch)
  const loadStudents = () => {
    const selectedCourse = course.value.trim().toLowerCase();
    const selectedYear = year.value.trim().toLowerCase();
    const selectedSemester = semester.value.trim().toLowerCase();

    if (!selectedCourse || !selectedYear || !selectedSemester) {
        studentTableBody.innerHTML = `
          <tr>
            <td colspan="3">Please select a course, year, and semester.</td>
          </tr>
        `;
      return;
    }

    studentTableBody.innerHTML = ""; // Clear previous data
    showLoading(true);

    const backendURL = `${API_BASE_URL}/get_students?course=${encodeURIComponent(
      selectedCourse,
    )}&year=${encodeURIComponent(selectedYear)}&semester=${encodeURIComponent(
      selectedSemester,
    )}`;

    fetch(backendURL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => {
        if (response.status === 404) {
          return { success: false, message: "No students found." };
        }
        if (!response.ok) {
          throw new Error(`Server responded with status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        studentTableBody.innerHTML = ""; // Clear previous content
        if (data.success === false && data.message === "No students found.") {
          const row = document.createElement("tr");
          const noDataCell = document.createElement("td");
          noDataCell.textContent =
            "No students found for the selected course, year, and semester.";
          noDataCell.setAttribute("colspan", 3);
          row.appendChild(noDataCell);
          studentTableBody.appendChild(row);
          return;
        }

        if (data.students && data.students.length > 0) {
          data.students.forEach((student, index) => {
            const row = createStudentRow(student, index + 1);
            studentTableBody.appendChild(row);
          });
        }
        // Enable submit button if we have students
        if (submitAttendanceButton) {
            submitAttendanceButton.disabled = data.students && data.students.length > 0 ? false : true;
        }
      })
      .catch((error) => {
        console.error("Error fetching students:", error);
        showMessage(
          "An error occurred while fetching student data. Please try again later.",
        );
      })
      .finally(() => {
        showLoading(false);
        setTimeout(hideMessage, 2000);
      });
  };

  // Function to update semester options based on year
  const updateSemesterOptions = () => {
    const selectedYear = year.value;
    const previousSemester = semester.value;
    
    // Define semester mapping
    const semesterMap = {
      "1st Year": ["Semester 1", "Semester 2"],
      "2nd Year": ["Semester 3", "Semester 4"],
      "3rd Year": ["Semester 5", "Semester 6"]
    };

    // Reset and add "Select Semester"
    semester.innerHTML = '<option value="">Select Semester</option>';

    if (selectedYear && semesterMap[selectedYear]) {
      semesterMap[selectedYear].forEach(sem => {
        const option = document.createElement("option");
        option.value = sem;
        option.textContent = sem;
        semester.appendChild(option);
      });
      
      // Restore previous selection if valid
      if (semesterMap[selectedYear].includes(previousSemester)) {
        semester.value = previousSemester;
      }
    }
    enableShowStudentsButton();
  };

  course.addEventListener("change", enableShowStudentsButton);
  year.addEventListener("change", updateSemesterOptions);
  semester.addEventListener("change", enableShowStudentsButton);

  // Initialize filtering on load
  updateSemesterOptions();

  // Show students button click
  if (showStudentsButton) {
    showStudentsButton.addEventListener("click", loadStudents);
  }

  // Submit attendance
  if (submitAttendanceButton) {
    submitAttendanceButton.addEventListener("click", () => {
      const attendanceRows = studentTableBody.querySelectorAll("tr");
      if (attendanceRows.length === 0) {
        alert("No students to submit attendance for. Please select a class.");
        return;
      }

      const attendanceData = [];
      const date = attendanceDate.value;
      const course = document
        .getElementById("course")
        .value.trim()
        .toLowerCase();
      const year = document.getElementById("year").value.trim().toLowerCase();
      const semester = document
        .getElementById("semester")
        .value.trim()
        .toLowerCase();

      attendanceRows.forEach((row) => {
        const select = row.querySelector("select");
        const studentName = row.querySelectorAll("td")[1].textContent;

        if (select) {
          const status = select.value;
          attendanceData.push({
            name: studentName,
            status: status,
          });
        }
      });

      const backendSubmitURL = `${API_BASE_URL}/submit_attendance`;
      showLoading(true);

      fetch(backendSubmitURL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          date: date,
          course: course,
          year: year,
          semester: semester,
          students: attendanceData,
        }),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          const summary = attendanceData.reduce(
            (acc, student) => {
              acc[student.status]++;
              return acc;
            },
            { present: 0, absent: 0, on_duty: 0 },
          );

          showMessage(
            `Attendance submitted successfully!\nPresent: ${summary.present}, Absent: ${summary.absent}, On Duty: ${summary.on_duty}`,
          );
          studentTableBody.innerHTML = "";
        })
        .catch((error) => {
          showMessage("Error saving the attendance. Please try again later.");
          console.error("Error submitting attendance:", error);
        })
        .finally(() => {
          showLoading(false);
          setTimeout(hideMessage, 3000); // Hide message after 3 seconds
        });
    });
  }

  // Helper function to create a student row
  function createStudentRow(student, serialNumber) {
    const row = document.createElement("tr");

    const serialNumberCell = document.createElement("td");
    serialNumberCell.textContent = serialNumber;
    row.appendChild(serialNumberCell);

    const nameCell = document.createElement("td");
    nameCell.textContent = student.name;
    row.appendChild(nameCell);

    const statusCell = document.createElement("td");
    const select = document.createElement("select");
    select.innerHTML = `
      <option value="present">Present</option>
      <option value="absent">Absent</option>
      <option value="on_duty">On Duty</option>
    `;
    statusCell.appendChild(select);
    row.appendChild(statusCell);

    return row;
  }
});
