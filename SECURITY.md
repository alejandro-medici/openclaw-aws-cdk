# Security Policy

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability in this project, please report it responsibly.

### How to Report

**DO NOT** open a public GitHub issue for security vulnerabilities.

Instead, please report security issues via one of the following methods:

1. **Email**: Send details to [security@example.com](mailto:security@example.com)
   - Use PGP key (fingerprint: TBD) for sensitive information
   - Include steps to reproduce the vulnerability
   - Provide any proof-of-concept code if applicable

2. **GitHub Security Advisory**: Use the [GitHub Security Advisory](https://github.com/YOUR_USERNAME/openclaw-aws-cdk/security/advisories/new) feature
   - This creates a private disclosure
   - We can collaborate on a fix before public disclosure

### What to Include

Please provide as much information as possible:

- Type of vulnerability (e.g., credential exposure, IAM misconfiguration, injection attack)
- Full paths of affected files
- Location of the affected source code (tag/branch/commit or direct URL)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact assessment (how an attacker could exploit this)

### Response Timeline

- **Acknowledgment**: Within 48 hours of report
- **Initial Assessment**: Within 5 business days
- **Fix Timeline**: Depends on severity
  - Critical: 7 days
  - High: 14 days
  - Medium: 30 days
  - Low: 60 days
- **Public Disclosure**: After fix is deployed and users have time to update (typically 7-14 days)

### Scope

This security policy applies to:

✅ **In Scope:**
- CDK stack configurations (IAM policies, Security Groups, etc.)
- Secrets management implementation
- Authentication/Authorization logic
- Infrastructure security controls
- CloudFormation template generation
- Documentation that could lead to insecure deployments

❌ **Out of Scope:**
- Vulnerabilities in dependencies (report to upstream projects)
- Social engineering attacks
- Physical attacks
- Denial of Service attacks (unless they reveal a security flaw)
- Issues in OpenClaw itself (report to [openclaw/openclaw](https://github.com/openclaw/openclaw))

### Reward & Recognition

While we don't currently offer a bug bounty program, we will:

- Publicly acknowledge your contribution (if desired)
- Credit you in the CHANGELOG
- Add you to our security hall of fame (if we create one)
- Provide a detailed write-up of the fix (for your portfolio, if desired)

### Security Best Practices

When using this CDK stack, please follow these security guidelines:

#### Secrets Management
- ✅ **DO** use SSM Parameter Store for all secrets
- ✅ **DO** enable KMS encryption for sensitive parameters
- ❌ **DON'T** hardcode secrets in CDK code
- ❌ **DON'T** commit .env files or credentials

#### Network Security
- ✅ **DO** keep Security Groups with zero inbound rules
- ✅ **DO** use Session Manager instead of SSH
- ❌ **DON'T** open port 22 (SSH) to the internet
- ❌ **DON'T** expose unnecessary ports

#### IAM Security
- ✅ **DO** follow least privilege principle
- ✅ **DO** use IAM roles for EC2 instances
- ✅ **DO** scope permissions to specific resources
- ❌ **DON'T** use wildcard (*) in resource ARNs unless absolutely necessary
- ❌ **DON'T** use long-term access keys for applications

#### Cost Security
- ✅ **DO** set up AWS Budgets with alerts
- ✅ **DO** monitor CloudWatch metrics regularly
- ✅ **DO** test with small instances first
- ❌ **DON'T** deploy without cost controls
- ❌ **DON'T** ignore budget alert emails

#### Audit & Monitoring
- ✅ **DO** enable CloudWatch Logs
- ✅ **DO** review CloudTrail logs regularly
- ✅ **DO** set up CloudWatch Alarms for critical metrics
- ❌ **DON'T** disable logging to save costs

## Known Security Considerations

### 1. Default VPC Usage
**Issue**: This stack creates a new VPC but you could modify it to use the default VPC.

**Mitigation**: The default VPC has a default Security Group that allows all traffic between instances. This stack creates a dedicated Security Group with zero inbound rules.

**Recommendation**: Use the created VPC, not the default VPC.

### 2. Public Subnet
**Issue**: EC2 instance is deployed in a public subnet (has internet access via IGW).

**Mitigation**:
- Security Group blocks ALL inbound traffic
- Only outbound HTTPS (443) is allowed
- No SSH access (Session Manager used instead)

**Recommendation**: This is acceptable for Free Tier deployments. For production, consider private subnet + NAT Gateway.

### 3. Single AZ Deployment
**Issue**: No high availability (single point of failure).

**Mitigation**: CloudWatch alarms notify on health check failures.

**Recommendation**: For production, deploy across multiple AZs with Auto Scaling Group.

### 4. Bedrock Model Access
**Issue**: IAM role has access to ALL Anthropic models in Bedrock.

**Mitigation**: IAM policy scopes to `anthropic.*` models only, not all Bedrock models.

**Recommendation**: Further restrict to specific model versions if needed.

### 5. Budget Email Address
**Issue**: Budget alerts require email address in code (potentially exposed).

**Recommendation**: We should make this a parameter or use SNS topic ARN instead. Current workaround: Use a distribution list, not personal email.

## Security Updates

We will publish security advisories for:

- Vulnerabilities with CVSS score ≥ 4.0
- Any issue that could lead to unauthorized access
- Credential exposure risks
- Cost runaway scenarios
- Compliance violations

Subscribe to [GitHub Security Advisories](https://github.com/YOUR_USERNAME/openclaw-aws-cdk/security/advisories) for notifications.

## Security Audit History

| Date | Auditor | Scope | Findings | Status |
|------|---------|-------|----------|--------|
| 2026-01-27 | Internal Review | Initial code review | 0 Critical, 0 High | ✅ Clean |

## Contact

For security inquiries: security@example.com

For general inquiries: See [README.md](README.md)

---

**Last Updated**: January 27, 2026
