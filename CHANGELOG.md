# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-12-28

### Added

#### Workflow Execution Tools
- `list_workflows` - List and filter workflow executions by name, status, time range, or free text
- `get_workflow_status` - Get detailed status and execution details for a specific workflow
- `start_workflow` - Start new workflow executions with custom inputs and parameters
- `pause_workflow` - Pause running workflow executions
- `resume_workflow` - Resume paused workflow executions
- `terminate_workflow` - Terminate workflow executions with optional reason
- `restart_workflow` - Restart workflows from the beginning
- `retry_workflow` - Retry failed workflows from the last failed task
- `search_workflows` - Advanced search with query syntax and pagination

#### Workflow Definition Tools
- `get_workflow_definition` - Get workflow definitions by name and version
- `list_workflow_definitions` - List all registered workflow definitions with filtering
- `create_workflow_definition` - Create or update workflow definitions

#### Task Management Tools
- `get_task_details` - Get detailed information about task executions
- `get_task_logs` - Retrieve execution logs for specific tasks
- `update_task_status` - Update task status and output data

#### Task Definition Tools
- `get_task_definition` - Get task definitions by name
- `list_task_definitions` - List all registered task definitions
- `create_task_definition` - Create or update task definitions

#### Event Handler Tools
- `get_event_handlers` - Query event handlers with filtering options

#### Core Features
- TypeScript implementation with full type safety
- Environment-based configuration via `CONDUCTOR_SERVER_URL` and `CONDUCTOR_API_PATH`
- Comprehensive error handling with detailed error messages
- MCP protocol support via stdio transport
- Compatible with Conductor v3.x REST API
- Support for workflow versioning, correlation IDs, and priorities
- Pagination support for list and search operations

#### Documentation
- Comprehensive README with tool descriptions and examples
- QUICKSTART guide for rapid setup
- EXAMPLES with common use cases and configuration templates
- CONTRIBUTING guide for developers
- Apache-2.0 license

### Technical Details
- Built with @modelcontextprotocol/sdk v1.0.4
- Uses axios v1.7.9 for HTTP communication
- Node.js 18.0.0+ required
- TypeScript 5.7.2 for development

[1.0.0]: https://github.com/opensensor/conductor-mcp/releases/tag/v1.0.0
