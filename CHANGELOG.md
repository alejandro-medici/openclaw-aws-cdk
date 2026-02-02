# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Bedrock Guardrails implementation for prompt injection protection
- Advanced cost optimization (Spot instances, scheduled shutdown)
- Automated testing suite
- Multi-region deployment support
- Amazon Connect integration for enterprise features
- Human agent escalation workflows

## [0.2.1] - 2026-01-30

### Changed
- **REBRAND: OpenClaw → OpenClaw** following upstream announcement (Jan 30, 2026)
  - This is the THIRD rebrand: Clawd → Clawdbot → OpenClaw → OpenClaw
  - Updated all code references: `OpenClawStack` → `OpenClawStack`, `openclaw` → `openclaw`
  - Updated all documentation, examples, and configuration files
  - Updated package name: `openclaw-aws-cdk` → `openclaw-aws-cdk`
  - Updated SSM parameter paths: `/openclaw/*` → `/openclaw/*`
  - Updated CloudWatch log groups: `/openclaw/*` → `/openclaw/*`
  - Updated all resource names, tags, and descriptions
  - Renamed stack files: `lib/openclaw-stack.ts` → `lib/openclaw-stack.ts`
  - Renamed bin files: `bin/openclaw-aws-cdk.ts` → `bin/openclaw-aws-cdk.ts`
  - Renamed test files: `test/openclaw-stack.test.ts` → `test/openclaw-stack.test.ts`

### Note
- No functional changes - this is a pure rebrand to maintain consistency with upstream
- Git history references to "OpenClaw" and "Clawdbot" remain unchanged for historical accuracy

## [0.2.0] - 2026-01-27

### Added
- **Comprehensive Documentation Suite**
  - [Deployment Guide](docs/deployment-guide.md) - Step-by-step deployment instructions
  - [Troubleshooting Guide](docs/troubleshooting.md) - Common issues and solutions
  - [Migration Guide](docs/migration-guide.md) - VPS/Mac Mini to AWS migration
  - [Security Audit](docs/security-audit.md) - Security checklist and compliance
  - [Architecture Diagrams](docs/architecture-diagrams.md) - Visual reference guide

### Changed
- Rebranded from "Clawdbot" to "OpenClaw" following upstream rename (this was later superseded by OpenClaw rebrand in v0.2.1)
- Updated all documentation references

### Fixed
- Consistent line endings via `.gitattributes`

## [0.1.0] - 2026-01-26

### Added
- **Core Infrastructure**
  - CDK stack for production-ready OpenClaw deployment
  - VPC with single AZ configuration (Free Tier optimized)
  - EC2 t3.micro instance with Amazon Linux 2023
  - Security Group with zero inbound ports (polling model)
  - IAM role with least privilege permissions

- **Security Features**
  - KMS-encrypted SSM Parameter Store for Telegram token
  - EBS volume encryption at rest
  - Session Manager for SSH-less access (replaces SSH)
  - IMDSv2 requirement for SSRF protection
  - CloudTrail-compatible design

- **Monitoring & Observability**
  - CloudWatch Logs integration (`/openclaw/gateway`)
  - CloudWatch Alarms for instance health
  - CPU utilization monitoring
  - Custom metrics support

- **Cost Management**
  - AWS Budgets integration with alerts at 80% threshold
  - Free Tier optimization (Year 1: $0-10/month infrastructure)
  - Cost allocation tags (Application: OpenClaw)
  - Budget forecast alerts at 100%

- **Bedrock Integration**
  - Amazon Bedrock (Claude) as AI provider
  - Support for Claude Sonnet 4.5 v2, Opus 4.5 v2, and 3.5 Sonnet
  - IAM role-based authentication (no API keys)
  - Model selection via CDK parameters

- **Operational Excellence**
  - Infrastructure as Code (CDK TypeScript)
  - Automated instance bootstrapping via UserData
  - Systemd service for OpenClaw auto-restart
  - One-command deployment (`cdk deploy`)

- **CDK Parameters**
  - `TelegramBotToken` - Bot token from @BotFather (required)
  - `BedrockModel` - AI model selection (default: Sonnet 4.5 v2)
  - `InstanceType` - EC2 instance size (default: t3.micro)
  - `MonthlyBudget` - Budget limit in USD (default: $50)
  - `EnableGuardrails` - Bedrock Guardrails toggle (default: false)

- **Stack Outputs**
  - Instance ID for management
  - Public IP for reference
  - Session Manager connect command
  - CloudWatch Logs command
  - Security Group ID
  - SSM Parameter ARN

- **Documentation**
  - README with quick start guide
  - Well-Architected Framework analysis
  - Security posture documentation
  - Cost comparison vs alternatives
  - Roadmap with 3 phases

- **Governance Files**
  - MIT License
  - Security policy (SECURITY.md)
  - Contributing guidelines (CONTRIBUTING.md)
  - Code of Conduct

### Technical Details

**Dependencies:**
- aws-cdk-lib: 2.172.0
- constructs: ^10.0.0
- Node.js: 18.0.0+
- TypeScript: ~5.7.2

**AWS Services Used:**
- Amazon EC2 (t3.micro)
- Amazon VPC
- Amazon Bedrock
- AWS Systems Manager (Parameter Store, Session Manager)
- Amazon CloudWatch (Logs, Alarms, Metrics)
- AWS Budgets
- AWS IAM
- AWS KMS

**Security Posture:**
- Zero inbound ports (100% polling model)
- KMS encryption at rest (SSM, EBS)
- TLS encryption in transit (HTTPS only)
- IAM roles (no long-lived credentials)
- Least privilege IAM policies
- CloudTrail-compatible

**Well-Architected Compliance:**
- Operational Excellence: IaC, monitoring, automated patching
- Security: Zero trust, encryption, audit logs
- Reliability: Health checks, auto-restart, snapshots-ready
- Performance: Right-sized instances, model selection
- Cost Optimization: Free Tier, budget alerts, usage tracking
- Sustainability: Single AZ, minimal resources

### Known Limitations
- Single region deployment (multi-region planned for Phase 2)
- Manual email configuration in budget alerts (will be parameterized)
- Guardrails defined but not implemented (planned for next release)
- No automated tests (planned for next release)
- Conversation history not persisted to S3 (manual backup only)

### Breaking Changes
- None (initial release)

---

## Release Notes

### Version 0.2.0 - Documentation Release

This release focuses on comprehensive documentation to support users at all experience levels, from deployment to production operation.

**Who should upgrade:** All users. This is a documentation-only release with no infrastructure changes.

**Upgrade path:**
```bash
git pull origin main
npm install
# No redeployment needed
```

### Version 0.1.0 - Initial Release

First production-ready release of OpenClaw AWS CDK. Provides a secure, cost-optimized deployment for personal and small team use.

**Target users:**
- Developers wanting secure OpenClaw deployment
- Teams concerned about VPS security risks
- Free Tier users seeking cheapest cloud option
- Users wanting enterprise upgrade path

**Deployment time:** 10 minutes from clone to running bot

**Estimated costs:**
- Year 1: $300-360/year ($25-30/month)
- Year 2+: $405-480/year ($34-40/month)

---

## Migration Guide

### From 0.1.0 to 0.2.0

**No infrastructure changes required.** This is a documentation-only release.

```bash
# Update to latest
git pull origin main
npm install

# Review new documentation
ls -la docs/

# Optional: Re-read deployment guide for any missed optimizations
open docs/deployment-guide.md
```

---

## Deprecation Notices

### None

---

## Security Advisories

### None

For security issues, use [GitHub Security Advisories](https://github.com/alejandro-medici/openclaw-aws-cdk/security/advisories).

**DO NOT** open public issues for security vulnerabilities.

---

## Support

- 📖 [Documentation](README.md)
- 🐛 [Report Issues](https://github.com/alejandro-medici/openclaw-aws-cdk/issues)
- 💬 [Discussions](https://github.com/alejandro-medici/openclaw-aws-cdk/discussions)
- 🔐 [Security Policy](SECURITY.md)

---

## Contributors

Thank you to all contributors who have helped improve this project!

- Core maintainers
- Documentation contributors
- Issue reporters
- Community members

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to contribute.

---

**Legend:**
- `Added` - New features
- `Changed` - Changes to existing functionality
- `Deprecated` - Soon-to-be removed features
- `Removed` - Removed features
- `Fixed` - Bug fixes
- `Security` - Security fixes

---

*This changelog is maintained by the OpenClaw AWS CDK community.*
