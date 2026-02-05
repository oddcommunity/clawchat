# ClawChat Monitoring

Full observability stack for the ClawChat platform.

## Components

| Component | Purpose | Port |
|-----------|---------|------|
| Prometheus | Metrics collection | 9090 |
| Grafana | Visualization | 3001 |
| Loki | Log aggregation | 3100 |
| Promtail | Log collection | - |
| Node Exporter | Host metrics | 9100 |
| Redis Exporter | Redis metrics | 9121 |
| Postgres Exporter | PostgreSQL metrics | 9187 |

## Quick Start

```bash
# Start the main stack
cd /home/exe/clawchat/server
docker-compose up -d

# Add monitoring stack
docker-compose -f docker-compose.yml -f monitoring/docker-compose.monitoring.yml up -d
```

## Access

- **Grafana**: http://localhost:3001
  - Default login: admin / admin (change in .env)
- **Prometheus**: http://localhost:9090

## Dashboards

Pre-configured dashboards:
- **ClawChat Overview**: System health, Synapse metrics
- More dashboards can be added to `grafana/provisioning/dashboards/`

## Alerting

To set up alerts, add rules to `prometheus.yml`:

```yaml
rule_files:
  - /etc/prometheus/alerts.yml
```

Example alert rules (`alerts.yml`):

```yaml
groups:
  - name: clawchat
    rules:
      - alert: HighCPUUsage
        expr: 100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: High CPU usage detected

      - alert: SynapseDown
        expr: up{job="synapse"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: Synapse homeserver is down

      - alert: HighMemoryUsage
        expr: (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100 > 90
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: High memory usage detected
```

## Synapse Metrics

Enable Synapse metrics in `homeserver.yaml`:

```yaml
enable_metrics: true
```

Key metrics to monitor:
- `synapse_http_server_response_count_total` - HTTP requests
- `synapse_http_server_response_time_seconds` - Response times
- `synapse_federation_client_sent_transactions_total` - Federation activity
- `synapse_storage_events_persisted_by_source_type` - Event storage rate

## Log Analysis

Access logs via Grafana's Explore view:

```
{job="synapse"} |= "error"
```

Common queries:
- All errors: `{job="synapse"} |= "error" | json`
- Login attempts: `{job="synapse"} |~ "login"`
- Slow queries: `{job="synapse"} |= "slow"`

## Backup

The monitoring data is stored in Docker volumes:
- `prometheus-data` - Time series data
- `grafana-data` - Dashboards and settings
- `loki-data` - Log data

Backup these volumes or configure remote storage for production.
