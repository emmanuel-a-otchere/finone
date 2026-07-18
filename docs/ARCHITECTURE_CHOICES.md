# SystemOne Architecture Choices

**Document Version**: 1.2.0
**Date**: 2026-03-08
**Status**: Confirmed

---

## Confirmed Technology Decisions

### 1. WebUI Build Pipeline
**Choice**: Option A - Multi-stage Dockerfile with Caddy

**Description**: Build React application inside Docker using multi-stage build,
then serve static files directly via containerized Caddy.

**Rationale**:
- Fully self-contained and reproducible builds
- No host dependencies required
- Consistent across all deployment environments
- Caddy handles both reverse proxy and static file serving

---

### 2. Celery Scheduler
**Choice**: Option A - celery-sqlalchemy-scheduler

**Description**: SQLAlchemy-based scheduler for Celery Beat that stores
schedules in PostgreSQL database.

**Rationale**:
- Compatible with FastAPI (replaces Django-specific scheduler)
- Schedules persist in database (survives container restarts)
- Schedules can be shared across replicas
- Full SQL query capability for schedule management

---

### 3. Authentication
**Choice**: Option B - htpasswd-style file (Initial Release)

**Description**: Apache-style password file with bcrypt hashing for user
credentials, combined with JWT tokens for session management.

**Rationale**:
- Simple and portable
- No additional database tables required initially
- Easy to manage via CLI tools
- Can be upgraded to database-backed auth in future release

**Future Enhancement**: Option C (PostgreSQL-backed users) planned for v2.0

---

### 4. Packaging Strategy
**Choice**: Option A - Docker save/export to Packaged/

**Description**: Export Docker images as versioned .tar.gz archives stored
in the Packaged/releases/ directory.

**Rationale**:
- Fully portable without network access
- No external registry dependency
- Version-controlled releases
- Easy rollback capability

---

## Additional Confirmed Decisions

| Decision Area | Choice |
|---------------|--------|
| Database | Self-contained PostgreSQL + TimescaleDB |
| OpenClaw | Optional add-on via SKILLs.md |
| NTFY Server | External (default: https://ping.otchere.com) |
| Email | User-configured external SMTP |
| Project Root | /SystemOne/ directory |
| Deployment Output | /SystemOne/Packaged/ directory |
| Data Sources | Free external APIs (Yahoo, FRED, SEC EDGAR, Reddit) |

---

## Technology Stack Summary

| Component | Technology | Version |
|-----------|-----------|---------|
| API Gateway | Caddy | 2.7+ |
| Core Engine | Python/FastAPI | 3.11/0.109 |
| Intelligence | Python/FastAPI | 3.11/0.109 |
| Database | PostgreSQL + TimescaleDB | 15+ |
| Cache/Queue | Redis | 7+ |
| Task Scheduler | Celery + celery-sqlalchemy-scheduler | 5.3+ |
| Frontend | React + TypeScript | 18+ |
| Styling | Tailwind CSS | 3.4+ |
| ML Framework | PyTorch | 2.1+ |
| NLP | Transformers (FinBERT) | 4.36+ |
| Containerization | Docker + Docker Compose | 24.0+ |

---

## Directory Structure

```
SystemOne/
├── docs/
│   ├── ARCHITECTURE_CHOICES.md
│   └── SystemOne_specification_v1.1.0.md
├── services/
│   ├── core-engine/
│   │   ├── Dockerfile
│   │   ├── requirements.txt
│   │   └── app/
│   └── intelligence/
│       ├── Dockerfile
│       ├── requirements.txt
│       └── app/
├── webui/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
├── init-scripts/
│   └── migrations/
├── Packaged/
│   └── releases/
├── docker-compose.yml
├── Caddyfile
├── SKILLs.md
├── .env.example
└── Makefile
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-03-08 | Initial architecture choices confirmed |
| 1.2 | 2026-05-10 | Added ForecastService, enriched signals, signalstatus/protocoltype enums, wiremesh SignalCard |
