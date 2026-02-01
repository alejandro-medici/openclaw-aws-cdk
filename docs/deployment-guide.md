# OpenClaw AWS CDK - Deployment Guide
**Complete Step-by-Step Instructions**

*Last Updated: January 2026*

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Step 1: AWS Account Setup](#step-1-aws-account-setup)
4. [Step 2: Local Environment Setup](#step-2-local-environment-setup)
5. [Step 3: Telegram Bot Creation](#step-3-telegram-bot-creation)
6. [Step 4: CDK Bootstrap](#step-4-cdk-bootstrap)
7. [Step 5: Deploy the Stack](#step-5-deploy-the-stack)
8. [Step 6: Post-Deployment Verification](#step-6-post-deployment-verification)
9. [Step 7: Testing Your Bot](#step-7-testing-your-bot)
10. [Advanced Configuration](#advanced-configuration)
11. [Updating Your Deployment](#updating-your-deployment)
12. [Cleanup and Removal](#cleanup-and-removal)

---

## Prerequisites

### Required Tools

| Tool | Minimum Version | Check Command | Installation Link |
|------|----------------|---------------|-------------------|
| Node.js | 18.0.0+ | `node --version` | [nodejs.org](https://nodejs.org) |
| npm | 9.0.0+ | `npm --version` | Included with Node.js |
| AWS CLI | 2.0.0+ | `aws --version` | [AWS CLI Install](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) |
| Git | 2.0.0+ | `git --version` | [git-scm.com](https://git-scm.com) |

### Required Accounts

- **AWS Account** with:
  - Free Tier eligible (recommended for cost savings)
  - Administrator access or equivalent permissions
  - No active budget limits blocking deployments

- **Telegram Account** with:
  - Active phone number
  - Access to [@BotFather](https://t.me/botfather)

### Required Permissions

Your AWS IAM user/role needs these permissions:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudformation:*",
        "ec2:*",
        "iam:*",
        "ssm:*",
        "logs:*",
        "budgets:*",
        "cloudwatch:*",
        "s3:*"
      ],
      "Resource": "*"
    }
  ]
}
```

---

## Pre-Deployment Checklist

Before starting, verify:

- [ ] AWS CLI configured with valid credentials (`aws sts get-caller-identity`)
- [ ] Node.js and npm installed and updated
- [ ] Free Tier available in your AWS account (check [AWS Free Tier page](https://aws.amazon.com/free))
- [ ] Bedrock access enabled in your region ([Request access](https://console.aws.amazon.com/bedrock))
- [ ] Telegram bot token obtained from @BotFather
- [ ] Email address ready for budget alerts (optional but recommended)

### Check AWS CLI Configuration

```bash
# Verify your AWS identity
aws sts get-caller-identity

# Expected output:
# {
#     "UserId": "AIDAXXXXXXXXXXXXXXXXX",
#     "Account": "123456789012",
#     "Arn": "arn:aws:iam::123456789012:user/your-username"
# }

# Check default region (should be Bedrock-enabled region)
aws configure get region

# Recommended regions for Bedrock:
# - us-east-1 (N. Virginia)
# - us-west-2 (Oregon)
# - eu-west-1 (Ireland)
# - ap-southeast-1 (Singapore)
```

### Enable Bedrock Access (CRITICAL)

1. Go to [AWS Bedrock Console](https://console.aws.amazon.com/bedrock)
2. Navigate to "Model access" in the left sidebar
3. Click "Enable specific models"
4. Select:
   - ✅ Claude 3.5 Sonnet v2
   - ✅ Claude 3 Opus (optional)
5. Click "Request model access"
6. Wait 2-5 minutes for approval (usually instant)

**Verify access:**
```bash
aws bedrock list-foundation-models --region us-east-1 --query 'modelSummaries[?contains(modelId, `anthropic`)].modelId'

# Should return:
# [
#     "anthropic.claude-3-5-sonnet-20241022-v2:0",
#     "anthropic.claude-sonnet-4-5-v2",
#     ...
# ]
```

---

## Step 1: AWS Account Setup

### 1.1 Create AWS Account (if needed)

1. Visit [aws.amazon.com](https://aws.amazon.com)
2. Click "Create an AWS Account"
3. Follow the registration process
4. Add payment method (required but Free Tier won't charge you)
5. Complete identity verification

### 1.2 Create IAM User (Best Practice)

**Don't use root account for deployments!**

```bash
# Create IAM user with necessary permissions
aws iam create-user --user-name openclaw-deployer

# Attach administrator policy (for deployment)
aws iam attach-user-policy \
  --user-name openclaw-deployer \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess

# Create access keys
aws iam create-access-key --user-name openclaw-deployer

# Save the output! You'll need:
# - AccessKeyId
# - SecretAccessKey
```

### 1.3 Configure AWS CLI with New User

```bash
# Run interactive configuration
aws configure

# Enter:
# AWS Access Key ID: <your-access-key-id>
# AWS Secret Access Key: <your-secret-access-key>
# Default region name: us-east-1
# Default output format: json
```

**Verify configuration:**
```bash
aws sts get-caller-identity
# Should show your new IAM user
```

---

## Step 2: Local Environment Setup

### 2.1 Clone the Repository

```bash
# Clone from GitHub
git clone https://github.com/alejandro-medici/openclaw-aws-cdk.git
cd openclaw-aws-cdk

# Verify files
ls -la
# Should see: bin/ lib/ docs/ package.json README.md
```

### 2.2 Install Dependencies

```bash
# Install Node.js dependencies
npm install

# This will install:
# - aws-cdk-lib (CDK framework)
# - constructs (CDK constructs)
# - TypeScript compiler
# - Testing frameworks

# Verify installation
npx cdk --version
# Expected: 2.172.0 or higher
```

### 2.3 Build the Project

```bash
# Compile TypeScript to JavaScript
npm run build

# Should complete without errors
# Creates bin/*.js and lib/*.js files
```

---

## Step 3: Telegram Bot Creation

### 3.1 Create Bot with BotFather

1. Open Telegram and search for [@BotFather](https://t.me/botfather)
2. Start a chat and send `/newbot`
3. Follow the prompts:
   ```
   BotFather: Alright, a new bot. How are we going to call it?
   You: My OpenClaw Assistant

   BotFather: Good. Now let's choose a username for your bot.
   You: my_openclaw_assistant_bot

   BotFather: Done! Here is your token:
   1234567890:ABCdefGHIjklMNOpqrsTUVwxyz1234567890
   ```

4. **SAVE THE TOKEN SECURELY!** You'll need it for deployment.

### 3.2 Configure Bot Settings (Optional)

```
/setdescription - Set bot description
My personal AI assistant powered by Claude

/setabouttext - Set about text
OpenClaw on AWS - Secure, scalable AI assistant

/setuserpic - Upload a profile picture

/setcommands - Set bot commands
start - Begin conversation
help - Show help message
status - Check bot status
```

### 3.3 Test Token Validity

```bash
# Test if token works
curl https://api.telegram.org/bot<YOUR_TOKEN>/getMe

# Expected response:
# {
#   "ok": true,
#   "result": {
#     "id": 1234567890,
#     "is_bot": true,
#     "first_name": "My OpenClaw Assistant",
#     "username": "my_openclaw_assistant_bot"
#   }
# }
```

---

## Step 4: CDK Bootstrap

CDK Bootstrap prepares your AWS account for CDK deployments (one-time operation per account/region).

### 4.1 Check if Already Bootstrapped

```bash
# Check for existing CDK toolkit stack
aws cloudformation describe-stacks \
  --stack-name CDKToolkit \
  --region us-east-1 2>/dev/null

# If you see stack details, already bootstrapped!
# If you see "Stack with id CDKToolkit does not exist", need to bootstrap.
```

### 4.2 Run Bootstrap (if needed)

```bash
# Bootstrap CDK in your account/region
npx cdk bootstrap aws://ACCOUNT-ID/REGION

# Example:
npx cdk bootstrap aws://123456789012/us-east-1

# This creates:
# - S3 bucket for CDK assets
# - IAM roles for CloudFormation
# - ECR repository for Docker images (if needed)

# Expected output:
# ✅ Environment aws://123456789012/us-east-1 bootstrapped.
```

### 4.3 Verify Bootstrap

```bash
# List CDK-created resources
aws cloudformation describe-stack-resources \
  --stack-name CDKToolkit \
  --region us-east-1

# Should show:
# - AWS::S3::Bucket
# - AWS::IAM::Role
# - AWS::ECR::Repository
```

---

## Step 5: Deploy the Stack

### 5.1 Synthesize CloudFormation Template (Optional)

Preview what will be created:

```bash
# Generate CloudFormation template
npx cdk synth

# This outputs a YAML template showing all resources
# Review to understand what will be deployed
```

### 5.2 Deploy with Minimum Parameters

**Basic deployment (Sonnet 4.5, t3.micro):**

```bash
npx cdk deploy \
  --parameters TelegramBotToken=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz1234567890 \
  --parameters BedrockModel=anthropic.claude-sonnet-4-5-v2

# CDK will show you a preview of changes
# Type 'y' to confirm deployment
```

### 5.3 Deploy with All Parameters

**Full configuration:**

```bash
npx cdk deploy \
  --parameters TelegramBotToken=YOUR_TELEGRAM_TOKEN \
  --parameters BedrockModel=anthropic.claude-sonnet-4-5-v2 \
  --parameters InstanceType=t3.micro \
  --parameters MonthlyBudget=50 \
  --parameters EnableGuardrails=false \
  --parameters BudgetAlertEmail=your-email@example.com

# Deployment takes 5-10 minutes
```

### 5.4 Monitor Deployment Progress

```bash
# Watch CloudFormation events in real-time
aws cloudformation describe-stack-events \
  --stack-name OpenClawStack \
  --region us-east-1 \
  --query 'StackEvents[0:10].[ResourceStatus,ResourceType,LogicalResourceId]' \
  --output table

# Refresh every 10 seconds to see progress
```

### 5.5 Expected Deployment Output

After successful deployment, you'll see:

```
✅ OpenClawStack

Outputs:
OpenClawStack.ConnectCommand = aws ssm start-session --target i-0abc123def456 --region us-east-1
OpenClawStack.InstanceId = i-0abc123def456
OpenClawStack.InstancePublicIp = 54.123.45.67
OpenClawStack.LogsCommand = aws logs tail /openclaw/gateway --follow --region us-east-1
OpenClawStack.SecurityGroupId = sg-0123456789abcdef
OpenClawStack.ServiceStatusCommand = aws ssm start-session --target i-0abc123def456...
OpenClawStack.TelegramTokenParameterArn = arn:aws:ssm:us-east-1:123456789012:parameter/openclaw/telegram-token

Stack ARN:
arn:aws:cloudformation:us-east-1:123456789012:stack/OpenClawStack/12345678-1234-1234-1234-123456789012
```

**SAVE THESE OUTPUTS!** You'll need them for management.

---

## Step 6: Post-Deployment Verification

### 6.1 Check Instance Status

```bash
# Get instance ID from outputs
INSTANCE_ID=$(aws cloudformation describe-stacks \
  --stack-name OpenClawStack \
  --query 'Stacks[0].Outputs[?OutputKey==`InstanceId`].OutputValue' \
  --output text)

echo "Instance ID: $INSTANCE_ID"

# Check instance state
aws ec2 describe-instances \
  --instance-ids $INSTANCE_ID \
  --query 'Reservations[0].Instances[0].State.Name' \
  --output text

# Expected: "running"
```

### 6.2 View Bootstrap Logs

```bash
# Connect via Session Manager
aws ssm start-session --target $INSTANCE_ID --region us-east-1

# Once connected, view bootstrap log
sudo tail -f /var/log/openclaw-bootstrap.log

# Look for:
# "=== OpenClaw Bootstrap Completed ==="

# Exit with: exit
```

### 6.3 Check OpenClaw Service Status

```bash
# Connect to instance
aws ssm start-session --target $INSTANCE_ID --region us-east-1

# Check service
sudo systemctl status openclaw

# Expected output:
# ● openclaw.service - OpenClaw AI Gateway
#    Loaded: loaded (/etc/systemd/system/openclaw.service; enabled)
#    Active: active (running) since ...
#    Main PID: 1234 (node)

# View live logs
sudo journalctl -u openclaw -f

# Exit with: Ctrl+C, then exit
```

### 6.4 Verify CloudWatch Logs

```bash
# List log streams
aws logs describe-log-streams \
  --log-group-name /openclaw/gateway \
  --order-by LastEventTime \
  --descending

# View recent logs
aws logs tail /openclaw/gateway --follow --region us-east-1

# Look for:
# - "Telegram polling started"
# - "Connected to Bedrock"
# - No error messages
```

### 6.5 Check SSM Parameters

```bash
# Verify encrypted token is stored
aws ssm get-parameter \
  --name /openclaw/telegram-token \
  --with-decryption \
  --region us-east-1 \
  --query 'Parameter.Value' \
  --output text

# Should show your Telegram token

# Verify Bedrock model
aws ssm get-parameter \
  --name /openclaw/bedrock-model \
  --region us-east-1 \
  --query 'Parameter.Value' \
  --output text

# Should show: anthropic.claude-sonnet-4-5-v2
```

---

## Step 7: Testing Your Bot

### 7.1 Initial Bot Test

1. Open Telegram
2. Search for your bot username (e.g., `@my_openclaw_assistant_bot`)
3. Start a conversation with `/start`

**Expected response:**
```
Hello! I'm your OpenClaw assistant powered by Claude.

Due to security settings (DM pairing), I need your approval before we can chat.

Please confirm you want to pair with this bot by replying "yes".
```

4. Reply with: `yes`

**Expected response:**
```
✅ Pairing approved! We're now connected.

I'm ready to help you. What can I do for you today?
```

### 7.2 Test Basic Functionality

```
You: Hello! Can you help me?

Bot: Hello! I'm Claude, your AI assistant running on OpenClaw.
I'd be happy to help you! I can assist with:
- Answering questions
- Writing and editing text
- Coding and technical tasks
- Analysis and research
- Creative projects
- And much more!

What would you like help with today?
```

### 7.3 Test Bedrock Integration

```
You: What model are you?

Bot: I'm Claude Sonnet 4.5, running on Amazon Bedrock through OpenClaw.
This is a secure, AWS-hosted deployment with zero inbound ports and
KMS-encrypted secrets. How can I assist you today?
```

### 7.4 Test Error Handling

```
You: Test a very long message... [send 4000+ characters]

Bot: I notice your message is quite long. Let me help you with that...
[Bot should handle gracefully without crashing]
```

### 7.5 Verify Costs are Tracking

```bash
# Check Bedrock usage in CloudWatch
aws cloudwatch get-metric-statistics \
  --namespace AWS/Bedrock \
  --metric-name InvocationCount \
  --dimensions Name=ModelId,Value=anthropic.claude-sonnet-4-5-v2 \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Sum \
  --region us-east-1

# Should show number of invocations
```

---

## Advanced Configuration

### Change Bedrock Model

```bash
# Update SSM parameter
aws ssm put-parameter \
  --name /openclaw/bedrock-model \
  --value anthropic.claude-opus-4-5-v2 \
  --type String \
  --overwrite \
  --region us-east-1

# Restart OpenClaw service
aws ssm start-session --target $INSTANCE_ID --region us-east-1
sudo systemctl restart openclaw
exit
```

### Enable Guardrails (Post-Deployment)

```bash
# Re-deploy with Guardrails enabled
npx cdk deploy \
  --parameters TelegramBotToken=YOUR_TOKEN \
  --parameters EnableGuardrails=true

# This will update the stack (takes 2-3 minutes)
```

### Scale Up Instance Size

```bash
# Re-deploy with larger instance
npx cdk deploy \
  --parameters TelegramBotToken=YOUR_TOKEN \
  --parameters InstanceType=t3.small

# Note: This requires instance stop/start (2-3 min downtime)
```

### Add Custom Environment Variables

```bash
# Connect to instance
aws ssm start-session --target $INSTANCE_ID --region us-east-1

# Edit OpenClaw config
sudo nano /home/openclaw/.openclaw/config.json

# Add custom settings, then restart
sudo systemctl restart openclaw
exit
```

---

## Updating Your Deployment

### Update CDK Code

```bash
# Pull latest changes
git pull origin main

# Rebuild
npm run build

# Review changes
npx cdk diff

# Deploy updates
npx cdk deploy
```

### Update OpenClaw Version

```bash
# Connect to instance
aws ssm start-session --target $INSTANCE_ID --region us-east-1

# Update OpenClaw package
sudo npm update -g openclaw

# Restart service
sudo systemctl restart openclaw

# Verify new version
openclaw --version

exit
```

### Rotate Telegram Token

```bash
# Get new token from @BotFather
# /revoke to revoke old token
# /newbot or /token to get new one

# Update SSM parameter
aws ssm put-parameter \
  --name /openclaw/telegram-token \
  --value NEW_TOKEN_HERE \
  --type SecureString \
  --overwrite \
  --region us-east-1

# Restart service
aws ssm start-session --target $INSTANCE_ID --region us-east-1
sudo systemctl restart openclaw
exit
```

---

## Cleanup and Removal

### Complete Removal

```bash
# Destroy CDK stack
npx cdk destroy

# Confirm with: y

# This removes:
# ✅ EC2 instance
# ✅ Security groups
# ✅ SSM parameters
# ✅ CloudWatch logs
# ✅ IAM roles
# ✅ Budget alerts

# Note: CDKToolkit stack remains (safe to keep for future deployments)
```

### Remove CDK Bootstrap (Optional)

Only if you're sure you won't deploy CDK apps again:

```bash
# Delete CDK toolkit stack
aws cloudformation delete-stack --stack-name CDKToolkit --region us-east-1

# Wait for deletion
aws cloudformation wait stack-delete-complete --stack-name CDKToolkit --region us-east-1

# Manually delete S3 bucket (has versioning)
aws s3 rm s3://cdk-hnb659fds-assets-ACCOUNT-REGION --recursive
aws s3 rb s3://cdk-hnb659fds-assets-ACCOUNT-REGION --force
```

### Verify Complete Cleanup

```bash
# Check for remaining resources
aws cloudformation list-stacks \
  --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE \
  --query 'StackSummaries[?contains(StackName, `OpenClaw`)].StackName'

# Should return empty []
```

---

## Troubleshooting

For detailed troubleshooting, see [troubleshooting.md](troubleshooting.md).

Common issues:

1. **"No Bedrock access"** → Request model access in Bedrock console
2. **"Invalid token"** → Check Telegram token with `/getMe` API
3. **"Stack rollback"** → Check CloudFormation events for specific error
4. **"Budget over threshold"** → Check CloudWatch metrics, consider cheaper model

---

## Next Steps

- ✅ Deployment complete!
- 📊 Review [cost-breakdown.md](cost-breakdown.md) to understand costs
- 🔒 Run [security-audit.md](security-audit.md) checklist
- 🚀 Explore [migration-guide.md](migration-guide.md) for VPS users
- 📈 Monitor usage in CloudWatch dashboard

---

## Support

- 📖 [Full Documentation](../README.md)
- 🐛 [Report Issues](https://github.com/alejandro-medici/openclaw-aws-cdk/issues)
- 💬 [GitHub Discussions](https://github.com/alejandro-medici/openclaw-aws-cdk/discussions)

---

**Built with ❤️ by the community** | Last updated: January 2026
