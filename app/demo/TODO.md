# Mobile AI Toolbox Chat - TODO List

## High Priority
- [ ] Rename directory from "demo" to "mobileaitoolboxchat" for clarity and consistency
- [ ] Rename "companions" to "bots" throughout the codebase
- [ ] Migrate core functionality to new `/groupchatcontext` directory
- [ ] Refactor GroupChatDemo.tsx (currently 966 lines) into smaller, maintainable components
- [ ] Implement GroupChatProvider context system
- [ ] Extract audio transcription logic into custom hooks

## Medium Priority
- [ ] Create BotRegistry for managing bot configurations
- [ ] Implement pre/post processing pipeline for bot messages
- [ ] Develop recursion control system with configurable limits
- [ ] Add prompt editing interface for custom bot behaviors
- [ ] Improve type definitions and documentation in types/*.ts files
- [ ] Optimize performance of message rendering

## Low Priority
- [ ] Enhance tool calling system with registry and discovery
- [ ] Improve debug information display for processing steps
- [ ] Add animation and transitions for smoother UX
- [ ] Create comprehensive test coverage for critical components
- [ ] Document component API interfaces
- [ ] Add storybook examples for UI components

## Completed
- [x] Initial implementation of group chat interface
- [x] Voice transcription integration
- [x] Settings dialog for customization
- [x] Created architectural overview document in `/groupchatcontext` 