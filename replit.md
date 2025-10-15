# Smart Farming Clone

## Overview
Smart Farming is a mobile-responsive web application clone that simulates an agricultural investment platform. The app allows users to register, login, view investment products, manage their balance, and participate in a referral program.

## Project Structure
- **Static Frontend Application** - HTML/CSS/JavaScript
- **Server**: Simple Node.js HTTP server (server.js)
- **Port**: 5000
- **Storage**: localStorage for user data and app state

## Recent Changes (October 14, 2025)
- ✅ Set up project in Replit environment
- ✅ Created images directory with placeholder images
- ✅ Configured Node.js HTTP server on port 5000
- ✅ Implemented all button functionalities:
  - Check-in system with daily bonuses (per-user tracking)
  - Invite/referral system with link copying
  - Recharge functionality with balance updates (per-user balance)
  - Withdrawal system with balance validation (per-user balance)
  - Profile page features (About, Income/Withdraw records, Redeem code, App download)
- ✅ Connected all interactive elements to JavaScript functions
- ✅ Dynamic balance and statistics display from localStorage
- ✅ Fixed user data isolation - all balances and stats are now per-user
- ✅ Enhanced visual design with modern UI:
  - Modern purple gradient color scheme (#7c3aed primary)
  - Improved shadows and depth with consistent theming
  - Smooth animations and hover effects
  - Enhanced typography and spacing
  - Better card designs with borders
  - Responsive bottom navigation with backdrop blur
  - Improved form inputs with focus states
  - Professional login/register pages

## Features

### Authentication
- User registration with phone number and password
- Login system with validation
- Session management using localStorage

### Dashboard (Home Page)
- Banner display
- Quick actions: Check-in, Invite, Recharge, Withdraw
- Special investment plans with daily/total profit display
- Recent transactions feed

### Products Page
- Investment products with different plans
- Daily and total income calculations
- One-click investment functionality

### Promotion Page
- Referral statistics (total people, total rebate)
- Invitation link with copy functionality
- Multi-level commission structure (3 levels)

### Profile Page (Mine)
- User profile display
- Account balance with real-time updates
- Statistics: Total recharge, withdraw, and welfare
- Quick links:
  - About Company
  - Income Record
  - Withdraw Record
  - Redeem Code (Easter egg: "WELCOME2024" for ₹50 bonus)
  - App Download
- Logout functionality

## Technical Stack
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Icons**: Bootstrap Icons (CDN)
- **Server**: Node.js HTTP server
- **Storage**: Browser localStorage

## File Structure
```
├── index.html          # Home/Dashboard page
├── login.html          # Login page
├── register.html       # Registration page
├── products.html       # Products listing page
├── promotion.html      # Referral/Promotion page
├── mine.html          # Profile/Account page
├── style.css          # Global styles
├── main.js            # Shared JavaScript functionality
├── server.js          # Node.js HTTP server
└── images/            # Image assets
    ├── banner.jpg
    ├── logo-square.png (SVG)
    ├── logo-circle.png (SVG)
    ├── gift-icon.png
    ├── medal1.png
    ├── medal2.png
    └── medal3.png
```

## How to Use

### For Users:
1. **Register**: Create an account with phone number and password
2. **Login**: Use your credentials to access the dashboard
3. **Check-in**: Daily check-in for random bonus (₹10-60)
4. **Invest**: Browse products and invest to earn daily profits
5. **Recharge**: Add funds to your account balance
6. **Withdraw**: Withdraw your earnings
7. **Invite**: Share referral link to earn commissions
8. **Redeem**: Use code "WELCOME2024" for ₹50 bonus

### For Developers:
- Server runs on port 5000 (0.0.0.0:5000)
- All user data stored in browser localStorage
- Cache-Control headers set to prevent caching issues
- Simple HTTP server serves static files

## Configuration
- **Development Server**: `node server.js`
- **Host**: 0.0.0.0 (required for Replit proxy)
- **Port**: 5000 (only port exposed in Replit)

## Future Enhancements
- Backend API for persistent data storage
- Real payment gateway integration
- Advanced user analytics dashboard
- Mobile app version
- Email/SMS notifications

## Notes
- All monetary transactions are simulated for demonstration
- Referral system tracks invites but doesn't affect actual rewards (demo mode)
- Easter egg redeem code: "WELCOME2024" for ₹50 bonus
