# Quick Start Guide

Get up and running with Conductor MCP Server in 5 minutes!

## Prerequisites

- Node.js 18.x or higher
- Access to a Netflix Conductor instance (local or remote)
- Claude Desktop (for AI assistant integration)

## Step 1: Install the MCP Server

```bash
npm install -g conductor-mcp
```

Or use without global install:
```bash
npx conductor-mcp
```

## Step 2: Configure Claude Desktop

### Find your configuration file

- **MacOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

### Add Conductor MCP configuration

Edit the file and add:

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

**Important**: Update `CONDUCTOR_SERVER_URL` to point to your Conductor instance!

## Step 3: Restart Claude Desktop

Close and reopen Claude Desktop completely for the changes to take effect.

## Step 4: Verify the Connection

Open Claude Desktop and try asking:

```
"List all workflow definitions in Conductor"
```

or

```
"What workflows are currently running?"
```

If Claude responds with Conductor data, you're all set! 🎉

## Step 5: Start Using It!

Here are some things you can try:

### View Workflow Status
```
"Show me the status of workflow abc-123-xyz"
```

### Start a Workflow
```
"Start a new order_processing workflow with orderId 12345"
```

### Troubleshoot Failures
```
"Show me all failed workflows in the last hour and help me understand why they failed"
```

### Create Workflows
```
"Help me create a new workflow for processing customer orders"
```

## Running Conductor Locally (Optional)

If you don't have a Conductor instance, you can run one locally using Docker:

```bash
# Pull and run Conductor server
docker run -d -p 8080:8080 conductor/conductor-server

# Pull and run Conductor UI (optional)
docker run -d -p 5000:5000 -e WF_SERVER=http://localhost:8080/api conductor/conductor-ui
```

Then access:
- Conductor API: http://localhost:8080
- Conductor UI: http://localhost:5000

## Troubleshooting

### Claude doesn't show Conductor tools

1. Make sure you saved the configuration file
2. Restart Claude Desktop completely
3. Check that the JSON is valid (use a JSON validator)
4. Verify the command path is correct

### Connection errors

1. Verify Conductor is running: `curl http://localhost:8080/api/health`
2. Check the URL in your configuration
3. Ensure there are no firewalls blocking the connection
4. Check Claude Desktop logs for errors

### Tools work but return errors

1. Verify you have the correct Conductor version (v3.x)
2. Check Conductor server logs
3. Verify workflow/task names are correct
4. Ensure you have necessary permissions

## Next Steps

- Read the [full README](README.md) for all available tools
- Check out [EXAMPLES.md](EXAMPLES.md) for more configuration options
- Review [CONTRIBUTING.md](CONTRIBUTING.md) to contribute to the project

## Getting Help

- GitHub Issues: https://github.com/opensensor/conductor-mcp/issues
- Conductor Docs: https://conductor.netflix.com/

Happy orchestrating! 🚀
