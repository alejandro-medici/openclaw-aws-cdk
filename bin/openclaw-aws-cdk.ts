#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { OpenClawStack } from '../lib/openclaw-stack';

const app = new cdk.App();

new OpenClawStack(app, 'OpenClawStack', {
  // Use default AWS account/region from credentials
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION
  },

  description: 'Production-ready OpenClaw deployment - Security-first & Well-Architected',

  tags: {
    Project: 'OpenClaw',
    Environment: 'Production',
    ManagedBy: 'CDK',
    CostCenter: 'AI-Assistant'
  }
});

app.synth();
