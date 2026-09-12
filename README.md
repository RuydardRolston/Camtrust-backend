# CamTrust Backend

Construction monitoring and site supervision API for the CamTrust platform. Provides RESTful endpoints and real-time WebSocket communication for project management, evidence capture, progress reporting, and engineer verification.

## Features

- **User Authentication & Authorization** - JWT-based auth with role-based access control (Property Owner, Professional/Engineer, Administrator)
- **Project Management** - CRUD operations for construction projects, milestones, and assignments
- **Site Evidence Capture** - Photo upload with GPS coordinates, timestamps, and watermarking
- **Progress Reporting** - Structured progress reports with work breakdown, observations, and evidence
- **Engineer Verification** - KYC/verification workflow for civil engineers with document upload
- **Real-time Notifications** - Socket.io integration for live updates
- **AI Assistant** - Integration with Google Gemini API for construction queries
- **Multi-role Dashboards** - Separate views for owners, engineers, and administrators

## Tech Stack

- **Runtime**: Node.js (ES Modules)
- **Framework**: Express 5.x
- **Database**: MySQL with Sequelize ORM
- **Authentication**: JWT with bcryptjs password hashing
- **File Upload**: Multer with multipart/form-data
- **Real-time**: Socket.io
- **AI**: Google Gemini API (@google/genai)
- **Testing**: Vitest (unit) + Mocha (integration)
- **Development**: Nodemon for hot reload

## Project Structure

```
camtrust-backend/
├── controllers/          # Request handlers / business logic
│   ├── adminController.js
│   ├── aiController.js
│   ├── assignmentController.js
│   ├── assignmentProposalController.js
│   ├── documentController.js
│   ├── evidenceController.js
│   ├── milestoneController.js
│   ├── notificationController.js
│   ├── projectController.js
│   ├── reportController.js
│   ├── userController.js
│   ├── verificationController.js
│   └── verificationDocumentController.js
├── middleware/           # Express middleware
│   └── authMiddleware.js
├── models/               # Sequelize models
│   ├── index.js
│   ├── documentModel.js
│   ├── milestoneModel.js
│   ├── notificationModel.js
│   ├── progressReportModel.js
│   ├── projectAssignmentModel.js
│   ├── projectModel.js
│   ├── siteEvidenceModel.js
│   ├── userModel.js
│   ├── verificationDocumentModel.js
│   └── verificationModel.js
├── routes/               # API route definitions
│   ├── adminRoute.js
│   ├── aiRoute.js
│   ├── assignmentProposalRoute.js
│   ├── assignmentRoute.js
│   ├── authRoute.js
│   ├── documentRoute.js
│   ├── evidenceRoute.js
│   ├── milestoneRoute.js
│   ├── notificationRoute.js
│   ├── projectRoute.js
│   ├── reportRoute.js
│   ├── userRoute.js
│   ├── verificationDocumentRoute.js
│   └── verificationRoute.js
├── utils/                # Utility functions
│   └── socket.js
├── tests/                # Test files
│   ├── adminController.test.js
│   ├── aiController.test.js
│   ├── api-test.ps1
│   ├── manual-api_tests.http
│   ├── test.server.js
│   └── workflow.test.js
├── uploads/              # Static file uploads (gitignored)
│   └── .gitkeep
├── scripts/              # Build/setup scripts
├── .env.example          # Environment variables template
├── .gitignore
├── app.js                # Express app setup (if used)
├── db_connect.js         # Database connection & sync
├── package.json
├── seed.js               # Database seeding
├── server.js             # Entry point
├── vitest.config.js      # Vitest configuration
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- MySQL 8.0+ (or MariaDB)
- XAMPP or standalone MySQL server

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd camtrust-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials and JWT secret
   ```

4. **Setup database**
   - Create a MySQL database named `group2` (or update `DB_NAME` in .env)
   - Run migrations/seed:
   ```bash
   node seed.js
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

   Server runs on `http://localhost:4000`

### Production

```bash
npm start
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `4000` |
| `JWT_SECRET` | Secret for JWT signing | Required |
| `DB_NAME` | MySQL database name | `group2` |
| `DB_USER` | MySQL username | `root` |
| `DB_PASS` | MySQL password | Empty |
| `DB_HOST` | MySQL host | `localhost` |
| `GEMINI_API_KEY` | Google Gemini API key | Required for AI features |

## API Endpoints

### Authentication
- `POST /api/users/signup` - Register new user
- `POST /api/users/login` - Login
- `GET /api/users/me` - Get current user profile

### Projects
- `GET /api/projects` - List projects (with filters)
- `POST /api/projects` - Create project (Owner)
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Milestones
- `GET /api/milestones?projectId=` - List milestones for project
- `POST /api/milestones` - Create milestone
- `PUT /api/milestones/:id` - Update milestone
- `DELETE /api/milestones/:id` - Delete milestone

### Evidence (Site Photos)
- `POST /api/evidence/upload` - Upload site photo with GPS
- `GET /api/evidence?milestoneId=` - Get evidence for milestone
- `GET /api/evidence/project/:projectId` - Get all project evidence
- `GET /api/evidence/all` - Get all evidence (Admin)

### Progress Reports
- `POST /api/reports` - Submit progress report
- `GET /api/reports?projectId=` - Get project reports
- `GET /api/reports/:id` - Get report details

### Assignments
- `GET /api/assignments/my` - Get current user's assignments
- `POST /api/assignments/assign` - Assign engineer (Admin/Owner)
- `POST /api/assignments/propose` - Propose engineer (Owner)
- `POST /api/assignments/:id/accept` - Accept assignment (Engineer)
- `POST /api/assignments/:id/reject` - Reject assignment (Engineer)

### Verification (Engineer KYC)
- `GET /api/verifications/me` - Get verification status
- `POST /api/verifications/request` - Submit verification request
- `POST /api/verifications/documents` - Upload verification document
- `GET /api/verifications/verified-engineers` - List verified engineers

### AI Assistant
- `POST /api/ai/ask` - Ask construction question (with optional project context)

### Admin
- `GET /api/admin/users` - List all users
- `GET /api/admin/projects` - List all projects
- `GET /api/admin/verification` - Pending verifications
- `PUT /api/admin/verification/:id` - Approve/reject verification

## Testing

```bash
# Unit tests (Vitest)
npm test

# Integration tests (Mocha)
npm run test:integration

# All tests
npm test && npm run test:integration
```

## Database Schema

Key models and relationships:

- **User** - Core user with roles (property_owner, professional, administrator)
- **Project** - Construction project owned by property_owner
- **Milestone** - Project phases with completion tracking
- **ProjectAssignment** - Links engineers to projects (status: proposed/accepted/rejected)
- **SiteEvidence** - Photos with GPS, timestamps, linked to milestones
- **ProgressReport** - Detailed work reports with evidence references
- **Verification** - Engineer KYC status
- **VerificationDocument** - Supporting documents for verification

## Real-time Events (Socket.io)

- `evidence:new` - New site evidence uploaded
- `report:new` - Progress report submitted
- `assignment:update` - Assignment status changed
- `notification:new` - New notification created

## Security

- JWT tokens with 24h expiry
- Password hashing with bcryptjs (12 rounds)
- CORS configured for frontend origins
- Role-based route protection
- File upload validation (images only, size limits)
- SQL injection prevention via Sequelize ORM

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

ISC License - See package.json for details.

## Author

Stone - Initial work