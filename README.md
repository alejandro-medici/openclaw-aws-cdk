# OpenClaw AWS CDK

**Production-ready OpenClaw deployment on AWS** - Security-first & Well-Architected

Deploy [OpenClaw](https://github.com/openclaw/openclaw) to AWS in 10 minutes with enterprise-grade security, cost controls, and zero inbound ports.

## Why This Solution?

Traditional OpenClaw deployments face critical security and operational challenges:

**Security Risks:**
- Plaintext secrets stored in JSON config files
- SSH ports exposed to the internet
- No secret rotation or encryption at rest
- Manual security patching required

**Operational Problems:**
- No cost monitoring or budget controls (leading to $300+ runaway bills)
- No centralized logging or audit trails
- Difficult to troubleshoot production issues

**This CDK eliminates these risks:**

- **Zero inbound ports**: Polling model, no SSH exposure
- **Encrypted secrets**: KMS-encrypted SSM Parameter Store
- **IAM roles**: No API keys to manage or rotate
- **Budget alerts**: Automated cost monitoring and alerts
- **CloudWatch integration**: Full audit trail and centralized logs
- **Free Tier optimized**: $8-30/month Year 1, $9-33/month with Spot Instances

## Quick Start

### Prerequisites

- AWS Account with Free Tier available
- AWS CLI configured ([install guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html))
- Node.js 18+ installed
- Telegram Bot Token (get from [@BotFather](https://t.me/botfather))

### Deploy in 3 Commands

```bash
# 1. Clone and install
git clone https://github.com/alejandro-medici/openclaw-aws-cdk.git
cd openclaw-aws-cdk
npm install

# 2. Bootstrap CDK (first time only)
npx cdk bootstrap

# 3. Deploy with your Telegram token
npx cdk deploy \
  --parameters TelegramBotToken=YOUR_BOT_TOKEN_HERE \
  --parameters BedrockModel=anthropic.claude-sonnet-4-5-v2
```

**That's it!** Wait 5-7 minutes for deployment. The stack will output connection commands.

### Post-Deployment

After deployment completes, CDK will show several outputs:

```bash
# Connect to instance (no SSH needed!)
aws ssm start-session --target i-xxxxx --region us-east-1

# View live logs
aws logs tail /openclaw/gateway --follow --region us-east-1

# Check service status (once connected via Session Manager)
sudo systemctl status openclaw
```

### Test Your Bot

1. Open Telegram and find your bot
2. Send `/start` to begin pairing
3. Bot will ask for approval (DM pairing security)
4. Start chatting with your AI assistant!

### Access OpenClaw Web Interface (Optional)

OpenClaw provides a web dashboard for monitoring and configuration. Access it securely from your local machine using SSM Port Forwarding:

```bash
# Forward OpenClaw's web port to your local machine (no VPN needed!)
aws ssm start-session \
  --target i-xxxxx \
  --document-name AWS-StartPortForwardingSession \
  --parameters '{"portNumber":["8080"],"localPortNumber":["8080"]}'

# Now open in your browser
open http://localhost:8080
```

**How it works:**
- Creates encrypted tunnel through AWS Systems Manager
- No inbound ports opened on EC2 instance
- No VPN or bastion host required
- Traffic stays within AWS network

## Architecture

### Security-First Design

```
Internet (no inbound connections)
    ↓
Security Group (0 inbound rules) ✅
    ↓
EC2 t3.micro (Amazon Linux 2023)
├─ IAM Role (Bedrock + SSM + CloudWatch) ✅
├─ SSM Session Manager (SSH replacement) ✅
├─ EBS encrypted (KMS) ✅
└─ User Data → Installs OpenClaw
    ↓
SSM Parameter Store (KMS encrypted) ✅
    ↓
Amazon Bedrock (Claude Sonnet 4.5) ✅
```

**Security advantages over typical VPS:**
- ❌ No SSH port exposed
- ❌ No plaintext secrets on disk
- ❌ No API keys to rotate (IAM roles)
- ✅ Full CloudTrail audit log
- ✅ KMS encryption at rest
- ✅ Budget alerts prevent runaway costs

### Cost Breakdown

**Year 1 (Free Tier):**
```
EC2 t3.micro:        $0/month (750 hours free)
EBS 8GB gp3:         $0/month (30GB free)
CloudWatch Logs:     $0/month (<5GB free)
SSM:                 $0/month (always free)
Bedrock (usage):     $8-30/month (pay per token)
─────────────────────────────────────────────
Total Year 1:        $8-30/month typical
```

**Year 2+ Cost Optimization Strategies:**

| Strategy | Infrastructure | Total w/ Bedrock | Commitment | Interruptions |
|----------|---------------|------------------|------------|---------------|
| **On-Demand** | $8.23/mo | $16-38/mo | None | No |
| **Spot Instances** | $0.80-2.50/mo | **$9-33/mo** | None | Rare (~5%) |
| **1yr Savings** | $4.50/mo | $13-35/mo | 1 year | No |
| **3yr Savings** | $2.80/mo | $11-33/mo | 3 years | No |

**Recommended:** Start with **Spot Instances** for 60-90% savings with minimal interruption risk.

**Deploy with Spot:**
```bash
# See examples/cost-optimization/spot-instance-stack.ts
npx cdk deploy -c useSpotInstances=true
```

**Compare to alternatives:**

| Solution | Monthly Cost | Security | Maintenance |
|----------|--------------|----------|-------------|
| Mac Mini | $5 + $599 upfront | Manual security, plaintext secrets | Self-managed, physical access required |
| **This CDK (Spot)** | **$9-33/mo** | Enterprise-grade (KMS, IAM, zero-trust) | Fully managed, automated patching |
| This CDK (On-Demand) | $16-38/mo | Enterprise-grade (KMS, IAM, zero-trust) | Fully managed, automated patching |

**Why AWS over Mac Mini?** You're paying for security automation and remote access. Security researchers found [hundreds of exposed OpenClaw installations](https://blogs.cisco.com/ai/personal-ai-agents-like-openclaw-are-a-security-nightmare) with stolen credentials.

## Configuration Options

### Parameters

Customize deployment via CDK parameters:

```bash
npx cdk deploy \
  --parameters TelegramBotToken=YOUR_TOKEN \
  --parameters BedrockModel=anthropic.claude-opus-4-5-v2 \
  --parameters InstanceType=t3.small \
  --parameters MonthlyBudget=100 \
  --parameters EnableGuardrails=true
```

**Available parameters:**
- `TelegramBotToken` (required): Your Telegram bot token
- `BedrockModel`: Claude model to use (Sonnet 4.5 default)
- `InstanceType`: EC2 size (t3.micro default = Free Tier)
- `MonthlyBudget`: Budget limit in USD (alert at 80%)
- `EnableGuardrails`: Bedrock Guardrails for prompt injection protection
- `BudgetAlertEmail`: Email address for budget alerts (optional)


## Well-Architected Compliance

This solution follows AWS Well-Architected Framework:

| Pillar | Implementation |
|--------|----------------|
| **Operational Excellence** | IaC (CDK), CloudWatch monitoring, automated patching |
| **Security** | Zero inbound, KMS encrypted, IAM roles, Session Manager |
| **Reliability** | Health checks, auto-restart, EBS snapshots |
| **Performance** | Right-sized instances, efficient model selection |
| **Cost Optimization** | Free Tier optimized, budget alerts, usage monitoring |
| **Sustainability** | Single AZ, minimal resources, optimized regions |

See [docs/security-audit.md](docs/security-audit.md) for detailed security analysis.

## Troubleshooting

### Deployment fails with "InvalidParameterValue"

Bedrock might not be available in your region. Try:
```bash
export AWS_DEFAULT_REGION=us-east-1
npx cdk deploy ...
```

### Bot not responding

1. Check service status:
```bash
aws ssm start-session --target i-xxxxx
sudo systemctl status openclaw
```

2. View bootstrap logs:
```bash
sudo tail -f /var/log/openclaw-bootstrap.log
```

3. Check CloudWatch logs:
```bash
aws logs tail /openclaw/gateway --follow
```

### Cost exceeded expectations

1. Check Bedrock usage in CloudWatch
2. Consider switching from Opus to Sonnet (5x cheaper)
3. Adjust budget alerts:
```bash
aws budgets update-budget --account-id YOUR_ACCOUNT --budget ...
```

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing`)
5. Open a Pull Request

## Security

Found a security issue? Please report it privately via [GitHub Security Advisories](https://github.com/alejandro-medici/openclaw-aws-cdk/security/advisories/new).

**Do NOT open public issues for security vulnerabilities.**

See [SECURITY.md](SECURITY.md) for details.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- [OpenClaw](https://github.com/openclaw/openclaw) - The amazing AI assistant this deploys
- AWS CDK team - Infrastructure as Code framework
- Community contributors - Thank you!

## Support

- 📖 [Deployment Guide](docs/deployment-guide.md)
- 💰 [Cost Breakdown](docs/cost-breakdown.md)
- 🔒 [Security Audit](docs/security-audit.md)
- 🔧 [Troubleshooting](docs/troubleshooting.md)
- 💬 [GitHub Issues](https://github.com/alejandro-medici/openclaw-aws-cdk/issues)
- 🌟 [Star this repo](https://github.com/alejandro-medici/openclaw-aws-cdk) if it helped you!

---

**Built with ❤️ by the community** | [Report an issue](https://github.com/alejandro-medici/openclaw-aws-cdk/issues) | [Request a feature](https://github.com/alejandro-medici/openclaw-aws-cdk/issues)
