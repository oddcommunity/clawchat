# ClawChat Troubleshooting Guide

Common issues and their solutions.

## Table of Contents

1. [Server Issues](#server-issues)
2. [App Issues](#app-issues)
3. [Bot Issues](#bot-issues)
4. [Performance Issues](#performance-issues)
5. [Debug Commands](#debug-commands)

---

## Server Issues

### Synapse Won't Start

**Symptoms:** Synapse container keeps restarting.

**Check logs:**
```bash
docker logs clawchat-synapse
```

**Common causes:**

1. **Database connection failed**
   ```bash
   # Check PostgreSQL is running
   docker exec clawchat-postgres pg_isready -U synapse

   # Verify database exists
   docker exec clawchat-postgres psql -U synapse -c "\l"
   ```

2. **Invalid configuration**
   ```bash
   # Validate homeserver.yaml syntax
   docker exec clawchat-synapse python -c "import yaml; yaml.safe_load(open('/data/homeserver.yaml'))"
   ```

3. **Missing signing key**
   ```bash
   # Generate signing key
   docker exec clawchat-synapse python -m synapse.app.homeserver \
     --config-path /data/homeserver.yaml \
     --generate-keys
   ```

### Database Connection Issues

**Symptoms:** "connection refused" errors.

**Solutions:**

```bash
# Check PostgreSQL container
docker ps | grep postgres

# Check container networking
docker network inspect clawchat_default

# Test connection from Synapse container
docker exec clawchat-synapse nc -zv postgres 5432
```

### Redis Connection Issues

**Symptoms:** Synapse starts but caching errors appear.

**Solutions:**

```bash
# Check Redis is running
docker exec clawchat-redis redis-cli ping

# Test from Synapse
docker exec clawchat-synapse nc -zv redis 6379
```

### SSL Certificate Issues

**Symptoms:** Browser shows certificate warning.

**Solutions:**

```bash
# Check certificate validity
openssl s_client -connect matrix.yourdomain.com:443 -servername matrix.yourdomain.com

# Renew certificate
docker-compose run --rm certbot renew

# Reload nginx
docker exec clawchat-nginx nginx -s reload
```

---

## App Issues

### Login Fails

**Symptoms:** "Failed to login" error.

**Debug steps:**

1. **Check network connectivity**
   - Ensure phone can reach the server
   - Try `curl https://matrix.yourdomain.com/health` from phone

2. **Check homeserver URL in config**
   ```typescript
   // lib/config.ts
   matrixHomeserver: 'https://matrix.yourdomain.com',  // Not http://
   ```

3. **Check user exists**
   ```bash
   docker exec clawchat-synapse \
     curl -s http://localhost:8008/_synapse/admin/v2/users/@username:yourdomain.com \
     -H "Authorization: Bearer ADMIN_TOKEN"
   ```

### Messages Not Sending

**Symptoms:** Messages stuck in "sending" state.

**Debug steps:**

1. **Check room exists and user is joined**
2. **Check bot is in the room**
3. **Check network console for errors**

### Push Notifications Not Working

**Symptoms:** No notifications when app is in background.

**Solutions:**

1. **iOS:**
   - Ensure push notification capability is enabled in Xcode
   - Check device is registered with APNS

2. **Android:**
   - Verify `google-services.json` is correct
   - Check notification channel settings

3. **Check pusher registration:**
   ```bash
   curl "https://matrix.yourdomain.com/_matrix/client/r0/pushers" \
     -H "Authorization: Bearer USER_TOKEN"
   ```

---

## Bot Issues

### Bot Not Responding

**Symptoms:** Messages sent to bot get no reply.

**Debug steps:**

1. **Check bot container is running**
   ```bash
   docker logs clawchat-clawdbot -f
   ```

2. **Check bot is in the room**
   ```bash
   # List rooms bot is in
   curl "http://localhost:8008/_matrix/client/r0/joined_rooms" \
     -H "Authorization: Bearer BOT_TOKEN"
   ```

3. **Check Anthropic API key**
   ```bash
   # Test API key
   curl https://api.anthropic.com/v1/messages \
     -H "x-api-key: $ANTHROPIC_API_KEY" \
     -H "anthropic-version: 2024-01-01" \
     -H "content-type: application/json" \
     -d '{"model":"claude-sonnet-4-20250514","max_tokens":10,"messages":[{"role":"user","content":"Hi"}]}'
   ```

4. **Check bot can sync**
   ```bash
   docker exec clawchat-clawdbot curl -s "http://synapse:8008/_matrix/client/r0/sync?timeout=0" \
     -H "Authorization: Bearer BOT_TOKEN"
   ```

### Bot Slow to Respond

**Symptoms:** Long delay before bot replies.

**Solutions:**

1. **Check Anthropic API latency**
2. **Increase bot concurrency limits**
3. **Check for rate limiting**

---

## Performance Issues

### High Memory Usage

**Symptoms:** Server running out of memory.

**Solutions:**

1. **Tune PostgreSQL:**
   ```sql
   -- Check connection count
   SELECT count(*) FROM pg_stat_activity;
   ```

2. **Tune Synapse caches:**
   ```yaml
   # homeserver.yaml
   caches:
     global_factor: 0.5  # Reduce from 1.0
   ```

3. **Enable Synapse workers** (for high load)

### High CPU Usage

**Symptoms:** Server CPU constantly high.

**Debug steps:**

```bash
# Find top processes
docker stats

# Check Synapse metrics
curl http://localhost:8008/_synapse/metrics | grep cpu
```

### Database Slow

**Symptoms:** Queries timing out.

**Solutions:**

```bash
# Check slow queries
docker exec clawchat-postgres psql -U synapse -c "
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active' AND now() - pg_stat_activity.query_start > interval '5 seconds';
"

# Analyze tables
docker exec clawchat-postgres psql -U synapse -c "VACUUM ANALYZE;"
```

---

## Debug Commands

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker logs clawchat-synapse -f --tail 100

# Kubernetes
kubectl logs -n clawchat -l app=synapse -f
```

### Check Service Health

```bash
# Synapse
curl http://localhost:8008/health

# Redis
docker exec clawchat-redis redis-cli ping

# PostgreSQL
docker exec clawchat-postgres pg_isready -U synapse
```

### Database Queries

```bash
# Connect to PostgreSQL
docker exec -it clawchat-postgres psql -U synapse

# Common queries
# - Count users: SELECT count(*) FROM users;
# - Count rooms: SELECT count(*) FROM rooms;
# - Count events: SELECT count(*) FROM events;
```

### Network Debugging

```bash
# Test connectivity between containers
docker exec clawchat-synapse nc -zv postgres 5432
docker exec clawchat-synapse nc -zv redis 6379

# Check DNS resolution
docker exec clawchat-synapse nslookup postgres
```

### Reset Everything

**Warning:** This deletes all data!

```bash
# Stop all containers
docker-compose down

# Remove volumes
docker volume rm clawchat_synapse-data clawchat_postgres-data clawchat_redis-data

# Start fresh
docker-compose up -d
./scripts/setup.sh
```
