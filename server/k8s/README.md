# ClawChat Kubernetes Deployment

Production-ready Kubernetes manifests for deploying the ClawChat stack.

## Prerequisites

- Kubernetes cluster (1.25+)
- kubectl configured
- cert-manager installed (for TLS)
- nginx-ingress controller
- Storage class named `standard` (or update PVCs)

## Quick Start

1. **Update secrets**:
   ```bash
   # Generate secure secrets
   openssl rand -hex 32  # For each secret value

   # Edit secrets.yaml with your values
   vim secrets.yaml
   ```

2. **Update domain configuration**:
   ```bash
   # Replace clawchat.io with your domain in:
   # - configmap.yaml
   # - synapse.yaml
   # - clawdbot.yaml
   # - ingress.yaml
   ```

3. **Deploy with kustomize**:
   ```bash
   kubectl apply -k .
   ```

4. **Create the Matrix bot user**:
   ```bash
   # Get a shell in the Synapse pod
   kubectl exec -it -n clawchat deploy/synapse -- bash

   # Register the bot user
   register_new_matrix_user -c /config/homeserver.yaml \
     -u clawbot -p YOUR_BOT_PASSWORD --admin
   ```

5. **Get the bot's access token**:
   ```bash
   # Login as the bot to get an access token
   curl -X POST 'https://matrix.clawchat.io/_matrix/client/r0/login' \
     -H 'Content-Type: application/json' \
     -d '{"type":"m.login.password","user":"clawbot","password":"YOUR_BOT_PASSWORD"}'

   # Add the access token to secrets
   kubectl patch secret clawchat-secrets -n clawchat \
     --type='json' \
     -p='[{"op":"add","path":"/stringData/MATRIX_BOT_ACCESS_TOKEN","value":"TOKEN_HERE"}]'
   ```

## Architecture

```
                    ┌─────────────────┐
                    │     Ingress     │
                    │   (nginx TLS)   │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              ▼                              ▼
     ┌────────────────┐            ┌────────────────┐
     │    Synapse     │            │    Clawdbot    │
     │  (1-5 pods)    │            │   (2-10 pods)  │
     └───────┬────────┘            └───────┬────────┘
             │                              │
             └──────────────┬───────────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                            ▼
     ┌────────────────┐          ┌────────────────┐
     │   PostgreSQL   │          │     Redis      │
     │  (StatefulSet) │          │  (Deployment)  │
     └────────────────┘          └────────────────┘
```

## Scaling

The HorizontalPodAutoscalers are configured to:
- **Synapse**: 1-5 replicas based on CPU/memory
- **Clawdbot**: 2-10 replicas based on CPU

For 10k concurrent users, you may need to:
1. Increase HPA max replicas
2. Add Synapse workers (separate configuration)
3. Use Redis Cluster for session storage
4. Add PostgreSQL read replicas

## Monitoring

Add Prometheus ServiceMonitors:
```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: synapse
  namespace: clawchat
spec:
  selector:
    matchLabels:
      app: synapse
  endpoints:
    - port: http
      path: /_synapse/metrics
```

## Troubleshooting

```bash
# Check pod status
kubectl get pods -n clawchat

# View Synapse logs
kubectl logs -n clawchat -l app=synapse -f

# View Clawdbot logs
kubectl logs -n clawchat -l app=clawdbot -f

# Check events
kubectl get events -n clawchat --sort-by='.lastTimestamp'
```
