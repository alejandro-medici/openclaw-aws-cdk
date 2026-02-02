# OpenClaw Migration Guide
**From VPS/Mac Mini to AWS CDK**

*Last Updated: January 2026*

---

## Table of Contents

1. [Why Migrate to AWS?](#why-migrate-to-aws)
2. [Migration Planning](#migration-planning)
3. [Pre-Migration Checklist](#pre-migration-checklist)
4. [Migration Paths](#migration-paths)
5. [Step-by-Step Migration](#step-by-step-migration)
6. [Post-Migration Validation](#post-migration-validation)
7. [Rollback Plan](#rollback-plan)
8. [Cost Comparison](#cost-comparison)

---

## Why Migrate to AWS?

### Current Pain Points

| Issue | VPS/Mac Mini | AWS CDK Solution |
|-------|--------------|------------------|
| **Security** | SSH port exposed | Zero inbound ports |
| **Secrets** | Plaintext files | KMS-encrypted SSM |
| **API Keys** | Manual rotation | IAM roles (auto-rotate) |
| **Cost Control** | No monitoring | Budget alerts |
| **Scalability** | Manual setup | Auto-scaling ready |
| **Disaster Recovery** | Manual backups | Automated EBS snapshots |
| **Compliance** | DIY | Well-Architected Framework |

### AWS Advantages

✅ **Security First:**
- No SSH port exposed (Session Manager only)
- KMS-encrypted secrets at rest
- IAM roles eliminate API key management
- CloudTrail audit logs

✅ **Cost Control:**
- Budget alerts at 80% threshold
- CloudWatch cost tracking
- Free Tier eligible ($0-10/month Year 1)
- Spot instances available (70% savings)

✅ **Operational Excellence:**
- Infrastructure as Code (CDK)
- Automated patching (Amazon Linux 2023)
- One-command deployment
- Easy rollback

✅ **Enterprise Path:**
- Amazon Connect integration
- Multi-channel support (Voice, SMS, WhatsApp)
- Human agent escalation
- HIPAA/SOC2 compliance available

---

## Migration Planning

### Migration Timeline

```
Week 1: Planning & Preparation
├─ Day 1-2: Backup current deployment
├─ Day 3-4: Set up AWS account, enable Bedrock
├─ Day 5-6: Test deployment in AWS (parallel)
└─ Day 7: Validate functionality

Week 2: Migration Execution
├─ Day 8: Deploy to AWS production
├─ Day 9: Migrate conversation history
├─ Day 10-11: Monitor for issues
├─ Day 12-13: Optimize configuration
└─ Day 14: Decommission old deployment
```

### Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Data loss** | High | Backup before migration |
| **Downtime** | Medium | Parallel deployment first |
| **Cost spike** | Low | Start with Free Tier, enable alerts |
| **Configuration issues** | Low | Test thoroughly before cutover |
| **User confusion** | Low | Same Telegram bot, transparent to users |

---

## Pre-Migration Checklist

### Information to Gather

- [ ] Current Telegram bot token
- [ ] Conversation history location (if backing up)
- [ ] Custom configuration files
- [ ] List of authorized users (if using DM pairing)
- [ ] Average daily message volume (for cost estimation)
- [ ] Current AI provider and model (OpenAI, Anthropic, etc.)

### AWS Prerequisites

- [ ] AWS account created
- [ ] AWS CLI configured
- [ ] Bedrock access enabled in target region
- [ ] Budget alerts configured
- [ ] IAM user with deployment permissions
- [ ] Node.js 18+ installed locally

### Backup Current Deployment

```bash
# === FOR VPS DEPLOYMENTS ===

# 1. SSH into your VPS
ssh user@your-vps-ip

# 2. Locate OpenClaw directory
cd ~/.openclaw  # or wherever OpenClaw is installed

# 3. Backup configuration
tar -czf openclaw-backup-$(date +%Y%m%d).tar.gz \
  config.json \
  .env \
  auth-profiles.json \
  conversations/ \
  sessions/

# 4. Download backup to local machine
# (from your local terminal)
scp user@your-vps-ip:~/.openclaw/openclaw-backup-*.tar.gz ./backups/

# 5. Verify backup
tar -tzf backups/openclaw-backup-*.tar.gz
```

```bash
# === FOR MAC MINI DEPLOYMENTS ===

# 1. Locate OpenClaw directory
cd ~/Library/Application\ Support/openclaw
# or
cd ~/.openclaw

# 2. Backup configuration
tar -czf ~/Desktop/openclaw-backup-$(date +%Y%m%d).tar.gz \
  config.json \
  conversations/ \
  sessions/

# 3. Verify backup
tar -tzf ~/Desktop/openclaw-backup-*.tar.gz
```

---

## Migration Paths

### Path 1: Fresh Start (Recommended)

**Best for:** Most users, simplest approach

**Pros:**
- Clean slate, no legacy issues
- Fastest migration (15 minutes)
- No data migration complexity

**Cons:**
- Loses conversation history
- Users need to re-pair (if using DM pairing)

**Process:**
1. Deploy to AWS
2. Keep old deployment running (parallel)
3. Test AWS deployment
4. Update bot token in old deployment to point to AWS (or vice versa)
5. Decommission old deployment after 1 week

---

### Path 2: Conversation Migration

**Best for:** Users who need to preserve conversation history

**Pros:**
- Maintains conversation context
- Seamless user experience

**Cons:**
- More complex (30-45 minutes)
- Requires data transfer

**Process:**
1. Deploy to AWS
2. Export conversations from old deployment
3. Import to AWS deployment
4. Validate data integrity
5. Switch bot token
6. Decommission old deployment

---

### Path 3: Gradual Rollout

**Best for:** High-volume deployments, risk-averse users

**Pros:**
- Minimal risk
- Easy rollback
- Test with subset of users first

**Cons:**
- Longest timeline (1-2 weeks)
- Requires managing two deployments

**Process:**
1. Deploy to AWS with NEW bot token (different bot)
2. Invite test users to new bot
3. Monitor for 3-7 days
4. Migrate remaining users
5. Decommission old deployment

---

## Step-by-Step Migration

### Migration Path 1: Fresh Start

#### Step 1: Extract Current Configuration

```bash
# From your current deployment
cat ~/.openclaw/config.json

# Note down:
# - Telegram bot token
# - AI provider settings
# - Security settings (DM pairing, etc.)
```

#### Step 2: Deploy to AWS

```bash
# Clone AWS CDK repository
git clone https://github.com/alejandro-medici/openclaw-aws-cdk.git
cd openclaw-aws-cdk

# Install dependencies
npm install

# Bootstrap CDK (one-time)
npx cdk bootstrap

# Deploy
npx cdk deploy \
  --parameters TelegramBotToken=YOUR_TELEGRAM_TOKEN \
  --parameters BedrockModel=anthropic.claude-sonnet-4-5-v2 \
  --parameters MonthlyBudget=50

# Wait 5-7 minutes for deployment
```

#### Step 3: Test AWS Deployment

```bash
# Get instance ID from outputs
INSTANCE_ID=$(aws cloudformation describe-stacks \
  --stack-name OpenClawStack \
  --query 'Stacks[0].Outputs[?OutputKey==`InstanceId`].OutputValue' \
  --output text)

# Check service status
aws ssm start-session --target $INSTANCE_ID
sudo systemctl status openclaw
sudo journalctl -u openclaw -n 50
exit

# Test in Telegram
# Send message to bot → Should receive response
```

#### Step 4: Monitor for 24-48 Hours

```bash
# Watch CloudWatch logs
aws logs tail /openclaw/gateway --follow

# Check for errors
aws logs filter-log-events \
  --log-group-name /openclaw/gateway \
  --filter-pattern "ERROR" \
  --start-time $(date -d '1 hour ago' +%s)000

# Monitor costs
aws ce get-cost-and-usage \
  --time-period Start=$(date -d '2 days ago' +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity DAILY \
  --metrics BlendedCost
```

#### Step 5: Decommission Old Deployment

```bash
# === FOR VPS ===
# Stop OpenClaw service
ssh user@your-vps
sudo systemctl stop openclaw
sudo systemctl disable openclaw

# Archive data (for records)
tar -czf openclaw-archive-$(date +%Y%m%d).tar.gz ~/.openclaw
mv openclaw-archive-* ~/backups/

# Optional: Cancel VPS subscription
# (Keep for 1 month as backup)

# === FOR MAC MINI ===
# Stop OpenClaw
# (depends on how it's running - PM2, systemd, manual, etc.)
pm2 stop openclaw
pm2 delete openclaw

# Archive data
tar -czf ~/Desktop/openclaw-archive-$(date +%Y%m%d).tar.gz ~/Library/Application\ Support/openclaw

# Keep Mac Mini for other uses or sell
```

---

### Migration Path 2: With Conversation History

#### Step 1: Export Conversations from Old Deployment

```bash
# SSH to VPS or access Mac Mini terminal
cd ~/.openclaw

# Find conversation data location
# (varies by OpenClaw version)
ls -la conversations/
ls -la sessions/

# Create export
mkdir -p export
cp -r conversations/ export/
cp -r sessions/ export/
cp auth-profiles.json export/

# Compress for transfer
tar -czf openclaw-export-$(date +%Y%m%d).tar.gz export/

# Transfer to local machine
# (from your local terminal, not VPS)
scp user@your-vps:~/.openclaw/openclaw-export-*.tar.gz ./
```

#### Step 2: Deploy AWS with Same Bot Token

```bash
# Use SAME Telegram token as old deployment
# This ensures users don't need to re-pair

npx cdk deploy \
  --parameters TelegramBotToken=SAME_TOKEN_AS_BEFORE \
  --parameters BedrockModel=anthropic.claude-sonnet-4-5-v2
```

#### Step 3: Import Data to AWS

```bash
# Get instance ID
INSTANCE_ID=$(aws cloudformation describe-stacks \
  --stack-name OpenClawStack \
  --query 'Stacks[0].Outputs[?OutputKey==`InstanceId`].OutputValue' \
  --output text)

# Connect to instance
aws ssm start-session --target $INSTANCE_ID

# Stop OpenClaw service temporarily
sudo systemctl stop openclaw

# Create transfer directory
mkdir -p /tmp/openclaw-import
exit

# Copy data to instance using S3 (AWS CLI v2)
# First, upload to S3
aws s3 mb s3://openclaw-migration-temp-$RANDOM
BUCKET=$(aws s3 ls | grep openclaw-migration-temp | awk '{print $3}')
aws s3 cp openclaw-export-*.tar.gz s3://$BUCKET/

# From instance, download and extract
aws ssm start-session --target $INSTANCE_ID

# Download from S3
BUCKET=$(aws s3 ls | grep openclaw-migration-temp | awk '{print $3}')
aws s3 cp s3://$BUCKET/openclaw-export-*.tar.gz /tmp/

# Extract
cd /tmp
tar -xzf openclaw-export-*.tar.gz

# Copy to OpenClaw directory
sudo cp -r export/conversations /home/openclaw/.openclaw/
sudo cp -r export/sessions /home/openclaw/.openclaw/
sudo cp export/auth-profiles.json /home/openclaw/.openclaw/

# Fix permissions
sudo chown -R openclaw:openclaw /home/openclaw/.openclaw/

# Restart service
sudo systemctl start openclaw

# Verify
sudo systemctl status openclaw
sudo journalctl -u openclaw -n 20

exit

# Clean up S3 bucket
aws s3 rm s3://$BUCKET/openclaw-export-*.tar.gz
aws s3 rb s3://$BUCKET
```

#### Step 4: Validate Data Migration

```bash
# Test in Telegram
# Send: "What did we talk about yesterday?"
# Bot should reference previous conversations

# Check logs for successful data load
aws logs tail /openclaw/gateway --since 10m | grep -i "conversation"
```

#### Step 5: Switch Traffic

```bash
# Stop old deployment immediately
# (since AWS is using same token now)
ssh user@your-vps
sudo systemctl stop openclaw
sudo systemctl disable openclaw
exit

# Monitor AWS deployment
aws logs tail /openclaw/gateway --follow
```

---

## Post-Migration Validation

### Functional Tests

```bash
# Test checklist:
```

| Test | Expected Result | Pass/Fail |
|------|----------------|-----------|
| Send basic message | Receives response within 5s | [ ] |
| Send long message (>1000 chars) | Handles gracefully | [ ] |
| Send code snippet | Formats correctly | [ ] |
| Ask follow-up question | Maintains context | [ ] |
| Send invalid command | Handles error gracefully | [ ] |
| Check conversation history | Previous conversations present | [ ] |
| Test DM pairing (if enabled) | New users require approval | [ ] |

### Performance Tests

```bash
# Measure response time
time echo "Hello" | telegram-send --stdin --token YOUR_TOKEN

# Should complete in <10 seconds

# Check CPU utilization
aws cloudwatch get-metric-statistics \
  --namespace AWS/EC2 \
  --metric-name CPUUtilization \
  --dimensions Name=InstanceId,Value=$INSTANCE_ID \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average

# Should be <50% average
```

### Security Validation

```bash
# 1. Verify no inbound ports
SG_ID=$(aws cloudformation describe-stacks \
  --stack-name OpenClawStack \
  --query 'Stacks[0].Outputs[?OutputKey==`SecurityGroupId`].OutputValue' \
  --output text)

aws ec2 describe-security-groups \
  --group-ids $SG_ID \
  --query 'SecurityGroups[0].IpPermissions'

# Should return: []

# 2. Verify encrypted secrets
aws ssm get-parameter \
  --name /openclaw/telegram-token \
  --query 'Parameter.Type' \
  --output text

# Should return: "SecureString"

# 3. Verify EBS encryption
aws ec2 describe-volumes \
  --filters "Name=attachment.instance-id,Values=$INSTANCE_ID" \
  --query 'Volumes[0].Encrypted' \
  --output text

# Should return: "True"
```

---

## Rollback Plan

### When to Rollback

- Critical bugs in AWS deployment
- Unacceptable performance degradation
- Cost exceeded budget significantly
- Data loss or corruption detected

### Rollback Procedure

```bash
# 1. Stop AWS deployment
aws ec2 stop-instances --instance-ids $INSTANCE_ID

# 2. Restart old deployment
ssh user@your-vps
sudo systemctl start openclaw
sudo systemctl status openclaw
exit

# 3. Verify old deployment working
# Send test message to Telegram bot

# 4. Monitor for 1 hour
# Ensure everything stable

# 5. Optional: Destroy AWS stack
npx cdk destroy
# (Keep for 24h in case need to retry)
```

### Data Recovery

If you need to recover data from AWS back to old deployment:

```bash
# 1. Connect to AWS instance
aws ssm start-session --target $INSTANCE_ID

# 2. Export data
cd /home/openclaw/.openclaw
sudo tar -czf /tmp/aws-export.tar.gz conversations/ sessions/ auth-profiles.json

# 3. Upload to S3
aws s3 mb s3://openclaw-recovery-$RANDOM
BUCKET=$(aws s3 ls | grep openclaw-recovery | awk '{print $3}')
aws s3 cp /tmp/aws-export.tar.gz s3://$BUCKET/

exit

# 4. Download to old deployment
scp s3://$BUCKET/aws-export.tar.gz user@your-vps:/tmp/

# 5. Extract on old deployment
ssh user@your-vps
cd /tmp
tar -xzf aws-export.tar.gz
cp -r conversations/ ~/.openclaw/
cp -r sessions/ ~/.openclaw/
cp auth-profiles.json ~/.openclaw/
sudo systemctl restart openclaw
```

---

## Cost Comparison

### Before Migration (VPS Example)

```
Hetzner VPS (CPX11):
├─ Server:           $3.85/month
├─ Anthropic API:    $25/month (typical usage)
├─ Backups:          $0 (manual)
└─ Total:            $28.85/month = $346/year
```

### After Migration (AWS Free Tier)

```
Year 1 (Free Tier):
├─ EC2 t3.micro:     $0/month (750h free)
├─ EBS 8GB gp3:      $0/month (30GB free)
├─ CloudWatch:       $0/month (<5GB free)
├─ Bedrock Sonnet:   $25/month
└─ Total:            $25/month = $300/year ✅ CHEAPER

Year 2+ (Post Free Tier):
├─ EC2 t3.micro:     $7.59/month
├─ EBS 8GB gp3:      $0.64/month
├─ CloudWatch:       $0.50/month
├─ Bedrock Sonnet:   $25/month
└─ Total:            $33.73/month = $405/year
```

---

## Migration Support

### Common Issues During Migration

See [troubleshooting.md](troubleshooting.md) for detailed solutions.

**Quick fixes:**

1. **"Bot not responding after migration"**
   - Check service status: `sudo systemctl status openclaw`
   - View logs: `sudo journalctl -u openclaw -n 50`
   - Restart: `sudo systemctl restart openclaw`

2. **"Conversation history not loaded"**
   - Verify files copied: `ls -la /home/openclaw/.openclaw/conversations/`
   - Check permissions: `ls -l /home/openclaw/.openclaw/`
   - Fix: `sudo chown -R openclaw:openclaw /home/openclaw/.openclaw/`

3. **"Users getting 'not authorized' errors"**
   - DM pairing data not migrated
   - Re-import auth-profiles.json
   - Or have users re-pair (send "yes" to bot)

### Getting Help

- 📖 [Deployment Guide](deployment-guide.md)
- 🐛 [Troubleshooting Guide](troubleshooting.md)
- 💬 [GitHub Discussions](https://github.com/alejandro-medici/openclaw-aws-cdk/discussions)
- 🔐 [Security Audit](security-audit.md)

---

**Migration completed?** Don't forget to:
- [ ] Update documentation with new connection details
- [ ] Notify users if bot behavior changed
- [ ] Set up monitoring alerts
- [ ] Schedule regular backups (EBS snapshots)
- [ ] Review first month's AWS bill

---

**Last updated:** January 2026
**Maintained by:** Community contributors
