# OpenClaw AWS CDK - Examples

This directory contains example configurations, scripts, and use cases for OpenClaw deployments.

## Directory Structure

```
examples/
├── README.md                          # This file
├── deployment-commands.sh             # Common deployment commands
├── cost-optimization/                 # Cost optimization examples
│   ├── spot-instance-config.ts       # Spot instance implementation
│   ├── scheduled-shutdown.ts         # Night/weekend shutdown
│   └── response-caching.json         # Cache configuration
├── security-hardening/                # Advanced security configs
│   ├── security-check.sh             # Automated security audit
│   ├── cloudtrail-setup.sh           # Enable CloudTrail
│   └── guardduty-setup.sh            # Enable GuardDuty
├── monitoring/                        # Monitoring and alerting
│   ├── custom-dashboard.json         # CloudWatch dashboard
│   ├── advanced-alarms.ts            # Additional alarms
│   └── cost-tracking.sh              # Daily cost reports
├── backup-restore/                    # Backup and recovery
│   ├── backup-script.sh              # Manual backup
│   ├── restore-script.sh             # Restore from backup
│   └── snapshot-automation.ts        # Automated EBS snapshots
└── multi-environment/                 # Dev/staging/prod setups
    ├── dev-stack.ts                  # Development environment
    ├── staging-stack.ts              # Staging environment
    └── prod-stack.ts                 # Production environment
```

## Quick Start

### Basic Deployment

```bash
# Clone and deploy with default settings
git clone https://github.com/YOUR_USERNAME/openclaw-aws-cdk.git
cd openclaw-aws-cdk
npm install

npx cdk deploy \
  --parameters TelegramBotToken=YOUR_TOKEN \
  --parameters BedrockModel=anthropic.claude-sonnet-4-5-v2
```

### Common Deployment Commands

See [deployment-commands.sh](deployment-commands.sh) for a collection of useful commands.

```bash
# Make executable
chmod +x examples/deployment-commands.sh

# Use specific command
./examples/deployment-commands.sh deploy-with-budget
```

## Use Cases

### 1. Personal Assistant (Default)

**Configuration:**
- Model: Claude Sonnet 4.5 v2
- Instance: t3.micro (Free Tier)
- Budget: $50/month
- DM Pairing: Enabled

**Estimated cost:** $25-30/month (Year 1)

**Deploy:**
```bash
npx cdk deploy \
  --parameters TelegramBotToken=YOUR_TOKEN \
  --parameters MonthlyBudget=50
```

### 2. Team Bot (5-10 users)

**Configuration:**
- Model: Claude Sonnet 4.5 v2
- Instance: t3.small (more memory)
- Budget: $100/month
- Guardrails: Enabled

**Estimated cost:** $40-60/month

**Deploy:**
```bash
npx cdk deploy \
  --parameters TelegramBotToken=YOUR_TOKEN \
  --parameters InstanceType=t3.small \
  --parameters MonthlyBudget=100 \
  --parameters EnableGuardrails=true
```

### 3. Cost-Optimized (Budget-Conscious)

**Configuration:**
- Model: Claude Sonnet 4.5 v2
- Instance: t3.micro with Spot
- Scheduled shutdown (nights)
- Budget: $30/month

**Estimated cost:** $15-25/month (Year 2+)

**Deploy:**
```bash
# Use cost-optimization example
cd examples/cost-optimization
npm run deploy
```

### 4. High-Security (Enterprise)

**Configuration:**
- Model: Claude Sonnet 4.5 v2
- Instance: t3.small
- Guardrails: Enabled
- CloudTrail: Enabled
- GuardDuty: Enabled
- Budget: $150/month

**Estimated cost:** $60-80/month + security services

**Deploy:**
```bash
# Deploy main stack
npx cdk deploy --parameters EnableGuardrails=true

# Enable security services
cd examples/security-hardening
./cloudtrail-setup.sh
./guardduty-setup.sh
```

## Example Scenarios

### Scenario: Migrate from VPS

See [../docs/migration-guide.md](../docs/migration-guide.md) for full guide.

**Quick steps:**
1. Backup current deployment
2. Deploy to AWS with same token
3. Test for 24 hours
4. Stop old VPS
5. Monitor costs

### Scenario: Scale from Personal to Team Use

**Steps:**
1. Increase instance size
2. Enable Guardrails
3. Add team members to authorized list
4. Increase budget alert

```bash
npx cdk deploy \
  --parameters InstanceType=t3.small \
  --parameters EnableGuardrails=true \
  --parameters MonthlyBudget=100
```

### Scenario: Reduce Costs After Free Tier

Year 2+ strategies:
- Enable Spot instances (70% savings on EC2)
- Schedule shutdowns (50% savings on EC2)
- Implement caching (20-30% savings on Bedrock)
- Reduce log retention (minor savings)

**Total savings:** 40-60% vs default

See [cost-optimization/](cost-optimization/) for implementations.

## Testing Examples

### Test Deployment Before Production

```bash
# Synthesize to see what will be created
npx cdk synth

# Check diff against deployed stack
npx cdk diff

# Deploy to test stack first
npx cdk deploy TestOpenClawStack \
  --parameters TelegramBotToken=TEST_TOKEN
```

### Integration Testing

```bash
# Send test message
curl -X POST "https://api.telegram.org/bot<TOKEN>/sendMessage" \
  -d "chat_id=<YOUR_CHAT_ID>" \
  -d "text=Test message"

# Check logs
aws logs tail /openclaw/gateway --since 5m

# Verify response received
```

## Troubleshooting Examples

### Debug Connection Issues

```bash
# Check instance status
INSTANCE_ID=$(aws cloudformation describe-stacks \
  --stack-name OpenClawStack \
  --query 'Stacks[0].Outputs[?OutputKey==`InstanceId`].OutputValue' \
  --output text)

aws ec2 describe-instance-status --instance-ids $INSTANCE_ID

# Check service logs
aws logs tail /openclaw/gateway --follow
```

### Debug Cost Issues

```bash
# Check daily costs
aws ce get-cost-and-usage \
  --time-period Start=$(date +%Y-%m-01),End=$(date +%Y-%m-%d) \
  --granularity DAILY \
  --metrics BlendedCost \
  --group-by Type=SERVICE

# Find expensive resource
aws ce get-cost-and-usage \
  --time-period Start=$(date +%Y-%m-01),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=SERVICE \
  --filter file://<(echo '{"Tags":{"Key":"Application","Values":["OpenClaw"]}}')
```

## Advanced Configurations

### Custom Bedrock Configuration

```json
// /home/openclaw/.openclaw/config.json
{
  "ai": {
    "provider": "bedrock",
    "model": "anthropic.claude-sonnet-4-5-v2",
    "region": "us-east-1",
    "maxTokens": 4096,
    "temperature": 0.7,
    "topP": 0.9
  }
}
```

### Multi-Region Setup

```typescript
// examples/multi-environment/prod-stack.ts
new OpenClawStack(app, 'OpenClawProd-US', {
  env: { region: 'us-east-1' }
});

new OpenClawStack(app, 'OpenClawProd-EU', {
  env: { region: 'eu-west-1' }
});
```

## CI/CD Examples

### GitHub Actions Deployment

```yaml
# .github/workflows/deploy.yml
name: Deploy OpenClaw
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npx cdk deploy --require-approval never
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

## Support

For questions about these examples:
- 📖 [Main Documentation](../README.md)
- 💬 [GitHub Discussions](https://github.com/YOUR_USERNAME/openclaw-aws-cdk/discussions)
- 🐛 [Report Issues](https://github.com/YOUR_USERNAME/openclaw-aws-cdk/issues)

## Contributing

Have a useful example? Please contribute!

1. Fork the repository
2. Add your example to `examples/`
3. Update this README
4. Submit a Pull Request

See [../CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

---

**Last updated:** January 2026
