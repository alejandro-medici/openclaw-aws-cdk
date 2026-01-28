#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { MoltbotStack } from '../lib/moltbot-stack';

const app = new cdk.App();

new MoltbotStack(app, 'MoltbotStack', {
  // Use default AWS account/region from credentials
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION
  },

  description: 'Production-ready Moltbot deployment - Security-first & Well-Architected',

  tags: {
    Project: 'Moltbot',
    Environment: 'Production',
    ManagedBy: 'CDK',
    CostCenter: 'AI-Assistant'
  }
});

app.synth();
