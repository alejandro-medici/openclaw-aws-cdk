# OpenClaw AWS CDK - Troubleshooting Guide
**Common Issues and Solutions**

*Last Updated: January 2026*

---

## Table of Contents

1. [Deployment Issues](#deployment-issues)
2. [Runtime Issues](#runtime-issues)
3. [Connection Issues](#connection-issues)
4. [Cost Issues](#cost-issues)
5. [Security Issues](#security-issues)
6. [Performance Issues](#performance-issues)
7. [Diagnostic Commands](#diagnostic-commands)
8. [Getting Help](#getting-help)

---

## Deployment Issues

### ❌ Error: "No Bedrock model access"

**Symptom:**
```
ResourceInitializationError: Unable to invoke model:
Access Denied: You don't have access to the model with the specified model ID.
```

**Cause:** Bedrock model access not enabled in your AWS account.

**Solution:**

1. Go to [AWS Bedrock Console](https://console.aws.amazon.com/bedrock)
2. Click "Model access" in left sidebar
3. Click "Enable specific models"
4. Select Claude models:
   - ✅ Claude 3.5 Sonnet v2
   - ✅ Claude Sonnet 4.5 v2
   - ✅ Claude Opus 4.5 (optional)
5. Click "Request model access"
6. Wait 2-5 minutes

**Verify fix:**
```bash
aws bedrock list-foundation-models \
  --region us-east-1 \
  --query 'modelSummaries[?contains(modelId, `anthropic`)].modelId' \
  --output table
```

---

### ❌ Error: "Invalid Telegram bot token"

**Symptom:**
```
Error: 401 Unauthorized - Invalid bot token
```

**Cause:** Wrong token format or expired token.

**Solution:**

1. Verify token format (should be like `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`)
2. Test token manually:
```bash
curl https://api.telegram.org/bot<YOUR_TOKEN>/getMe
```

3. If invalid, get new token from @BotFather:
```
/revoke - Revoke old token
/token - Get new token
```

4. Update deployment:
```bash
npx cdk deploy --parameters TelegramBotToken=NEW_TOKEN_HERE
```

---

### ❌ Error: "Stack rollback - CREATE_FAILED"

**Symptom:**
```
OpenClawStack | CREATE_FAILED | AWS::CloudFormation::Stack
Rollback requested by user.
```

**Cause:** One or more resources failed to create.

**Solution:**

1. Check specific failure:
```bash
aws cloudformation describe-stack-events \
  --stack-name OpenClawStack \
  --query 'StackEvents[?ResourceStatus==`CREATE_FAILED`]' \
  --output table
```

2. Common causes:
   - **VPC limit reached** → Delete unused VPCs
   - **Instance type unavailable** → Choose different type
   - **Region not supported** → Switch to us-east-1

3. Clean up failed stack:
```bash
npx cdk destroy
```

4. Re-deploy with fixes:
```bash
npx cdk deploy --parameters InstanceType=t3.small
```

---

### ❌ Error: "CDK toolkit not bootstrapped"

**Symptom:**
```
❌ OpenClawStack failed: Error: This stack uses assets, so the toolkit stack must be deployed
```

**Cause:** CDK not bootstrapped in your account/region.

**Solution:**

```bash
# Bootstrap CDK
npx cdk bootstrap aws://ACCOUNT_ID/REGION

# Example:
npx cdk bootstrap aws://123456789012/us-east-1

# Then retry deployment
npx cdk deploy
```

---

### ❌ Error: "Insufficient permissions"

**Symptom:**
```
User: arn:aws:iam::123456789012:user/john is not authorized to perform: cloudformation:CreateStack
```

**Cause:** IAM user lacks necessary permissions.

**Solution:**

1. Attach AdministratorAccess policy (temporary):
```bash
aws iam attach-user-policy \
  --user-name YOUR_USERNAME \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess
```

2. Or create custom policy with minimum permissions (see [security-audit.md](security-audit.md))

---

## Runtime Issues

### ❌ Bot not responding to messages

**Symptom:** Messages sent to bot receive no response.

**Diagnosis:**

```bash
# 1. Check if instance is running
INSTANCE_ID=$(aws cloudformation describe-stacks \
  --stack-name OpenClawStack \
  --query 'Stacks[0].Outputs[?OutputKey==`InstanceId`].OutputValue' \
  --output text)

aws ec2 describe-instances \
  --instance-ids $INSTANCE_ID \
  --query 'Reservations[0].Instances[0].State.Name'

# Expected: "running"

# 2. Check service status
aws ssm start-session --target $INSTANCE_ID --region us-east-1
sudo systemctl status openclaw

# 3. Check logs for errors
sudo journalctl -u openclaw -n 50
```

**Common causes and fixes:**

#### A. Service crashed
```bash
# Check for crash
sudo systemctl status openclaw

# If "failed", check logs
sudo journalctl -u openclaw -n 100 --no-pager

# Restart service
sudo systemctl restart openclaw

# Enable auto-restart on boot
sudo systemctl enable openclaw
```

#### B. Token invalid/changed
```bash
# Verify token in SSM
aws ssm get-parameter \
  --name /openclaw/telegram-token \
  --with-decryption \
  --query 'Parameter.Value' \
  --output text

# Test token
curl https://api.telegram.org/bot<TOKEN>/getMe

# If invalid, update:
aws ssm put-parameter \
  --name /openclaw/telegram-token \
  --value NEW_TOKEN \
  --type SecureString \
  --overwrite

# Restart service
aws ssm start-session --target $INSTANCE_ID
sudo systemctl restart openclaw
exit
```

#### C. Bedrock quota exceeded
```bash
# Check CloudWatch for throttling
aws logs filter-log-events \
  --log-group-name /openclaw/gateway \
  --filter-pattern "ThrottlingException" \
  --start-time $(date -d '1 hour ago' +%s)000

# If throttled, request quota increase:
# https://console.aws.amazon.com/servicequotas/home/services/bedrock/quotas
```

---

### ❌ Error: "Out of memory"

**Symptom:**
```
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
```

**Cause:** t3.micro has only 1GB RAM, may be insufficient for large conversations.

**Solution:**

1. Scale up instance:
```bash
npx cdk deploy --parameters InstanceType=t3.small
```

2. Or clear conversation history:
```bash
# Connect to instance
aws ssm start-session --target $INSTANCE_ID

# Clear OpenClaw cache
rm -rf /home/openclaw/.openclaw/cache/*
sudo systemctl restart openclaw
exit
```

---

### ❌ Error: "Connection timeout to Bedrock"

**Symptom:**
```
Error: connect ETIMEDOUT bedrock-runtime.us-east-1.amazonaws.com:443
```

**Cause:** Network connectivity issue or security group misconfiguration.

**Solution:**

1. Check security group allows HTTPS outbound:
```bash
SG_ID=$(aws cloudformation describe-stacks \
  --stack-name OpenClawStack \
  --query 'Stacks[0].Outputs[?OutputKey==`SecurityGroupId`].OutputValue' \
  --output text)

aws ec2 describe-security-groups \
  --group-ids $SG_ID \
  --query 'SecurityGroups[0].IpPermissionsEgress'

# Should show:
# {
#   "IpProtocol": "-1",  # All traffic
#   "IpRanges": [{"CidrIp": "0.0.0.0/0"}]
# }
```

2. Test connectivity from instance:
```bash
aws ssm start-session --target $INSTANCE_ID

# Test DNS resolution
nslookup bedrock-runtime.us-east-1.amazonaws.com

# Test HTTPS connectivity
curl -I https://bedrock-runtime.us-east-1.amazonaws.com

# Should return 403 (expected, means connectivity works)
exit
```

3. Check IAM permissions:
```bash
# Verify instance role has Bedrock access
aws iam get-role-policy \
  --role-name OpenClawGatewayRole \
  --policy-name OpenClawGatewayRoleDefaultPolicy*

# Should see bedrock:InvokeModel
```

---

## Connection Issues

### ❌ Cannot connect via Session Manager

**Symptom:**
```
An error occurred (TargetNotConnected): i-0abc123 is not connected.
```

**Cause:** SSM agent not running or IAM role missing.

**Solution:**

1. Wait 2-3 minutes after deployment (agent takes time to start)

2. Check instance is running:
```bash
aws ec2 describe-instances \
  --instance-ids $INSTANCE_ID \
  --query 'Reservations[0].Instances[0].State.Name'
```

3. Verify SSM agent status:
```bash
# Check if agent is connected
aws ssm describe-instance-information \
  --filters "Key=InstanceIds,Values=$INSTANCE_ID" \
  --query 'InstanceInformationList[0].PingStatus'

# Expected: "Online"
```

4. If still failing, restart instance:
```bash
aws ec2 reboot-instances --instance-ids $INSTANCE_ID
# Wait 2 minutes, then retry connection
```

---

### ❌ "Session Manager plugin not found"

**Symptom:**
```
SessionManagerPlugin is not found. Please refer to SessionManager Documentation
```

**Cause:** AWS CLI Session Manager plugin not installed.

**Solution:**

**macOS:**
```bash
brew install --cask session-manager-plugin
```

**Linux:**
```bash
curl "https://s3.amazonaws.com/session-manager-downloads/plugin/latest/ubuntu_64bit/session-manager-plugin.deb" -o "session-manager-plugin.deb"
sudo dpkg -i session-manager-plugin.deb
```

**Windows:**
```powershell
# Download from:
https://s3.amazonaws.com/session-manager-downloads/plugin/latest/windows/SessionManagerPluginSetup.exe
# Run installer
```

**Verify installation:**
```bash
session-manager-plugin --version
```

---

## Cost Issues

### 💸 Unexpected high costs

**Symptom:** AWS bill higher than expected ($50+ instead of $10-30).

**Diagnosis:**

```bash
# 1. Check Bedrock usage
aws cloudwatch get-metric-statistics \
  --namespace AWS/Bedrock \
  --metric-name InvocationCount \
  --dimensions Name=ModelId,Value=anthropic.claude-sonnet-4-5-v2 \
  --start-time $(date -u -d '7 days ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 86400 \
  --statistics Sum

# 2. Check EC2 usage
aws ce get-cost-and-usage \
  --time-period Start=$(date -d '1 month ago' +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity DAILY \
  --metrics BlendedCost \
  --group-by Type=SERVICE

# 3. Check for unexpected resources
aws resourcegroupstaggingapi get-resources \
  --tag-filters Key=Application,Values=OpenClaw \
  --query 'ResourceTagMappingList[].ResourceARN'
```

**Common causes:**

#### A. Using Opus instead of Sonnet
**Opus = 5x more expensive than Sonnet**

```bash
# Check current model
aws ssm get-parameter \
  --name /openclaw/bedrock-model \
  --query 'Parameter.Value' \
  --output text

# If opus, switch to sonnet:
aws ssm put-parameter \
  --name /openclaw/bedrock-model \
  --value anthropic.claude-sonnet-4-5-v2 \
  --overwrite

# Restart
aws ssm start-session --target $INSTANCE_ID
sudo systemctl restart openclaw
exit
```

#### B. Runaway conversation loop
**Check for repeated API calls:**

```bash
# View last 100 log entries
aws logs tail /openclaw/gateway --since 1h | grep -c "bedrock:InvokeModel"

# If >1000 calls/hour, investigate:
aws logs tail /openclaw/gateway --since 1h --format short

# Look for repetitive patterns
```

**Fix: Restart service and add rate limiting**

#### C. NAT Gateway charges
**Check if NAT Gateway was accidentally created:**

```bash
aws ec2 describe-nat-gateways \
  --query 'NatGateways[?State==`available`]'

# If found, delete it (OpenClaw doesn't need NAT)
aws ec2 delete-nat-gateway --nat-gateway-id nat-xxxxx
```

---

### 💰 Budget alert received

**Symptom:** Email notification "You have exceeded 80% of your budget"

**Action plan:**

1. **Immediate: Check current spend**
```bash
aws ce get-cost-and-usage \
  --time-period Start=$(date -d '1 month ago' +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics BlendedCost
```

2. **Identify top services**
```bash
aws ce get-cost-and-usage \
  --time-period Start=$(date -d '1 month ago' +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=SERVICE
```

3. **Take action based on findings:**

| If cost is from... | Action |
|-------------------|--------|
| Bedrock | Switch to cheaper model, reduce usage |
| EC2 | Consider Spot instances, schedule shutdown |
| CloudWatch Logs | Reduce retention period, filter verbose logs |
| Data Transfer | Check for unexpected outbound traffic |

4. **Emergency: Stop instance**
```bash
aws ec2 stop-instances --instance-ids $INSTANCE_ID
# This stops ALL costs except EBS storage (~$0.80/month)
```

---

## Security Issues

### 🔒 SSM Parameter shows plaintext token

**Symptom:** Token visible in AWS Console.

**Diagnosis:**
```bash
aws ssm get-parameter \
  --name /openclaw/telegram-token \
  --query 'Parameter.Type' \
  --output text

# Should return: "SecureString"
# If returns "String", not encrypted!
```

**Solution:**

```bash
# Get current value
TOKEN=$(aws ssm get-parameter \
  --name /openclaw/telegram-token \
  --query 'Parameter.Value' \
  --output text)

# Delete and recreate as SecureString
aws ssm delete-parameter --name /openclaw/telegram-token

aws ssm put-parameter \
  --name /openclaw/telegram-token \
  --value "$TOKEN" \
  --type SecureString \
  --description "Telegram token (KMS encrypted)"

# Restart service
aws ssm start-session --target $INSTANCE_ID
sudo systemctl restart openclaw
exit
```

---

### 🔒 Security group has inbound rules

**Symptom:** SSH port or other ports open.

**Check:**
```bash
SG_ID=$(aws cloudformation describe-stacks \
  --stack-name OpenClawStack \
  --query 'Stacks[0].Outputs[?OutputKey==`SecurityGroupId`].OutputValue' \
  --output text)

aws ec2 describe-security-groups \
  --group-ids $SG_ID \
  --query 'SecurityGroups[0].IpPermissions'

# Should return: []  (empty array)
```

**Fix:**
```bash
# Remove all inbound rules
aws ec2 revoke-security-group-ingress \
  --group-id $SG_ID \
  --ip-permissions $(aws ec2 describe-security-groups \
    --group-ids $SG_ID \
    --query 'SecurityGroups[0].IpPermissions' \
    --output json)
```

---

## Performance Issues

### 🐌 Slow response times (>10 seconds)

**Diagnosis:**

```bash
# Check EC2 CPU utilization
aws cloudwatch get-metric-statistics \
  --namespace AWS/EC2 \
  --metric-name CPUUtilization \
  --dimensions Name=InstanceId,Value=$INSTANCE_ID \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average

# If >90%, scale up:
npx cdk deploy --parameters InstanceType=t3.small
```

**Check Bedrock latency:**
```bash
aws logs insights start-query \
  --log-group-name /openclaw/gateway \
  --start-time $(date -d '1 hour ago' +%s) \
  --end-time $(date +%s) \
  --query-string 'fields @timestamp, bedrock_latency | stats avg(bedrock_latency) by bin(5m)'
```

---

## Diagnostic Commands

### Quick Health Check Script

```bash
#!/bin/bash
# save as check-openclaw-health.sh

echo "=== OpenClaw Health Check ==="
echo ""

# Get instance ID
INSTANCE_ID=$(aws cloudformation describe-stacks \
  --stack-name OpenClawStack \
  --query 'Stacks[0].Outputs[?OutputKey==`InstanceId`].OutputValue' \
  --output text)

echo "Instance ID: $INSTANCE_ID"

# Check instance state
STATE=$(aws ec2 describe-instances \
  --instance-ids $INSTANCE_ID \
  --query 'Reservations[0].Instances[0].State.Name' \
  --output text)

echo "Instance State: $STATE"

if [ "$STATE" != "running" ]; then
  echo "❌ Instance not running!"
  exit 1
fi

# Check SSM connectivity
SSM_STATUS=$(aws ssm describe-instance-information \
  --filters "Key=InstanceIds,Values=$INSTANCE_ID" \
  --query 'InstanceInformationList[0].PingStatus' \
  --output text 2>/dev/null)

echo "SSM Status: $SSM_STATUS"

if [ "$SSM_STATUS" != "Online" ]; then
  echo "⚠️ SSM agent not connected"
fi

# Check recent log errors
echo ""
echo "Recent errors in logs:"
aws logs filter-log-events \
  --log-group-name /openclaw/gateway \
  --filter-pattern "ERROR" \
  --start-time $(date -d '10 minutes ago' +%s)000 \
  --query 'events[*].message' \
  --output text | tail -5

echo ""
echo "✅ Health check complete"
```

**Run it:**
```bash
chmod +x check-openclaw-health.sh
./check-openclaw-health.sh
```

---

## Getting Help

### Before Asking for Help

Collect this information:

```bash
# 1. CDK version
npx cdk --version

# 2. Stack outputs
aws cloudformation describe-stacks \
  --stack-name OpenClawStack \
  --query 'Stacks[0].Outputs' \
  --output table

# 3. Recent logs
aws logs tail /openclaw/gateway --since 30m > openclaw-logs.txt

# 4. Instance details
aws ec2 describe-instances \
  --instance-ids $INSTANCE_ID \
  --query 'Reservations[0].Instances[0]' \
  --output json > instance-details.json

# 5. Service status (if accessible)
aws ssm start-session --target $INSTANCE_ID
sudo systemctl status openclaw > service-status.txt
sudo journalctl -u openclaw -n 100 > service-logs.txt
exit
```

### Support Channels

1. **GitHub Issues**: [Create an issue](https://github.com/YOUR_USERNAME/openclaw-aws-cdk/issues)
   - Include: CDK version, error message, relevant logs
   - Redact: Tokens, account IDs, personal info

2. **GitHub Discussions**: [Ask a question](https://github.com/YOUR_USERNAME/openclaw-aws-cdk/discussions)

3. **AWS Support**: For AWS-specific issues (costs, quotas, etc.)

4. **OpenClaw Community**: For OpenClaw-specific questions
   - Discord: [OpenClaw Discord](https://discord.gg/openclaw)
   - GitHub: [OpenClaw Issues](https://github.com/openclaw/openclaw/issues)

---

## Still Stuck?

If you've tried everything:

1. **Destroy and redeploy** (saves state in SSM):
```bash
npx cdk destroy
npx cdk deploy --parameters TelegramBotToken=YOUR_TOKEN
```

2. **Check AWS Service Health**:
https://status.aws.amazon.com

3. **Verify Free Tier eligibility**:
https://console.aws.amazon.com/billing/home#/freetier

---

**Last updated:** January 2026
**Maintained by:** Community contributors
