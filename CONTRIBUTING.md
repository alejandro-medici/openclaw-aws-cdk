# Contributing to Clawdbot AWS CDK

Thank you for considering contributing! This project aims to provide a production-ready, security-first AWS deployment for Clawdbot.

## Code of Conduct

Be respectful, inclusive, and professional. We're all here to make deploying Clawdbot easier and more secure.

## How to Contribute

### Reporting Bugs

Before creating a bug report:
1. Check if the issue already exists in [GitHub Issues](https://github.com/YOUR_USERNAME/clawdbot-aws-cdk/issues)
2. Verify you're using the latest version
3. Test with a clean AWS account if possible

When filing a bug report, include:
- CDK version (`npx cdk --version`)
- Node.js version (`node --version`)
- AWS region
- Full error message or logs
- Steps to reproduce
- Expected vs actual behavior

### Suggesting Enhancements

Feature requests are welcome! Please include:
- **Use case**: Why is this needed?
- **Proposed solution**: How would it work?
- **Alternatives considered**: What other approaches did you think about?
- **Impact**: Cost, security, complexity implications

### Pull Requests

#### Before You Start

1. **Check existing PRs**: Someone might already be working on it
2. **Open an issue first**: Discuss the change before coding
3. **Fork the repo**: Don't work on the main branch

#### Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/clawdbot-aws-cdk.git
cd clawdbot-aws-cdk

# Install dependencies
npm install

# Build the project
npm run build

# Run tests (when available)
npm test

# Synthesize CloudFormation
npx cdk synth
```

#### Code Style

- **TypeScript**: Use strict mode, no `any` types
- **Comments**: Explain WHY, not WHAT
- **Naming**: Descriptive names (e.g., `securityGroup`, not `sg`)
- **Formatting**: Run `npm run build` before committing

#### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add Bedrock Guardrails support
fix: correct IAM policy for multi-region
docs: update deployment instructions
refactor: simplify VPC configuration
test: add unit tests for IAM role
```

**Good commit message:**
```
feat: add email parameter for budget alerts

- Make budget alert email configurable via CDK parameter
- Update README with new parameter documentation
- Add validation for email format

Closes #42
```

**Bad commit message:**
```
updated stuff
```

#### PR Checklist

Before submitting a PR:

- [ ] Code compiles without errors (`npm run build`)
- [ ] CDK synth works (`npx cdk synth`)
- [ ] Documentation updated (README, JSDoc comments)
- [ ] No secrets or credentials in code
- [ ] Security implications considered
- [ ] Cost implications documented
- [ ] Backward compatible (or breaking change noted)
- [ ] Self-reviewed the diff

#### PR Template

```markdown
## Description
Brief description of what this PR does.

## Motivation
Why is this change needed?

## Changes
- List of changes made
- Each item should be atomic

## Testing
How was this tested?
- [ ] Deployed to clean AWS account
- [ ] Tested with existing deployments
- [ ] Verified CloudFormation template

## Security Considerations
Any security implications? New IAM permissions? Attack surface changes?

## Cost Impact
Does this change AWS costs? By how much?

## Breaking Changes
Does this require users to update their deployments?

## Screenshots (if applicable)
Show before/after for UI/output changes.

## Checklist
- [ ] Documentation updated
- [ ] No secrets committed
- [ ] CDK synth works
- [ ] Backward compatible
```

### Areas We Need Help

**High Priority:**
- 🔴 Unit tests for CDK constructs
- 🔴 Integration tests (deploy + destroy)
- 🔴 Bedrock Guardrails integration
- 🔴 Multi-region support

**Medium Priority:**
- 🟡 Cost optimization strategies
- 🟡 Monitoring dashboard (CloudWatch)
- 🟡 Backup/restore automation
- 🟡 Blog posts / tutorials

**Low Priority:**
- 🟢 Alternative messaging platforms (Discord, WhatsApp)
- 🟢 CI/CD examples (GitHub Actions)
- 🟢 Terraform version (for non-CDK users)

### Architecture Decisions

When making significant changes, document your reasoning:

1. **Create an ADR** (Architecture Decision Record) in `.claude/decisions/`
2. Use template:
   ```markdown
   # ADR-XXX: Title

   ## Status
   Proposed / Accepted / Deprecated

   ## Context
   What problem are we solving?

   ## Decision
   What did we decide to do?

   ## Consequences
   What are the trade-offs?
   - Good
   - Bad
   - Neutral

   ## Alternatives Considered
   What else did we think about?
   ```

### Security Contributions

Security improvements are **always welcome**:

- IAM policy tightening
- Secret management enhancements
- Network security hardening
- Compliance features (HIPAA, SOC2, etc.)
- Threat modeling documentation

**Important**: Follow [SECURITY.md](SECURITY.md) for vulnerability reporting.

### Documentation Contributions

Great documentation is as valuable as great code:

- Fix typos or unclear instructions
- Add troubleshooting guides
- Write tutorials or blog posts
- Create architecture diagrams
- Translate to other languages

### Testing

Currently, we don't have automated tests (contributions welcome!). Manual testing checklist:

**Deployment Test:**
```bash
# 1. Clean AWS account
aws sts get-caller-identity

# 2. Bootstrap CDK
npx cdk bootstrap

# 3. Deploy with test token
npx cdk deploy --parameters TelegramBotToken=TEST_TOKEN

# 4. Verify outputs
# Check CloudFormation stack in console
# Verify EC2 instance running
# Check Security Group has zero inbound rules

# 5. Test connection
aws ssm start-session --target i-xxxxx

# 6. Cleanup
npx cdk destroy
```

**Security Test:**
```bash
# Verify no inbound ports
aws ec2 describe-security-groups --group-ids sg-xxxxx

# Verify KMS encryption on SSM parameter
aws ssm get-parameter --name /clawdbot/telegram-token --with-decryption

# Verify IAM role permissions (least privilege)
aws iam get-role-policy --role-name ClawdbotGatewayRole
```

## Release Process

(Maintainers only)

1. Update version in `package.json`
2. Update CHANGELOG.md
3. Create git tag: `git tag -a v1.0.0 -m "Release v1.0.0"`
4. Push tag: `git push origin v1.0.0`
5. GitHub Actions will create release (when configured)

## Questions?

- 💬 Open a [Discussion](https://github.com/YOUR_USERNAME/clawdbot-aws-cdk/discussions)
- 🐛 Report a [Bug](https://github.com/YOUR_USERNAME/clawdbot-aws-cdk/issues/new?template=bug_report.md)
- 💡 Suggest a [Feature](https://github.com/YOUR_USERNAME/clawdbot-aws-cdk/issues/new?template=feature_request.md)

## Recognition

Contributors will be:
- Listed in CHANGELOG.md
- Credited in release notes
- Added to README.md (if significant contribution)
- Thanked publicly on social media (if desired)

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).

---

**Thank you for making Clawdbot deployments better!** 🙏
