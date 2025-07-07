# WeatherX League Frontend

A sophisticated Next.js frontend for the WeatherX League decentralized weather prediction platform, built with NEAR Protocol integration and Material-UI components.

## 🚀 Features

### Core Functionality
- **Weather Prediction Interface**: Intuitive stake form for making weather predictions
- **NEAR Wallet Integration**: Seamless connection with MyNearWallet, Meteor, Sender, and Here wallets
- **Real-time Data**: Live odds ticker and market trends
- **NFT Gallery**: Storm Seer badge collection with dynamic SVG rendering
- **Referral System**: Friend.tech inspired bonding curve rewards

### Advanced Features
- **Leaderboard**: Comprehensive ranking system for predictions and referrals
- **Performance Analytics**: Detailed user statistics and success tracking
- **Cross-chain Integration**: FVM transaction support through NEAR Chain Signatures
- **Web3.Storage**: Archive system for rainfall data with CID tracking
- **Mobile Responsive**: Optimized for all device sizes

## 🛠 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Material-UI
- **Blockchain**: NEAR Protocol
- **Wallet**: NEAR Wallet Selector
- **Animations**: Framer Motion
- **Charts**: Chart.js with React integration
- **Forms**: React Hook Form + Zod validation
- **HTTP Client**: Axios
- **Notifications**: React Hot Toast

## 📦 Installation

```bash
# Install dependencies
npm install

# Create environment variables
cp .env.example .env.local

# Start development server
npm run dev
```

## 🔧 Configuration

Create a `.env.local` file with the following variables:

```env
# NEAR Configuration
NEXT_PUBLIC_NEAR_NETWORK_ID=testnet
NEXT_PUBLIC_NEAR_CONTRACT_ID=prediction-pool.testnet
NEXT_PUBLIC_NEAR_WALLET_URL=https://testnet.mynearwallet.com/

# Agent API Configuration
NEXT_PUBLIC_AGENT_API_URL=http://localhost:3001

# Web3.Storage Configuration (optional)
NEXT_PUBLIC_WEB3_STORAGE_TOKEN=your_web3_storage_token_here

# Analytics (optional)
NEXT_PUBLIC_GA_ID=your_google_analytics_id_here
```

## 🎯 Key Components

### Header Component
- Wallet connection management
- Network status indicator
- Navigation between pages
- User balance display

### StakeForm Component
- Prediction input interface
- NEAR wallet transaction signing
- Form validation with Zod
- Real-time balance updates

### OddsTicker Component
- Auto-scrolling market data
- Real-time odds updates
- Volume and trend indicators
- Interactive prediction cards

### BadgeGallery Component
- Storm Seer NFT display
- Dynamic SVG generation with exact `bg-hsl(hue,80%,50%)` implementation
- Rarity-based styling (Bronze, Silver, Gold, Platinum)
- Interactive modal views

### ReferralWidget Component
- Friend.tech inspired interface
- Bonding curve calculations
- Social sharing integration
- Milestone tracking

## 🔗 Wallet Integration

The frontend supports multiple NEAR wallets:

- **MyNearWallet**: Primary wallet for testnet
- **Meteor Wallet**: Browser extension wallet
- **Sender**: Mobile-first wallet
- **Here Wallet**: Telegram-based wallet

### Wallet Connection Flow
1. User clicks "Connect Wallet"
2. Modal displays available wallets
3. User selects preferred wallet
4. Wallet authentication
5. Account state synchronization

## 📊 Contract Integration

### Prediction Methods
- `open_round()`: Create new prediction round
- `predict()`: Place prediction with NEAR stake
- `close_round()`: End prediction period
- `settle_round()`: Distribute rewards

### View Methods
- `get_active_rounds()`: Fetch current predictions
- `get_user_predictions()`: User prediction history
- `get_leaderboard()`: Top performers
- `get_user_xp()`: Experience points

## 🎨 Design System

### Color Scheme
- **Primary**: Near blue (#0ea5e9)
- **Secondary**: Storm orange (#f59e0b)
- **Background**: Dark slate (#0f172a)
- **Cards**: Translucent with blur effects

### Typography
- **Font Family**: Inter
- **Headings**: Bold weights (600-700)
- **Body**: Regular and medium weights
- **Mono**: JetBrains Mono for addresses

### Animations
- **Entry**: Fade and slide up animations
- **Hover**: Scale and glow effects
- **Loading**: Shimmer placeholders
- **Page Transitions**: Smooth routing

## 🔄 Referral System

### Features
- **Referral Links**: `?ref=account.near` parameter processing
- **Automatic Rewards**: +5 XP to referrer on signup
- **Milestone Bonuses**: Silver (+10), Gold (+25), Platinum (+50)
- **Bonding Curve**: Exponential rewards based on referral count

### Implementation
```typescript
// Generate referral link
const referralLink = useReferral().generateReferralLink(accountId)

// Process referral reward
await processReferral(referrerAccountId, newUserAccountId)
```

## 🏆 NFT Integration

### Storm Seer Badges
- **VRF Generation**: Native Flow VRF for `bgHue`
- **Rarity System**: XP-based tiers (Bronze to Platinum)
- **SVG Rendering**: Dynamic badge generation
- **Metadata**: On-chain storage with MetadataViews

### Badge Display
```typescript
// Dynamic SVG with exact hue implementation
<svg style={{ backgroundColor: `hsl(${hue}, 80%, 50%)` }}>
  {/* Badge content */}
</svg>
```

## 🚀 Deployment

### Build Commands
```bash
# Build for production
npm run build

# Start production server
npm start

# Type checking
npm run type-check

# Linting
npm run lint
```

### Deployment Platforms
- **Vercel**: Recommended for Next.js apps
- **Netlify**: Alternative with CDN
- **IPFS**: Decentralized hosting option

## 📱 Mobile Optimization

- **Responsive Design**: Mobile-first approach
- **Touch Interactions**: Optimized for mobile devices
- **Performance**: Lazy loading and code splitting
- **PWA Ready**: Service worker support

## 🔐 Security

- **Environment Variables**: Secure API key management
- **Input Validation**: Zod schema validation
- **XSS Protection**: Sanitized user inputs
- **HTTPS**: Secure connection requirements

## 📈 Performance

- **Bundle Analysis**: Optimized build size
- **Image Optimization**: Next.js Image component
- **Code Splitting**: Dynamic imports
- **Caching**: Browser and CDN caching

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# E2E tests
npm run test:e2e
```

## 📄 API Integration

### Agent Service Endpoints
- `/api/weather/rain/:stationId`: Weather data
- `/api/contract/predict`: Prediction submission
- `/api/referrals/stats`: Referral analytics
- `/api/archive/upload`: Web3.Storage upload

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📝 License

MIT License - see LICENSE file for details

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Join our Discord community
- Check the documentation

---

Built with ❤️ by the WeatherX League team 