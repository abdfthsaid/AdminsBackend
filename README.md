# 🔐 Danab Power - Admin Backend

Secured admin dashboard API with JWT authentication for managing powerbank rental system.

## 🚀 Features

- User management (add, update, delete admin users)
- Station management and monitoring
- Transaction history and analytics
- Customer data management
- Revenue tracking and reporting
- Blacklist management
- Real-time statistics
- Chart data for dashboard visualizations
- Automatic station stats updates (every 15 minutes)

## 📋 Endpoints

All endpoints require JWT authentication (except login).

### Authentication

- `POST /api/users/login` - Admin login (returns JWT token)

### User Management

- `POST /api/users/add` - Add new admin user
- `PUT /api/users/update` - Update user
- `DELETE /api/users/delete` - Delete user
- `GET /api/users/all` - Get all users
- `GET /api/users/one` - Get one user

### Station Management

- `GET /api/stations` - Get all stations
- `POST /api/stations` - Add new station
- `PUT /api/stations/:id` - Update station
- `DELETE /api/stations/:id` - Delete station

### Analytics

- `GET /api/stats` - Get system statistics
- `GET /api/revenue` - Get revenue data
- `GET /api/customers` - Get customer data
- `GET /api/transactions` - Get transaction history
- `GET /api/charts` - Get chart data
- `GET /api/chartsAll` - Get all charts data

### Blacklist

- `GET /api/blacklist` - Get all blacklisted numbers
- `POST /api/blacklist` - Add to blacklist
- `DELETE /api/blacklist/:id` - Remove from blacklist

## 🔧 Environment Variables

Create a `.env` file (see `.env.example`):

```env
FIREBASE_CREDENTIALS_B64=your_base64_credentials
JWT_SECRET=danab_power_secret_key_2024
HEYCHARGE_API_KEY=your_heycharge_api_key
HEYCHARGE_DOMAIN=https://openapi.heycharge.global
PORT=4000
```

**Required for station stats auto-update:**

- `HEYCHARGE_API_KEY` - HeyCharge API authentication key
- `HEYCHARGE_DOMAIN` - HeyCharge API base URL

## 📦 Installation

```bash
npm install
```

## 🏃 Run

```bash
npm start
```

Server runs on port 4000 (or PORT from environment).

## 🔒 Authentication

All routes (except `/api/users/login`) require JWT token in Authorization header:

```javascript
headers: {
  'Authorization': 'Bearer YOUR_JWT_TOKEN'
}
```

### Login Flow

1. POST to `/api/users/login` with username and password
2. Receive JWT token in response
3. Include token in Authorization header for all subsequent requests

## 🚫 Rate Limits

- All endpoints: 300 requests per minute per IP
- Login endpoint: 5 attempts per 15 minutes per IP

## 👥 User Roles

- **admin** - Full access to all endpoints
- **user** - Limited access (defined in middleware)

## 📊 Database

Uses Firebase Firestore:

- `system_users` - Admin users
- `stations` - Station information
- `rentals` - Transaction records
- `customers` - Customer data
- `blacklist` - Blocked phone numbers

## ⏱️ Background Jobs

- **Station Stats Update**: Runs every 15 minutes to sync station data from HeyCharge API

## 🌐 Deploy to Render

1. Push to GitHub
2. Create new Web Service on Render
3. Set environment variables:
   - `FIREBASE_CREDENTIALS_B64`
   - `JWT_SECRET`
   - `HEYCHARGE_API_KEY` (required for station stats)
   - `HEYCHARGE_DOMAIN` (required for station stats)
4. Deploy with: `node server.js`

**⚠️ Important:** Without HeyCharge credentials, the station stats auto-update job will be skipped (backend will still work for all other features).

## 🔐 Security Features

- ✅ JWT authentication on all routes
- ✅ Role-based authorization (admin/user)
- ✅ Rate limiting to prevent abuse
- ✅ Login rate limiting (brute-force protection)
- ✅ Request logging for monitoring
- ✅ Graceful error handling

## 📝 Logs

All requests are logged with format:

```
[ADMIN] METHOD /path - STATUS - DURATIONms - IP: address
```

## 🆘 Troubleshooting

- Ensure `FIREBASE_CREDENTIALS_B64` is valid Base64
- Verify JWT_SECRET matches between deployments
- Check Firebase project permissions
- Review logs for authentication errors
