# CDK Construct Plan: @openclaw/aws-secure-bot-construct

## Vision

Transform the OpenClawStack into a reusable L3 CDK Construct that developers can install via npm and use with 5 lines of code instead of 700.

---

## Phase 1: API Design & Architecture (Week 1)

### Target API

```typescript
import { SecureAIBot } from '@openclaw/aws-secure-bot-construct';

const bot = new SecureAIBot(this, 'MyBot', {
  // Required
  botToken: SecretValue.secretsManager('telegram-bot-token'),

  // Optional - AI Provider
  aiProvider: {
    type: 'bedrock',
    model: 'anthropic.claude-sonnet-4-5-v2',
    guardrails: {
      enabled: true,
      blockPromptAttacks: true,
      anonymizePII: ['EMAIL', 'PHONE', 'NAME']
    }
  },

  // Optional - Infrastructure
  compute: {
    instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MICRO),
    useSpotInstances: true,
    spotInterruptionBehavior: SpotInstanceInterruption.STOP
  },

  // Optional - Cost Control
  budget: {
    monthlyLimit: 50,
    alertEmail: 'alerts@example.com',
    alertThresholds: [0.8, 1.0] // 80% and 100%
  },

  // Optional - Monitoring
  monitoring: {
    enableCloudWatch: true,
    logRetentionDays: 7,
    alarms: {
      cpu: { threshold: 80 },
      health: { enabled: true }
    }
  },

  // Optional - Network
  vpc: myVpc, // or undefined to create new VPC

  // Optional - Security
  security: {
    enableSessionManager: true,
    allowSSH: false,
    encryptEBS: true,
    kmsKey: myKey // or undefined for default
  }
});

// Access created resources
bot.instance;
bot.vpc;
bot.securityGroup;
bot.role;
```

### Class Structure

```
SecureAIBot (L3 Construct)
├─ SecureBotVpc (L2 Construct)
│  ├─ VPC with single public subnet
│  └─ Internet Gateway
├─ SecureBotInstance (L2 Construct)
│  ├─ EC2 Instance (or Spot)
│  ├─ IAM Role with least privilege
│  ├─ Security Group (zero inbound)
│  └─ User Data bootstrap script
├─ SecureBotMonitoring (L2 Construct)
│  ├─ CloudWatch Alarms
│  ├─ Log Groups
│  └─ Budget Alerts
└─ SecureBotGuardrails (L2 Construct - optional)
   └─ Bedrock Guardrail configuration
```

---

## Phase 2: Refactor Existing Code (Week 2)

### Step 1: Create Construct Library Structure

```
openclaw-aws-construct/
├─ lib/
│  ├─ index.ts                    # Main export
│  ├─ secure-ai-bot.ts            # Main L3 construct
│  ├─ constructs/
│  │  ├─ secure-bot-vpc.ts
│  │  ├─ secure-bot-instance.ts
│  │  ├─ secure-bot-monitoring.ts
│  │  └─ secure-bot-guardrails.ts
│  └─ types.ts                    # TypeScript interfaces
├─ test/
│  ├─ secure-ai-bot.test.ts       # Main tests
│  └─ constructs/
│     ├─ secure-bot-vpc.test.ts
│     └─ ...
├─ examples/
│  ├─ basic-usage.ts
│  ├─ spot-instances.ts
│  ├─ custom-vpc.ts
│  └─ multi-bot.ts
├─ .projenrc.ts                   # Projen config
├─ package.json
├─ README.md
└─ API.md                         # Generated API docs
```

### Step 2: Extract Reusable Logic

Extract from current `lib/openclaw-stack.ts`:

1. **VPC creation** → `SecureBotVpc` construct
2. **Instance + IAM** → `SecureBotInstance` construct
3. **Monitoring** → `SecureBotMonitoring` construct
4. **Guardrails** → `SecureBotGuardrails` construct

### Step 3: Add Smart Defaults

```typescript
export interface SecureAIBotProps {
  botToken: SecretValue;
  aiProvider?: AIProviderConfig; // Default: Bedrock Sonnet 4.5
  compute?: ComputeConfig;       // Default: t3.micro on-demand
  budget?: BudgetConfig;         // Default: $50 limit
  monitoring?: MonitoringConfig; // Default: enabled
  vpc?: IVpc;                    // Default: create new VPC
  security?: SecurityConfig;     // Default: zero-trust
}
```

---

## Phase 3: Testing & Validation (Week 3)

### Test Coverage Requirements

- ✅ Unit tests for each construct (95% coverage)
- ✅ Integration tests (full stack deployment)
- ✅ Snapshot tests (CloudFormation template validation)
- ✅ Security tests (no SSH, KMS enabled, etc.)
- ✅ Cost validation tests (verify Free Tier resources)

### Example Test

```typescript
test('SecureAIBot creates zero inbound security group', () => {
  const app = new App();
  const stack = new Stack(app, 'TestStack');

  new SecureAIBot(stack, 'Bot', {
    botToken: SecretValue.unsafePlainText('test-token')
  });

  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::EC2::SecurityGroup', {
    SecurityGroupIngress: Match.absent() // Zero inbound rules
  });
});
```

---

## Phase 4: Documentation (Week 4)

### Required Docs

1. **README.md**
   - Quick start (5-line example)
   - Features & benefits
   - Cost comparison
   - Security highlights
   - Link to full docs

2. **API.md** (auto-generated from JSDoc)
   - All props interfaces
   - Method signatures
   - Property descriptions

3. **Examples**
   - Basic deployment
   - Spot instances
   - Custom VPC
   - Multi-bot deployment
   - Cost optimization

4. **Migration Guide**
   - How to migrate from OpenClawStack to SecureAIBot construct

---

## Phase 5: Publishing (Week 5)

### NPM Package Setup

```json
{
  "name": "@openclaw/aws-secure-bot-construct",
  "version": "1.0.0",
  "description": "Production-ready CDK construct for secure AI bot deployment",
  "keywords": [
    "aws-cdk",
    "constructs",
    "ai",
    "bedrock",
    "security",
    "openclaw",
    "telegram"
  ],
  "main": "lib/index.js",
  "types": "lib/index.d.ts",
  "peerDependencies": {
    "aws-cdk-lib": "^2.172.0",
    "constructs": "^10.0.0"
  }
}
```

### Publishing Checklist

- [ ] Create npm organization: `@openclaw`
- [ ] Set up CI/CD (GitHub Actions)
- [ ] Automated testing on PR
- [ ] Automated publish to npm on tag
- [ ] Register on [Construct Hub](https://constructs.dev)
- [ ] Add badge to README (npm version, downloads, etc.)

### Construct Hub Integration

```typescript
// .projenrc.ts
const project = new awscdk.AwsCdkConstructLibrary({
  name: '@openclaw/aws-secure-bot-construct',
  author: 'Your Name',
  authorAddress: 'you@example.com',
  cdkVersion: '2.172.0',
  defaultReleaseBranch: 'main',
  repositoryUrl: 'https://github.com/your-org/aws-secure-bot-construct.git',

  // Construct Hub
  publishToMaven: false,
  publishToPypi: false,
  publishToNuget: false,
  publishToGo: false,

  // Keywords for discoverability
  keywords: [
    'aws-cdk',
    'constructs',
    'ai-bot',
    'security',
    'bedrock',
    'openclaw'
  ]
});
```

---

## Phase 6: Monetization Strategy (Ongoing)

### Option A: Open Source + Services

- ✅ Free construct on npm
- 💰 Charge for:
  - Custom implementation ($500-2000)
  - Training workshops ($1000/day)
  - Enterprise support ($200/month)
  - Consulting (Well-Architected reviews)

### Option B: Freemium Model

- ✅ Free basic construct
- 💰 Premium features ($10-20/month):
  - Multi-region failover
  - Advanced cost optimization
  - Custom guardrails
  - Slack/Discord alerting
  - Web dashboard

### Option C: GitHub Sponsors

- ✅ Free construct
- 💰 Voluntary donations via GitHub Sponsors
- 🎁 Sponsor perks:
  - Early access to new features
  - Priority support
  - Name in README
  - Custom feature requests

---

## Success Metrics

### Year 1 Goals

- 📦 1,000+ npm downloads/month
- ⭐ 100+ GitHub stars
- 👥 10+ contributors
- 📝 Featured on Construct Hub homepage
- 💼 3+ paid consulting engagements

### Technical Metrics

- 📊 95%+ test coverage
- 🐛 <5 open bugs at any time
- 📖 100% API documentation
- ⚡ <2 day response to issues

---

## Risk Mitigation

### What if OpenClaw changes name AGAIN?

**Strategy:** Make the construct **framework-agnostic**

```typescript
// Support ANY AI bot, not just OpenClaw
const bot = new SecureAIBot(this, 'Bot', {
  botToken: myToken,
  botType: 'openclaw', // or 'custom'
  installScript: `
    npm install -g openclaw@latest
    openclaw setup --bedrock
  `,
  aiProvider: { type: 'bedrock', model: 'sonnet-4.5' }
});
```

This way, if OpenClaw becomes "SuperClaw" tomorrow, users just change `botType: 'superclaw'` and update the install script.

### What if AWS changes CDK APIs?

**Strategy:**
- Pin to stable CDK version (`^2.172.0`)
- Use CDK v2 stable constructs only
- Monitor AWS CDK changelog
- Automated dependency updates with tests

---

## Next Steps (This Week)

1. **Day 1-2:** Refactor `lib/openclaw-stack.ts` into modular constructs
2. **Day 3:** Write TypeScript interfaces for all props
3. **Day 4:** Set up test infrastructure with Jest
4. **Day 5:** Create 3 example projects (basic, spot, custom VPC)
5. **Weekend:** Write README and API docs

---

## Questions to Answer

- [ ] Should we support multiple AI providers (OpenAI, Anthropic API, etc.)?
- [ ] Should we support multiple chat platforms (Discord, Slack, WhatsApp)?
- [ ] Do we need a web dashboard for monitoring?
- [ ] What's the minimum CDK version to support?
- [ ] Should we publish to PyPI/Maven for Python/Java users?

---

## Resources

- [AWS CDK Construct Library Guide](https://docs.aws.amazon.com/cdk/v2/guide/constructs.html)
- [Construct Hub Publishing Guide](https://constructs.dev/contribute)
- [Projen for CDK Projects](https://github.com/projen/projen)
- [CDK Best Practices](https://docs.aws.amazon.com/cdk/v2/guide/best-practices.html)
