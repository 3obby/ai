# GCBB AI Companion Platform - Core Overview

## Architecture
- Next.js 15 App Router with TypeScript (fully compatible with Next.js 15 breaking changes)
- Domain-Driven Design architecture with feature-based organization
- PostgreSQL database (Neon) with Prisma ORM v6.4.1
- OpenAI integration (GPT models via API)
- Authentication via NextAuth v4.24.11
- Token-based economy with subscription tiers
- Vercel deployment with Blob storage
- Tailwind CSS with dark mode theming
- Redis caching for API responses
- Server-side streaming for real-time AI responses
- Optimized connection pooling for serverless database

## Project Structure
- **Feature-Based Organization**: Code organized by domain/feature rather than by technical type
- **Unified Data Models**: Simplified data models with a unified approach to chats, participants, and config
- **Shared Components**: Common UI components and utilities available in `app/shared` directory
- **API Domain Separation**: API routes organized by domain for better maintainability

## Next.js 15 Compatibility
- All dynamic route parameters (`params`, `searchParams`) correctly awaited in server components
- Middleware and API routes updated for Next.js 15 compatibility
- Edge runtime API optimizations
- Enhanced document flow with optimized components
- See `DEVELOPMENT_AND_DEPLOYMENT.md` for detailed notes on breaking changes

## Project Status
- Currently undergoing architecture restructuring (see `RESTRUCTURING_PROGRESS.md`)
- See `DEVELOPMENT_AND_DEPLOYMENT.md` for detailed information on the new architecture

## Key Data Models
- **User**: Authentication, preferences, token balance
- **Companion**: AI persona with configurable traits
- **Chat/Message**: Conversation threads between users and companions
- **GroupChat/GroupChatMember**: Multi-participant conversation system
- **UserSubscription**: Subscription status ($4.99/week)
- **File/FileGroup**: File storage and organization (5GB/user)

## Token Economy
- Anonymous users: 1,000 free tokens
- Email login: 10,000 free tokens
- Subscription: 200,000 tokens weekly ($4.99/week)
- Additional purchases: 250,000 tokens for $4.99 (subscribers)
- Companion publishing: 100,000 tokens
- Token burning: 1:1 ratio (each inference token used burns one token from balance)

## API Architecture
- `/api/chat/[chatId]`: Message exchange with streaming
- `/api/companions`: List and filter companions
- `/api/companion/[companionId]`: CRUD operations
- `/api/user-progress`: Token usage statistics
- `/api/stripe`: Payment processing
- `/api/files`: File management endpoints
- `/api/group-chat`: Group chat configuration
- `/api/dashboard-data`: Optimized metrics retrieval for dashboard with tiered caching
- `/api/cache`: System-level cache management for administrators
- `/api/chat-config`: Chat configuration templates and custom settings
- `/api/db`: Database operation endpoints for processing payments, subscriptions, and token purchases
- `/api/vote`: Community voting system for feature ideas and community submissions

## App Router Structure
- Main dashboard: `/dashboard` (app/(root)/(routes)/dashboard/page.tsx)
- Chat interfaces: `/c/[companionId]` (app/(chat)/(routes)/c/[companionId]/page.tsx)
- Auth routes: `/sign-in`, `/sign-up` (app/(auth)/*)
- Account/token management: `/account`, `/token-shop`

## Group Chat Framework
- Multiple participants (human and AI companions)
- Custom instruction injection
- Message routing and processing pipeline
- Context management
- Tool access configuration per participant
- Role-based access system
- State management with shared/private objects

## Companion Customization Framework
- **Personality Configuration**
  - **Personality Traits**: 0-10 scales for analytical/creative, formal/casual, serious/humorous, reserved/enthusiastic, practical/theoretical
  - **Voice Attributes**: Configurable humor, directness, and warmth on 0-10 scales
  - **Response Format**: Customizable length (concise, balanced, detailed) and writing style (academic, conversational, technical, narrative, casual)
  - **Personality Templates**: Pre-configured personality profiles (Academic Expert, Friendly Tutor, Creative Collaborator, Technical Expert)

- **Knowledge Configuration**
  - **Expertise Areas**: Configurable primary and secondary domains of knowledge
  - **Knowledge Depth**: Scale from general (0) to specialized (10) knowledge
  - **Confidence Settings**: Threshold for expressing uncertainty (0-10 scale)
  - **Source Preferences**: Academic, industry, news, or general sources
  - **Citation Style**: None, inline, footnote, or comprehensive citation formats

- **Interaction Configuration**
  - **Initiative Level**: Scale from passive (0) to proactive (10) conversation participation
  - **Conversational Memory**: Minimal, moderate, or extensive recall of previous exchanges
  - **Follow-up Behavior**: None, occasional, or frequent follow-up questions
  - **Feedback Loop**: Option to request user feedback on responses
  - **Multi-turn Reasoning**: Enable step-by-step reasoning for complex topics

- **Tool Access Configuration**
  - **Web Search Integration**: Configurable search providers and result limits
  - **Code Execution**: Language-specific code running capabilities
  - **Data Visualization**: Enable/disable chart and graph generation
  - **Document Analysis**: Enable/disable document processing features
  - **Calculation Tools**: Enable/disable mathematical computation features

- **Implementation Details**
  - Stored in database as JSON fields (personalityConfig, knowledgeConfig, interactionConfig, toolConfig)
  - Version tracking via integer field
  - Tool access control via string array
  - Full form-based UI for companion creators
  - Runtime application during AI response generation

## Performance Optimizations
- Strategic database indexing for common query patterns
- Tiered Redis caching (5-minute TTL for frequently accessed data)
- Server-side streaming for immediate responses
- Optimized image loading with Next.js Image component
- Lazy loading for non-critical components
- Suspense boundaries for parallel data loading
- Connection pooling for database queries

## Demo Experience
- Interactive demo available at `/demo` route
- Pre-configured group chat with 3 AI companions (technical advisor, creative lead, project manager)
- Real-time companion configuration with personality adjustments
- No login required - instant access to core functionality
- Mobile-optimized interface with responsive design
- Configurable chat settings (response speed, typing indicators)
- Serves as both demonstration and onboarding tool

## UX Enhancements
- Wizard flows for complex operations (companion creation, group chat setup)
- Real-time previews for immediate feedback
- Enhanced template system with advanced filtering and sharing
- Progressive disclosure of complex features
- Consistent design patterns across the application

## Anonymous User Experience
- Public dashboard access without authentication
- Viewing public companions without login
- Anonymous chat sessions with cookie-based tracking
- Seamless upgrade path to authenticated session
- Optimized response time with simplified models
- Automatic token allocation (1,000 tokens)

## Architectural Restructuring (Coming Soon)

We're planning a significant architectural restructuring to improve performance, reliability, and developer experience. Key changes include:

- **Domain-Driven Design**: Reorganizing into domain-specific feature modules
- **Simplified Data Model**: Unifying chat models and streamlining relationships
- **Enhanced State Management**: Implementing more efficient state handling
- **Performance Optimizations**: Server Components and progressive loading

For details, see `restructuring-plan.md`, `DEVELOPMENT_AND_DEPLOYMENT.md` and `DATABASE_AND_MIGRATIONS.md`.

## Key Features

### Group Chat Experience
- **Multi-AI Conversations**: Engage with multiple AI companions simultaneously in a single chat
- **Parallel Responses**: All companions respond independently to provide diverse perspectives
- **Typing Indicators**: Visual feedback showing which companions are currently composing responses
- **Direct Addressing**: Target specific companions using "@Name" or "Name:" syntax
- **Custom AI Teams**: Create specialized groups of companions with complementary skills

### Voice Chat & Realtime Transcription
- **Real-time Audio Conversations**: Direct voice interaction with AI companions using OpenAI's Realtime API
- **Bidirectional Transcription**: Real-time transcription of both user and AI speech in the chat interface
- **WebRTC Integration**: Low-latency audio streaming with optimized voice quality
- **Detailed Transcription Metadata**: Rich metadata including timestamps, word boundaries, and segments
- **Multi-modal Interaction**: Seamlessly switch between text and voice in the same conversation
- **Whisper API Fallback**: Reliable non-streaming transcription for longer audio segments
- **Visual Transcription Indicators**: Clear differentiation between interim and final transcriptions

## Demo Experience

Try our interactive demo at `/demo`