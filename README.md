# ClawChat

A self-hosted AI messaging platform built on Matrix protocol, designed to scale to 10,000+ concurrent conversations.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        ClawChat Stack                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │  ClawChat    │    │   Synapse    │    │  Clawdbot    │      │
│  │  Expo App    │◄──►│  Homeserver  │◄──►│  AI Gateway  │      │
│  │  (iOS/And)   │    │              │    │              │      │
│  └──────────────┘    └──────┬───────┘    └──────┬───────┘      │
│                             │                   │               │
│                      ┌──────┴───────┐    ┌──────┴───────┐      │
│                      │  PostgreSQL  │    │    Redis     │      │
│                      │  (Synapse)   │    │  (Sessions)  │      │
│                      └──────────────┘    └──────────────┘      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
clawchat/
├── app/                          # Expo React Native client
│   ├── app/                      # File-based routing (expo-router)
│   │   ├── (auth)/               # Authentication screens
│   │   │   ├── login.tsx
│   │   │   └── register.tsx
│   │   ├── (chat)/               # Chat screens
│   │   │   ├── index.tsx         # Rooms list
│   │   │   └── [roomId].tsx      # Chat room
│   │   └── _layout.tsx           # Root layout
│   ├── lib/
│   │   ├── matrix/client.ts      # Matrix SDK wrapper
│   │   ├── store/                # Zustand stores
│   │   │   ├── auth.ts           # Auth state
│   │   │   └── chat.ts           # Chat state
│   │   └── config.ts             # App configuration
│   └── package.json
│
└── server/
    ├── docker-compose.yml        # Local/staging deployment
    ├── homeserver.yaml           # Synapse configuration
    ├── .env.example              # Environment template
    └── k8s/                      # Kubernetes manifests
        ├── namespace.yaml
        ├── postgres.yaml
        ├── redis.yaml
        ├── synapse.yaml
        ├── clawdbot.yaml
        ├── ingress.yaml
        └── kustomization.yaml
```

## Quick Start

### 1. Deploy Server (Docker Compose)

```bash
cd server
cp .env.example .env
# Edit .env with your domain and secrets
docker-compose up -d
```

### 2. Create Admin & Bot Users

```bash
# Create admin user
docker exec -it clawchat-synapse register_new_matrix_user \
  -c /data/homeserver.yaml -u admin -p YOUR_PASSWORD --admin

# Create bot user
docker exec -it clawchat-synapse register_new_matrix_user \
  -c /data/homeserver.yaml -u clawbot -p BOT_PASSWORD --admin
```

### 3. Run Expo App

```bash
cd app
npm install
npx expo start
```

### 4. Connect Clawdbot

```bash
# In your clawdbot/openclaw installation
openclaw plugins install @openclaw/matrix
openclaw config set channels.matrix.enabled true
openclaw config set channels.matrix.homeserver "https://matrix.yourdomain.com"
openclaw config set channels.matrix.accessToken "YOUR_BOT_TOKEN"
openclaw start
```

## Configuration

### App Configuration

Edit `app/lib/config.ts`:
```typescript
export const config = {
  matrixHomeserver: 'https://matrix.yourdomain.com',
  botUserId: '@clawbot:yourdomain.com',
};
```

### Server Configuration

Key environment variables in `.env`:
```env
DOMAIN=yourdomain.com
POSTGRES_PASSWORD=secure_password
SYNAPSE_REGISTRATION_SHARED_SECRET=generate_with_openssl
ANTHROPIC_API_KEY=sk-ant-...
```

## Production Deployment (Kubernetes)

For 10k+ concurrent users:

```bash
cd server/k8s

# Update secrets
vim secrets.yaml  # Add your secure values

# Update domain references
sed -i 's/clawchat.io/yourdomain.com/g' *.yaml

# Deploy
kubectl apply -k .
```

See `server/k8s/README.md` for detailed instructions.

## Scaling Considerations

| Component | Default | 10k Users |
|-----------|---------|-----------|
| Synapse | 1 pod | 3-5 pods + workers |
| Clawdbot | 2 pods | 5-10 pods |
| PostgreSQL | 1 instance | Primary + read replicas |
| Redis | 1 instance | Redis Cluster |

## Tech Stack

- **Mobile App**: Expo (React Native), matrix-js-sdk, Zustand, GiftedChat
- **Homeserver**: Matrix Synapse (Python)
- **AI Gateway**: Clawdbot/OpenClaw (Node.js)
- **Database**: PostgreSQL 15
- **Cache/Sessions**: Redis 7
- **Orchestration**: Docker Compose (dev), Kubernetes (prod)

## License

MIT
