#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ClawdbotStack } from '../lib/clawdbot-stack';

const app = new cdk.App();

new ClawdbotStack(app, 'ClawdbotStack', {
  // Use default AWS account/region from credentials
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION
  },

  description: 'Production-ready Clawdbot deployment - Security-first & Well-Architected',

  tags: {
    Project: 'Clawdbot',
    Environment: 'Production',
    ManagedBy: 'CDK',
    CostCenter: 'AI-Assistant'
  }
});

app.synth();
