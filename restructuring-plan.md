# AgentConsult: App Restructuring Plan

## Current Issues

1. **Performance Issues**: Extreme load times
2. **Reliability Issues**: Consistent breaking errors
3. **UX Issues**: Unclear workflow for configuring and managing group chats
4. **Maintainability Issues**: Complex, organically grown codebase

## Root Causes

1. **Complex Data Model**: Overly complicated relationships between users, companions, group chats, and configurations
2. **Scattered Business Logic**: Logic spread across components, API routes, and utility functions
3. **Heavy Client-Side Operations**: Excessive client-side processing causing performance issues
4. **Tight Coupling**: Components and features highly dependent on each other

## Proposed Architecture

### 1. Domain-Driven Design Structure

Reorganize the codebase into clear domain boundaries:

```
app/
├── (auth)/              # Authentication domain
├── (dashboard)/         # User dashboard domain
├── api/                 # API routes (restructured)
│   ├── auth/            # Auth-related endpoints
│   ├── companions/      # Companion-related endpoints
│   ├── chats/           # Chat-related endpoints
│   │   ├── group/       # Group chat specific endpoints
│   │   ├── individual/  # Individual chat endpoints
│   │   └── config/      # Chat configuration endpoints
│   ├── files/           # File management endpoints
│   └── payments/        # Payment and subscription endpoints
├── features/            # Feature modules (NEW)
│   ├── companions/      # Companion management feature
│   │   ├── components/  # Companion-specific components
│   │   ├── hooks/       # Companion-specific hooks
│   │   └── utils/       # Companion-specific utilities
│   ├── chat-engine/     # Core chat functionality
│   │   ├── components/  # Chat UI components
│   │   ├── hooks/       # Chat-related hooks
│   │   └── utils/       # Chat-related utilities
│   ├── group-chat/      # Group chat feature
│   │   ├── components/  # Group chat UI components
│   │   ├── hooks/       # Group chat hooks
│   │   └── utils/       # Group chat utilities
│   └── chat-config/     # Chat configuration feature
│       ├── components/  # Configuration UI components
│       ├── hooks/       # Configuration hooks
│       └── utils/       # Configuration utilities
└── shared/              # Shared code (NEW)
    ├── components/      # Shared UI components
    ├── hooks/           # Shared hooks
    ├── utils/           # Shared utilities
    └── types/           # Shared TypeScript types
```

### 2. Data Model Simplification

Simplify the data model to reduce complexity:

1. **Unified Chat Model**: Merge individual and group chat models into a unified chat model with a "type" discriminator
2. **Config-as-Extension**: Treat configurations as extensions to chat instances rather than separate entities
3. **Role-Based Participants**: Standardize participant model for both AI companions and human users

### 3. State Management

Implement a more structured state management approach:

1. **Server Components**: Maximize use of React Server Components for data fetching
2. **Client State Management**: Use React Context + SWR or Zustand for client-side state
3. **Atomic State Design**: Break down state into smaller, focused pieces

### 4. Performance Optimizations

1. **Optimistic Updates**: Implement optimistic UI updates for better perceived performance
2. **Progressive Loading**: Use progressive loading patterns for chat history and configurations
3. **Edge Caching**: Leverage Vercel Edge caching for static and semi-static content
4. **Lazy Loading**: Implement code splitting and lazy loading for non-critical features

### 5. Workflow Simplifications

1. **Wizard-Based Setup**: Create step-by-step wizards for complex configuration tasks
2. **Template System**: Enhance the template system for quick configuration of common use cases
3. **Preview System**: Add real-time preview of chat configuration changes

## Implementation Strategy

### Phase 1: Foundation Restructuring
- Create the new directory structure
- Migrate shared components and utilities
- Implement the simplified data models

### Phase 2: Feature Migration
- Migrate core features one by one to the new structure
- Implement new state management approach
- Create improved workflows for core operations

### Phase 3: Performance Optimization
- Implement server components where applicable
- Add caching and performance optimizations
- Lazy load non-critical features

### Phase 4: UX Enhancement
- Create wizard flows for complex operations
- Implement real-time previews
- Enhance template system

## Benefits

1. **Maintainability**: Clear separation of concerns and domain boundaries
2. **Performance**: Optimized rendering and data fetching
3. **Developer Experience**: Easier to understand and extend
4. **User Experience**: More intuitive workflows and faster interactions
5. **Scalability**: Better foundation for adding new features

## Technical Implementation Details

### Changes to Database Schema

1. **Unified Chat Table**: 
```sql
CREATE TABLE Chat (
  id UUID PRIMARY KEY,
  type ENUM('individual', 'group'),
  name VARCHAR(255),
  creatorId UUID REFERENCES User(id),
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP,
  config JSONB  -- Embed config in the chat record
);
```

2. **Unified Participant Table**:
```sql
CREATE TABLE ChatParticipant (
  id UUID PRIMARY KEY,
  chatId UUID REFERENCES Chat(id),
  participantId UUID,  -- Either userId or companionId
  participantType ENUM('user', 'companion'),
  role VARCHAR(50),
  joinedAt TIMESTAMP
);
```

3. **Simplified Message Table**:
```sql
CREATE TABLE Message (
  id UUID PRIMARY KEY,
  chatId UUID REFERENCES Chat(id),
  senderId UUID,
  senderType ENUM('user', 'companion'),
  content TEXT,
  createdAt TIMESTAMP
);
```

### API Strategy

1. **REST Resources**: Clearly defined REST endpoints for main resources
2. **GraphQL for Complex Queries**: Add GraphQL for complex data requirements
3. **Webhooks for Events**: Implement webhooks for real-time notifications

### Component Architecture

1. **Atomic Design**: Implement atomic design principles for UI components
2. **Composite Pattern**: Use composite pattern for chat interface components
3. **Container/Presenter Pattern**: Separate data fetching from presentation
