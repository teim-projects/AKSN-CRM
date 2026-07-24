## Frontend Local Setup

### 1) Install dependencies
```bash
npm install
```

### 2) Configure environment
Use `.env.development` (already present) or `.env.local` for overrides.

Required values:
- `VITE_BASE_API_URL=http://localhost:8000`
- `VITE_GOOGLE_CLIENT_ID=<your-google-client-id>`

### 3) Start development server
```bash
npm run dev
```

App runs at `http://localhost:5173`.