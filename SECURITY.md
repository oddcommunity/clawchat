# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Reporting a Vulnerability

We take the security of ClawChat seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### Please DO NOT:

- Open a public GitHub issue for security vulnerabilities
- Disclose the vulnerability publicly before we've had a chance to address it

### Please DO:

1. **Email us** at security@exe.ai with:
   - A description of the vulnerability
   - Steps to reproduce the issue
   - Potential impact of the vulnerability
   - Any possible mitigations you've identified

2. **Include** as much information as possible:
   - Type of issue (e.g., buffer overflow, SQL injection, cross-site scripting, etc.)
   - Full paths of source file(s) related to the issue
   - Location of the affected source code (tag/branch/commit or direct URL)
   - Any special configuration required to reproduce the issue
   - Step-by-step instructions to reproduce the issue
   - Proof-of-concept or exploit code (if possible)
   - Impact of the issue, including how an attacker might exploit it

### What to expect:

- **Acknowledgment**: We'll acknowledge receipt of your report within 48 hours
- **Communication**: We'll keep you informed of our progress
- **Credit**: We'll credit you in our release notes (unless you prefer to remain anonymous)
- **Timeline**: We aim to address critical vulnerabilities within 7 days

## Security Best Practices

### For Self-Hosters

1. **Keep software updated**
   - Regularly update ClawChat, Synapse, and all dependencies
   - Subscribe to security announcements

2. **Secure your Matrix homeserver**
   - Use HTTPS with valid TLS certificates
   - Enable rate limiting
   - Configure proper access controls

3. **Protect API keys**
   - Never commit API keys to version control
   - Use environment variables or secret management
   - Rotate keys regularly

4. **Database security**
   - Use strong passwords
   - Enable encryption at rest
   - Regular backups with encryption

5. **Network security**
   - Use firewalls to restrict access
   - Consider VPN for admin access
   - Monitor for unusual activity

### For End-to-End Encryption

1. **Verify devices**
   - Always verify new devices before trusting them
   - Use out-of-band verification when possible

2. **Backup encryption keys**
   - Export and securely store your encryption keys
   - Use a strong passphrase for key backups

3. **Secure your device**
   - Use device encryption
   - Keep your device's OS updated
   - Use strong authentication (biometrics, PIN)

## Encryption Details

ClawChat uses Matrix's E2EE implementation:

- **Olm**: Double ratchet algorithm for 1:1 key exchange
- **Megolm**: Efficient group encryption for rooms
- **Curve25519**: Key agreement
- **Ed25519**: Digital signatures
- **AES-256**: Symmetric encryption

The implementation is based on the Signal protocol and uses the audited `matrix-sdk-crypto` Rust library compiled to WebAssembly.

## Scope

This security policy applies to:

- ClawChat mobile app (iOS/Android)
- ClawChat server components (clawdbot)
- Official Docker images
- Documentation on this repository

This policy does NOT cover:

- Third-party bots in the bot directory
- Self-hosted instances (your responsibility)
- Matrix Synapse homeserver (see [Synapse security](https://matrix-org.github.io/synapse/latest/setup/installation.html#security))

## Contact

- Security issues: security@exe.ai
- General questions: hello@exe.ai
- GitHub: https://github.com/oddcommunity/clawchat
