# Conductor MCP Server Examples

## Example 1: Local Development Setup

If you're running Conductor locally (e.g., using Docker):

```json
{
  "mcpServers": {
    "conductor": {
      "command": "conductor-mcp",
      "env": {
        "CONDUCTOR_SERVER_URL": "http://localhost:8080",
        "CONDUCTOR_API_PATH": "/api"
      }
    }
  }
}
```

## Example 2: Remote Conductor Server

For a production Conductor instance:

```json
{
  "mcpServers": {
    "conductor": {
      "command": "conductor-mcp",
      "env": {
        "CONDUCTOR_SERVER_URL": "https://conductor.production.example.com",
        "CONDUCTOR_API_PATH": "/api"
      }
    }
  }
}
```

## Example 3: Custom API Path

If your Conductor server uses a different API path:

```json
{
  "mcpServers": {
    "conductor": {
      "command": "conductor-mcp",
      "env": {
        "CONDUCTOR_SERVER_URL": "http://conductor.internal",
        "CONDUCTOR_API_PATH": "/conductor/api"
      }
    }
  }
}
```

## Example 4: Using npx (without global install)

```json
{
  "mcpServers": {
    "conductor": {
      "command": "npx",
      "args": ["conductor-mcp"],
      "env": {
        "CONDUCTOR_SERVER_URL": "http://localhost:8080",
        "CONDUCTOR_API_PATH": "/api"
      }
    }
  }
}
```

## Example Workflow Definition

Here's a sample workflow definition you can create using the MCP server:

```json
{
  "name": "sample_workflow",
  "description": "A sample workflow to demonstrate Conductor",
  "version": 1,
  "tasks": [
    {
      "name": "task_1",
      "taskReferenceName": "task_1_ref",
      "type": "SIMPLE",
      "inputParameters": {
        "input1": "${workflow.input.param1}"
      }
    },
    {
      "name": "task_2",
      "taskReferenceName": "task_2_ref",
      "type": "SIMPLE",
      "inputParameters": {
        "input2": "${task_1_ref.output.result}"
      }
    }
  ],
  "inputParameters": ["param1"],
  "outputParameters": {
    "finalResult": "${task_2_ref.output.result}"
  },
  "schemaVersion": 2,
  "restartable": true,
  "ownerEmail": "dev@example.com"
}
```

## Example Task Definition

Here's a sample task definition:

```json
{
  "name": "sample_task",
  "description": "A sample task",
  "retryCount": 3,
  "timeoutSeconds": 300,
  "inputKeys": ["input1", "input2"],
  "outputKeys": ["result"],
  "timeoutPolicy": "TIME_OUT_WF",
  "retryLogic": "FIXED",
  "retryDelaySeconds": 60,
  "responseTimeoutSeconds": 180,
  "concurrentExecLimit": 100,
  "rateLimitPerFrequency": 50,
  "rateLimitFrequencyInSeconds": 60,
  "ownerEmail": "dev@example.com"
}
```

## Common Claude Interactions

Once configured, you can interact with Claude like this:

### Checking Workflow Status
```
"What's the status of workflow abc-123-xyz?"
```

### Starting a Workflow
```
"Start the order_processing workflow with these parameters:
- orderId: 12345
- customerId: C789
- amount: 150.00"
```

### Troubleshooting
```
"Show me all failed workflows in the last 24 hours and help me understand why they failed"
```

### Creating Workflows
```
"Create a new workflow definition called 'user_onboarding' that:
1. Sends a welcome email
2. Creates a user account
3. Assigns default permissions
4. Sends a confirmation"
```

### Searching
```
"Find all workflows of type 'payment_processing' that completed successfully today"
```
