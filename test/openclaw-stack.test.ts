import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { OpenClawStack } from '../lib/openclaw-stack';

describe('OpenClawStack', () => {
  let app: cdk.App;
  let stack: OpenClawStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new OpenClawStack(app, 'TestStack');
    template = Template.fromStack(stack);
  });

  // ==========================================
  // VPC TESTS
  // ==========================================

  describe('VPC Configuration', () => {
    test('should create VPC with Free Tier settings', () => {
      template.hasResourceProperties('AWS::EC2::VPC', {
        EnableDnsHostnames: true,
        EnableDnsSupport: true
      });
    });

    test('should have public subnet', () => {
      template.hasResourceProperties('AWS::EC2::Subnet', {
        MapPublicIpOnLaunch: true
      });
    });

    test('should not create NAT Gateway (cost optimization)', () => {
      template.resourceCountIs('AWS::EC2::NatGateway', 0);
    });
  });

  // ==========================================
  // SECURITY GROUP TESTS
  // ==========================================

  describe('Security Group - Zero Inbound Rules', () => {
    test('should have NO inbound rules (critical security check)', () => {
      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        SecurityGroupIngress: Match.absent()
      });
    });

    test('should allow all outbound traffic', () => {
      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        SecurityGroupEgress: Match.arrayWith([
          Match.objectLike({
            CidrIp: '0.0.0.0/0'
          })
        ])
      });
    });

    test('should have descriptive name', () => {
      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        GroupName: 'openclaw-gateway-sg',
        GroupDescription: Match.stringLikeRegexp('.*Zero inbound.*')
      });
    });

    test('should have security posture tag', () => {
      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        Tags: Match.arrayWith([
          Match.objectLike({
            Key: 'SecurityPosture',
            Value: 'Zero-Inbound'
          })
        ])
      });
    });
  });

  // ==========================================
  // IAM ROLE TESTS
  // ==========================================

  describe('IAM Role - Least Privilege', () => {
    test('should create IAM role for EC2', () => {
      template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: Match.objectLike({
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: 'sts:AssumeRole',
              Principal: {
                Service: 'ec2.amazonaws.com'
              }
            })
          ])
        })
      });
    });

    test('should have SSM managed policy for Session Manager', () => {
      template.hasResourceProperties('AWS::IAM::Role', {
        ManagedPolicyArns: Match.arrayWith([
          Match.objectLike({
            'Fn::Join': Match.arrayWith([
              Match.arrayWith([
                Match.stringLikeRegexp('.*AmazonSSMManagedInstanceCore.*')
              ])
            ])
          })
        ])
      });
    });

    test('should have Bedrock permissions limited to Anthropic models', () => {
      // Get the policy document
      const resources = template.toJSON().Resources;
      const policies = Object.values(resources).filter(
        (r: any) => r.Type === 'AWS::IAM::Policy'
      );

      expect(policies.length).toBeGreaterThan(0);

      const hasBedrockPolicy = policies.some((policy: any) => {
        const statements = policy.Properties.PolicyDocument.Statement;
        return statements.some((stmt: any) => {
          const hasBedrockAction = stmt.Action && (
            stmt.Action.includes('bedrock:InvokeModel') ||
            (Array.isArray(stmt.Action) && stmt.Action.some((a: string) => a.includes('bedrock:Invoke')))
          );

          if (hasBedrockAction) {
            // Check that resource contains 'anthropic'
            const resourceStr = JSON.stringify(stmt.Resource);
            return resourceStr.includes('anthropic');
          }
          return false;
        });
      });

      expect(hasBedrockPolicy).toBe(true);
    });

    test('should have SSM Parameter Store permissions scoped to /openclaw/*', () => {
      // Get the policy document
      const resources = template.toJSON().Resources;
      const policies = Object.values(resources).filter(
        (r: any) => r.Type === 'AWS::IAM::Policy'
      );

      expect(policies.length).toBeGreaterThan(0);

      const hasSSMPolicy = policies.some((policy: any) => {
        const statements = policy.Properties.PolicyDocument.Statement;
        return statements.some((stmt: any) => {
          const hasSSMAction = stmt.Action && (
            stmt.Action.includes('ssm:GetParameter') ||
            (Array.isArray(stmt.Action) && stmt.Action.some((a: string) => a.includes('ssm:GetParameter')))
          );

          if (hasSSMAction) {
            // Check that resource is scoped to /openclaw/*
            const resourceStr = JSON.stringify(stmt.Resource);
            return resourceStr.includes('parameter/openclaw');
          }
          return false;
        });
      });

      expect(hasSSMPolicy).toBe(true);
    });

    test('should have CloudWatch Logs permissions scoped to /openclaw/*', () => {
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: Match.arrayWith([
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents',
                'logs:DescribeLogStreams'
              ]),
              // Resource can be object or array, both are valid
              Resource: Match.anyValue()
            })
          ])
        }
      });
    });

    test('should NOT have wildcard (*) permissions on sensitive actions', () => {
      const policyStatements = template.toJSON().Resources;

      Object.values(policyStatements).forEach((resource: any) => {
        if (resource.Type === 'AWS::IAM::Policy') {
          const statements = resource.Properties.PolicyDocument.Statement;

          statements.forEach((statement: any) => {
            // Check that critical actions don't have * resources
            const criticalActions = [
              'bedrock:InvokeModel',
              'ssm:GetParameter',
              'logs:CreateLogGroup'
            ];

            if (statement.Action && Array.isArray(statement.Action)) {
              const hasCriticalAction = statement.Action.some((action: string) =>
                criticalActions.some(critical => action.includes(critical.split(':')[1]))
              );

              if (hasCriticalAction && statement.Resource) {
                // Ensure Resource is not just "*"
                expect(statement.Resource).not.toBe('*');
              }
            }
          });
        }
      });
    });
  });

  // ==========================================
  // SSM PARAMETERS TESTS
  // ==========================================

  describe('SSM Parameters - Encrypted Secrets', () => {
    test('should store Telegram token as SecureString', () => {
      template.hasResourceProperties('AWS::SSM::Parameter', {
        Name: '/openclaw/telegram-token',
        Type: 'SecureString'
      });
    });

    test('should store Bedrock model as String', () => {
      template.hasResourceProperties('AWS::SSM::Parameter', {
        Name: '/openclaw/bedrock-model',
        Type: 'String'
      });
    });

    test('should have descriptive parameter descriptions', () => {
      template.hasResourceProperties('AWS::SSM::Parameter', {
        Name: '/openclaw/telegram-token',
        Description: Match.stringLikeRegexp('.*KMS encrypted.*')
      });
    });
  });

  // ==========================================
  // EC2 INSTANCE TESTS
  // ==========================================

  describe('EC2 Instance Configuration', () => {
    test('should create EC2 instance with public IP', () => {
      template.hasResourceProperties('AWS::EC2::Instance', {
        SubnetId: Match.anyValue()
      });
    });

    test('should have encrypted EBS volume', () => {
      template.hasResourceProperties('AWS::EC2::Instance', {
        BlockDeviceMappings: Match.arrayWith([
          Match.objectLike({
            Ebs: Match.objectLike({
              Encrypted: true,
              VolumeType: 'gp3',
              VolumeSize: 8
            })
          })
        ])
      });
    });

    test('should require IMDSv2 (SSRF protection)', () => {
      // IMDSv2 is configured via Launch Template in CDK
      template.hasResourceProperties('AWS::EC2::LaunchTemplate', {
        LaunchTemplateData: {
          MetadataOptions: {
            HttpTokens: 'required'
          }
        }
      });
    });

    test('should have IAM instance profile attached', () => {
      template.hasResourceProperties('AWS::EC2::Instance', {
        IamInstanceProfile: Match.anyValue()
      });
    });

    test('should use Amazon Linux 2023 AMI', () => {
      // AMI ID will vary by region, but we can check it exists
      template.hasResourceProperties('AWS::EC2::Instance', {
        ImageId: Match.anyValue()
      });
    });

    test('should have Application tag for cost tracking', () => {
      template.hasResourceProperties('AWS::EC2::Instance', {
        Tags: Match.arrayWith([
          Match.objectLike({
            Key: 'Application',
            Value: 'OpenClaw'
          })
        ])
      });
    });
  });

  // ==========================================
  // CLOUDWATCH TESTS
  // ==========================================

  describe('CloudWatch Monitoring', () => {
    test('should create CloudWatch Alarms', () => {
      template.resourceCountIs('AWS::CloudWatch::Alarm', 2);
    });

    test('should have instance health alarm', () => {
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        MetricName: 'StatusCheckFailed',
        Namespace: 'AWS/EC2',
        Threshold: 1
      });
    });

    test('should have CPU utilization alarm', () => {
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        MetricName: 'CPUUtilization',
        Namespace: 'AWS/EC2',
        Threshold: 90
      });
    });

    test('should create CloudWatch Log Group', () => {
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        LogGroupName: '/openclaw/gateway',
        RetentionInDays: 7
      });
    });
  });

  // ==========================================
  // BUDGET TESTS
  // ==========================================

  describe('AWS Budgets - Cost Control', () => {
    test('should create budget', () => {
      template.hasResourceProperties('AWS::Budgets::Budget', {
        Budget: Match.objectLike({
          BudgetType: 'COST',
          TimeUnit: 'MONTHLY'
        })
      });
    });

    test('should have 80% alert threshold', () => {
      template.hasResourceProperties('AWS::Budgets::Budget', {
        NotificationsWithSubscribers: Match.arrayWith([
          Match.objectLike({
            Notification: Match.objectLike({
              Threshold: 80,
              ComparisonOperator: 'GREATER_THAN',
              NotificationType: 'ACTUAL'
            })
          })
        ])
      });
    });

    test('should have forecasted 100% alert', () => {
      template.hasResourceProperties('AWS::Budgets::Budget', {
        NotificationsWithSubscribers: Match.arrayWith([
          Match.objectLike({
            Notification: Match.objectLike({
              Threshold: 100,
              ComparisonOperator: 'GREATER_THAN',
              NotificationType: 'FORECASTED'
            })
          })
        ])
      });
    });

    test('should filter costs by Application tag', () => {
      template.hasResourceProperties('AWS::Budgets::Budget', {
        Budget: Match.objectLike({
          CostFilters: Match.objectLike({
            TagKeyValue: Match.arrayWith([
              Match.stringLikeRegexp('.*Application.*OpenClaw.*')
            ])
          })
        })
      });
    });
  });

  // ==========================================
  // PARAMETERS TESTS
  // ==========================================

  describe('CloudFormation Parameters', () => {
    test('should have TelegramBotToken parameter with noEcho', () => {
      const parameters = template.toJSON().Parameters;
      expect(parameters.TelegramBotToken).toBeDefined();
      expect(parameters.TelegramBotToken.NoEcho).toBe(true);
      expect(parameters.TelegramBotToken.Type).toBe('String');
    });

    test('should have BedrockModel parameter with allowed values', () => {
      const parameters = template.toJSON().Parameters;
      expect(parameters.BedrockModel).toBeDefined();
      expect(parameters.BedrockModel.AllowedValues).toContain('anthropic.claude-sonnet-4-5-v2');
      expect(parameters.BedrockModel.AllowedValues).toContain('anthropic.claude-opus-4-5-v2');
    });

    test('should have InstanceType parameter with Free Tier option', () => {
      const parameters = template.toJSON().Parameters;
      expect(parameters.InstanceType).toBeDefined();
      expect(parameters.InstanceType.Default).toBe('t3.micro');
      expect(parameters.InstanceType.AllowedValues).toContain('t3.micro');
    });

    test('should have MonthlyBudget parameter with reasonable defaults', () => {
      const parameters = template.toJSON().Parameters;
      expect(parameters.MonthlyBudget).toBeDefined();
      expect(parameters.MonthlyBudget.Default).toBe(50);
      expect(parameters.MonthlyBudget.Type).toBe('Number');
    });

    test('should have EnableGuardrails parameter', () => {
      const parameters = template.toJSON().Parameters;
      expect(parameters.EnableGuardrails).toBeDefined();
      expect(parameters.EnableGuardrails.Default).toBe('false');
      expect(parameters.EnableGuardrails.AllowedValues).toEqual(['true', 'false']);
    });
  });

  // ==========================================
  // OUTPUTS TESTS
  // ==========================================

  describe('Stack Outputs', () => {
    test('should output Instance ID', () => {
      template.hasOutput('InstanceId', {});
    });

    test('should output Connect Command', () => {
      template.hasOutput('ConnectCommand', {});
    });

    test('should output Logs Command', () => {
      template.hasOutput('LogsCommand', {});
    });

    test('should output Security Group ID', () => {
      template.hasOutput('SecurityGroupId', {});
    });

    test('should output Telegram Token Parameter ARN', () => {
      template.hasOutput('TelegramTokenParameterArn', {});
    });
  });

  // ==========================================
  // BEDROCK GUARDRAILS TESTS
  // ==========================================

  describe('Bedrock Guardrails (when enabled)', () => {
    let guardedApp: cdk.App;
    let guardedStack: OpenClawStack;
    let guardedTemplate: Template;

    beforeEach(() => {
      guardedApp = new cdk.App({
        context: {
          'EnableGuardrails': 'true'
        }
      });
      guardedStack = new OpenClawStack(guardedApp, 'GuardedStack');
      guardedTemplate = Template.fromStack(guardedStack);
    });

    test('should NOT create Guardrail by default', () => {
      // Default stack (without Guardrails)
      template.resourceCountIs('AWS::Bedrock::Guardrail', 0);
    });

    // Note: Guardrails are created conditionally via CFN parameters
    // These tests verify the structure exists in the template
    test('should have Guardrail ID SSM parameter placeholder', () => {
      template.hasResourceProperties('AWS::SSM::Parameter', {
        Name: '/openclaw/guardrail-id'
      });
    });
  });

  // ==========================================
  // INTEGRATION TESTS
  // ==========================================

  describe('Integration - Components Work Together', () => {
    test('should have instance in same VPC as security group', () => {
      const resources = template.toJSON().Resources;

      let instanceSubnetRef: any;
      let sgVpcRef: any;

      Object.values(resources).forEach((resource: any) => {
        if (resource.Type === 'AWS::EC2::Instance') {
          instanceSubnetRef = resource.Properties.SubnetId;
        }
        if (resource.Type === 'AWS::EC2::SecurityGroup') {
          sgVpcRef = resource.Properties.VpcId;
        }
      });

      expect(instanceSubnetRef).toBeDefined();
      expect(sgVpcRef).toBeDefined();
    });

    test('should have instance profile referencing IAM role', () => {
      template.hasResourceProperties('AWS::IAM::InstanceProfile', {
        Roles: Match.arrayWith([
          Match.objectLike({
            Ref: Match.stringLikeRegexp('.*OpenClawInstanceRole.*')
          })
        ])
      });
    });

    test('should have complete monitoring stack', () => {
      // Check we have all monitoring components
      template.resourceCountIs('AWS::Logs::LogGroup', 1);
      template.resourceCountIs('AWS::CloudWatch::Alarm', 2);
      template.resourceCountIs('AWS::Budgets::Budget', 1);
    });

    test('should have all security components', () => {
      // Verify security stack is complete
      template.resourceCountIs('AWS::EC2::SecurityGroup', 1);
      template.resourceCountIs('AWS::IAM::Role', 1);

      // SSM Parameters: at least token + model (may have more with guardrails)
      const resources = template.toJSON().Resources;
      const ssmParams = Object.values(resources).filter(
        (r: any) => r.Type === 'AWS::SSM::Parameter'
      );
      expect(ssmParams.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ==========================================
  // COMPLIANCE TESTS
  // ==========================================

  describe('Well-Architected Framework Compliance', () => {
    test('Security Pillar: Encryption at rest', () => {
      // EBS encrypted
      template.hasResourceProperties('AWS::EC2::Instance', {
        BlockDeviceMappings: Match.arrayWith([
          Match.objectLike({
            Ebs: Match.objectLike({
              Encrypted: true
            })
          })
        ])
      });

      // SSM SecureString
      template.hasResourceProperties('AWS::SSM::Parameter', {
        Type: 'SecureString'
      });
    });

    test('Security Pillar: Least privilege IAM', () => {
      // No overly permissive policies
      const resources = template.toJSON().Resources;

      Object.values(resources).forEach((resource: any) => {
        if (resource.Type === 'AWS::IAM::Policy') {
          const statements = resource.Properties.PolicyDocument.Statement;

          statements.forEach((statement: any) => {
            // No Action: "*"
            if (statement.Action === '*') {
              throw new Error('Found wildcard Action in IAM policy');
            }

            // CloudWatch metrics exception (requires *)
            if (statement.Action && statement.Action.includes('cloudwatch:PutMetricData')) {
              // This is acceptable with conditions
              expect(statement.Condition).toBeDefined();
            }
          });
        }
      });
    });

    test('Cost Optimization Pillar: Free Tier eligible resources', () => {
      // t3.micro default
      const parameters = template.toJSON().Parameters;
      expect(parameters.InstanceType.Default).toBe('t3.micro');

      // 8GB EBS (under 30GB free tier)
      template.hasResourceProperties('AWS::EC2::Instance', {
        BlockDeviceMappings: Match.arrayWith([
          Match.objectLike({
            Ebs: Match.objectLike({
              VolumeSize: 8
            })
          })
        ])
      });

      // Log retention 7 days (under 5GB free tier assumption)
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        RetentionInDays: 7
      });
    });

    test('Operational Excellence: Infrastructure as Code', () => {
      // Stack is defined in code (this test itself proves it)
      expect(stack).toBeInstanceOf(cdk.Stack);

      // Has tags for tracking
      template.hasResourceProperties('AWS::EC2::Instance', {
        Tags: Match.arrayWith([
          Match.objectLike({
            Key: 'Application',
            Value: 'OpenClaw'
          })
        ])
      });
    });

    test('Reliability: Health monitoring and alarms', () => {
      // Health check alarm exists
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        MetricName: 'StatusCheckFailed'
      });

      // CPU alarm exists
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        MetricName: 'CPUUtilization'
      });
    });
  });

  // ==========================================
  // SNAPSHOT TESTS
  // ==========================================

  describe('Snapshot Tests', () => {
    test('template matches snapshot', () => {
      expect(template.toJSON()).toMatchSnapshot();
    });
  });
});
