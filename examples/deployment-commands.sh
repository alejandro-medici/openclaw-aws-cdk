#!/bin/bash
# Moltbot AWS CDK - Common Deployment Commands
# Usage: ./deployment-commands.sh [command]

set -e

STACK_NAME="MoltbotStack"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

function print_usage() {
    echo "Moltbot AWS CDK - Deployment Commands"
    echo ""
    echo "Usage: ./deployment-commands.sh [command]"
    echo ""
    echo "Commands:"
    echo "  deploy-basic              Deploy with default settings"
    echo "  deploy-with-budget        Deploy with custom budget and email"
    echo "  deploy-team               Deploy for team use (t3.small + Guardrails)"
    echo "  deploy-cost-optimized     Deploy with cost optimizations"
    echo "  update-model              Update Bedrock model to Opus/Sonnet"
    echo "  check-status              Check deployment status"
    echo "  check-costs               Check current month costs"
    echo "  check-logs                Tail CloudWatch logs"
    echo "  connect                   Connect via Session Manager"
    echo "  restart-service           Restart Moltbot service"
    echo "  destroy                   Destroy stack (with confirmation)"
    echo "  help                      Show this help message"
    echo ""
}

function deploy_basic() {
    echo -e "${GREEN}Deploying Moltbot with default settings...${NC}"

    read -p "Enter Telegram Bot Token: " TOKEN

    npx cdk deploy \
        --parameters TelegramBotToken="$TOKEN" \
        --parameters BedrockModel=anthropic.claude-sonnet-4-5-v2

    echo -e "${GREEN}Deployment complete!${NC}"
    check_status
}

function deploy_with_budget() {
    echo -e "${GREEN}Deploying Moltbot with custom budget...${NC}"

    read -p "Enter Telegram Bot Token: " TOKEN
    read -p "Enter Monthly Budget (USD): " BUDGET
    read -p "Enter Alert Email: " EMAIL

    npx cdk deploy \
        --parameters TelegramBotToken="$TOKEN" \
        --parameters BedrockModel=anthropic.claude-sonnet-4-5-v2 \
        --parameters MonthlyBudget="$BUDGET" \
        --parameters BudgetAlertEmail="$EMAIL"

    echo -e "${GREEN}Deployment complete!${NC}"
    check_status
}

function deploy_team() {
    echo -e "${GREEN}Deploying Moltbot for team use...${NC}"

    read -p "Enter Telegram Bot Token: " TOKEN

    npx cdk deploy \
        --parameters TelegramBotToken="$TOKEN" \
        --parameters BedrockModel=anthropic.claude-sonnet-4-5-v2 \
        --parameters InstanceType=t3.small \
        --parameters MonthlyBudget=100 \
        --parameters EnableGuardrails=true

    echo -e "${GREEN}Deployment complete!${NC}"
    echo -e "${YELLOW}Team configuration includes:${NC}"
    echo "  - t3.small instance (1GB RAM → 2GB RAM)"
    echo "  - Bedrock Guardrails enabled"
    echo "  - \$100/month budget"
    check_status
}

function deploy_cost_optimized() {
    echo -e "${GREEN}Deploying cost-optimized Moltbot...${NC}"
    echo -e "${YELLOW}Note: This requires additional setup for Spot instances${NC}"

    read -p "Enter Telegram Bot Token: " TOKEN

    npx cdk deploy \
        --parameters TelegramBotToken="$TOKEN" \
        --parameters BedrockModel=anthropic.claude-sonnet-4-5-v2 \
        --parameters InstanceType=t3.micro \
        --parameters MonthlyBudget=30

    echo -e "${GREEN}Deployment complete!${NC}"
    echo -e "${YELLOW}For additional cost savings, consider:${NC}"
    echo "  - Spot instances (see examples/cost-optimization/)"
    echo "  - Scheduled shutdowns"
    echo "  - Response caching"
}

function update_model() {
    echo -e "${YELLOW}Available models:${NC}"
    echo "  1. Claude Sonnet 4.5 v2 (Recommended, balanced)"
    echo "  2. Claude Opus 4.5 v2 (Most capable, 5x cost)"
    echo "  3. Claude 3.5 Sonnet (Previous generation)"

    read -p "Select model (1-3): " CHOICE

    case $CHOICE in
        1)
            MODEL="anthropic.claude-sonnet-4-5-v2"
            ;;
        2)
            MODEL="anthropic.claude-opus-4-5-v2"
            echo -e "${YELLOW}Warning: Opus is 5x more expensive!${NC}"
            ;;
        3)
            MODEL="anthropic.claude-3-5-sonnet-20241022-v2:0"
            ;;
        *)
            echo -e "${RED}Invalid choice${NC}"
            exit 1
            ;;
    esac

    echo -e "${GREEN}Updating model to: $MODEL${NC}"

    aws ssm put-parameter \
        --name /moltbot/bedrock-model \
        --value "$MODEL" \
        --overwrite \
        --region us-east-1

    echo "Restarting Moltbot service..."
    restart_service

    echo -e "${GREEN}Model updated successfully!${NC}"
}

function check_status() {
    echo -e "${GREEN}Checking deployment status...${NC}"

    INSTANCE_ID=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --query 'Stacks[0].Outputs[?OutputKey==`InstanceId`].OutputValue' \
        --output text 2>/dev/null)

    if [ -z "$INSTANCE_ID" ]; then
        echo -e "${RED}Stack not deployed or not found${NC}"
        exit 1
    fi

    echo "Instance ID: $INSTANCE_ID"

    STATE=$(aws ec2 describe-instances \
        --instance-ids $INSTANCE_ID \
        --query 'Reservations[0].Instances[0].State.Name' \
        --output text)

    echo "Instance State: $STATE"

    if [ "$STATE" == "running" ]; then
        echo -e "${GREEN}✓ Instance is running${NC}"

        # Check SSM connectivity
        SSM_STATUS=$(aws ssm describe-instance-information \
            --filters "Key=InstanceIds,Values=$INSTANCE_ID" \
            --query 'InstanceInformationList[0].PingStatus' \
            --output text 2>/dev/null)

        echo "SSM Status: $SSM_STATUS"

        if [ "$SSM_STATUS" == "Online" ]; then
            echo -e "${GREEN}✓ Session Manager connected${NC}"
        else
            echo -e "${YELLOW}⚠ Session Manager not connected${NC}"
        fi
    else
        echo -e "${RED}✗ Instance not running${NC}"
    fi
}

function check_costs() {
    echo -e "${GREEN}Checking current month costs...${NC}"

    # Month-to-date total
    MTD_COST=$(aws ce get-cost-and-usage \
        --time-period Start=$(date +%Y-%m-01),End=$(date +%Y-%m-%d) \
        --granularity MONTHLY \
        --metrics BlendedCost \
        --filter file://<(echo '{"Tags":{"Key":"Application","Values":["Moltbot"]}}') \
        --query 'ResultsByTime[0].Total.BlendedCost.Amount' \
        --output text 2>/dev/null || echo "N/A")

    echo "Month-to-date: \$$MTD_COST"

    # By service
    echo ""
    echo "Cost by service:"
    aws ce get-cost-and-usage \
        --time-period Start=$(date +%Y-%m-01),End=$(date +%Y-%m-%d) \
        --granularity MONTHLY \
        --metrics BlendedCost \
        --group-by Type=SERVICE \
        --filter file://<(echo '{"Tags":{"Key":"Application","Values":["Moltbot"]}}') \
        --query 'ResultsByTime[0].Groups[].[Keys[0],Metrics.BlendedCost.Amount]' \
        --output table 2>/dev/null || echo "Unable to fetch detailed costs"
}

function check_logs() {
    echo -e "${GREEN}Tailing CloudWatch logs...${NC}"
    echo "Press Ctrl+C to exit"
    echo ""

    aws logs tail /moltbot/gateway --follow --region us-east-1
}

function connect() {
    echo -e "${GREEN}Connecting via Session Manager...${NC}"

    INSTANCE_ID=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --query 'Stacks[0].Outputs[?OutputKey==`InstanceId`].OutputValue' \
        --output text 2>/dev/null)

    if [ -z "$INSTANCE_ID" ]; then
        echo -e "${RED}Stack not deployed${NC}"
        exit 1
    fi

    echo "Connecting to instance: $INSTANCE_ID"
    aws ssm start-session --target $INSTANCE_ID --region us-east-1
}

function restart_service() {
    echo -e "${GREEN}Restarting Moltbot service...${NC}"

    INSTANCE_ID=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --query 'Stacks[0].Outputs[?OutputKey==`InstanceId`].OutputValue' \
        --output text 2>/dev/null)

    if [ -z "$INSTANCE_ID" ]; then
        echo -e "${RED}Stack not deployed${NC}"
        exit 1
    fi

    aws ssm send-command \
        --instance-ids $INSTANCE_ID \
        --document-name "AWS-RunShellScript" \
        --parameters 'commands=["sudo systemctl restart moltbot"]' \
        --region us-east-1 \
        --output text

    echo -e "${GREEN}Restart command sent!${NC}"
    echo "Wait 10 seconds, then check logs:"
    echo "  ./deployment-commands.sh check-logs"
}

function destroy() {
    echo -e "${RED}WARNING: This will destroy the entire Moltbot stack!${NC}"
    echo "This includes:"
    echo "  - EC2 instance"
    echo "  - EBS volumes"
    echo "  - CloudWatch logs"
    echo "  - SSM parameters (Telegram token)"
    echo ""
    read -p "Are you sure? (yes/no): " CONFIRM

    if [ "$CONFIRM" != "yes" ]; then
        echo "Cancelled"
        exit 0
    fi

    read -p "Type stack name to confirm ($STACK_NAME): " CONFIRM_NAME

    if [ "$CONFIRM_NAME" != "$STACK_NAME" ]; then
        echo "Stack name doesn't match. Cancelled."
        exit 0
    fi

    echo -e "${YELLOW}Destroying stack...${NC}"
    npx cdk destroy --force

    echo -e "${GREEN}Stack destroyed${NC}"
}

# Main command router
case "${1:-help}" in
    deploy-basic)
        deploy_basic
        ;;
    deploy-with-budget)
        deploy_with_budget
        ;;
    deploy-team)
        deploy_team
        ;;
    deploy-cost-optimized)
        deploy_cost_optimized
        ;;
    update-model)
        update_model
        ;;
    check-status)
        check_status
        ;;
    check-costs)
        check_costs
        ;;
    check-logs)
        check_logs
        ;;
    connect)
        connect
        ;;
    restart-service)
        restart_service
        ;;
    destroy)
        destroy
        ;;
    help)
        print_usage
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        echo ""
        print_usage
        exit 1
        ;;
esac
