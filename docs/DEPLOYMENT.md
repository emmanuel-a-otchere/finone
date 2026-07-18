# SystemOne Deployment Guide

This guide covers deploying SystemOne in two scenarios:
1. **Co-located with OpenClaw** - On an Ubuntu server already running OpenClaw
2. **Separate Network Node** - On a Debian container in the same LAN as OpenClaw

---

## Prerequisites (Both Scenarios)

- Docker Engine 24.0+
- Docker Compose 2.20+
- Git 2.40+
- 4GB RAM minimum (8GB recommended)
- 20GB disk space

---

## Scenario 1: Ubuntu Server with OpenClaw

This deployment runs SystemOne alongside OpenClaw on the same Ubuntu machine, enabling direct skill integration.

### 1.1 System Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker if not present (OpenClaw typically has this)
sudo apt install -y docker.io docker-compose-plugin

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify Docker
docker --version
docker compose version
```

### 1.2 Clone and Configure SystemOne

```bash
# Navigate to your services directory (adjust path as needed)
cd /opt

# Clone SystemOne
sudo git clone https://github.com/your-org/systemone.git
cd systemone/SystemOne

# Set ownership
sudo chown -R $USER:$USER .

# Create environment file
cp .env.example .env
```

### 1.3 Configure Environment for OpenClaw Integration

Edit `.env` with OpenClaw-specific settings:

```bash
nano .env
```

```env
# Database
DB_PASSWORD=your_secure_password_here

# Authentication
JWT_SECRET=$(openssl rand -hex 32)
JWT_EXPIRATION_HOURS=24

# Logging
LOG_LEVEL=INFO

# OpenClaw Integration - ENABLE THIS
OPENCLAW_ENABLED=true
OPENCLAW_API_URL=http://localhost:8080
OPENCLAW_API_KEY=your_openclaw_api_key

# NTFY Notifications (OpenClaw default)
NTFY_ENABLED=true
NTFY_SERVER_URL=https://ping.otchere.com
NTFY_TOPIC=portfolio
```

### 1.4 Configure Docker Network for OpenClaw

SystemOne needs to communicate with OpenClaw services. Create a shared network:

```bash
# Check if OpenClaw network exists
docker network ls | grep openclaw

# If OpenClaw uses a specific network, note its name
# Common names: openclaw_default, openclaw-network

# Modify docker-compose.yml to use external network
```

Edit `docker-compose.yml` to add external network:

```yaml
# Add at the bottom of docker-compose.yml, replace existing networks section:
networks:
  systemone-network:
    driver: bridge
  openclaw-network:
    external: true
    name: openclaw_default  # Adjust to match your OpenClaw network name
```

Add the OpenClaw network to services that need it:

```yaml
services:
  core-engine:
    # ... existing config ...
    networks:
      - systemone-network
      - openclaw-network

  intelligence-api:
    # ... existing config ...
    networks:
      - systemone-network
      - openclaw-network
```

### 1.5 Adjust Ports to Avoid Conflicts

If OpenClaw uses port 80, modify SystemOne's WebUI port:

```yaml
# In docker-compose.yml, change webui service:
  webui:
    # ... existing config ...
    ports:
      - "8080:80"  # Changed from 80:80
```

Or use a subdomain with OpenClaw's Caddy/reverse proxy.

### 1.6 Build and Start

```bash
# Build all images
make build

# Start services
make up

# Verify all services are running
docker compose ps

# Check logs
make logs
```

### 1.7 Create Admin User

```bash
# Interactive user creation
docker compose exec core-engine python -c "
from app.services.auth import auth_service
username = input('Enter username: ')
password = input('Enter password: ')
auth_service.add_user(username, password)
print(f'User {username} created successfully')
"
```

### 1.8 Register SystemOne as OpenClaw Skill

```bash
# Copy SKILLs.md to OpenClaw skills directory
cp SKILLs.md /path/to/openclaw/skills/systemone-trading/

# Or use OpenClaw CLI (if available)
openclaw skills install ./SKILLs.md
openclaw skills configure systemone-trading --api-url http://localhost:8001
```

### 1.9 Configure OpenClaw to Use SystemOne

Add to your OpenClaw configuration:

```yaml
# In OpenClaw config (e.g., ~/.openclaw/config.yaml or /etc/openclaw/config.yaml)
skills:
  systemone-trading:
    enabled: true
    api_url: http://systemone-core:8001
    api_key: your_api_key_here
    ntfy:
      server_url: https://ping.otchere.com
      topic: portfolio
```

### 1.10 Verify Integration

```bash
# Test SystemOne health
curl http://localhost:8001/health

# Test from OpenClaw context
curl -H "Authorization: Bearer $OPENCLAW_TOKEN" \
     http://localhost:8001/api/core/health

# Access WebUI
open http://localhost:8080
```

### 1.11 Systemd Service (Optional)

Create a systemd service for auto-start:

```bash
sudo nano /etc/systemd/system/systemone.service
```

```ini
[Unit]
Description=SystemOne Trading Intelligence
Requires=docker.service
After=docker.service openclaw.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/systemone/SystemOne
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
User=your_username

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable systemone
sudo systemctl start systemone
```

---

## Scenario 2: Debian Container on Same LAN

This deployment runs SystemOne in a separate Debian container/VM that communicates with OpenClaw over the local network.

### 2.1 Container/VM Setup

```bash
# If using LXC/LXD
lxc launch images:debian/12 systemone
lxc exec systemone -- bash

# If using Docker for the container itself
docker run -d --name systemone-host \
  --privileged \
  -v /var/run/docker.sock:/var/run/docker.sock \
  debian:12 tail -f /dev/null
docker exec -it systemone-host bash

# If using a VM, SSH into it
ssh user@systemone-vm
```

### 2.2 Install Dependencies on Debian

```bash
# Update system
apt update && apt upgrade -y

# Install required packages
apt install -y \
  ca-certificates \
  curl \
  gnupg \
  git \
  make

# Install Docker
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Start Docker
systemctl enable docker
systemctl start docker
```

### 2.3 Clone SystemOne

```bash
# Create directory
mkdir -p /opt/systemone
cd /opt/systemone

# Clone repository
git clone https://github.com/your-org/systemone.git .
cd SystemOne

# Create environment file
cp .env.example .env
```

### 2.4 Configure for Remote OpenClaw

Determine the OpenClaw server's LAN IP address:

```bash
# On the OpenClaw Ubuntu server, run:
ip addr show | grep "inet " | grep -v 127.0.0.1
# Example output: 192.168.1.100
```

Edit `.env` on the Debian container:

```bash
nano .env
```

```env
# Database
DB_PASSWORD=your_secure_password_here

# Authentication
JWT_SECRET=generate_a_random_64_char_string
JWT_EXPIRATION_HOURS=24

# Logging
LOG_LEVEL=INFO

# OpenClaw Integration - Remote Connection
OPENCLAW_ENABLED=true
OPENCLAW_API_URL=http://192.168.1.100:8080  # OpenClaw server LAN IP
OPENCLAW_API_KEY=your_openclaw_api_key

# NTFY Notifications
NTFY_ENABLED=true
NTFY_SERVER_URL=https://ping.otchere.com
NTFY_TOPIC=portfolio
```

### 2.5 Configure Firewall (if applicable)

On the Debian container:

```bash
# Install UFW
apt install -y ufw

# Allow SSH
ufw allow 22/tcp

# Allow SystemOne ports
ufw allow 80/tcp    # WebUI
ufw allow 8001/tcp  # Core Engine API
ufw allow 8002/tcp  # Intelligence API

# Enable firewall
ufw enable
```

On the OpenClaw Ubuntu server, allow incoming connections from SystemOne:

```bash
# Get SystemOne container's IP
# On Debian container: ip addr show

# On Ubuntu/OpenClaw server:
sudo ufw allow from 192.168.1.101 to any port 8080  # Adjust IP
```

### 2.6 Build and Start

```bash
# Build all images
make build

# Start services
make up

# Verify services
docker compose ps
```

### 2.7 Create Admin User

```bash
docker compose exec core-engine python -c "
from app.services.auth import auth_service
auth_service.add_user('admin', 'your_password_here')
print('Admin user created')
"
```

### 2.8 Configure OpenClaw to Connect to Remote SystemOne

On the OpenClaw Ubuntu server, update the OpenClaw configuration:

```yaml
# In OpenClaw config
skills:
  systemone-trading:
    enabled: true
    api_url: http://192.168.1.101:8001  # SystemOne container LAN IP
    api_key: your_api_key_here
    ntfy:
      server_url: https://ping.otchere.com
      topic: portfolio
```

### 2.9 Test Connectivity

From the Debian container:

```bash
# Test OpenClaw connectivity
curl http://192.168.1.100:8080/health

# Test local SystemOne
curl http://localhost:8001/health
```

From the OpenClaw server:

```bash
# Test SystemOne API
curl http://192.168.1.101:8001/health

# Test with auth
TOKEN=$(curl -s -X POST http://192.168.1.101:8001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your_password"}' | jq -r '.access_token')

curl -H "Authorization: Bearer $TOKEN" \
     http://192.168.1.101:8001/signals
```

### 2.10 Access WebUI

From any device on the LAN:

```
http://192.168.1.101
```

Or if using a different port:

```
http://192.168.1.101:8080
```

---

## Post-Deployment Tasks (Both Scenarios)

### Health Monitoring

```bash
# Check all services
make health

# Or manually
curl http://localhost:8001/health
curl http://localhost:8002/health
```

### View Logs

```bash
# All logs
make logs

# Specific service
make logs-core
make logs-intel
make logs-celery
```

### Database Access

```bash
make shell-db
# Then in psql:
\dt
SELECT * FROM signals LIMIT 5;
```

### Backup

```bash
# Backup database
docker compose exec postgres pg_dump -U postgres systemone > backup_$(date +%Y%m%d).sql

# Backup entire data volumes
docker run --rm -v systemone_pgdata:/data -v $(pwd):/backup alpine \
  tar czf /backup/pgdata_backup.tar.gz /data
```

---

## Troubleshooting

### Connection Refused to OpenClaw

```bash
# Check OpenClaw is running
curl http://<openclaw-ip>:8080/health

# Check firewall
sudo ufw status

# Check Docker network connectivity
docker network inspect systemone-network
```

### Database Connection Issues

```bash
# Check PostgreSQL is running
docker compose logs postgres

# Test connection
docker compose exec postgres pg_isready -U postgres
```

### WebUI Not Loading

```bash
# Check Caddy logs
docker compose logs webui

# Verify build completed
docker compose exec webui ls /srv
```

### API Authentication Failing

```bash
# Check htpasswd file exists
docker compose exec core-engine cat /config/users.htpasswd

# Recreate user
docker compose exec core-engine python -c "
from app.services.auth import auth_service
auth_service.add_user('admin', 'newpassword')
"
```

---

## Security Recommendations

1. **Change default passwords** in `.env`
2. **Use HTTPS** in production (configure Caddy with certificates)
3. **Restrict network access** using firewall rules
4. **Regular backups** of database and configuration
5. **Monitor logs** for suspicious activity
6. **Keep Docker images updated** with security patches

---

## Quick Reference

| Service | Default Port | Health Endpoint |
|---------|--------------|-----------------|
| WebUI | 80 | / |
| Core Engine | 8001 | /health |
| Intelligence | 8002 | /health |
| PostgreSQL | 5432 | pg_isready |
| Redis | 6379 | redis-cli ping |

| Command | Description |
|---------|-------------|
| `make build` | Build all Docker images |
| `make up` | Start all services |
| `make down` | Stop all services |
| `make logs` | View all logs |
| `make health` | Check service health |
| `make add-user` | Create new user |
| `make package` | Export images for deployment |
