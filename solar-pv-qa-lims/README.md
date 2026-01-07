# Solar PV QA LIMS

A comprehensive Laboratory Information Management System (LIMS) for Solar PV Quality Assurance testing and certification.

## Features

- **Service Request Management**: Create and track testing requests (internal/external)
- **Sample Registration & Tracking**: Full chain of custody tracking
- **Test Plan Management**: Support for IEC 61215, IEC 61730, and other standards
- **Test Execution & Results**: Record and verify test results
- **Report Generation**: Generate and manage test reports
- **Certificate Generation**: Issue and manage certifications
- **Dashboard with KPIs**: Real-time metrics and analytics
- **Lab Facility Management**: Track multiple testing facilities

## Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT
- **Security**: Helmet, CORS, Rate Limiting

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **HTTP Client**: Axios
- **Routing**: React Router v6

## Project Structure

```
solar-pv-qa-lims/
├── backend/
│   ├── package.json
│   ├── server.js
│   ├── database/
│   │   ├── schema.sql
│   │   ├── pool.js
│   │   ├── init.js
│   │   └── seed.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── serviceRequests.js
│   │   ├── samples.js
│   │   ├── testPlans.js
│   │   ├── reports.js
│   │   ├── certifications.js
│   │   ├── labFacilities.js
│   │   └── dashboard.js
│   └── middleware/
│       ├── auth.js
│       ├── errorHandler.js
│       └── validate.js
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── index.css
│       ├── hooks/
│       │   └── useAuth.jsx
│       ├── utils/
│       │   ├── api.js
│       │   └── helpers.js
│       ├── components/
│       │   ├── Layout.jsx
│       │   ├── StatusBadge.jsx
│       │   ├── StatsCard.jsx
│       │   ├── Modal.jsx
│       │   └── LoadingSpinner.jsx
│       └── pages/
│           ├── Dashboard.jsx
│           ├── ServiceRequests.jsx
│           ├── ServiceRequestDetail.jsx
│           ├── SampleManagement.jsx
│           ├── SampleDetail.jsx
│           ├── TestPlanning.jsx
│           ├── TestPlanDetail.jsx
│           ├── Reports.jsx
│           ├── ReportDetail.jsx
│           ├── Certifications.jsx
│           ├── LabFacilities.jsx
│           └── Login.jsx
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Database Setup

1. Create a PostgreSQL database:
```bash
createdb solar_pv_qa_lims
```

2. Set up environment variables:
```bash
cd backend
cp .env.example .env
# Edit .env with your database credentials
```

3. Initialize the database:
```bash
npm run db:init
```

4. Seed with sample data (optional):
```bash
npm run db:seed
```

### Backend Setup

```bash
cd backend
npm install
npm run dev
```

The API will be available at `http://localhost:3001`

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173`

## Environment Variables

### Backend (.env)

```env
# Server
PORT=3001
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/solar_pv_qa_lims

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173
```

### Frontend (.env)

```env
VITE_API_URL=/api
```

## API Documentation

The API documentation is available at `GET /api` when the server is running.

### Main Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /api/auth/login` | User login |
| `POST /api/auth/register` | User registration |
| `GET /api/service-requests` | List service requests |
| `POST /api/service-requests` | Create service request |
| `GET /api/samples` | List samples |
| `POST /api/samples` | Register sample |
| `GET /api/test-plans` | List test plans |
| `POST /api/test-plans` | Create test plan |
| `GET /api/reports` | List reports |
| `POST /api/reports` | Generate report |
| `GET /api/certifications` | List certifications |
| `GET /api/dashboard/stats` | Get dashboard statistics |

## Test Standards Supported

- **IEC 61215** - Crystalline Silicon Terrestrial PV Modules
- **IEC 61730** - PV Module Safety Qualification
- **IEC 62716** - Ammonia Corrosion Testing
- **IEC 61701** - Salt Mist Corrosion Testing
- **IEC 62804** - PID Testing
- **UL 1703** - Safety Standard for Flat-Plate PV Modules
- **IEC 61853** - Performance Testing and Energy Rating
- **IEC 62892** - Extended Thermal Cycling

## Demo Accounts

After seeding the database:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@solarpvqa.com | admin123 |
| Technician | technician@solarpvqa.com | tech123 |
| Manager | manager@solarpvqa.com | manager123 |

## Deployment

### Railway Deployment

1. Create a new Railway project
2. Add a PostgreSQL database service
3. Deploy the backend service:
   - Connect your GitHub repository
   - Set the root directory to `solar-pv-qa-lims/backend`
   - Add environment variables
4. Deploy the frontend service:
   - Set the root directory to `solar-pv-qa-lims/frontend`
   - Set `VITE_API_URL` to your backend URL

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d
```

## License

MIT License

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request
