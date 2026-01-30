import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { OpenClawStack } from '../../lib/openclaw-stack';

/**
 * Cost Optimization: Spot Instance Implementation
 *
 * Savings: ~70% on EC2 costs ($7.59 → $2.28/month)
 * Risk: Instance may be stopped if spot price exceeds max (rare for t3.micro)
 *
 * Usage:
 *   npx cdk deploy --parameters TelegramBotToken=YOUR_TOKEN --parameters UseSpotInstances=true
 */

export class OpenClawSpotStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Add parameter for toggling spot instances
    const useSpot = new cdk.CfnParameter(this, 'UseSpotInstances', {
      type: 'String',
      default: 'false',
      allowedValues: ['true', 'false'],
      description: 'Use EC2 Spot Instances for cost savings (70% cheaper, may be interrupted)'
    });

    const spotMaxPrice = new cdk.CfnParameter(this, 'SpotMaxPrice', {
      type: 'Number',
      default: 0.005, // 50% of On-Demand price
      description: 'Maximum price for Spot Instance (USD/hour, default: $0.005 = 50% of On-Demand)'
    });

    // ... rest of stack from openclaw-stack.ts ...

    // When creating EC2 instance, add spot configuration:
    /*
    const instance = new ec2.Instance(this, 'OpenClawInstance', {
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC
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
          encrypted: true,
          deleteOnTermination: true
        })
      }],
      requireImdsv2: true,
      instanceName: 'openclaw-gateway',

      // SPOT INSTANCE CONFIGURATION
      spotOptions: useSpot.valueAsString === 'true' ? {
        requestType: ec2.SpotRequestType.PERSISTENT,
        interruptionBehavior: ec2.SpotInstanceInterruption.STOP,  // Stop, don't terminate
        maxPrice: spotMaxPrice.valueAsNumber
      } : undefined
    });
    */

    // Add output showing spot configuration
    new cdk.CfnOutput(this, 'SpotInstanceEnabled', {
      value: useSpot.valueAsString,
      description: 'Whether Spot Instances are enabled (true = 70% savings)'
    });

    new cdk.CfnOutput(this, 'EstimatedMonthlyCost', {
      value: useSpot.valueAsString === 'true' ? '$2.28/month (EC2)' : '$7.59/month (EC2)',
      description: 'Estimated EC2 cost (Year 2+)'
    });
  }
}

/**
 * SPOT INSTANCE BEST PRACTICES
 *
 * 1. Set max price to 50-70% of On-Demand
 *    - t3.micro On-Demand: $0.0104/hour
 *    - Recommended max: $0.005-$0.007/hour
 *
 * 2. Use STOP (not TERMINATE) interruption behavior
 *    - Preserves EBS volume
 *    - Restarts when capacity available
 *
 * 3. Configure CloudWatch alarm for interruptions
 *    - Monitor spot termination notices
 *    - Alert if instance stopped unexpectedly
 *
 * 4. Test interruption handling
 *    - Simulate interruption
 *    - Verify service restarts correctly
 *
 * 5. Not recommended for production
 *    - Use for dev/test environments
 *    - Personal use acceptable
 *    - Small team = use On-Demand
 */

/**
 * MONITORING SPOT INTERRUPTIONS
 *
 * Check interruption history:
 *   aws ec2 describe-spot-instance-requests \
 *     --filters "Name=state,Values=closed" \
 *     --query 'SpotInstanceRequests[*].{ID:SpotInstanceRequestId,Status:Status}'
 *
 * View interruption notices:
 *   aws logs tail /openclaw/gateway --filter "spot-interruption" --follow
 *
 * Calculate savings:
 *   Normal: 730 hours × $0.0104 = $7.59/month
 *   Spot:   730 hours × $0.0031 (avg) = $2.26/month
 *   Savings: $5.33/month (70%)
 */
