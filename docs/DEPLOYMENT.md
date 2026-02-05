# ClawChat Deployment Guide

Complete guide for deploying ClawChat to production.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Server Deployment](#server-deployment)
3. [Mobile App Deployment](#mobile-app-deployment)
4. [Post-Deployment](#post-deployment)
5. [Deployment Checklist](#deployment-checklist)

---

## Prerequisites

### Infrastructure Requirements

| Component | Minimum | Recommended (10k users) |
|-----------|---------|------------------------|
| CPU | 2 cores | 8+ cores |
| RAM | 4 GB | 16+ GB |
| Storage | 50 GB SSD | 500+ GB SSD |
| Network | 100 Mbps | 1 Gbps |

### Required Accounts & Keys

- [ ] Domain name (e.g., `clawchat.io`)
- [ ] DNS provider access
- [ ] Anthropic API key
- [ ] Apple Developer account (for iOS)
- [ ] Google Play Console account (for Android)
- [ ] EAS (Expo Application Services) account

---

## Server Deployment

### Option 1: Docker Compose (Small Scale)

```bash
# 1. Clone and configure
git clone https://github.com/your-org/clawchat.git
cd clawchat/server
cp .env.example .env

# 2. Generate secrets
echo "POSTGRES_PASSWORD=$(openssl rand -hex 16)" >> .env
echo "SYNAPSE_REGISTRATION_SHARED_SECRET=$(openssl rand -hex 32)" >> .env
echo "SYNAPSE_MACAROON_SECRET_KEY=$(openssl rand -hex 32)" >> .env
echo "SYNAPSE_FORM_SECRET=$(openssl rand -hex 32)" >> .env

# 3. Add your Anthropic API key
echo "ANTHROPIC_API_KEY=sk-ant-..." >> .env

# 4. Update domain in configuration files
sed -i 's/clawchat.io/yourdomain.com/g' homeserver.yaml
sed -i 's/clawchat.io/yourdomain.com/g' nginx.conf

# 5. Start services
docker-compose --profile simple up -d

# 6. Run setup
./scripts/setup.sh

# 7. (Optional) Enable production profile with SSL
docker-compose --profile simple --profile production up -d
```

### Option 2: Kubernetes (Large Scale)

```bash
# 1. Configure secrets
cd server/k8s
cp secrets.yaml secrets.local.yaml
# Edit secrets.local.yaml with actual values

# 2. Update domain references
find . -name "*.yaml" -exec sed -i 's/clawchat.io/yourdomain.com/g' {} \;

# 3. Deploy
kubectl apply -k .

# 4. Wait for pods
kubectl get pods -n clawchat -w

# 5. Create bot user
kubectl exec -it -n clawchat deploy/synapse -- \
  register_new_matrix_user -c /config/homeserver.yaml \
  -u clawbot -p YOUR_PASSWORD --admin
```

### DNS Configuration

Add these DNS records:

| Type | Name | Value |
|------|------|-------|
| A | matrix | `<server-ip>` |
| A | api | `<server-ip>` |
| CNAME | www | `yourdomain.com` |

### SSL Certificates

**Using Certbot:**
```bash
docker-compose run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d matrix.yourdomain.com \
  -d api.yourdomain.com
```

**Using Let's Encrypt with Kubernetes:**
```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
```

---

## Mobile App Deployment

### Configure the App

```bash
cd app

# 1. Update configuration
vim lib/config.ts
# Set matrixHomeserver and botUserId

# 2. Update app.json
vim app.json
# Set bundleIdentifier, package, projectId

# 3. Update eas.json
vim eas.json
# Set environment variables for each profile
```

### Build with EAS

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure project
eas build:configure

# Build for iOS
eas build --platform ios --profile production

# Build for Android
eas build --platform android --profile production
```

### Submit to App Stores

**iOS App Store:**
```bash
eas submit --platform ios
```

**Google Play Store:**
```bash
eas submit --platform android
```

---

## Post-Deployment

### Verify Deployment

```bash
# Check Synapse health
curl https://matrix.yourdomain.com/health

# Check Federation (if enabled)
curl https://matrix.yourdomain.com/_matrix/federation/v1/version

# Test login
curl -X POST https://matrix.yourdomain.com/_matrix/client/r0/login \
  -H "Content-Type: application/json" \
  -d '{"type":"m.login.password","user":"testuser","password":"testpass"}'
```

### Set Up Monitoring

```bash
cd server
docker-compose -f docker-compose.yml \
  -f monitoring/docker-compose.monitoring.yml up -d

# Access Grafana at http://localhost:3001
```

### Configure Backups

```bash
# Manual backup
./scripts/backup.sh

# Set up cron job for daily backups
echo "0 2 * * * /path/to/clawchat/server/scripts/backup.sh" | crontab -
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] Domain purchased and DNS access confirmed
- [ ] SSL certificates obtained or auto-renewal configured
- [ ] Anthropic API key obtained
- [ ] Server/Kubernetes cluster provisioned
- [ ] Apple Developer and Google Play accounts set up
- [ ] All secrets generated securely

### Server Deployment

- [ ] Environment variables configured
- [ ] Docker Compose or Kubernetes manifests applied
- [ ] PostgreSQL initialized and healthy
- [ ] Redis running and healthy
- [ ] Synapse homeserver started
- [ ] Bot user created
- [ ] Bot access token generated
- [ ] Clawdbot connected to Synapse
- [ ] SSL/TLS configured
- [ ] Nginx/Ingress routing verified

### App Deployment

- [ ] Config updated with production homeserver URL
- [ ] App icons and splash screens added
- [ ] EAS project configured
- [ ] iOS build succeeded
- [ ] Android build succeeded
- [ ] iOS app submitted to App Store Connect
- [ ] Android app submitted to Google Play Console
- [ ] App Store review passed
- [ ] Apps published and available

### Post-Deployment

- [ ] Health checks passing
- [ ] Monitoring configured (Prometheus, Grafana)
- [ ] Alerting configured
- [ ] Backup schedule configured
- [ ] Backup restore tested
- [ ] User registration tested
- [ ] Bot conversation tested
- [ ] Image upload tested
- [ ] Push notifications working

### Documentation

- [ ] User documentation created
- [ ] Admin runbook created
- [ ] Incident response plan documented
- [ ] On-call rotation established
