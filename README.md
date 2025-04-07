# Certificate Management System

A full-stack web application for generating and verifying professional certificates. Built with Express.js (Node.js) for the backend and React.js for the frontend.

## Features

- Admin panel for generating certificates
- JWT-based authentication
- Certificate verification system
- PDF generation
- Modern UI with Tailwind CSS

## Tech Stack

- Frontend: React.js, TypeScript, Tailwind CSS
- Backend: Express.js, Node.js
- Database: MongoDB
- Authentication: JWT
- PDF Generation: Puppeteer

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- npm or yarn

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd certificate-management
```

2. Install backend dependencies:
```bash
npm install
```

3. Install frontend dependencies:
```bash
cd client
npm install
```

4. Create a `.env` file in the root directory with the following variables:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/certificate-db
JWT_SECRET=your-super-secret-key
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

5. Start MongoDB server

## Running the Application

1. Start the backend server:
```bash
npm run dev
```

2. In a new terminal, start the frontend development server:
```bash
cd client
npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Usage

1. Admin Login:
   - Visit http://localhost:3000/admin/login
   - Use admin credentials to log in

2. Generate Certificate:
   - After logging in, you'll be redirected to the dashboard
   - Fill in the certificate details
   - Preview and generate the certificate

3. Verify Certificate:
   - Visit http://localhost:3000/verify
   - Enter the certificate ID
   - View and download the certificate

## API Endpoints

- POST /api/auth/login - Admin login
- POST /api/certificates/generate - Generate new certificate
- GET /api/certificates/:id - Get certificate by ID
- GET /api/certificates/:id/pdf - Download certificate PDF

## Security

- JWT-based authentication for admin routes
- Password hashing using bcrypt
- Protected routes for admin dashboard
- Secure cookie settings for JWT storage

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request 