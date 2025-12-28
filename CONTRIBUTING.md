# Contributing to Conductor MCP Server

Thank you for your interest in contributing to the Conductor MCP Server! This document provides guidelines for contributing to the project.

## Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/opensensor/conductor-mcp.git
   cd conductor-mcp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the project**
   ```bash
   npm run build
   ```

4. **Watch mode for development**
   ```bash
   npm run watch
   ```

## Project Structure

```
conductor-mcp/
├── src/
│   └── index.ts          # Main MCP server implementation
├── build/                # Compiled JavaScript (generated)
├── package.json          # Project dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── README.md             # User documentation
├── EXAMPLES.md           # Configuration examples
└── CONTRIBUTING.md       # This file
```

## Architecture

The MCP server is built using:

- **TypeScript**: For type-safe development
- **MCP SDK**: Official Model Context Protocol SDK
- **Axios**: HTTP client for Conductor REST API calls
- **stdio transport**: For communication with MCP clients

### Key Components

1. **Tool Definitions**: Each tool is defined with:
   - Name and description
   - Input schema (JSON Schema format)
   - Parameter validation

2. **Tool Handlers**: Switch-case handlers that:
   - Extract and validate parameters
   - Make Conductor API calls
   - Format and return responses
   - Handle errors gracefully

3. **Configuration**: Environment-based configuration for:
   - Conductor server URL
   - API path prefix

## Adding New Tools

To add a new tool to the MCP server:

1. **Define the tool** in the `tools` array:
   ```typescript
   {
     name: "my_new_tool",
     description: "Description of what this tool does",
     inputSchema: {
       type: "object",
       properties: {
         param1: {
           type: "string",
           description: "Description of param1",
         },
       },
       required: ["param1"],
     },
   }
   ```

2. **Add the handler** in the switch statement:
   ```typescript
   case "my_new_tool": {
     const { param1 } = args as any;
     const response = await conductorClient.get(`/some-endpoint/${param1}`);
     
     return {
       content: [
         {
           type: "text",
           text: JSON.stringify(response.data, null, 2),
         },
       ],
     };
   }
   ```

3. **Update documentation** in README.md with:
   - Tool description
   - Parameters
   - Usage examples

## Conductor API Reference

The server uses the Conductor REST API. Key endpoints:

- `/api/workflow/*` - Workflow execution operations
- `/api/metadata/workflow/*` - Workflow definitions
- `/api/tasks/*` - Task operations
- `/api/metadata/taskdefs/*` - Task definitions
- `/api/event/*` - Event handlers

Refer to the [Conductor API documentation](https://conductor.netflix.com/) for details.

## Testing

### Manual Testing

1. **Build the project**
   ```bash
   npm run build
   ```

2. **Test with MCP Inspector** (if available)
   ```bash
   npx @modelcontextprotocol/inspector build/index.js
   ```

3. **Test with Claude Desktop**
   - Add configuration to `claude_desktop_config.json`
   - Restart Claude Desktop
   - Try interacting with Conductor through Claude

### Integration Testing

To test against a real Conductor instance:

1. **Start Conductor locally** (using Docker):
   ```bash
   docker run -d -p 8080:8080 conductor/conductor-server
   ```

2. **Set environment variables**
   ```bash
   export CONDUCTOR_SERVER_URL=http://localhost:8080
   export CONDUCTOR_API_PATH=/api
   ```

3. **Run the server**
   ```bash
   node build/index.js
   ```

## Code Style

- Use TypeScript for all new code
- Follow existing code formatting
- Add comments for complex logic
- Use descriptive variable names
- Keep functions focused and small

## Error Handling

All tool handlers should:
- Catch and handle errors gracefully
- Return informative error messages
- Include HTTP status codes when available
- Use the `isError: true` flag for error responses

Example:
```typescript
try {
  // Tool logic
} catch (error: any) {
  const errorMessage = error.response?.data?.message || error.message || "Unknown error";
  const statusCode = error.response?.status || 500;
  
  return {
    content: [
      {
        type: "text",
        text: `Error: [${statusCode}] ${errorMessage}`,
      },
    ],
    isError: true,
  };
}
```

## Documentation

When adding features:
- Update README.md with new tools and examples
- Add examples to EXAMPLES.md if applicable
- Update this CONTRIBUTING.md if changing development process

## Submitting Changes

1. **Create a branch**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make your changes**
   - Write clean, documented code
   - Follow existing patterns
   - Test thoroughly

3. **Commit your changes**
   ```bash
   git add .
   git commit -m "Add feature: description"
   ```

4. **Push to GitHub**
   ```bash
   git push origin feature/my-feature
   ```

5. **Create a Pull Request**
   - Describe what you changed and why
   - Link any related issues
   - Request review

## Questions?

If you have questions:
- Open an issue on GitHub
- Check existing issues and discussions
- Review the Conductor and MCP documentation

## License

By contributing, you agree that your contributions will be licensed under the Apache-2.0 License.
