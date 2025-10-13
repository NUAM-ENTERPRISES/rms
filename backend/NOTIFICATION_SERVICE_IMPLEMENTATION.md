# 🔔 Notification Service Implementation - Affiniks RMS

## 📋 **Implementation Summary**

This document outlines the comprehensive notification service implementation for the Affiniks RMS system, following industry-grade patterns and the established BE_GUIDELINES.md and FE_GUIDELINES.md.

---

## 🎯 **What Was Implemented**

### **1. Enhanced Database Schema**

- **Enhanced Notification Model**: Added `link`, `meta`, `status`, `readAt`, `idemKey` fields
- **OutboxEvent Model**: For reliable event processing with idempotency
- **TeamTransferRequest Model**: Complete transfer request workflow
- **Proper Indexing**: Optimized queries with strategic indexes

### **2. BullMQ Queue System**

- **Notifications Queue**: Handles all notification events
- **Outbox Pattern**: Reliable event processing with retry logic
- **Idempotent Jobs**: Prevents duplicate notifications
- **Exponential Backoff**: Robust retry mechanism

### **3. Notifications Module**

- **NotificationsService**: Core business logic for notification management
- **NotificationsController**: REST API endpoints with proper validation
- **NotificationsGateway**: WebSocket real-time notifications
- **NotificationsProcessor**: BullMQ job processor with event handlers

### **4. Transfer Request System**

- **Complete Workflow**: Request → Approve/Reject → Transfer
- **RBAC Integration**: Role-based access control
- **Team Management**: Proper team membership handling
- **Audit Trail**: Complete transfer history tracking

### **5. Real-time Features**

- **WebSocket Gateway**: Real-time notification delivery
- **JWT Authentication**: Secure WebSocket connections
- **User Rooms**: Targeted notification delivery
- **Connection Management**: Proper connection/disconnection handling

---

## 🏗️ **Architecture Overview**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│                 │    │                 │    │                 │
│ • React         │◄──►│ • NestJS        │◄──►│ • PostgreSQL    │
│ • RTK Query     │    │ • BullMQ        │    │ • Prisma        │
│ • WebSocket     │    │ • WebSocket     │    │ • Redis         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### **Event Flow**

1. **Transfer Request Created** → OutboxEvent inserted
2. **Outbox Processor** → Polls and enqueues BullMQ jobs
3. **Notification Processor** → Creates notifications for recipients
4. **WebSocket Gateway** → Delivers real-time notifications
5. **Frontend** → Receives and displays notifications

---

## 📁 **Files Created/Modified**

### **New Files Created**

```
backend/src/
├── config/
│   └── queue.config.ts                    # BullMQ configuration
├── jobs/
│   ├── notifications.processor.ts         # Notification job processor
│   └── outbox.processor.ts                # Outbox pattern processor
├── notifications/
│   ├── dto/
│   │   ├── create-notification.dto.ts     # Create notification DTO
│   │   ├── query-notifications.dto.ts     # Query notifications DTO
│   │   └── notification-response.dto.ts   # Notification response DTOs
│   ├── notifications.controller.ts        # REST API controller
│   ├── notifications.service.ts           # Business logic service
│   ├── notifications.gateway.ts           # WebSocket gateway
│   └── notifications.module.ts            # Module configuration
└── teams/
    └── dto/
        ├── create-transfer-request.dto.ts     # Transfer request DTOs
        ├── process-transfer-request.dto.ts    # Process transfer DTOs
        ├── query-transfer-requests.dto.ts     # Query transfer DTOs
        └── transfer-request-response.dto.ts   # Transfer response DTOs
```

### **Modified Files**

```
backend/
├── prisma/
│   └── schema.prisma                      # Enhanced with new models
├── src/
│   ├── app.module.ts                      # Added NotificationsModule
│   ├── teams/
│   │   ├── teams.controller.ts            # Added transfer endpoints
│   │   └── teams.service.ts               # Added transfer logic
│   └── prisma/
│       └── seed.ts                        # Updated team membership rules
└── package.json                           # Added Socket.IO dependencies
```

---

## 🔧 **API Endpoints**

### **Notifications API**

```
GET    /api/v1/notifications              # Get user notifications
GET    /api/v1/notifications/badge        # Get unread count
PATCH  /api/v1/notifications/:id/read     # Mark as read
POST   /api/v1/notifications/read-all     # Mark all as read
```

### **Transfer Requests API**

```
POST   /api/v1/teams/:id/transfers/request                    # Create transfer request
GET    /api/v1/teams/:id/transfers/requests                   # Get team transfer requests
PATCH  /api/v1/teams/:id/transfers/requests/:requestId/:action # Process transfer request
GET    /api/v1/teams/transfers/history/:userId                # Get user transfer history
```

---

## 🔐 **Security & RBAC**

### **Role Hierarchy**

```
CEO → Director → Manager → Team Head → Team Lead → Recruiter → Documentation/Processing Executives
```

### **Team Membership Rules**

- **Eligible for Team Membership**: Team Lead, Recruiter, Documentation Executive, Processing Executive
- **Team Management Only**: CEO, Director, Manager, Team Head, System Admin
- **Transfer Approval**: Manager, Team Head, Team Lead (as per requirements)

### **Permissions**

- `manage:teams` - Create and process transfer requests
- `read:teams` - View transfer requests and history
- `read:notifications` - View notifications
- `manage:notifications` - Manage notification settings

---

## 🚀 **How to Run Locally**

### **Prerequisites**

```bash
# Redis (for BullMQ)
brew install redis
redis-server

# PostgreSQL (already configured)
# Environment variables in .env
```

### **Environment Variables**

```bash
# Add to .env
REDIS_URL="redis://localhost:6379"
NOTIFICATIONS_OUTBOX_POLL_MS="5000"
NOTIFICATIONS_OUTBOX_BATCH="10"
NOTIFICATIONS_MAX_RETRIES="3"
NOTIFICATIONS_RETRY_DELAY="1000"
```

### **Commands**

```bash
# Install dependencies
npm install

# Run database migrations
npx prisma migrate dev

# Seed database
npm run db:seed

# Start development server
npm run start:dev
```

---

## 🧪 **Testing the Implementation**

### **1. Create Transfer Request**

```bash
curl -X POST http://localhost:3000/api/v1/teams/{teamId}/transfers/request \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "toTeamId": "team456",
    "reason": "Better team fit"
  }'
```

### **2. Get Notifications**

```bash
curl -X GET http://localhost:3000/api/v1/notifications \
  -H "Authorization: Bearer {token}"
```

### **3. WebSocket Connection**

```javascript
// Frontend WebSocket connection
const socket = io('http://localhost:3000/notifications', {
  auth: {
    token: 'your-jwt-token',
  },
});

socket.on('notification:new', (data) => {
  console.log('New notification:', data);
});
```

---

## 📊 **Monitoring & Observability**

### **Logs**

- Structured logging with correlation IDs
- BullMQ job processing logs
- WebSocket connection logs
- Transfer request audit logs

### **Metrics**

- Notification delivery success rate
- Transfer request processing time
- WebSocket connection count
- Queue processing metrics

---

## 🔄 **Event Types Supported**

### **Current Events**

- `MemberTransferRequested` - Team transfer request created
- `CandidateVerified` - Candidate document verified (placeholder)

### **Extensible Design**

The system is designed to easily add new event types:

1. Add new processor method in `NotificationsProcessor`
2. Create outbox event in business logic
3. Define notification templates
4. Update frontend to handle new notification types

---

## 🎯 **Business Rules Implemented**

### **Transfer Request Rules**

1. Only users in source team can be transferred
2. Users cannot be transferred to teams they're already in
3. Only one pending transfer request per user
4. Team leads and above can approve transfers
5. Complete audit trail maintained

### **Notification Rules**

1. Idempotent notification creation
2. Real-time delivery via WebSocket
3. Proper RBAC filtering
4. Automatic cleanup of old notifications

---

## 🚀 **Future Enhancements**

### **Phase 2 Features**

- Email notifications
- SMS notifications
- WhatsApp integration
- Push notifications
- Notification preferences
- Bulk notification operations

### **Performance Optimizations**

- Redis caching for frequently accessed data
- Notification batching
- WebSocket connection pooling
- Database query optimization

---

## ✅ **Definition of Done**

- ✅ **Database Schema**: Enhanced with proper models and indexes
- ✅ **BullMQ Integration**: Reliable queue processing with retry logic
- ✅ **WebSocket Gateway**: Real-time notification delivery
- ✅ **Transfer Request System**: Complete workflow implementation
- ✅ **RBAC Integration**: Proper role-based access control
- ✅ **API Documentation**: Swagger documentation for all endpoints
- ✅ **Error Handling**: Comprehensive error handling and logging
- ✅ **Testing**: Ready for unit and integration tests
- ✅ **Documentation**: Complete implementation documentation

---

## 📝 **Notes**

- **Idempotency**: All operations are idempotent to prevent duplicates
- **Scalability**: Designed to handle high-volume notification processing
- **Maintainability**: Clean separation of concerns and modular design
- **Security**: JWT authentication and RBAC throughout
- **Observability**: Comprehensive logging and monitoring capabilities

This implementation provides a solid foundation for the notification system and can be easily extended for future requirements.
