# Training Tracker System

A web-based training management system built with the PERN stack (PostgreSQL, Express.js, React, Node.js) and Supabase.

## 📋 Features

- **Multi-Role System**: User, Admin, and Super Admin roles
- **Learning Management**: Modules, lessons, activities, and quizzes
<!-- - **Certificate Generation**: Automatic certificate creation upon lesson completion -->
- **Activity Verification**: Admin approval system for user submissions
- **Dashboard & Analytics**: Progress tracking and performance monitoring
- **User Management**: Comprehensive admin controls

## 🛠️ Tech Stack

**Frontend:**
- React (Vite)
- React Router
- Axios
- Tailwind CSS

**Backend:**
- Node.js
- Express.js
- PostgreSQL (Supabase)
- Sequelize ORM
- JWT Authentication

**File Storage:**
- Cloudinary (for images and submissions)

**Certificate Generation:**
- PDFKit or Puppeteer

## 📁 Project Structure
```
training-tracker/
├── client/          # React frontend
└── server/          # Express backend
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL (Supabase project or local Postgres)
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd training-tracker
```

2. **Setup Backend**
```bash
cd server
npm install
```

Create `.env` file in `server/` folder:
```env
PORT=5000
DATABASE_URL=your_supabase_postgres_connection_string
JWT_SECRET=your_secret_key
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
```

3. **Setup Frontend**
```bash
cd ../client
npm install
```

Create `.env` file in `client/` folder:
```env
VITE_API_URL=http://localhost:5000/api
```

### Running the Application

**Start Backend:**
```bash
cd server
npm run dev
```

**Start Frontend:**
```bash
cd client
npm run dev
```

The application will be available at:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`

## 👥 User Roles

### User
- View and complete modules and lessons
- Submit activities for verification
- Take quizzes
- View progress and certificates

### Admin
- Verify user activity submissions
- View all user progress
- Manage user accounts
- Generate reports

### Super Admin
- Full CRUD operations on modules, lessons, activities, and quizzes
- Manage admin accounts
- System-wide settings and configurations

## 🔐 Authentication

- JWT-based authentication
- Role-based access control (RBAC)
- Protected routes for different user roles

## 📝 To-Do

- [ ] Setup database schemas
- [ ] Implement authentication
- [ ] Create user dashboard
- [ ] Build admin verification system
- [ ] Develop certificate generation
- [ ] Add quiz functionality
- [ ] Implement progress tracking

## 🤝 Contributing

This is a private project. Contributions are currently not open.

## 📄 License

Private - All rights reserved

## 📧 Contact

For questions or support, please contact [your-email@example.com]

---

**Status**: 🚧 In Development

Last Updated: January 2026
