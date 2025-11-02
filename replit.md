# Easy Money

## Overview
Easy Money Premium is a mobile-responsive web application that simulates an agricultural investment platform. The app allows users to register, login, view investment products, manage their balance, and participate in a referral program. Features a complete backend API with SQLite database and automatic UPI payment rotation system.

## Project Structure
- **Frontend**: HTML/CSS/JavaScript (Static files)
- **Backend**: Express.js REST API
- **Database**: SQLite (better-sqlite3)
- **Port**: 5000
- **Storage**: SQLite database for persistent user data

## Recent Changes (November 2, 2025)

### Latest Updates
- ✅ **New Premium Banner**:
  - Added new EasyMoney Premium banner image (banner-premium.png)
  - Banner now displays the official EasyMoney Premium branding
  
- ✅ **Product Images Update**:
  - Added 5 real product images to products page
  - Images show modern electronic gadgets and technology products
  - Replaced placeholder images with professional stock photos
  
- ✅ **Mobile Responsiveness Enhancement**:
  - Added comprehensive media queries for all screen sizes (768px, 480px, 420px, 360px)
  - Optimized touch targets (minimum 44px height for buttons)
  - Improved spacing and typography for mobile devices
  - Better image scaling and layout adjustments
  - Enhanced readability on small screens
  
- ✅ **Dynamic Transaction Feed**:
  - Implemented random transaction rotation every 1 minute
  - Transaction pool with 12+ sample transactions
  - Displays 4 random transactions at a time
  - Automatic rotation keeps the feed fresh and active
  
### Previous Updates
- ✅ **Database Migration to SQLite**:
  - Migrated from PostgreSQL to SQLite using better-sqlite3
  - Updated all API endpoints to use synchronous SQLite API
  - Database transactions for data integrity
  - WAL mode enabled for better performance
  
- ✅ **UPI Payment Rotation System**:
  - 7 UPI IDs configured for automatic rotation
  - UPI IDs: hacker-shaw@fam, jadhavnitin6@bpunity, aryansinghthakurrajput-1@okhdfcbank, dheerajya799-20@okicici, sangeetaya79@okicici, Manjughazipur7575-3@okhdfcbank, tanishqsonkar91400-1@okaxis
  - Automatic rotation after every 10 successful payments
  - Active UPI tracking in qr_codes table
  
- ✅ **Branding Update**:
  - Updated to "Easy Money Premium" branding
  - Replaced all images with new brand assets
  - New logo, banners, and icons throughout the app

## Previous Changes (October 15, 2025)
- ✅ **Backend API Implementation**:
  - Created Express.js backend with RESTful API endpoints
  - Implemented JWT-based authentication system
  - Set up PostgreSQL database with proper schema
  - Migrated from localStorage to persistent database storage
  
- ✅ **Authentication System**:
  - `/api/auth/register` - User registration with password hashing (bcrypt)
  - `/api/auth/login` - Login with JWT token generation
  - Token-based authentication middleware
  - Automatic referral code generation for each user
  
- ✅ **Payment System with Custom UPI**:
  - `/api/payment/recharge` - Initiate recharge with custom UPI ID
  - `/api/payment/recharge/confirm` - Confirm recharge with UTR number
  - `/api/payment/withdraw` - Request withdrawal to user's UPI ID
  - Transaction tracking with status management
  
- ✅ **User Management**:
  - `/api/user/profile` - Get user profile and balance
  - `/api/user/checkin` - Daily check-in with bonus rewards
  - `/api/transactions` - View transaction history
  
- ✅ **Database Schema**:
  - `users` table - User accounts, balances, referral codes
  - `transactions` table - Recharge, withdrawal, and payment records
  - `checkins` table - Daily check-in tracking
  - `investments` table - Investment plans and returns
  
- ✅ **Frontend Updates**:
  - Updated all pages to use API instead of localStorage
  - Real-time balance updates from database
  - Improved authentication flow
  - Better error handling and user feedback

## Features

### Authentication
- User registration with phone number and password (bcrypt hashing)
- Secure login with JWT tokens (30-day expiration)
- Referral code system for inviting friends
- Session management with token-based auth

### Dashboard (Home Page)
- Banner display
- Quick actions: Check-in, Recharge, Withdraw, Invite
- Special investment plans with daily/total profit display
- Recent transactions feed

### Products Page
- Investment products with different plans
- Daily and total income calculations
- One-click investment functionality

### Promotion Page
- Referral statistics (total people, total rebate)
- Invitation link with unique referral code
- Multi-level commission structure (3 levels)

### Profile Page (Mine)
- User profile display
- Real-time account balance from database
- Statistics: Total recharge, withdraw, and welfare
- Quick links:
  - About Company
  - Income Record (from transactions API)
  - Withdraw Record (from transactions API)
  - Redeem Code
  - App Download
- Logout functionality

### Payment System (Winzo-Style)
- **Deposit Page** (`deposit.html`):
  - Dedicated deposit page with clean UI
  - Enter amount with quick amount buttons (₹100, ₹500, ₹1000, etc.)
  - UPI payment method selection
  - Automatic UPI app opening with pre-filled amount
  - UTR number submission for verification
  - Recent deposit transactions history
  - Admin verification required before balance credit
  
- **Withdrawal Page** (`withdraw.html`):
  - Dedicated withdrawal page
  - Display available balance
  - Enter withdrawal amount (minimum ₹50)
  - Enter UPI ID for receiving payment
  - Withdrawal information and guidelines
  - Recent withdrawal transactions history
  - Balance deducted immediately, processed within 24 hours

## Technical Stack
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Express.js, Node.js
- **Database**: SQLite (better-sqlite3)
- **Authentication**: JWT (jsonwebtoken)
- **Security**: bcrypt for password hashing
- **Icons**: Bootstrap Icons (CDN)

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### User
- `GET /api/user/profile` - Get user profile (authenticated)
- `POST /api/user/checkin` - Daily check-in (authenticated)

### Payment
- `POST /api/payment/recharge` - Initiate recharge (authenticated)
- `POST /api/payment/recharge/confirm` - Confirm recharge with UTR (authenticated)
- `POST /api/payment/withdraw` - Request withdrawal (authenticated)
- `GET /api/transactions` - Get transaction history (authenticated)

### Health
- `GET /api/health` - API health check

## File Structure
```
├── backend-server.js      # Main Express.js backend server
├── api/
│   ├── db.js             # Database connection and schema
│   ├── auth.js           # Authentication endpoints
│   └── payment.js        # Payment endpoints
├── index.html            # Home/Dashboard page
├── login.html            # Login page
├── register.html         # Registration page
├── products.html         # Products listing page
├── promotion.html        # Referral/Promotion page
├── mine.html            # Profile/Account page
├── deposit.html         # Deposit/Recharge page (Winzo-style)
├── withdraw.html        # Withdrawal page (Winzo-style)
├── style.css            # Global styles
├── main.js              # Frontend API client
├── server.js            # Legacy static server (not used)
└── images/              # Image assets
    ├── banner.jpg
    ├── logo-square.png
    ├── logo-circle.png
    ├── gift-icon.png
    ├── medal1.png
    ├── medal2.png
    └── medal3.png
```

## Environment Variables
- `JWT_SECRET` - Secret key for JWT token signing (default: easymoney-premium-jwt-secret-2024)
- `NODE_ENV` - Environment (development/production)

## UPI Payment System
- **7 UPI IDs configured** for automatic rotation
- **Rotation trigger**: After every 10 successful payments
- **Current active UPI**: hacker-shaw@fam (position 1)
- System automatically cycles through all 7 UPI IDs to distribute payment load

## How to Use

### For Users:
1. **Register**: Create an account with phone number and password
2. **Login**: Use your credentials to get authenticated
3. **Check-in**: Daily check-in for random bonus (₹10-60)
4. **Recharge**: Add funds using custom UPI payment
   - Get UPI ID from system
   - Make payment via any UPI app
   - Enter UTR/Transaction number to confirm
5. **Withdraw**: Withdraw your earnings to your UPI ID
   - Enter amount and your UPI ID
   - Request processed within 24 hours
6. **Invest**: Browse products and invest to earn daily profits
7. **Invite**: Share referral link with your unique code

### For Developers:
- Server runs on port 5000 (0.0.0.0:5000)
- All user data stored in PostgreSQL database
- JWT tokens stored in browser localStorage
- Cache-Control headers set to prevent caching issues
- Database auto-initializes on server start

## Configuration
- **Backend Server**: `node backend-server.js`
- **Host**: 0.0.0.0 (required for Replit proxy)
- **Port**: 5000 (only port exposed in Replit)
- **Database**: SQLite (database.sqlite file)

## Security Features
- Password hashing with bcrypt (10 rounds)
- JWT token authentication (30-day expiration)
- Protected API routes with authentication middleware
- SQL injection prevention with parameterized queries
- Transaction integrity with database transactions

## Database Schema

### users (SQLite)
- `id` - Primary key (AUTOINCREMENT)
- `phone` - Unique phone number
- `password_hash` - Bcrypt hashed password
- `balance` - Current account balance (REAL)
- `total_recharge` - Total amount recharged (REAL)
- `total_withdraw` - Total amount withdrawn (REAL)
- `total_welfare` - Total welfare/bonus received (REAL)
- `referral_code` - Unique referral code
- `referred_by` - Referral code of referrer
- `created_at` - Account creation timestamp

### transactions (SQLite)
- `id` - Primary key (AUTOINCREMENT)
- `user_id` - Foreign key to users
- `type` - Transaction type (recharge/withdraw)
- `amount` - Transaction amount (REAL)
- `status` - Status (pending/completed)
- `upi_id` - UPI ID for withdrawals
- `utr_number` - UTR number for recharges
- `created_at` - Transaction timestamp

### checkins (SQLite)
- `id` - Primary key (AUTOINCREMENT)
- `user_id` - Foreign key to users
- `amount` - Bonus amount (REAL)
- `checkin_date` - Date of check-in
- `created_at` - Check-in timestamp

### investments (SQLite)
- `id` - Primary key (AUTOINCREMENT)
- `user_id` - Foreign key to users
- `plan_name` - Investment plan name
- `amount` - Investment amount (REAL)
- `daily_profit` - Daily profit amount (REAL)
- `total_profit` - Total expected profit (REAL)
- `days` - Investment duration in days
- `status` - Investment status (active/completed)
- `created_at` - Investment timestamp

### qr_codes (SQLite)
- `id` - Primary key (AUTOINCREMENT)
- `upi_id` - UPI ID for payments
- `qr_position` - Position in rotation sequence (1-7)
- `successful_payments` - Count of successful payments
- `max_payments_per_qr` - Maximum payments before rotation (default: 10)
- `is_active` - Currently active UPI (1 or 0)
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

## Custom UPI Payment Flow
1. User initiates recharge request
2. Backend creates pending transaction in database
3. System provides custom UPI ID (configurable via CUSTOM_UPI_ID env variable)
4. User makes payment via any UPI app (PhonePe, GPay, Paytm, etc.)
5. User enters UTR/Transaction number from payment receipt
6. Backend verifies and updates:
   - Transaction status to 'completed'
   - User balance increased
   - Total recharge updated
7. User can now use the balance in the app

## Notes
- All monetary transactions use custom UPI payment system
- Recharge requires UTR number confirmation
- Withdrawals are processed to user's UPI ID
- Database transactions ensure data consistency
- Referral system is tracked in database for future rewards
- Check-in system prevents duplicate daily check-ins
heck-ins
