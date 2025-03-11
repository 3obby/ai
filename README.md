# AI Companion Platform

An advanced AI companion platform built with Next.js 14 App Router, TypeScript, Prisma, and PostgreSQL. This platform enables users to create, customize, and interact with AI companions powered by OpenAI's GPT models.

## 🧠 Technical Architecture

### Core Technologies
- **Framework**: Next.js 14.2.24 with App Router
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM 6.4.1
- **Authentication**: NextAuth 4.x with Email Magic Link
- **Payments**: Stripe integration with subscription tiers and token purchases 
- **AI Integration**: OpenAI API (GPT-3.5 & GPT-4)
- **Styling**: Tailwind CSS with dark/light mode
- **Storage**: Vercel Blob for file management
- **Deployment**: Vercel with Neon PostgreSQL

### Key Components
- **Token System**: Weekly subscription ($4.99) with 200,000 tokens, additional token purchases
- **Server Components**: Optimized for Next.js app router patterns
- **Real-time Chat**: Interactive messaging experience
- **Group Chat**: Multi-bot conversation capabilities with configurable interactions
- **File Management**: 5GB storage per user for sharing files with AI companions
- **Companion Configuration**: Control over personality, knowledge profile, and interaction styles
- **Community Sharing**: Publish companions to marketplace (costs 100,000 tokens)

## 💼 Business Capabilities

### Monetization
- **Subscription Model**: Weekly subscription ($4.99) with 200,000 tokens included
- **Token Purchases**: Two-tier token pricing with subscriber discounts (20% off)
- **Usage Analytics**: Track token consumption and user engagement
- **Retention Strategy**: Combined subscription + token purchase model

### User Engagement
- **Companion Creation**: Create and customize AI companions
- **Community Features**: Public companion marketplace with voting
- **Progress System**: Token usage tracking with statistics
- **File Sharing**: Upload and share documents, images with companions
- **Companion Configuration**: Fine-tune AI personality traits, knowledge, and behaviors

## 🚀 Key Features

### Companion System
- **Custom Instructions**: Generate unique companion behavior
- **Configuration Options**: Personality settings (analytical vs. creative, formal vs. casual, etc.)
- **Knowledge Profile**: Set expertise areas and knowledge depth
- **Interaction Controls**: Adjust responsiveness, initiative levels, and message styles
- **Tool Access**: Configure web search, code execution, and other capabilities

### Group Chat Framework
- **Multi-Participant**: Combine multiple AI companions in one conversation
- **Custom Roles**: Different companion types with varied permissions
- **Message Routing**: Control which messages go to which participants
- **Specialized Experiences**: Configurable for various use cases like gaming or collaboration

### File Management
- **Storage**: 5GB per user with organization capabilities
- **Supported Formats**: Documents, images, and more
- **Security**: Secure access via signed URLs
- **Integration**: Companions can reference uploaded content

## 🔧 Development Guide

### Environment Setup
Required environment variables:
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
SHADOW_DATABASE_URL=

# Stripe
STRIPE_API_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_STANDARD_PRICE_ID=

# Vercel Blob
VERCELBLOB_READ_WRITE_TOKEN=
```

### Installation
1. Clone the repository
2. Install dependencies with `npm install`
3. Set up your environment variables
4. Run database migrations: `npx prisma migrate dev`
5. Start the development server: `npx next dev`

### Database Migrations
For safe schema changes:
1. Make schema changes in schema.prisma
2. Run `npm run db:migrate -- --name your_change`
3. Commit and push to main
4. Vercel build automatically runs `prisma migrate deploy`

## 📱 Mobile & Responsive Design

The platform is fully responsive across desktop, tablet, and mobile devices with a dark, modern aesthetic using Tailwind CSS.

## 🔄 Version Information

Current version: 0.3.27  
Check `/updates` for version history and recent changes.
