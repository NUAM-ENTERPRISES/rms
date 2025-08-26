# Global Audit System - Affiniks RMS

## Overview

The Affiniks RMS implements a comprehensive **global audit interceptor** that automatically logs all mutating operations across the application. This ensures complete audit coverage for compliance, security, and operational transparency.

## 🏗️ Architecture

### **Global Audit Interceptor**

- **Location**: `backend/src/common/audit/audit.interceptor.ts`
- **Registration**: Global interceptor via `APP_INTERCEPTOR` in `AppModule`
- **Coverage**: All POST, PATCH, PUT, DELETE operations
- **Automatic**: No manual intervention required

### **Audit Service**

- **Location**: `backend/src/common/audit/audit.service.ts`
- **Database**: PostgreSQL with `audit_logs` table
- **Caching**: None (real-time logging for compliance)
- **Error Handling**: Graceful degradation (audit failures don't break main app)

---

## 📊 Audit Coverage

### **✅ Currently Audited Operations**

| Entity Type        | Create | Update | Delete | Special Actions                     |
| ------------------ | ------ | ------ | ------ | ----------------------------------- |
| **Users**          | ✅     | ✅     | ✅     | Role assignments, password changes  |
| **Clients**        | ✅     | ✅     | ✅     | Financial data changes              |
| **Projects**       | ✅     | ✅     | ✅     | Status changes, role requirements   |
| **Candidates**     | ✅     | ✅     | ✅     | Status changes, project assignments |
| **Teams**          | ✅     | ✅     | ✅     | Member assignments                  |
| **Documents**      | ✅     | ✅     | ✅     | Verification status                 |
| **Interviews**     | ✅     | ✅     | ✅     | Scheduling, outcomes                |
| **Processing**     | ✅     | ✅     | ✅     | Status changes                      |
| **Certifications** | ✅     | ✅     | ✅     | Status updates                      |
| **Talent Pool**    | ✅     | ✅     | ✅     | Availability changes                |

### **🔒 Sensitive Data Protection**

The audit system automatically redacts sensitive fields:

```typescript
const sensitiveFieldsMap = {
  user: ["password", "email", "phone", "dateOfBirth"],
  candidate: [
    "contact",
    "email",
    "dateOfBirth",
    "expectedSalary",
    "currentEmployer",
  ],
  client: ["email", "phone", "taxId", "commissionRate", "paymentTerms"],
  // ... more entity types
};
```

**Redacted fields are logged as `[REDACTED]`** to maintain audit trail while protecting sensitive data.

---

## 🎯 Key Features

### **1. Automatic Entity Detection**

```typescript
// URL: /api/v1/users/123 → entityType: 'user'
// URL: /api/v1/clients/456 → entityType: 'client'
// URL: /api/v1/candidates/789 → entityType: 'candidate'
```

### **2. Action Type Mapping**

```typescript
POST   → 'create'
PATCH  → 'update'
PUT    → 'update'
DELETE → 'delete'
```

### **3. Comprehensive Metadata**

```typescript
{
  method: 'POST',
  url: '/api/v1/users',
  userAgent: 'Mozilla/5.0...',
  ip: '127.0.0.1',
  timestamp: '2024-01-15T10:30:00Z',
  responseStatus: 'success',
  createdId: 'user-123',
  // Error info if applicable
  error: {
    message: 'Validation failed',
    status: 400
  }
}
```

### **4. Skip Audit Capability**

```typescript
@SkipAudit()
@Post('health-check')
async healthCheck() {
  // This endpoint won't be audited
}
```

---

## 📋 Database Schema

### **AuditLog Table**

```sql
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  action_type TEXT NOT NULL,      -- create, update, delete, etc.
  entity_id TEXT NOT NULL,        -- ID of the affected entity
  entity_type TEXT NOT NULL,      -- user, client, candidate, etc.
  user_id TEXT NOT NULL,          -- ID of user who performed action
  changes JSONB DEFAULT '{}',     -- What was changed (redacted)
  timestamp TIMESTAMP DEFAULT NOW(),

  -- Relations
  user_id TEXT REFERENCES users(id)
);
```

---

## 🔧 Configuration

### **Global Registration**

```typescript
// app.module.ts
{
  provide: APP_INTERCEPTOR,
  useClass: AuditInterceptor,
}
```

### **Module Dependencies**

```typescript
// audit.module.ts
@Module({
  controllers: [AuditController],
  providers: [AuditService, AuditInterceptor],
  exports: [AuditService, AuditInterceptor],
})
```

---

## 📡 API Endpoints

### **View Audit Logs**

```http
GET /api/v1/audit
GET /api/v1/audit?entityType=user&entityId=123
GET /api/v1/audit?userId=456&actionType=create
GET /api/v1/audit?limit=100&offset=50
```

### **Entity-Specific Logs**

```http
GET /api/v1/audit/entity?entityType=user&entityId=123
GET /api/v1/audit/user?userId=456
```

### **Required Permissions**

- `read:audit` - View audit logs
- `write:audit` - Export audit logs (future)
- `manage:audit` - Manage audit configuration (future)

---

## 🧪 Testing

### **Unit Tests**

```bash
npm test -- --testPathPatterns=audit.interceptor.spec.ts
```

### **Test Coverage**

- ✅ Non-authenticated requests (skipped)
- ✅ GET requests (skipped)
- ✅ POST/PATCH/DELETE requests (audited)
- ✅ Sensitive field redaction
- ✅ Error handling
- ✅ Skip audit decorator
- ✅ Unknown entity types

---

## 🚀 Performance Considerations

### **Optimizations**

1. **Async Logging**: Audit operations don't block main requests
2. **Error Isolation**: Audit failures don't break application
3. **Minimal Overhead**: Lightweight interceptor with efficient entity detection
4. **Selective Logging**: Only mutating operations are audited

### **Database Performance**

- **Indexes**: `user_id`, `entity_type`, `entity_id`, `timestamp`
- **Partitioning**: Consider time-based partitioning for large datasets
- **Retention**: Implement data retention policies (future)

---

## 🔒 Security & Compliance

### **Data Protection**

- **Sensitive Fields**: Automatically redacted
- **Access Control**: RBAC-protected audit endpoints
- **Audit Trail**: Complete history of all changes
- **Non-repudiation**: User attribution for all actions

### **Compliance Features**

- **GDPR**: Sensitive data redaction
- **SOX**: Complete audit trail
- **HIPAA**: Healthcare data protection
- **ISO 27001**: Information security management

---

## 📈 Monitoring & Alerts

### **Audit Metrics**

- **Volume**: Number of audit logs per day
- **Errors**: Failed audit operations
- **Performance**: Audit logging latency
- **Coverage**: Percentage of operations audited

### **Alerting**

- **High Volume**: Unusual audit activity
- **Errors**: Audit logging failures
- **Missing Data**: Operations not being audited
- **Performance**: Slow audit operations

---

## 🔮 Future Enhancements

### **Planned Features**

1. **Real-time Alerts**: Suspicious activity detection
2. **Audit Export**: CSV/JSON export functionality
3. **Retention Policies**: Automated data cleanup
4. **Advanced Filtering**: Complex query capabilities
5. **Audit Dashboards**: Visual audit analytics
6. **Integration**: SIEM system integration

### **Performance Improvements**

1. **Batch Logging**: Group multiple operations
2. **Caching**: Frequently accessed audit data
3. **Compression**: Reduce storage requirements
4. **Archiving**: Move old logs to cold storage

---

## 🛠️ Troubleshooting

### **Common Issues**

#### **1. Missing Audit Logs**

```bash
# Check if interceptor is registered
grep -r "APP_INTERCEPTOR" src/

# Verify audit service is working
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/v1/audit
```

#### **2. Performance Issues**

```bash
# Check audit table size
SELECT COUNT(*) FROM audit_logs;
SELECT pg_size_pretty(pg_total_relation_size('audit_logs'));

# Check for slow queries
SELECT * FROM audit_logs
WHERE timestamp > NOW() - INTERVAL '1 hour'
ORDER BY timestamp DESC;
```

#### **3. Permission Errors**

```bash
# Verify user has audit permissions
SELECT * FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE ur.user_id = '<user_id>' AND p.key = 'read:audit';
```

---

## 📚 References

- **NestJS Interceptors**: [https://docs.nestjs.com/interceptors](https://docs.nestjs.com/interceptors)
- **Prisma Documentation**: [https://www.prisma.io/docs](https://www.prisma.io/docs)
- **PostgreSQL JSONB**: [https://www.postgresql.org/docs/current/datatype-json.html](https://www.postgresql.org/docs/current/datatype-json.html)
- **Audit Best Practices**: [https://owasp.org/www-project-proactive-controls/v3/en/c9-security-logging](https://owasp.org/www-project-proactive-controls/v3/en/c9-security-logging)

---

## ✅ Definition of Done

- [x] Global audit interceptor implemented
- [x] All mutating operations audited
- [x] Sensitive data redaction working
- [x] Comprehensive test coverage
- [x] API endpoints for audit viewing
- [x] RBAC protection on audit endpoints
- [x] Error handling and graceful degradation
- [x] Documentation complete
- [x] Performance optimized
- [x] Security reviewed

**Audit Coverage: 100% of mutating operations** ✅
