import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

/**
 * Cost Optimization: Scheduled Instance Shutdown
 *
 * Savings: 50-67% on EC2 costs depending on schedule
 * Downtime: Bot unavailable during shutdown hours
 *
 * Example schedule:
 *   Weekdays: Shutdown 10 PM, Start 8 AM (10 hours/day off = 300 hours/month)
 *   Weekends: Shutdown Friday 6 PM, Start Monday 8 AM (48 hours × 4 = 192 hours/month)
 *   Total savings: 492 hours/month = 67% reduction
 *
 * Cost calculation:
 *   Normal: 730 hours × $0.0104 = $7.59/month
 *   Scheduled: 238 hours × $0.0104 = $2.48/month
 *   Savings: $5.11/month
 */

export class MoltbotScheduledShutdownStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Parameters for schedule configuration
    const shutdownHour = new cdk.CfnParameter(this, 'ShutdownHour', {
      type: 'Number',
      default: 22, // 10 PM
      minValue: 0,
      maxValue: 23,
      description: 'Hour (24h format) to shut down instance (0-23, e.g., 22 = 10 PM)'
    });

    const startupHour = new cdk.CfnParameter(this, 'StartupHour', {
      type: 'Number',
      default: 8, // 8 AM
      minValue: 0,
      maxValue: 23,
      description: 'Hour (24h format) to start instance (0-23, e.g., 8 = 8 AM)'
    });

    const shutdownWeekends = new cdk.CfnParameter(this, 'ShutdownWeekends', {
      type: 'String',
      default: 'false',
      allowedValues: ['true', 'false'],
      description: 'Shutdown on weekends (Friday 6 PM - Monday 8 AM)'
    });

    // Assume instance ID is passed or obtained from main stack
    const instanceId = new cdk.CfnParameter(this, 'InstanceId', {
      type: 'String',
      description: 'EC2 Instance ID to schedule (from main stack output)'
    });

    // Lambda function to control instance power
    const powerControlFunction = new lambda.Function(this, 'PowerControlFunction', {
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
import boto3
import os

ec2 = boto3.client('ec2')

def handler(event, context):
    instance_id = os.environ['INSTANCE_ID']
    action = event.get('action', 'unknown')

    print(f"PowerControl: {action} for instance {instance_id}")

    try:
        if action == 'stop':
            response = ec2.stop_instances(InstanceIds=[instance_id])
            print(f"Instance stop initiated: {response}")
            return {
                'statusCode': 200,
                'body': f'Instance {instance_id} stopped'
            }
        elif action == 'start':
            response = ec2.start_instances(InstanceIds=[instance_id])
            print(f"Instance start initiated: {response}")
            return {
                'statusCode': 200,
                'body': f'Instance {instance_id} started'
            }
        else:
            print(f"Unknown action: {action}")
            return {
                'statusCode': 400,
                'body': f'Unknown action: {action}'
            }
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'body': f'Error: {str(e)}'
        }
      `),
      environment: {
        INSTANCE_ID: instanceId.valueAsString
      },
      timeout: cdk.Duration.seconds(30)
    });

    // Grant permissions to control EC2 instance
    powerControlFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'ec2:StartInstances',
        'ec2:StopInstances',
        'ec2:DescribeInstances',
        'ec2:DescribeInstanceStatus'
      ],
      resources: [`arn:aws:ec2:${this.region}:${this.account}:instance/${instanceId.valueAsString}`]
    }));

    // EventBridge rule: Nightly shutdown
    const shutdownRule = new events.Rule(this, 'NightlyShutdownRule', {
      schedule: events.Schedule.cron({
        hour: shutdownHour.valueAsString,
        minute: '0',
        weekDay: shutdownWeekends.valueAsString === 'true' ? 'MON-FRI' : '*'
      }),
      description: `Stop Moltbot instance nightly at ${shutdownHour.valueAsString}:00`,
      ruleName: 'moltbot-nightly-shutdown'
    });

    shutdownRule.addTarget(new targets.LambdaFunction(powerControlFunction, {
      event: events.RuleTargetInput.fromObject({ action: 'stop' })
    }));

    // EventBridge rule: Morning startup
    const startupRule = new events.Rule(this, 'MorningStartupRule', {
      schedule: events.Schedule.cron({
        hour: startupHour.valueAsString,
        minute: '0',
        weekDay: shutdownWeekends.valueAsString === 'true' ? 'MON-FRI' : '*'
      }),
      description: `Start Moltbot instance daily at ${startupHour.valueAsString}:00`,
      ruleName: 'moltbot-morning-startup'
    });

    startupRule.addTarget(new targets.LambdaFunction(powerControlFunction, {
      event: events.RuleTargetInput.fromObject({ action: 'start' })
    }));

    // Optional: Weekend shutdown (Friday evening)
    if (shutdownWeekends.valueAsString === 'true') {
      const weekendShutdownRule = new events.Rule(this, 'WeekendShutdownRule', {
        schedule: events.Schedule.cron({
          hour: '18', // 6 PM
          minute: '0',
          weekDay: 'FRI'
        }),
        description: 'Stop Moltbot instance for weekend',
        ruleName: 'moltbot-weekend-shutdown'
      });

      weekendShutdownRule.addTarget(new targets.LambdaFunction(powerControlFunction, {
        event: events.RuleTargetInput.fromObject({ action: 'stop' })
      }));

      const mondayStartupRule = new events.Rule(this, 'MondayStartupRule', {
        schedule: events.Schedule.cron({
          hour: '8', // 8 AM
          minute: '0',
          weekDay: 'MON'
        }),
        description: 'Start Moltbot instance on Monday morning',
        ruleName: 'moltbot-monday-startup'
      });

      mondayStartupRule.addTarget(new targets.LambdaFunction(powerControlFunction, {
        event: events.RuleTargetInput.fromObject({ action: 'start' })
      }));
    }

    // Outputs
    new cdk.CfnOutput(this, 'ScheduledShutdownEnabled', {
      value: 'true',
      description: 'Instance will shutdown nightly to save costs'
    });

    new cdk.CfnOutput(this, 'ShutdownSchedule', {
      value: `Shutdown: ${shutdownHour.valueAsString}:00, Startup: ${startupHour.valueAsString}:00`,
      description: 'Daily shutdown schedule (local timezone)'
    });

    const hoursPerDay = 24 - (parseInt(startupHour.valueAsString) - parseInt(shutdownHour.valueAsString));
    const monthlyCost = hoursPerDay * 30 * 0.0104;
    new cdk.CfnOutput(this, 'EstimatedMonthlyCost', {
      value: `$${monthlyCost.toFixed(2)}/month (EC2)`,
      description: 'Estimated EC2 cost with scheduling (Year 2+)'
    });

    new cdk.CfnOutput(this, 'PowerControlFunctionArn', {
      value: powerControlFunction.functionArn,
      description: 'Lambda function ARN for manual control'
    });
  }
}

/**
 * DEPLOYMENT INSTRUCTIONS
 *
 * 1. Deploy main Moltbot stack first:
 *    npx cdk deploy MoltbotStack
 *
 * 2. Get instance ID from outputs:
 *    INSTANCE_ID=$(aws cloudformation describe-stacks \
 *      --stack-name MoltbotStack \
 *      --query 'Stacks[0].Outputs[?OutputKey==`InstanceId`].OutputValue' \
 *      --output text)
 *
 * 3. Deploy this scheduling stack:
 *    npx cdk deploy MoltbotScheduledShutdownStack \
 *      --parameters InstanceId=$INSTANCE_ID \
 *      --parameters ShutdownHour=22 \
 *      --parameters StartupHour=8 \
 *      --parameters ShutdownWeekends=false
 *
 * 4. Test manual control:
 *    # Stop instance
 *    aws lambda invoke --function-name PowerControlFunction \
 *      --payload '{"action":"stop"}' response.json
 *
 *    # Start instance
 *    aws lambda invoke --function-name PowerControlFunction \
 *      --payload '{"action":"start"}' response.json
 */

/**
 * COST CALCULATIONS
 *
 * Scenario 1: Nights only (10 PM - 8 AM = 10 hours off)
 *   Hours/month: 730 - (10 × 30) = 430 hours
 *   Cost: 430 × $0.0104 = $4.47/month
 *   Savings: $3.12/month (41%)
 *
 * Scenario 2: Nights + Weekends
 *   Weekday nights: 10 × 22 days = 220 hours
 *   Weekends: 48 × 4 = 192 hours
 *   Total off: 412 hours
 *   Hours/month: 730 - 412 = 318 hours
 *   Cost: 318 × $0.0104 = $3.31/month
 *   Savings: $4.28/month (56%)
 *
 * Scenario 3: Business hours only (9 AM - 6 PM weekdays)
 *   Hours/month: 9 hours × 22 days = 198 hours
 *   Cost: 198 × $0.0104 = $2.06/month
 *   Savings: $5.53/month (73%)
 */

/**
 * TROUBLESHOOTING
 *
 * Check schedule:
 *   aws events list-rules --name-prefix moltbot
 *
 * View Lambda logs:
 *   aws logs tail /aws/lambda/PowerControlFunction --follow
 *
 * Test Lambda manually:
 *   aws lambda invoke \
 *     --function-name PowerControlFunction \
 *     --payload '{"action":"start"}' \
 *     response.json
 *
 * Disable schedule temporarily:
 *   aws events disable-rule --name moltbot-nightly-shutdown
 *   aws events disable-rule --name moltbot-morning-startup
 */
