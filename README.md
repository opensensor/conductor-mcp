# conductor-mcp

MCP server for Netflix Conductor Workflow Engine - enables AI assistants to interact with Conductor workflows for troubleshooting, creation, and management.

## Overview

This Model Context Protocol (MCP) server provides a comprehensive interface to Netflix Conductor, allowing AI assistants like Claude to help developers:

- **Troubleshoot workflows**: Get detailed status, view execution history, analyze failed tasks
- **Manage workflow executions**: Start, pause, resume, terminate, restart, and retry workflows
- **Work with workflow definitions**: Create, update, and query workflow definitions
- **Manage task definitions**: Create, update, and query task definitions
- **Search and query**: Advanced search capabilities across workflow executions

## Installation

```bash
npm install -g conductor-mcp
```

Or install locally:

```bash
npm install conductor-mcp
```

## Configuration

The MCP server connects to your Conductor instance using environment variables:

- `CONDUCTOR_SERVER_URL`: Base URL of your Conductor server (default: `http://localhost:8080`)
- `CONDUCTOR_API_PATH`: API path prefix (default: `/api`)

### Claude Desktop Configuration

Add this to your Claude Desktop configuration file:

**MacOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

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

For a remote Conductor server:

```json
{
  "mcpServers": {
    "conductor": {
      "command": "conductor-mcp",
      "env": {
        "CONDUCTOR_SERVER_URL": "https://conductor.yourcompany.com",
        "CONDUCTOR_API_PATH": "/api"
      }
    }
  }
}
```

## Available Tools

### Workflow Execution Management

#### `list_workflows`
List workflow executions with optional filters.

**Parameters:**
- `workflowName` (optional): Filter by workflow name/type
- `status` (optional): Filter by status (RUNNING, COMPLETED, FAILED, TIMED_OUT, TERMINATED, PAUSED)
- `startTime` (optional): Filter workflows started after this time (epoch milliseconds)
- `endTime` (optional): Filter workflows started before this time (epoch milliseconds)
- `freeText` (optional): Free text search

**Example:**
```
List all failed workflows in the last 24 hours
```

#### `get_workflow_status`
Get detailed status of a specific workflow execution.

**Parameters:**
- `workflowId` (required): The workflow execution ID
- `includeTaskDetails` (optional): Include detailed task information (default: true)

**Example:**
```
Get status of workflow abc-123-def
```

#### `start_workflow`
Start a new workflow execution.

**Parameters:**
- `workflowName` (required): Name of the workflow to start
- `version` (optional): Version of the workflow (defaults to latest)
- `input` (optional): Input parameters as JSON object
- `correlationId` (optional): Correlation ID for tracking
- `priority` (optional): Priority 0-99 (default: 0)

**Example:**
```
Start a new order_processing workflow with input {"orderId": "12345", "customerId": "C789"}
```

#### `pause_workflow`
Pause a running workflow.

**Parameters:**
- `workflowId` (required): The workflow execution ID

#### `resume_workflow`
Resume a paused workflow.

**Parameters:**
- `workflowId` (required): The workflow execution ID

#### `terminate_workflow`
Terminate a workflow execution.

**Parameters:**
- `workflowId` (required): The workflow execution ID
- `reason` (optional): Reason for termination

#### `restart_workflow`
Restart a workflow from the beginning.

**Parameters:**
- `workflowId` (required): The workflow execution ID
- `useLatestDefinition` (optional): Use latest workflow definition (default: false)

#### `retry_workflow`
Retry a failed workflow from the last failed task.

**Parameters:**
- `workflowId` (required): The workflow execution ID
- `resumeSubworkflowTasks` (optional): Resume subworkflow tasks (default: false)

#### `search_workflows`
Advanced search for workflow executions.

**Parameters:**
- `query` (required): Query string (e.g., 'workflowType=MyWorkflow AND status=FAILED')
- `start` (optional): Start index for pagination (default: 0)
- `size` (optional): Number of results (default: 100)
- `sort` (optional): Sort field and order (e.g., 'startTime:DESC')

**Example:**
```
Search for all failed payment workflows in the last week
```

### Workflow Definition Management

#### `get_workflow_definition`
Get a workflow definition by name and version.

**Parameters:**
- `workflowName` (required): Name of the workflow
- `version` (optional): Version (defaults to latest)

#### `list_workflow_definitions`
List all registered workflow definitions.

**Parameters:**
- `access` (optional): Filter by access type (READ or CREATE)
- `tagKey` (optional): Filter by tag key
- `tagValue` (optional): Filter by tag value

#### `create_workflow_definition`
Create or update a workflow definition.

**Parameters:**
- `definition` (required): Complete workflow definition as JSON object
- `overwrite` (optional): Overwrite existing definition (default: true)

### Task Management

#### `get_task_details`
Get details of a specific task execution.

**Parameters:**
- `taskId` (required): The task execution ID

#### `get_task_logs`
Get execution logs for a specific task.

**Parameters:**
- `taskId` (required): The task execution ID

#### `update_task_status`
Update the status of a task execution.

**Parameters:**
- `taskId` (required): The task execution ID
- `workflowInstanceId` (required): The workflow instance ID
- `status` (required): New status (IN_PROGRESS, FAILED, FAILED_WITH_TERMINAL_ERROR, COMPLETED)
- `output` (optional): Task output data
- `logs` (optional): Task execution logs

### Task Definition Management

#### `get_task_definition`
Get a task definition by name.

**Parameters:**
- `taskName` (required): Name of the task

#### `list_task_definitions`
List all registered task definitions.

**Parameters:**
- `access` (optional): Filter by access type (READ or CREATE)

#### `create_task_definition`
Create or update a task definition.

**Parameters:**
- `definition` (required): Complete task definition as JSON object

### Event Handlers

#### `get_event_handlers`
Get event handlers.

**Parameters:**
- `event` (optional): Filter by event name
- `activeOnly` (optional): Return only active handlers (default: true)

## Usage Examples

Here are some common scenarios you can ask Claude to help with:

### Troubleshooting

```
"Show me all failed workflows in the last hour"
"Why did workflow abc-123 fail?"
"What tasks are currently running in workflow xyz-789?"
"Show me the execution history of the payment_processing workflow"
```

### Workflow Management

```
"Start a new order_processing workflow with orderId 12345"
"Pause workflow abc-123"
"Retry the failed workflow xyz-789"
"Terminate all stuck workflows"
```

### Workflow Development

```
"Show me the definition of the payment_processing workflow"
"Create a new workflow definition for customer onboarding"
"List all available task definitions"
"What workflows are registered in the system?"
```

## Development

### Building from Source

```bash
git clone https://github.com/opensensor/conductor-mcp.git
cd conductor-mcp
npm install
npm run build
```

### Running Locally

```bash
npm run build
CONDUCTOR_SERVER_URL=http://localhost:8080 node build/index.js
```

### Watch Mode

```bash
npm run watch
```

## Architecture

This MCP server uses:
- **@modelcontextprotocol/sdk**: MCP protocol implementation
- **axios**: HTTP client for Conductor API calls
- **TypeScript**: Type-safe development

The server runs on stdio transport, making it compatible with Claude Desktop and other MCP clients.

## API Compatibility

This server is compatible with Netflix Conductor v3.x API. It has been tested with:
- Conductor v3.15.0
- Conductor v3.13.0

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

Apache-2.0

## Resources

- [Netflix Conductor Documentation](https://conductor.netflix.com/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [MCP Servers](https://github.com/modelcontextprotocol/servers)

## Support

For issues and questions:
- GitHub Issues: https://github.com/opensensor/conductor-mcp/issues
- Conductor Documentation: https://conductor.netflix.com/

## Acknowledgments

Built with the Model Context Protocol SDK and inspired by the Netflix Conductor workflow orchestration platform.

