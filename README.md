# ClawChat

An open-source, E2EE AI messaging platform built on Matrix protocol. Connect to official AI bots, third-party services, or self-host your own private bot with full end-to-end encryption.

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)

## Features

- 🔒 **End-to-End Encryption** - Matrix Olm/Megolm protocol ensures only you and your bot can read messages
- 🤖 **Bot Marketplace** - Browse official, community, and private bots
- 🏠 **Self-Hosted** - Full control over your data on your own infrastructure
- 📱 **Cross-Platform** - Expo React Native app for iOS and Android
- 🔌 **Open Protocol** - Built on Matrix, works with any Matrix client
- ⚡ **Scalable** - Kubernetes-ready for 10k+ concurrent users

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                      ClawChat Architecture                            │
│                                                                       │
│   ┌─────────────┐                                                    │
│   │  ClawChat   │◄─────────── E2EE ──────────┬──────────┐           │
│   │    App      │                             │          │           │
│   └─────────────┘                             │          │           │
│          │                                    │          │           │
│          ▼                                    ▼          ▼           │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │         Matrix Homeserver (Synapse)                          │   │
│   │            Routes encrypted blobs only                       │   │
│   │            Cannot read message content                       │   │
│   └─────────────────────────────────────────────────────────────┘   │
│          │              │              │              │              │
│          ▼              ▼              ▼              ▼              │
│   ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐       │
│   │  exe AI   │  │  Bot X    │  │  Bot Y    │  │  Private  │       │
│   │ (Official)│  │ (3rd Party)│ │ (3rd Party)│ │ (Self-Host)│      │
│   │           │  │           │  │           │  │           │       │
│   │ • Claude  │  │ • GPT-4   │  │ • Image   │  │ • Ollama  │       │
│   │ • Vision  │  │ • Custom  │  │ • Video   │  │ • Local   │       │
│   └───────────┘  └───────────┘  └───────────┘  └───────────┘       │
│                                                                       │
│                       Apache 2.0 Licensed                            │
└──────────────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Deploy Server

```bash
cd server
cp .env.example .env
# Edit .env with your domain and API keys

# Start with Docker Compose
docker-compose --profile simple up -d

# Run setup script
./scripts/setup.sh
```

### 2. Run Mobile App

```bash
cd app
npm install
npx expo start
```

### 3. Connect to a Bot

Open the app, create an account, and tap "Chat with Claude" or browse the Bot Directory.

## Project Structure

```
clawchat/
├── app/                          # Expo React Native client
│   ├── app/                      # Screens (expo-router)
│   │   ├── (auth)/               # Login, Register
│   │   └── (chat)/               # Chat, Settings, Bots
│   │       ├── bots/             # Bot directory
│   │       └── verify.tsx        # E2EE verification
│   ├── lib/
│   │   ├── matrix/
│   │   │   ├── client.ts         # Matrix SDK with E2EE
│   │   │   └── crypto.ts         # Encryption helpers
│   │   ├── bots/
│   │   │   └── registry.ts       # Bot discovery
│   │   └── store/                # Zustand state
│   └── package.json
│
├── server/
│   ├── clawdbot/                 # AI bot with E2EE support
│   ├── docker-compose.yml        # Docker deployment
│   ├── homeserver.yaml           # Synapse config
│   ├── k8s/                      # Kubernetes manifests
│   ├── monitoring/               # Prometheus + Grafana
│   └── scripts/                  # Setup scripts
│
├── docs/
│   ├── DEPLOYMENT.md             # Production guide
│   └── TROUBLESHOOTING.md        # Debug help
│
└── LICENSE                       # Apache 2.0
```

## End-to-End Encryption

ClawChat uses Matrix's E2EE based on the Signal protocol:

- **Olm** - Double ratchet for 1:1 key exchange
- **Megolm** - Efficient group encryption for rooms
- **Device Verification** - Compare fingerprints to verify identity

### How It Works

1. Your app generates device keys on first launch
2. When you start a chat, a Megolm session is created
3. Session keys are shared with the bot via Olm
4. All messages are encrypted before leaving your device
5. The homeserver only sees encrypted blobs

### Verifying Bots

Compare device fingerprints to ensure you're talking to the authentic bot:

```
Your Fingerprint:     a1b2 c3d4 e5f6 g7h8
Bot's Fingerprint:    i9j0 k1l2 m3n4 o5p6
```

## Bot Directory

### Official Bots (exe AI)

- **Claude** - General AI assistant
- **exe-create** - Image/video editing

### Adding Private Bots

1. Run clawdbot on your own server:
```bash
docker run -d \
  -e ANTHROPIC_API_KEY=sk-ant-... \
  -e MATRIX_HOMESERVER=https://matrix.yourdomain.com \
  -e MATRIX_USER_ID=@mybot:yourdomain.com \
  -e MATRIX_ACCESS_TOKEN=... \
  -e ENABLE_E2EE=true \
  ghcr.io/oddcommunity/clawchat/clawdbot
```

2. In the app, go to Bot Directory → Add Private Bot
3. Enter the bot's Matrix ID and homeserver

## Configuration

### App Config (`app/lib/config.ts`)

```typescript
export default {
  matrixHomeserver: 'https://matrix.clawchat.io',
  botUserId: '@claude:clawchat.io',
  appName: 'ClawChat',
  appVersion: '1.0.0',
};
```

### Server Config (`.env`)

```env
DOMAIN=yourdomain.com
ANTHROPIC_API_KEY=sk-ant-...
POSTGRES_PASSWORD=secure_password
ENABLE_E2EE=true
```

## Production Deployment

For 10k+ concurrent users, use Kubernetes:

```bash
cd server/k8s
kubectl apply -k .
```

| Component | Min | Recommended |
|-----------|-----|-------------|
| Synapse | 1 pod | 3-5 pods |
| Clawdbot | 2 pods | 5-10 pods |
| PostgreSQL | 1 | Primary + replicas |
| Redis | 1 | Redis Cluster |

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for full guide.

## Tech Stack

- **App**: Expo, React Native, matrix-js-sdk, Zustand
- **E2EE**: @matrix-org/matrix-sdk-crypto-wasm (Rust/WASM)
- **Server**: Synapse (Matrix), Node.js (Clawdbot)
- **AI**: Anthropic Claude API
- **Database**: PostgreSQL, Redis
- **Deploy**: Docker Compose, Kubernetes

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

Apache 2.0 - See [LICENSE](LICENSE) for details.

---

Built with ❤️ by [exe AI](https://exe.ai)
