# AI Companion Platform

An advanced AI companion platform built with Next.js 13 App Router, TypeScript, Prisma, and PostgreSQL. This platform enables users to create, customize, and interact with AI companions powered by OpenAI's GPT models.

## 🧠 Technical Architecture

### Core Technologies
- **Framework**: Next.js 13.4.11 with App Router
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js with Magic Link Email
- **Payments**: Stripe integration with subscription tiers and token purchases
- **AI Integration**: OpenAI API (GPT-3.5 & GPT-4)
- **Styling**: Tailwind CSS with dark/light mode support
- **Deployment**: Compatible with Vercel, Netlify, or any Node.js hosting

### Key Components
- **Token System**: Proactive token purchasing with subscriber discounts
- **Server Components**: Optimized for Next.js server components and server actions
- **Real-time Chat**: WebSocket-enabled real-time messaging
- **Group Chat**: Multi-bot conversation capabilities
- **API Routes**: Comprehensive REST API for all platform functions
- **Data Models**: Advanced schema design with Prisma for companion data, user data, chat history, and transactions

## 💼 Business Capabilities

### Monetization
- **Subscription Model**: Weekly subscription ($4.99) with 200,000 tokens included
- **Token Purchases**: Two-tier token pricing with subscriber discounts (20% off)
- **Usage Analytics**: Track token consumption, user engagement, and revenue
- **Retention Strategies**: Combining subscriptions with token purchases for optimal user retention

### User Engagement
- **Companion Creation**: Users can create unlimited AI companions with unique personalities
- **Community Features**: User voting on feature requests and community ideas
- **Progress System**: Token burning tracking with detailed statistics
- **Customization**: Extensive options for personalizing companions and interactions

## 🚀 Operational Features

### User Management
- **Registration/Login**: Email-based magic link authentication
- **Profile Management**: User settings and preferences
- **Token Management**: Token balance, purchase history, and usage tracking
- **Subscription Management**: Manage subscription status, billing, and renewal

### Admin Capabilities
- **Companion Management**: Create, edit, and delete companions
- **User Management**: View and manage user accounts
- **Analytics Dashboard**: Track platform usage, revenue, and engagement
- **Token Economy Management**: Adjust token pricing and allocation

### Content Management
- **Categories**: Organize companions by categories
- **Bot Templates**: Pre-made templates for quick companion creation
- **Moderation**: Content filtering and safety mechanisms

## 🔧 Technical Implementation Details

### AI Conversation Pipeline
1. User submits message
2. Message is processed through middleware
3. OpenAI API is called with companion-specific context
4. Response is processed and enhanced
5. Tokens are calculated and deducted from user balance
6. Response is returned to user and stored in database

### Token Economy
- **Token Calculation**: Dynamic calculation based on input and output tokens
- **Token Top-ups**: User-initiated token purchases
- **Subscription Tokens**: Automatic weekly token allocation
- **Token Burning**: Track global and user-specific token consumption

### Companion Generation
- **Custom Instructions**: Unique instruction sets for each companion
- **Memory System**: Companions remember conversation history
- **Personality Framework**: Structured approach to defining personalities
- **Response Formatting**: Control over response style and length

## 📚 API Reference

### Core Endpoints
- `/api/chat/[chatId]` - Manage conversations with companions
- `/api/companions` - List and filter available companions
- `/api/companion/[companionId]` - Get, create, update companions
- `/api/stripe/token-purchase` - Purchase additional tokens
- `/api/user-progress` - Get user token and usage stats

### Authentication Endpoints
- `/api/auth/[...nextauth]` - NextAuth.js authentication routes
- `/api/me` - Get current user information

## 🚀 Getting Started

### Prerequisites
- Node.js 16+
- PostgreSQL database
- OpenAI API key
- Stripe account (for payments)

### Environment Variables
Required environment variables include:
```
# Authentication
NEXTAUTH_SECRET=
NEXTAUTH_URL=
NEXTAUTH_URL_PRODUCTION=

# Email provider
POSTMARK_API_KEY=

# OpenAI
OPENAI_API_KEY=

# Database
DATABASE_URL=

# Stripe
STRIPE_API_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_STANDARD_PRICE_ID=
```

### Installation
1. Clone the repository
2. Install dependencies with `npm install`
3. Set up your environment variables
4. Run database migrations: `npx prisma migrate dev`
5. Start the development server: `npx next dev`

## 🔄 Version Control & Updates

This project includes an automatic version tracking and documentation system that:
- Updates version numbers automatically based on commit messages
- Categorizes changes based on semantics (major, minor, patch)
- Provides an updates page at `/updates`

Current version: 0.3.22

## 📱 Mobile & Responsive Design

The platform is fully responsive and works on:
- Desktop browsers
- Tablets
- Mobile devices

Key mobile features include:
- Touch-optimized interface
- Mobile-friendly chat experience
- Adaptive layout for different screen sizes

## 🤝 Integration Capabilities

The platform can integrate with:
- **LangChain**: For advanced AI workflows
- **Vector Databases**: For enhanced memory capabilities
- **Third-party Auth Providers**: Google, GitHub, etc.
- **Webhook Systems**: For event-driven architecture
- **Analytics Platforms**: For detailed usage tracking

This documentation provides a comprehensive overview of the AI Companion Platform's capabilities and implementation details.
