# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability, please do NOT open a public GitHub issue.
Email: emmanuel@otchere.com

## Credential Handling

This repository follows strict credential hygiene:

### Never commit
The following file types are globally excluded via `.gitignore` and MUST NOT be committed:

```
data/.htpasswd              # HTTP Basic Auth (bcrypt hashes)
*.env.local                 # Local environment overrides
.env.*.local                # Local env variants
.env.production             # Production secrets
*.pem, *.key, *.crt         # TLS/SSH keys
*.p12, *.pfx                # PKCS#12 bundles
credentials.json            # Generic credential stores
secrets.json               # Generic secret stores
token, auth                 # Auth tokens/files
*.secret, *.credentials     # Any secret/credentials file
*.h5, *.pb, *.onnx         # Trained model files
*.pkl, *.joblib, *.model   # Serialized ML models
.agents/                    # Agent profiles and memory
.mcp/                       # MCP server configurations
```

### Development credentials
`core-engine.env` contains development defaults (local PostgreSQL, dev JWT secret).
Do NOT copy these into production environments.

### AI models
Trained model files are excluded from version control.
Models are loaded from the `models/` directory at runtime.

## Dependency Security

- Run `pip audit` / `npm audit` regularly
- Keep dependencies updated — this project pins versions in `requirements.txt` / `package.json`
- Do NOT use `latest` tags in Docker images for production

## Supply Chain

- All npm/PyPI packages are pinned via lock files (`package-lock.json`)
- Docker base images should be pinned to specific SHA tags for production
