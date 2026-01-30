# OpenClaw AWS CDK - Cost Breakdown
**Detailed Cost Analysis and Optimization Guide**

*Last Updated: January 2026*

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Year 1: Free Tier Analysis](#year-1-free-tier-analysis)
3. [Year 2+: Post Free Tier](#year-2-post-free-tier)
4. [Usage-Based Cost Modeling](#usage-based-cost-modeling)
5. [Cost Optimization Strategies](#cost-optimization-strategies)
6. [Cost Monitoring Setup](#cost-monitoring-setup)
7. [Cost Comparison vs Alternatives](#cost-comparison-vs-alternatives)
8. [TCO (Total Cost of Ownership)](#tco-total-cost-of-ownership)

---

## Executive Summary

### Quick Facts

| Metric | Value |
|--------|-------|
| **Year 1 Cost** | $300-360/year ($25-30/month) |
| **Year 2+ Cost** | $405-480/year ($34-40/month) |
| **Free Tier Savings** | ~$100/year (Year 1 only) |
| **Break-even vs VPS** | 13 months |
| **Most Expensive Component** | Bedrock API (~75% of costs) |
| **Cheapest Alternative** | Hetzner VPS ($346/year) |

### Cost Philosophy

This deployment prioritizes:
1. **Security** > Cost savings (zero inbound ports, KMS encryption)
2. **Free Tier optimization** (Year 1 cheapest among cloud options)
3. **Pay-per-use** (No fixed high costs like Mac Mini)
4. **Predictability** (Budget alerts at 80%)

---

## Year 1: Free Tier Analysis

### Free Tier Eligibility

**AWS Free Tier lasts 12 months** from account creation date.

Check your eligibility:
```bash
# View account creation date
aws iam get-account-summary --query 'SummaryMap.AccountCreationTime'

# Check Free Tier usage
# Visit: https://console.aws.amazon.com/billing/home#/freetier
```

### Detailed Monthly Breakdown (Year 1)

#### Infrastructure Costs: $0/month

```
┌─────────────────────────────────────────────────────────┐
│ EC2 t3.micro                                            │
├─────────────────────────────────────────────────────────┤
│ Price:      $0.0104/hour                                │
│ Hours used: 730 hours/month (24/7)                      │
│ List cost:  $7.59/month                                 │
│ Free Tier:  750 hours/month free                        │
│ YOUR COST:  $0/month ✅                                 │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ EBS gp3 Storage (8 GB)                                  │
├─────────────────────────────────────────────────────────┤
│ Price:      $0.08/GB-month                              │
│ Size:       8 GB                                        │
│ List cost:  $0.64/month                                 │
│ Free Tier:  30 GB-months free                           │
│ YOUR COST:  $0/month ✅                                 │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ CloudWatch Logs                                         │
├─────────────────────────────────────────────────────────┤
│ Ingestion:  $0.50/GB                                    │
│ Storage:    $0.03/GB-month                              │
│ Est. usage: 1 GB/month ingestion, 2 GB storage          │
│ List cost:  $0.56/month                                 │
│ Free Tier:  5 GB ingestion, 5 GB storage free           │
│ YOUR COST:  $0/month ✅                                 │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Data Transfer Out                                       │
├─────────────────────────────────────────────────────────┤
│ Price:      $0.09/GB (after 100 GB)                     │
│ Est. usage: 5 GB/month (Telegram + Bedrock responses)   │
│ List cost:  $0/month (under 100 GB free)                │
│ Free Tier:  100 GB/month free                           │
│ YOUR COST:  $0/month ✅                                 │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ SSM Parameter Store                                     │
├─────────────────────────────────────────────────────────┤
│ Standard:   Free (up to 10,000 parameters)              │
│ YOUR COST:  $0/month ✅ (Always free)                   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Systems Manager Session Manager                        │
├─────────────────────────────────────────────────────────┤
│ Price:      Free                                        │
│ YOUR COST:  $0/month ✅ (Always free)                   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ AWS Budgets                                             │
├─────────────────────────────────────────────────────────┤
│ Price:      $0.02/budget/day ($0.60/month)              │
│ Free Tier:  First 2 budgets free                        │
│ YOUR COST:  $0/month ✅                                 │
└─────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════
TOTAL INFRASTRUCTURE (FREE TIER): $0/month
═══════════════════════════════════════════════════════════
```

#### Usage-Based Costs: $25-30/month

```
┌─────────────────────────────────────────────────────────┐
│ Amazon Bedrock - Claude Sonnet 4.5 v2                   │
├─────────────────────────────────────────────────────────┤
│ Input:   $3.00 per 1M tokens                            │
│ Output:  $15.00 per 1M tokens                           │
│                                                         │
│ Typical Usage (50 messages/day):                        │
│ ├─ Input:   ~750K tokens/month                         │
│ ├─ Output:  ~150K tokens/month                         │
│ │                                                       │
│ ├─ Input cost:  $2.25/month                            │
│ └─ Output cost: $2.25/month                            │
│                                                         │
│ TYPICAL USER: $25/month                                │
│                                                         │
│ Heavy Usage (200 messages/day):                         │
│ ├─ Input:   ~3M tokens/month                           │
│ ├─ Output:  ~600K tokens/month                         │
│ │                                                       │
│ ├─ Input cost:  $9.00/month                            │
│ └─ Output cost: $9.00/month                            │
│                                                         │
│ HEAVY USER: $30-35/month                                │
└─────────────────────────────────────────────────────────┘

FREE TIER NOTE: Bedrock has NO Free Tier - always paid
```

#### Year 1 Total: $25-30/month

```
Infrastructure:  $0/month    (Free Tier)
Bedrock API:     $25-30/month (usage-based)
───────────────────────────────────────────
TOTAL YEAR 1:    $25-30/month
Annual:          $300-360/year ✅
```

---

## Year 2+: Post Free Tier

### Detailed Monthly Breakdown (Year 2+)

```
┌─────────────────────────────────────────────────────────┐
│ INFRASTRUCTURE (Now Paid)                               │
├─────────────────────────────────────────────────────────┤
│ EC2 t3.micro:      $7.59/month                          │
│ EBS 8GB gp3:       $0.64/month                          │
│ CloudWatch Logs:   $0.56/month                          │
│ Data Transfer:     $0/month (under 100 GB)              │
│ SSM/Session Mgr:   $0/month (always free)               │
│ ────────────────────────────────                        │
│ Infrastructure:    $8.79/month                          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ USAGE-BASED (Same as Year 1)                            │
├─────────────────────────────────────────────────────────┤
│ Bedrock Sonnet:    $25-30/month                         │
└─────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════
TOTAL YEAR 2+: $33.79-38.79/month
Annual:        $405-465/year
═══════════════════════════════════════════════════════════

Increase from Year 1: +$8.79/month (+$105/year)
```

---

## Usage-Based Cost Modeling

### Bedrock Pricing Deep Dive

#### Claude Sonnet 4.5 v2 (Recommended)

| Token Type | Price per 1M tokens | Cost per message* |
|------------|---------------------|-------------------|
| Input | $3.00 | $0.045 |
| Output | $15.00 | $0.030 |
| **Total** | — | **$0.075/message** |

*Assuming average message: 15K input tokens, 2K output tokens

#### Claude Opus 4.5 v2 (Premium)

| Token Type | Price per 1M tokens | Cost per message* |
|------------|---------------------|-------------------|
| Input | $15.00 | $0.225 |
| Output | $75.00 | $0.150 |
| **Total** | — | **$0.375/message** |

**Opus is 5x more expensive than Sonnet!**

#### Usage Scenarios

```
┌────────────────────────────────────────────────────────┐
│ LIGHT USER                                             │
│ 20 messages/day × 30 days = 600 messages/month         │
├────────────────────────────────────────────────────────┤
│ Sonnet: 600 × $0.075 = $45/month                       │
│ Opus:   600 × $0.375 = $225/month (⚠️ 5x more!)        │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│ TYPICAL USER                                           │
│ 50 messages/day × 30 days = 1,500 messages/month       │
├────────────────────────────────────────────────────────┤
│ Sonnet: 1,500 × $0.075 = $112.50/month                 │
│ Opus:   1,500 × $0.375 = $562.50/month (⚠️ 5x more!)   │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│ HEAVY USER                                             │
│ 200 messages/day × 30 days = 6,000 messages/month      │
├────────────────────────────────────────────────────────┤
│ Sonnet: 6,000 × $0.075 = $450/month                    │
│ Opus:   6,000 × $0.375 = $2,250/month (⚠️ EXPENSIVE!)  │
└────────────────────────────────────────────────────────┘
```

### Calculator

```bash
# Quick cost calculator
MESSAGES_PER_DAY=50
COST_PER_MESSAGE=0.075  # Sonnet

MONTHLY_COST=$(echo "$MESSAGES_PER_DAY * 30 * $COST_PER_MESSAGE" | bc -l)
echo "Estimated Bedrock cost: \$${MONTHLY_COST}/month"

# Add infrastructure
INFRA_COST_YEAR1=0
INFRA_COST_YEAR2=8.79

TOTAL_YEAR1=$(echo "$MONTHLY_COST + $INFRA_COST_YEAR1" | bc -l)
TOTAL_YEAR2=$(echo "$MONTHLY_COST + $INFRA_COST_YEAR2" | bc -l)

echo "Year 1 total: \$${TOTAL_YEAR1}/month"
echo "Year 2+ total: \$${TOTAL_YEAR2}/month"
```

---

## Cost Optimization Strategies

### 1. Use Sonnet instead of Opus

**Savings: 80% on Bedrock costs**

```bash
# Check current model
aws ssm get-parameter \
  --name /openclaw/bedrock-model \
  --query 'Parameter.Value' \
  --output text

# Switch to Sonnet
aws ssm put-parameter \
  --name /openclaw/bedrock-model \
  --value anthropic.claude-sonnet-4-5-v2 \
  --overwrite

# Restart service
aws ssm start-session --target $INSTANCE_ID
sudo systemctl restart openclaw
exit
```

**Impact:**
- Typical user: $112.50 → $22.50/month = **$90/month saved**
- Heavy user: $450 → $90/month = **$360/month saved**

### 2. Spot Instances (Year 2+)

**Savings: 70% on EC2 costs**

```typescript
// lib/openclaw-stack.ts - modify instance creation
const instance = new ec2.Instance(this, 'OpenClawInstance', {
  // ... existing config ...
  spotOptions: {
    requestType: ec2.SpotRequestType.PERSISTENT,
    interruptionBehavior: ec2.SpotInstanceInterruption.STOP,
    maxPrice: 0.005  // 50% of On-Demand price
  }
});
```

**Impact:**
- EC2: $7.59 → $2.28/month = **$5.31/month saved**
- Annual savings: **$64/year**

**Trade-off:** Instance may be stopped if spot price exceeds max (rare for t3.micro)

### 3. Schedule Instance Shutdown (Nights/Weekends)

**Savings: 50% on infrastructure costs** (if only using 12 hours/day)

```bash
# Create Lambda to stop instance at night
# (See advanced-cost-optimization.ts in examples/)

# Example: Shutdown 10 PM - 8 AM
# Saves: 10 hours/day × 30 days = 300 hours/month
# EC2 savings: $7.59 × (300/730) = $3.12/month
```

**Impact:**
- EC2: $7.59 → $4.47/month = **$3.12/month saved**
- Annual savings: **$37/year**

**Trade-off:** Bot unavailable during shutdown hours

### 4. Reduce CloudWatch Log Retention

**Savings: $0.20-0.30/month**

```typescript
// lib/openclaw-stack.ts - modify log group
const logGroup = new cdk.aws_logs.LogGroup(this, 'OpenClawLogGroup', {
  logGroupName: '/openclaw/gateway',
  retention: cdk.aws_logs.RetentionDays.THREE_DAYS,  // Was: ONE_WEEK
  removalPolicy: cdk.RemovalPolicy.DESTROY
});
```

**Impact:**
- CloudWatch: $0.56 → $0.26/month = **$0.30/month saved**

### 5. Implement Response Caching

**Savings: 20-30% on Bedrock costs** for repetitive queries

```json
// Add to /home/openclaw/.openclaw/config.json
{
  "cache": {
    "enabled": true,
    "ttl": 300,  // 5 minutes
    "maxSize": 100  // Cache up to 100 responses
  }
}
```

**Impact:**
- Bedrock: $25 → $17.50/month = **$7.50/month saved**

---

## Cost Monitoring Setup

### Enable Cost Alerts

```bash
# Create budget with 80% alert (already in CDK)
# Verify it's working:
aws budgets describe-budgets \
  --account-id $(aws sts get-caller-identity --query Account --output text) \
  --query 'Budgets[?BudgetName==`OpenClaw-Monthly-Budget`]'

# Add additional alert at 100%
aws budgets create-notification \
  --account-id $(aws sts get-caller-identity --query Account --output text) \
  --budget-name OpenClaw-Monthly-Budget \
  --notification NotificationType=ACTUAL,ComparisonOperator=GREATER_THAN,Threshold=100,ThresholdType=PERCENTAGE \
  --subscribers SubscriptionType=EMAIL,Address=your-email@example.com
```

### Daily Cost Tracking

```bash
# Create script: check-daily-costs.sh
#!/bin/bash

echo "=== OpenClaw Daily Costs ==="
echo ""

# Today's cost
aws ce get-cost-and-usage \
  --time-period Start=$(date +%Y-%m-%d),End=$(date -d '+1 day' +%Y-%m-%d) \
  --granularity DAILY \
  --metrics BlendedCost \
  --filter file://<(cat <<EOF
{
  "Tags": {
    "Key": "Application",
    "Values": ["OpenClaw"]
  }
}
EOF
) \
  --query 'ResultsByTime[0].Total.BlendedCost.Amount' \
  --output text

# Month-to-date
aws ce get-cost-and-usage \
  --time-period Start=$(date +%Y-%m-01),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --filter file://<(cat <<EOF
{
  "Tags": {
    "Key": "Application",
    "Values": ["OpenClaw"]
  }
}
EOF
) \
  --query 'ResultsByTime[0].Total.BlendedCost.Amount' \
  --output text

# Bedrock-specific
aws ce get-cost-and-usage \
  --time-period Start=$(date +%Y-%m-01),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --filter file://<(cat <<EOF
{
  "Dimensions": {
    "Key": "SERVICE",
    "Values": ["Amazon Bedrock"]
  }
}
EOF
) \
  --query 'ResultsByTime[0].Total.BlendedCost.Amount' \
  --output text
```

### CloudWatch Cost Dashboard

```bash
# Create custom dashboard
aws cloudwatch put-dashboard \
  --dashboard-name OpenClaw-Costs \
  --dashboard-body file://dashboard.json

# dashboard.json:
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/Billing", "EstimatedCharges", {"stat": "Maximum"}]
        ],
        "period": 86400,
        "stat": "Maximum",
        "region": "us-east-1",
        "title": "Estimated Monthly Charges"
      }
    }
  ]
}
```

---

## Cost Comparison vs Alternatives

### 3-Year Total Cost of Ownership

```
┌──────────────────────────────────────────────────────────┐
│                    3-YEAR TCO COMPARISON                 │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ Mac Mini M4:                                             │
│ ├─ Hardware:        $599 (upfront)                       │
│ ├─ Electricity:     $60/year × 3 = $180                  │
│ ├─ Anthropic API:   $300/year × 3 = $900                 │
│ └─ TOTAL:           $1,679                                │
│                                                          │
│ Hetzner VPS:                                             │
│ ├─ Server:          $3.85/month × 36 = $139              │
│ ├─ Anthropic API:   $300/year × 3 = $900                 │
│ └─ TOTAL:           $1,039 ✅ CHEAPEST                    │
│                                                          │
│ Railway:                                                 │
│ ├─ Hosting:         $10/month × 36 = $360                │
│ ├─ Anthropic API:   $300/year × 3 = $900                 │
│ └─ TOTAL:           $1,260                                │
│                                                          │
│ AWS CDK (this solution):                                 │
│ ├─ Year 1:          $300 (Free Tier)                     │
│ ├─ Year 2-3:        $405/year × 2 = $810                 │
│ └─ TOTAL:           $1,110                                │
│                                                          │
│ AWS CDK (optimized with Spot + scheduling):              │
│ ├─ Year 1:          $300                                 │
│ ├─ Year 2-3:        $320/year × 2 = $640                 │
│ └─ TOTAL:           $940 ✅ COMPETITIVE                   │
└──────────────────────────────────────────────────────────┘
```

### Value-Add Analysis

| Feature | Hetzner VPS | Mac Mini | AWS CDK |
|---------|-------------|----------|---------|
| **Upfront Cost** | $0 ✅ | $599 ❌ | $0 ✅ |
| **Monthly Cost (Yr 1)** | $28.85 | $30 | $25 ✅ |
| **Zero Inbound Ports** | ❌ | ❌ | ✅ |
| **KMS Encryption** | ❌ | ❌ | ✅ |
| **Budget Alerts** | ❌ | ❌ | ✅ |
| **IAM Roles (no keys)** | ❌ | ❌ | ✅ |
| **Audit Logs** | ❌ | ❌ | ✅ |
| **Enterprise Path** | ❌ | ❌ | ✅ (Connect) |
| **Auto-scaling** | ❌ | ❌ | ✅ |
| **Disaster Recovery** | Manual | Manual | Automated ✅ |

---

## TCO (Total Cost of Ownership)

### Hidden Costs of Alternatives

#### VPS Hidden Costs:
- Security audits: $500-1000/year (if professional)
- Manual backups time: 2 hours/month = $100/month (at $50/hr)
- Incident response: $200-500 per incident
- SSL certificates: $0-50/year
- Monitoring tools: $10-30/month

#### Mac Mini Hidden Costs:
- Physical space rental: $10-20/month (if colocated)
- UPS battery: $100-200 upfront + $50/year replacement
- Network redundancy: $20-50/month
- Depreciation: $599 → $200 over 3 years = $133/year
- Repair/replacement risk: $100-600

#### AWS CDK Hidden Costs:
- Learning curve: 4-8 hours initially (one-time)
- Monitoring time: 30 min/month
- ... but automated security, backups, scaling included ✅

---

## Recommendations by Use Case

### Personal Use (< 1000 messages/month)

**Recommended:** AWS CDK with Sonnet

```
Monthly Cost: $25-30 (Year 1), $34-39 (Year 2+)
Rationale: Cheapest Year 1, best security, easy to manage
```

### Small Team (1000-5000 messages/month)

**Recommended:** AWS CDK with Sonnet + Spot instances

```
Monthly Cost: $30-50 (Year 1), $40-60 (Year 2+)
Rationale: Good balance of cost, security, scalability
```

### Enterprise (>5000 messages/month)

**Recommended:** AWS CDK + Amazon Connect + Reserved Instances

```
Monthly Cost: $100-300
Rationale: Multi-channel, compliance-ready, human escalation
```

### Budget-Constrained (<$30/month forever)

**Recommended:** Hetzner VPS

```
Monthly Cost: $28.85
Rationale: Lowest long-term cost if security trade-offs acceptable
```

---

## Summary: Is AWS CDK Worth It?

**YES, if you value:**
- ✅ Security (zero inbound ports, KMS encryption)
- ✅ Operational simplicity (IaC, auto-patching)
- ✅ Year 1 savings (cheapest cloud option)
- ✅ Enterprise path (Connect integration)
- ✅ Peace of mind (budget alerts, audit logs)

**MAYBE, if:**
- ⚠️ You're comfortable managing VPS security manually
- ⚠️ You prefer lowest absolute cost long-term (Hetzner wins Year 2+)
- ⚠️ You already own a Mac Mini

**NO, if:**
- ❌ You need <$30/month forever (choose Hetzner)
- ❌ You send >10,000 messages/day (Bedrock costs explode)
- ❌ You're opposed to cloud providers

---

**Need help optimizing costs?** See [Cost Optimization Examples](../examples/cost-optimization/)

**Last updated:** January 2026
