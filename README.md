# Live Student Attendance System

A modern, automated, and highly interactive attendance management system leveraging facial recognition technology and gamification to improve student engagement and streamline administrative workflows.

## 🚀 Features

### For Students
- **Gamified Dashboard:** Real-time visibility into attendance stats, current streaks, and achievement badges (Gold, Silver, Bronze).
- **Leaderboards:** Weekly and Monthly Top Performers to encourage consistent attendance.
- **Visual Analytics:** Attendance heatmaps and circular progress trackers.
- **Easy Onboarding:** Simple profile management with support for uploading multiple face photos to improve recognition accuracy.
- **Detailed History:** Comprehensive view of past sessions, attendance status, and any teacher notes.

### For Teachers & Faculty
- **Automated Facial Recognition:** Seamlessly take attendance using camera feeds without manual roll calls.
- **Actionable Analytics:** Visualize student attendance trends through dynamic line and bar charts.
- **Advanced Export:** Export beautifully formatted, auto-styled Excel reports ("Comprehensive Matrix") for monthly analytics.
- **Automated Escalation System:** Configurable system to automatically alert parents and coordinators via email when students accumulate consecutive absences.
- **Session Management:** Add contextual notes to individual class sessions and manage upcoming schedules.

## 💻 Tech Stack

### Frontend
- **Framework:** React (Vite)
- **Styling:** Tailwind CSS with glassmorphism UI/UX design elements
- **Data Visualization:** Recharts
- **Icons:** Lucide React
- **Exporting:** `xlsx-js-style` for highly customized Excel reports

### Backend
- **Framework:** Python / Flask
- **Database:** MongoDB (via PyMongo)
- **Computer Vision:** OpenCV (`opencv-python`) & `face_recognition`
- **Task Scheduling:** APScheduler (for automated emails and streak calculations)

## 🛠 Prerequisites

Make sure you have the following installed on your system:
- [Node.js](https://nodejs.org/) (v16 or higher)
- [Python](https://www.python.org/) (v3.9 or higher)
- [MongoDB](https://www.mongodb.com/) (Local instance or Atlas URI)
- CMake and dlib (Required for the `face_recognition` library)

## ⚙️ Installation & Setup

### 1. Clone the repository
```bash
git clone https://github.com/your-username/live-student-attendance-system.git
cd live-student-attendance-system
```

### 2. Backend Setup
Navigate to the backend directory and install the required Python packages:
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in the `backend` directory and configure the following variables:
```env
MONGO_URI=mongodb://localhost:27017/attendance_db
# Add SMTP or Email configurations here if applicable
```

Run the backend server:
```bash
python app.py
```

### 3. Frontend Setup
Open a new terminal, navigate to the frontend directory, and install dependencies:
```bash
cd frontend
npm install
```

Create a `.env` file in the `frontend` directory:
```env
VITE_API_URL=http://localhost:5000
```

Start the frontend development server:
```bash
npm run dev
```

## 📸 Usage

1. **Teacher Registration:** Register a teacher account and log into the Teacher Dashboard.
2. **Student Registration:** Register student accounts and upload clear, well-lit photos for the face database.
3. **Taking Attendance:** As a teacher, navigate to the Take Attendance page, select a session, and use the webcam interface to capture faces and mark students present.
4. **Monitoring:** Both students and teachers can immediately see the updated stats, leaderboards, and streaks on their respective dashboards.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the issues page.
