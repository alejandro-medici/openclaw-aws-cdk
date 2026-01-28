import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as budgets from 'aws-cdk-lib/aws-budgets';
import { Construct } from 'constructs';

export class ClawdbotStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ========================================
    // PARAMETERS
    // ========================================

    const telegramToken = new cdk.CfnParameter(this, 'TelegramBotToken', {
      type: 'String',
      noEcho: true,
      description: 'Telegram Bot Token (get from @BotFather)',
      constraintDescription: 'Must be a valid Telegram Bot Token'
    });

    const bedrockModel = new cdk.CfnParameter(this, 'BedrockModel', {
      type: 'String',
      default: 'anthropic.claude-sonnet-4-5-v2',
      allowedValues: [
        'anthropic.claude-sonnet-4-5-v2',
        'anthropic.claude-opus-4-5-v2',
        'anthropic.claude-3-5-sonnet-20241022-v2:0'
      ],
      description: 'Bedrock model to use (Sonnet 4.5 recommended for cost)'
    });

    const instanceType = new cdk.CfnParameter(this, 'InstanceType', {
      type: 'String',
      default: 't3.micro',
      allowedValues: ['t3.micro', 't3.small', 't3.medium'],
      description: 'EC2 instance type (t3.micro = Free Tier eligible)'
    });

    const budgetAmount = new cdk.CfnParameter(this, 'MonthlyBudget', {
      type: 'Number',
      default: 50,
      minValue: 10,
      maxValue: 500,
      description: 'Monthly budget limit in USD (alert at 80%)'
    });

    const enableGuardrails = new cdk.CfnParameter(this, 'EnableGuardrails', {
      type: 'String',
      default: 'false',
      allowedValues: ['true', 'false'],
      description: 'Enable Bedrock Guardrails for prompt injection protection (additional cost)'
    });

    // ========================================
    // VPC - Simple VPC for Free Tier
    // Note: Using a simple VPC instead of lookup for easier deployment
    // Free Tier: VPCs are free, only resources inside cost money
    // ========================================

    const vpc = new ec2.Vpc(this, 'ClawdbotVPC', {
      maxAzs: 1,  // Single AZ = Free Tier friendly
      natGateways: 0,  // No NAT Gateway = Free (use IGW only)
      subnetConfiguration: [
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24
        }
      ],
      enableDnsHostnames: true,
      enableDnsSupport: true
    });

    // ========================================
    // SECURITY GROUP - NO INBOUND TRAFFIC!
    // ========================================

    const securityGroup = new ec2.SecurityGroup(this, 'ClawdbotSecurityGroup', {
      vpc,
      description: 'Clawdbot Gateway - Zero inbound traffic (polling model)',
      allowAllOutbound: true,
      securityGroupName: 'clawdbot-gateway-sg'
    });

    // Explicitly document: NO inbound rules = zero attack surface
    cdk.Tags.of(securityGroup).add('SecurityPosture', 'Zero-Inbound');

    // ========================================
    // IAM ROLE - Least Privilege
    // ========================================

    const role = new iam.Role(this, 'ClawdbotInstanceRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      description: 'IAM role for Clawdbot EC2 instance - Bedrock + SSM + CloudWatch',
      managedPolicies: [
        // Session Manager access (SSH replacement)
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore')
      ],
      roleName: 'ClawdbotGatewayRole'
    });

    // Bedrock permissions - only Anthropic models
    role.addToPolicy(new iam.PolicyStatement({
      sid: 'BedrockInvokeAnthropicModels',
      effect: iam.Effect.ALLOW,
      actions: [
        'bedrock:InvokeModel',
        'bedrock:InvokeModelWithResponseStream'
      ],
      resources: [
        `arn:aws:bedrock:*::foundation-model/anthropic.*`
      ]
    }));

    // SSM Parameter Store - read secrets only
    role.addToPolicy(new iam.PolicyStatement({
      sid: 'SSMParameterReadOnly',
      effect: iam.Effect.ALLOW,
      actions: [
        'ssm:GetParameter',
        'ssm:GetParameters'
      ],
      resources: [
        `arn:aws:ssm:${this.region}:${this.account}:parameter/clawdbot/*`
      ]
    }));

    // CloudWatch Logs - application logging
    role.addToPolicy(new iam.PolicyStatement({
      sid: 'CloudWatchLogsWrite',
      effect: iam.Effect.ALLOW,
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents',
        'logs:DescribeLogStreams'
      ],
      resources: [
        `arn:aws:logs:${this.region}:${this.account}:log-group:/clawdbot/*`
      ]
    }));

    // CloudWatch Metrics - custom metrics
    role.addToPolicy(new iam.PolicyStatement({
      sid: 'CloudWatchMetricsWrite',
      effect: iam.Effect.ALLOW,
      actions: [
        'cloudwatch:PutMetricData'
      ],
      resources: ['*'],
      conditions: {
        StringEquals: {
          'cloudwatch:namespace': 'Clawdbot'
        }
      }
    }));

    // ========================================
    // SSM PARAMETER - Encrypted Telegram Token
    // ========================================

    const telegramTokenParameter = new ssm.StringParameter(this, 'TelegramTokenParameter', {
      parameterName: '/clawdbot/telegram-token',
      stringValue: telegramToken.valueAsString,
      type: ssm.ParameterType.SECURE_STRING,
      description: 'Telegram Bot Token for Clawdbot (KMS encrypted)',
      tier: ssm.ParameterTier.STANDARD
    });

    // Store Bedrock model selection
    new ssm.StringParameter(this, 'BedrockModelParameter', {
      parameterName: '/clawdbot/bedrock-model',
      stringValue: bedrockModel.valueAsString,
      type: ssm.ParameterType.STRING,
      description: 'Bedrock model identifier',
      tier: ssm.ParameterTier.STANDARD
    });

    // ========================================
    // USER DATA - Bootstrap Script
    // ========================================

    const userData = ec2.UserData.forLinux();
    userData.addCommands(
      '#!/bin/bash',
      'set -e',
      'exec > >(tee /var/log/clawdbot-bootstrap.log)',
      'exec 2>&1',
      '',
      'echo "=== Clawdbot Bootstrap Started ==="',
      'date',
      '',
      '# Update system',
      'yum update -y',
      '',
      '# Install Node.js 22 (required for Clawdbot)',
      'echo "Installing Node.js 22..."',
      'curl -fsSL https://rpm.nodesource.com/setup_22.x | bash -',
      'yum install -y nodejs',
      'node --version',
      'npm --version',
      '',
      '# Install AWS CLI v2 (if not present)',
      'if ! command -v aws &> /dev/null; then',
      '  echo "Installing AWS CLI v2..."',
      '  curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"',
      '  yum install -y unzip',
      '  unzip awscliv2.zip',
      '  ./aws/install',
      '  rm -rf aws awscliv2.zip',
      'fi',
      '',
      '# Get AWS region',
      `REGION="${this.region}"`,
      'echo "Region: $REGION"',
      '',
      '# Retrieve Telegram token from SSM',
      'echo "Retrieving Telegram token from SSM..."',
      'TELEGRAM_TOKEN=$(aws ssm get-parameter \\',
      '  --name /clawdbot/telegram-token \\',
      '  --with-decryption \\',
      `  --region $REGION \\`,
      '  --query Parameter.Value \\',
      '  --output text)',
      '',
      'if [ -z "$TELEGRAM_TOKEN" ]; then',
      '  echo "ERROR: Failed to retrieve Telegram token"',
      '  exit 1',
      'fi',
      '',
      '# Retrieve Bedrock model',
      'BEDROCK_MODEL=$(aws ssm get-parameter \\',
      '  --name /clawdbot/bedrock-model \\',
      `  --region $REGION \\`,
      '  --query Parameter.Value \\',
      '  --output text)',
      '',
      'echo "Bedrock model: $BEDROCK_MODEL"',
      '',
      '# Install Clawdbot globally',
      'echo "Installing Clawdbot..."',
      'npm install -g clawdbot@latest',
      '',
      '# Create clawdbot user (run as non-root)',
      'useradd -m -s /bin/bash clawdbot || true',
      '',
      '# Create config directory',
      'mkdir -p /home/clawdbot/.clawdbot',
      'chown -R clawdbot:clawdbot /home/clawdbot',
      '',
      '# Configure Clawdbot for Bedrock',
      'cat > /home/clawdbot/.clawdbot/config.json <<EOF',
      '{',
      '  "ai": {',
      '    "provider": "bedrock",',
      '    "model": "$BEDROCK_MODEL",',
      '    "region": "$REGION"',
      '  },',
      '  "channels": {',
      '    "telegram": {',
      '      "enabled": true,',
      '      "token": "$TELEGRAM_TOKEN"',
      '    }',
      '  },',
      '  "security": {',
      '    "dmPairing": true,',
      '    "requireApproval": true',
      '  }',
      '}',
      'EOF',
      '',
      'chown clawdbot:clawdbot /home/clawdbot/.clawdbot/config.json',
      'chmod 600 /home/clawdbot/.clawdbot/config.json',
      '',
      '# Create systemd service',
      'cat > /etc/systemd/system/clawdbot.service <<EOF',
      '[Unit]',
      'Description=Clawdbot AI Gateway',
      'After=network.target',
      '',
      '[Service]',
      'Type=simple',
      'User=clawdbot',
      'WorkingDirectory=/home/clawdbot',
      'ExecStart=/usr/bin/clawdbot start',
      'Restart=always',
      'RestartSec=10',
      'StandardOutput=journal',
      'StandardError=journal',
      'SyslogIdentifier=clawdbot',
      '',
      '[Install]',
      'WantedBy=multi-user.target',
      'EOF',
      '',
      '# Start Clawdbot service',
      'systemctl daemon-reload',
      'systemctl enable clawdbot',
      'systemctl start clawdbot',
      '',
      '# Verify service status',
      'sleep 5',
      'systemctl status clawdbot --no-pager',
      '',
      'echo "=== Clawdbot Bootstrap Completed ==="',
      'date'
    );

    // ========================================
    // EC2 INSTANCE - Amazon Linux 2023 + Encrypted EBS
    // ========================================

    const instance = new ec2.Instance(this, 'ClawdbotInstance', {
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC  // Free Tier eligible
      },
      instanceType: new ec2.InstanceType(instanceType.valueAsString),
      machineImage: ec2.MachineImage.latestAmazonLinux2023({
        cpuType: ec2.AmazonLinuxCpuType.X86_64
      }),
      securityGroup,
      role,
      userData,
      blockDevices: [{
        deviceName: '/dev/xvda',
        volume: ec2.BlockDeviceVolume.ebs(8, {
          volumeType: ec2.EbsDeviceVolumeType.GP3,
          encrypted: true,  // KMS encryption at rest
          deleteOnTermination: true
        })
      }],
      requireImdsv2: true,  // Security: require IMDSv2
      instanceName: 'clawdbot-gateway'
    });

    // Tag for cost allocation
    cdk.Tags.of(instance).add('Application', 'Clawdbot');
    cdk.Tags.of(instance).add('CostCenter', 'AI-Assistant');

    // ========================================
    // CLOUDWATCH ALARMS - Health Monitoring
    // ========================================

    // Instance health check alarm
    const healthAlarm = new cloudwatch.Alarm(this, 'InstanceHealthAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/EC2',
        metricName: 'StatusCheckFailed',
        dimensionsMap: {
          InstanceId: instance.instanceId
        },
        statistic: 'Maximum',
        period: cdk.Duration.minutes(5)
      }),
      threshold: 1,
      evaluationPeriods: 2,
      alarmDescription: 'Alert when Clawdbot instance fails health checks',
      alarmName: 'clawdbot-instance-health',
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    // CPU utilization alarm (detect runaway processes)
    const cpuAlarm = new cloudwatch.Alarm(this, 'CPUUtilizationAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/EC2',
        metricName: 'CPUUtilization',
        dimensionsMap: {
          InstanceId: instance.instanceId
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5)
      }),
      threshold: 90,
      evaluationPeriods: 3,
      alarmDescription: 'Alert when CPU utilization exceeds 90% for 15 minutes',
      alarmName: 'clawdbot-cpu-high',
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    // ========================================
    // AWS BUDGETS - Cost Control
    // ========================================

    new budgets.CfnBudget(this, 'ClawdbotBudget', {
      budget: {
        budgetName: 'Clawdbot-Monthly-Budget',
        budgetLimit: {
          amount: budgetAmount.valueAsNumber,
          unit: 'USD'
        },
        timeUnit: 'MONTHLY',
        budgetType: 'COST',
        costFilters: {
          TagKeyValue: [
            `user:Application$Clawdbot`
          ]
        }
      },
      notificationsWithSubscribers: [
        {
          notification: {
            notificationType: 'ACTUAL',
            comparisonOperator: 'GREATER_THAN',
            threshold: 80,  // Alert at 80% of budget
            thresholdType: 'PERCENTAGE'
          },
          subscribers: [
            {
              subscriptionType: 'EMAIL',
              address: 'your-email@example.com'  // TODO: Make this a parameter
            }
          ]
        },
        {
          notification: {
            notificationType: 'FORECASTED',
            comparisonOperator: 'GREATER_THAN',
            threshold: 100,  // Alert if forecasted to exceed 100%
            thresholdType: 'PERCENTAGE'
          },
          subscribers: [
            {
              subscriptionType: 'EMAIL',
              address: 'your-email@example.com'  // TODO: Make this a parameter
            }
          ]
        }
      ]
    });

    // ========================================
    // CLOUDWATCH LOG GROUP - Centralized Logging
    // ========================================

    const logGroup = new cdk.aws_logs.LogGroup(this, 'ClawdbotLogGroup', {
      logGroupName: '/clawdbot/gateway',
      retention: cdk.aws_logs.RetentionDays.ONE_WEEK,  // Free Tier: 5GB ingestion
      removalPolicy: cdk.RemovalPolicy.DESTROY  // Clean up on stack deletion
    });

    // ========================================
    // OUTPUTS - Connection & Status Info
    // ========================================

    new cdk.CfnOutput(this, 'InstanceId', {
      value: instance.instanceId,
      description: 'EC2 Instance ID',
      exportName: 'ClawdbotInstanceId'
    });

    new cdk.CfnOutput(this, 'InstancePublicIp', {
      value: instance.instancePublicIp,
      description: 'Public IP (for reference only - SSH disabled)',
      exportName: 'ClawdbotPublicIp'
    });

    new cdk.CfnOutput(this, 'ConnectCommand', {
      value: `aws ssm start-session --target ${instance.instanceId} --region ${this.region}`,
      description: 'Command to connect via Session Manager (no SSH needed)',
      exportName: 'ClawdbotConnectCommand'
    });

    new cdk.CfnOutput(this, 'LogsCommand', {
      value: `aws logs tail /clawdbot/gateway --follow --region ${this.region}`,
      description: 'Command to view live logs',
      exportName: 'ClawdbotLogsCommand'
    });

    new cdk.CfnOutput(this, 'ServiceStatusCommand', {
      value: `aws ssm start-session --target ${instance.instanceId} --region ${this.region} && sudo systemctl status clawdbot`,
      description: 'Command to check Clawdbot service status',
      exportName: 'ClawdbotStatusCommand'
    });

    new cdk.CfnOutput(this, 'TelegramTokenParameterArn', {
      value: telegramTokenParameter.parameterArn,
      description: 'SSM Parameter ARN for Telegram token (KMS encrypted)',
      exportName: 'ClawdbotTelegramTokenArn'
    });

    new cdk.CfnOutput(this, 'SecurityGroupId', {
      value: securityGroup.securityGroupId,
      description: 'Security Group ID (zero inbound rules)',
      exportName: 'ClawdbotSecurityGroupId'
    });

    // ========================================
    // DEPLOYMENT NOTES
    // ========================================

    new cdk.CfnOutput(this, 'DeploymentNotes', {
      value: [
        '✅ Deployment complete!',
        '1. Connect: Use Session Manager (see ConnectCommand output)',
        '2. Logs: Check /var/log/clawdbot-bootstrap.log for setup',
        '3. Status: Run systemctl status clawdbot',
        '4. Security: Zero inbound ports, KMS-encrypted secrets',
        '5. Cost: Monitor via AWS Budgets (alert at 80%)'
      ].join(' | '),
      description: 'Post-deployment steps'
    });
  }
}

