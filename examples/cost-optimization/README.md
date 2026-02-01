# Cost Optimization Examples

This directory contains advanced cost optimization strategies for OpenClaw deployments.

## Optimization Strategies

### 1. Spot Instances (70% savings on EC2)
- **File:** [spot-instance-stack.ts](spot-instance-stack.ts)
- **Savings:** ~$5.31/month on EC2
- **Risk:** Instance may be interrupted (rare for t3.micro)
- **Best for:** Non-critical workloads, personal use

### 2. Scheduled Shutdown (50% savings on EC2)
- **File:** [scheduled-shutdown-stack.ts](scheduled-shutdown-stack.ts)
- **Savings:** ~$3.12/month on EC2
- **Downtime:** Bot unavailable during shutdown hours
- **Best for:** Personal use with predictable hours (e.g., 9 AM - 11 PM only)

### 3. Response Caching (20-30% savings on Bedrock)
- **File:** [response-caching-config.json](response-caching-config.json)
- **Savings:** ~$7.50/month on Bedrock
- **Trade-off:** Slightly less dynamic responses
- **Best for:** Repetitive queries, FAQ-style bots

### 4. Log Retention Reduction (Minor savings)
- **File:** [minimal-logging-stack.ts](minimal-logging-stack.ts)
- **Savings:** ~$0.30/month on CloudWatch
- **Trade-off:** Less historical data for troubleshooting
- **Best for:** Stable deployments after initial testing

## Cost Comparison

| Configuration | Year 2+ Monthly Cost | vs Default | Total Annual Savings |
|---------------|----------------------|------------|----------------------|
| **Default** | $33.79/month | baseline | - |
| **+ Spot** | $28.48/month | -16% | -$64/year |
| **+ Spot + Scheduling** | $25.36/month | -25% | -$101/year |
| **+ Spot + Scheduling + Caching** | $17.86/month | -47% | -$191/year |
| **All Optimizations** | $17.56/month | -48% | -$195/year |

## Quick Start

### Option 1: Spot Instances Only

```bash
# Copy the spot instance stack
cp examples/cost-optimization/spot-instance-stack.ts lib/

# Deploy
npx cdk deploy \
  --parameters TelegramBotToken=YOUR_TOKEN \
  --parameters UseSpotInstances=true
```

### Option 2: Full Cost Optimization

```bash
# Use the complete optimized stack
cp examples/cost-optimization/fully-optimized-stack.ts lib/openclaw-stack.ts

# Deploy with all optimizations
npx cdk deploy \
  --parameters TelegramBotToken=YOUR_TOKEN \
  --parameters UseSpotInstances=true \
  --parameters EnableScheduledShutdown=true \
  --parameters ShutdownHour=22 \
  --parameters StartupHour=8
```

### Option 3: Response Caching

```bash
# Deploy normally, then configure caching
npx cdk deploy --parameters TelegramBotToken=YOUR_TOKEN

# Connect and configure caching
INSTANCE_ID=$(aws cloudformation describe-stacks \
  --stack-name OpenClawStack \
  --query 'Stacks[0].Outputs[?OutputKey==`InstanceId`].OutputValue' \
  --output text)

aws ssm start-session --target $INSTANCE_ID

# On instance:
sudo cat > /home/openclaw/.openclaw/cache.json <<'EOF'
{
  "enabled": true,
  "ttl": 300,
  "maxSize": 100,
  "strategy": "lru"
}
EOF

sudo chown openclaw:openclaw /home/openclaw/.openclaw/cache.json
sudo systemctl restart openclaw
exit
```

## Detailed Guides

### Spot Instance Implementation

See [spot-instance-stack.ts](spot-instance-stack.ts) for full implementation.

**Key changes:**
- Add `spotOptions` to EC2 instance
- Set `maxPrice` to 50% of On-Demand
- Configure `interruptionBehavior` to STOP (not TERMINATE)

**Pros:**
- 70% cost reduction on EC2
- Persistent storage (EBS remains)
- Restarts automatically when capacity available

**Cons:**
- May be stopped if demand spikes (rare)
- 2-minute warning before interruption
- Not recommended for production

### Scheduled Shutdown Implementation

See [scheduled-shutdown-stack.ts](scheduled-shutdown-stack.ts) for full implementation.

**Example schedule:**
- **Shutdown:** 10 PM daily
- **Startup:** 8 AM daily
- **Weekends:** Shutdown Friday 6 PM, start Monday 8 AM

**Cost calculation:**
```
Normal: 730 hours/month × $0.0104 = $7.59/month
Shutdown nights (10 PM - 8 AM): 10 hours × 30 days = 300 hours saved
Weekend shutdown: 48 hours × 4 weekends = 192 hours saved

Total saved: 492 hours
New cost: 238 hours × $0.0104 = $2.48/month
Savings: $5.11/month (67%)
```

### Response Caching Strategy

**How it works:**
1. Hash incoming messages
2. Check cache for similar recent queries
3. Return cached response if found (< 5 min old)
4. Otherwise, call Bedrock and cache result

**Configuration:**
```json
{
  "cache": {
    "enabled": true,
    "ttl": 300,
    "maxSize": 100,
    "strategy": "lru",
    "similarityThreshold": 0.9
  }
}
```

**Best practices:**
- Set TTL to 5-10 minutes for dynamic responses
- Use similarity matching for slight variations
- Exclude sensitive queries from cache
- Monitor cache hit rate

**Expected savings:**
- 20-30% reduction in Bedrock calls
- Higher for FAQ-style bots
- Lower for highly dynamic conversations

## Monitoring Cost Savings

### Track Your Savings

```bash
# Compare costs month-over-month
aws ce get-cost-and-usage \
  --time-period Start=$(date -d '60 days ago' +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --filter file://<(echo '{"Tags":{"Key":"Application","Values":["OpenClaw"]}}')

# Check Bedrock usage reduction
aws cloudwatch get-metric-statistics \
  --namespace AWS/Bedrock \
  --metric-name InvocationCount \
  --dimensions Name=ModelId,Value=anthropic.claude-sonnet-4-5-v2 \
  --start-time $(date -u -d '30 days ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 86400 \
  --statistics Sum
```

### Create Cost Dashboard

```bash
# Use CloudWatch dashboard template
aws cloudwatch put-dashboard \
  --dashboard-name OpenClaw-Cost-Tracking \
  --dashboard-body file://examples/cost-optimization/cost-dashboard.json
```

## Trade-offs Summary

| Optimization | Savings | Impact | Recommended For |
|--------------|---------|--------|-----------------|
| **Spot Instances** | High (70%) | Low (rare interruptions) | Personal, dev/test |
| **Scheduled Shutdown** | High (50-67%) | High (downtime) | Personal, predictable hours |
| **Response Caching** | Medium (20-30%) | Low (slight staleness) | FAQ bots, repetitive queries |
| **Log Reduction** | Low (~5%) | Medium (less debugging data) | Stable deployments |

## Recommended Configurations

### Personal Use (Budget < $20/month)

```bash
npx cdk deploy \
  --parameters UseSpotInstances=true \
  --parameters EnableScheduledShutdown=true \
  --parameters ShutdownHour=23 \
  --parameters StartupHour=7 \
  --parameters LogRetentionDays=3
```

**Result:** ~$17/month (Year 2+)

### Small Team (Budget < $40/month)

```bash
npx cdk deploy \
  --parameters InstanceType=t3.small \
  --parameters UseSpotInstances=false \
  --parameters EnableScheduledShutdown=false
```

**Result:** ~$35/month (Year 2+), high availability

### Dev/Test Environment (Minimum cost)

```bash
npx cdk deploy \
  --parameters UseSpotInstances=true \
  --parameters EnableScheduledShutdown=true \
  --parameters LogRetentionDays=1 \
  --parameters ShutdownHour=18 \
  --parameters StartupHour=9
```

**Result:** ~$10/month (Year 2+)

## Support

Questions about cost optimization?
- 📖 [Cost Breakdown Guide](../../docs/cost-breakdown.md)
- 💬 [GitHub Discussions](https://github.com/alejandro-medici/openclaw-aws-cdk/discussions)
- 📊 [AWS Cost Explorer](https://console.aws.amazon.com/cost-management/home)

---

**Last updated:** January 2026
