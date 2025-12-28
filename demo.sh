#!/bin/bash

# Demo script for conductor-mcp
# This demonstrates the MCP server capabilities by interacting with Conductor

set -e

CONDUCTOR_URL="http://localhost:8080/api"

echo "========================================="
echo "Conductor MCP Server Demo"
echo "========================================="
echo ""

# Check if Conductor is running
echo "1. Checking Conductor health..."
if curl -s -f "${CONDUCTOR_URL%/api}/health" > /dev/null; then
    echo "✓ Conductor is running"
else
    echo "✗ Conductor is not running. Please start it first."
    exit 1
fi
echo ""

# Register task definitions
echo "2. Registering demo task definitions..."
curl -s -X POST "${CONDUCTOR_URL}/metadata/taskdefs" \
    -H "Content-Type: application/json" \
    -d '[
        {
            "name": "demo_task_1",
            "description": "Demo task 1",
            "retryCount": 3,
            "timeoutSeconds": 300,
            "inputKeys": ["input_value"],
            "outputKeys": ["result"],
            "timeoutPolicy": "TIME_OUT_WF",
            "retryLogic": "FIXED",
            "retryDelaySeconds": 60,
            "responseTimeoutSeconds": 180,
            "ownerEmail": "test@example.com"
        },
        {
            "name": "demo_task_2",
            "description": "Demo task 2",
            "retryCount": 3,
            "timeoutSeconds": 300,
            "inputKeys": ["previous_output"],
            "outputKeys": ["final_result"],
            "timeoutPolicy": "TIME_OUT_WF",
            "retryLogic": "FIXED",
            "retryDelaySeconds": 60,
            "responseTimeoutSeconds": 180,
            "ownerEmail": "test@example.com"
        }
    ]' > /dev/null
echo "✓ Task definitions registered"
echo ""

# Register workflow definition
echo "3. Registering demo workflow definition..."
curl -s -X POST "${CONDUCTOR_URL}/metadata/workflow" \
    -H "Content-Type: application/json" \
    -d @demo-workflow.json > /dev/null
echo "✓ Workflow definition registered"
echo ""

# List all workflows
echo "4. Listing all workflow definitions..."
curl -s "${CONDUCTOR_URL}/metadata/workflow" | jq -r '.[].name' | head -5
echo ""

# Start a workflow
echo "5. Starting demo workflow..."
WORKFLOW_ID=$(curl -s -X POST "${CONDUCTOR_URL}/workflow" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "demo_workflow",
        "version": 1,
        "input": {
            "value": "Hello from conductor-mcp!"
        }
    }' | tr -d '"')
echo "✓ Workflow started with ID: ${WORKFLOW_ID}"
echo ""

# Get workflow status
echo "6. Getting workflow status..."
curl -s "${CONDUCTOR_URL}/workflow/${WORKFLOW_ID}?includeTasks=true" | \
    jq '{workflowId, status, tasks: [.tasks[] | {name, status, taskType}]}'
echo ""

echo "========================================="
echo "Demo Complete!"
echo "========================================="
echo ""
echo "The MCP server can now be used to:"
echo "  - List workflows: list_workflow_definitions"
echo "  - Get workflow status: get_workflow_status"
echo "  - Start workflows: start_workflow"
echo "  - Manage executions: pause, resume, terminate, retry"
echo "  - Search workflows: search_workflows"
echo "  - And much more!"
echo ""
echo "Try it with Claude Desktop or any MCP client!"

