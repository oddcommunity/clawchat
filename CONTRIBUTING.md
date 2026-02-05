# Contributing to ClawChat

Thank you for your interest in contributing to ClawChat! This document provides guidelines and instructions for contributing.

## Development Setup

### Prerequisites

- Node.js 20+
- Docker and Docker Compose
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (macOS) or Android Emulator

### Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/clawchat.git
   cd clawchat
   ```

2. **Start the server**
   ```bash
   cd server
   cp .env.example .env
   # Edit .env with your configuration
   docker-compose up -d
   ./scripts/setup.sh
   ```

3. **Start the app**
   ```bash
   cd app
   npm install
   npx expo start
   ```

## Project Structure

```
clawchat/
├── app/                  # Expo React Native app
│   ├── app/              # Screens (file-based routing)
│   ├── components/       # Reusable UI components
│   ├── lib/              # Core libraries
│   │   ├── matrix/       # Matrix SDK wrapper
│   │   ├── store/        # Zustand state management
│   │   └── hooks/        # Custom React hooks
│   └── __tests__/        # Test files
│
├── server/               # Backend infrastructure
│   ├── clawdbot/         # AI bot service
│   ├── k8s/              # Kubernetes manifests
│   ├── monitoring/       # Observability stack
│   └── scripts/          # Utility scripts
│
└── .github/workflows/    # CI/CD pipelines
```

## Code Style

### TypeScript

- Use strict TypeScript (no `any` unless absolutely necessary)
- Prefer interfaces over types for object shapes
- Use meaningful variable names
- Add JSDoc comments for public functions

### React Native

- Use functional components with hooks
- Keep components small and focused
- Use Zustand for state management
- Follow the existing file structure

### Testing

- Write tests for new features
- Maintain >80% code coverage
- Use meaningful test descriptions

```bash
# Run tests
cd app
npm test

# Run with coverage
npm test -- --coverage
```

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

Examples:
```
feat(chat): add image sending support
fix(auth): resolve session restore on app restart
docs: update README with deployment instructions
```

## Pull Request Process

1. **Create a feature branch**
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Make your changes**
   - Follow the code style guidelines
   - Add tests for new functionality
   - Update documentation if needed

3. **Run checks locally**
   ```bash
   cd app
   npm run lint
   npm run typecheck
   npm test
   ```

4. **Submit a Pull Request**
   - Use a clear, descriptive title
   - Reference any related issues
   - Describe what changed and why

5. **Code Review**
   - Address review feedback
   - Keep the PR focused and small

## Reporting Issues

### Bug Reports

Include:
- Steps to reproduce
- Expected vs. actual behavior
- Device/OS/app version
- Screenshots or logs if applicable

### Feature Requests

Include:
- Clear description of the feature
- Use case / motivation
- Potential implementation approach

## Security

If you discover a security vulnerability, please email security@clawchat.io instead of opening a public issue.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
