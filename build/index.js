#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, ListResourcesRequestSchema, ReadResourceRequestSchema, ListPromptsRequestSchema, GetPromptRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
// Get configuration from environment variables
const config = {
    baseUrl: process.env.CONDUCTOR_SERVER_URL || "http://localhost:8080",
    apiPath: process.env.CONDUCTOR_API_PATH || "/api",
};
// Create axios instance for Conductor API
const conductorClient = axios.create({
    baseURL: `${config.baseUrl}${config.apiPath}`,
    headers: {
        "Content-Type": "application/json",
    },
    timeout: 30000,
});
// Helper function to format error messages with suggestions
function formatError(error, toolName) {
    if (axios.isAxiosError(error)) {
        const axiosError = error;
        const status = axiosError.response?.status || 500;
        const message = axiosError.response?.data?.message || axiosError.message || "Unknown error";
        let suggestion = "";
        // Provide helpful suggestions based on error type
        if (status === 404) {
            suggestion = "\n\n💡 Suggestion: The resource was not found. Please verify the ID/name is correct.";
        }
        else if (status === 400) {
            suggestion = "\n\n💡 Suggestion: Invalid request. Please check the input parameters.";
        }
        else if (status === 500) {
            if (message.includes("Elasticsearch")) {
                suggestion = "\n\n💡 Suggestion: Elasticsearch is not configured or unavailable. Try using list_workflows instead of search_workflows.";
            }
            else {
                suggestion = "\n\n💡 Suggestion: Server error. The Conductor server may be experiencing issues.";
            }
        }
        else if (status === 503) {
            suggestion = "\n\n💡 Suggestion: Service unavailable. The Conductor server may be down or restarting.";
        }
        else if (axiosError.code === "ECONNREFUSED") {
            suggestion = `\n\n💡 Suggestion: Cannot connect to Conductor server at ${config.baseUrl}. Please verify the server is running and the URL is correct.`;
        }
        else if (axiosError.code === "ETIMEDOUT") {
            suggestion = "\n\n💡 Suggestion: Request timed out. The server may be slow or unresponsive.";
        }
        return `❌ Error executing ${toolName}: [${status}] ${message}${suggestion}`;
    }
    return `❌ Error executing ${toolName}: ${error.message || "Unknown error"}`;
}
// Helper function to validate workflow ID format
function validateWorkflowId(workflowId) {
    if (!workflowId || workflowId.trim() === "") {
        return { valid: false, error: "Workflow ID cannot be empty" };
    }
    // Basic UUID validation (Conductor typically uses UUIDs)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(workflowId)) {
        return { valid: false, error: `Invalid workflow ID format. Expected UUID format, got: ${workflowId}` };
    }
    return { valid: true };
}
// Helper function to format timestamps
function formatTimestamp(epochMs) {
    if (!epochMs)
        return "N/A";
    const date = new Date(epochMs);
    return date.toISOString();
}
// Helper function to summarize workflow status
function summarizeWorkflow(workflow) {
    const duration = workflow.endTime
        ? workflow.endTime - workflow.startTime
        : Date.now() - workflow.startTime;
    const durationSec = Math.floor(duration / 1000);
    return `📋 Workflow: ${workflow.workflowName || workflow.workflowType} (v${workflow.version || workflow.workflowVersion})
🆔 ID: ${workflow.workflowId}
📊 Status: ${workflow.status}
⏱️  Started: ${formatTimestamp(workflow.startTime)}
⏳ Duration: ${durationSec}s
${workflow.status === "FAILED" ? `❌ Failed Tasks: ${workflow.failedTaskNames?.join(", ") || "N/A"}` : ""}`;
}
// Define available resources
const resources = [
    {
        uri: "conductor://workflows/definitions",
        name: "Workflow Definitions",
        description: "List of all registered workflow definitions in Conductor",
        mimeType: "application/json",
    },
    {
        uri: "conductor://tasks/definitions",
        name: "Task Definitions",
        description: "List of all registered task definitions in Conductor",
        mimeType: "application/json",
    },
    {
        uri: "conductor://workflows/running",
        name: "Running Workflows",
        description: "List of currently running workflow executions",
        mimeType: "application/json",
    },
    {
        uri: "conductor://workflows/failed",
        name: "Failed Workflows",
        description: "List of recently failed workflow executions",
        mimeType: "application/json",
    },
];
// Define available prompts
const prompts = [
    {
        name: "troubleshoot_workflow",
        description: "Troubleshoot a failed or stuck workflow",
        arguments: [
            {
                name: "workflowId",
                description: "The workflow execution ID to troubleshoot",
                required: true,
            },
        ],
    },
    {
        name: "analyze_failures",
        description: "Analyze recent workflow failures and identify patterns",
        arguments: [
            {
                name: "workflowName",
                description: "Optional: Filter by specific workflow name",
                required: false,
            },
            {
                name: "hours",
                description: "Number of hours to look back (default: 24)",
                required: false,
            },
        ],
    },
    {
        name: "create_workflow",
        description: "Guide to create a new workflow definition",
        arguments: [
            {
                name: "workflowName",
                description: "Name for the new workflow",
                required: true,
            },
            {
                name: "description",
                description: "Description of what the workflow does",
                required: true,
            },
        ],
    },
    {
        name: "monitor_workflow",
        description: "Monitor a running workflow execution",
        arguments: [
            {
                name: "workflowId",
                description: "The workflow execution ID to monitor",
                required: true,
            },
        ],
    },
];
// Define available tools
const tools = [
    {
        name: "list_workflows",
        description: "List workflow executions with optional filters. Returns a list of workflow executions matching the criteria.",
        inputSchema: {
            type: "object",
            properties: {
                workflowName: {
                    type: "string",
                    description: "Filter by workflow name/type",
                },
                status: {
                    type: "string",
                    description: "Filter by workflow status (RUNNING, COMPLETED, FAILED, TIMED_OUT, TERMINATED, PAUSED)",
                    enum: ["RUNNING", "COMPLETED", "FAILED", "TIMED_OUT", "TERMINATED", "PAUSED"],
                },
                startTime: {
                    type: "number",
                    description: "Filter workflows started after this time (epoch milliseconds)",
                },
                endTime: {
                    type: "number",
                    description: "Filter workflows started before this time (epoch milliseconds)",
                },
                freeText: {
                    type: "string",
                    description: "Free text search across workflow executions",
                },
            },
        },
    },
    {
        name: "get_workflow_status",
        description: "Get the current status and details of a specific workflow execution by its ID. Returns complete workflow execution details including tasks, input/output, and current status.",
        inputSchema: {
            type: "object",
            properties: {
                workflowId: {
                    type: "string",
                    description: "The unique workflow execution ID",
                },
                includeTaskDetails: {
                    type: "boolean",
                    description: "Include detailed task information (default: true)",
                },
            },
            required: ["workflowId"],
        },
    },
    {
        name: "start_workflow",
        description: "Start a new workflow execution. Returns the workflow execution ID of the newly started workflow.",
        inputSchema: {
            type: "object",
            properties: {
                workflowName: {
                    type: "string",
                    description: "Name of the workflow to start",
                },
                version: {
                    type: "number",
                    description: "Version of the workflow (optional, defaults to latest)",
                },
                input: {
                    type: "object",
                    description: "Input parameters for the workflow as a JSON object",
                },
                correlationId: {
                    type: "string",
                    description: "Optional correlation ID for tracking",
                },
                priority: {
                    type: "number",
                    description: "Workflow execution priority (0-99, default: 0)",
                },
            },
            required: ["workflowName"],
        },
    },
    {
        name: "pause_workflow",
        description: "Pause a running workflow execution. The workflow will pause and can be resumed later.",
        inputSchema: {
            type: "object",
            properties: {
                workflowId: {
                    type: "string",
                    description: "The workflow execution ID to pause",
                },
            },
            required: ["workflowId"],
        },
    },
    {
        name: "resume_workflow",
        description: "Resume a paused workflow execution. The workflow will continue from where it was paused.",
        inputSchema: {
            type: "object",
            properties: {
                workflowId: {
                    type: "string",
                    description: "The workflow execution ID to resume",
                },
            },
            required: ["workflowId"],
        },
    },
    {
        name: "terminate_workflow",
        description: "Terminate a workflow execution. This will stop the workflow and mark it as terminated.",
        inputSchema: {
            type: "object",
            properties: {
                workflowId: {
                    type: "string",
                    description: "The workflow execution ID to terminate",
                },
                reason: {
                    type: "string",
                    description: "Reason for termination",
                },
            },
            required: ["workflowId"],
        },
    },
    {
        name: "restart_workflow",
        description: "Restart a workflow execution from the beginning. This creates a new execution with the same input.",
        inputSchema: {
            type: "object",
            properties: {
                workflowId: {
                    type: "string",
                    description: "The workflow execution ID to restart",
                },
                useLatestDefinition: {
                    type: "boolean",
                    description: "Use the latest workflow definition (default: false)",
                },
            },
            required: ["workflowId"],
        },
    },
    {
        name: "retry_workflow",
        description: "Retry a failed workflow execution from the last failed task.",
        inputSchema: {
            type: "object",
            properties: {
                workflowId: {
                    type: "string",
                    description: "The workflow execution ID to retry",
                },
                resumeSubworkflowTasks: {
                    type: "boolean",
                    description: "Resume subworkflow tasks (default: false)",
                },
            },
            required: ["workflowId"],
        },
    },
    {
        name: "search_workflows",
        description: "Advanced search for workflow executions using query syntax. Supports complex queries with multiple criteria.",
        inputSchema: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "Query string (e.g., 'workflowType=MyWorkflow AND status=FAILED')",
                },
                start: {
                    type: "number",
                    description: "Start index for pagination (default: 0)",
                },
                size: {
                    type: "number",
                    description: "Number of results to return (default: 100)",
                },
                sort: {
                    type: "string",
                    description: "Sort field and order (e.g., 'startTime:DESC')",
                },
            },
            required: ["query"],
        },
    },
    {
        name: "get_workflow_definition",
        description: "Get the definition of a workflow by name and version. Returns the complete workflow definition including all tasks and configuration.",
        inputSchema: {
            type: "object",
            properties: {
                workflowName: {
                    type: "string",
                    description: "Name of the workflow",
                },
                version: {
                    type: "number",
                    description: "Version of the workflow (optional, defaults to latest)",
                },
            },
            required: ["workflowName"],
        },
    },
    {
        name: "list_workflow_definitions",
        description: "List all registered workflow definitions. Returns metadata about all workflows registered in Conductor.",
        inputSchema: {
            type: "object",
            properties: {
                access: {
                    type: "string",
                    description: "Filter by access type (READ or CREATE)",
                    enum: ["READ", "CREATE"],
                },
                tagKey: {
                    type: "string",
                    description: "Filter by tag key",
                },
                tagValue: {
                    type: "string",
                    description: "Filter by tag value",
                },
            },
        },
    },
    {
        name: "create_workflow_definition",
        description: "Create or update a workflow definition. If the workflow already exists, it will be updated.",
        inputSchema: {
            type: "object",
            properties: {
                definition: {
                    type: "object",
                    description: "Complete workflow definition as a JSON object",
                },
                overwrite: {
                    type: "boolean",
                    description: "Overwrite existing definition (default: true)",
                },
            },
            required: ["definition"],
        },
    },
    {
        name: "get_task_details",
        description: "Get details of a specific task execution by task ID. Returns task status, input/output, and execution details.",
        inputSchema: {
            type: "object",
            properties: {
                taskId: {
                    type: "string",
                    description: "The unique task execution ID",
                },
            },
            required: ["taskId"],
        },
    },
    {
        name: "get_task_logs",
        description: "Get execution logs for a specific task. Returns log entries generated during task execution.",
        inputSchema: {
            type: "object",
            properties: {
                taskId: {
                    type: "string",
                    description: "The unique task execution ID",
                },
            },
            required: ["taskId"],
        },
    },
    {
        name: "update_task_status",
        description: "Update the status of a task execution. This is typically used by workers to update task status.",
        inputSchema: {
            type: "object",
            properties: {
                taskId: {
                    type: "string",
                    description: "The unique task execution ID",
                },
                workflowInstanceId: {
                    type: "string",
                    description: "The workflow instance ID",
                },
                status: {
                    type: "string",
                    description: "New task status",
                    enum: ["IN_PROGRESS", "FAILED", "FAILED_WITH_TERMINAL_ERROR", "COMPLETED"],
                },
                output: {
                    type: "object",
                    description: "Task output data",
                },
                logs: {
                    type: "array",
                    description: "Task execution logs",
                    items: {
                        type: "object",
                    },
                },
            },
            required: ["taskId", "workflowInstanceId", "status"],
        },
    },
    {
        name: "get_task_definition",
        description: "Get the definition of a task by name. Returns the task definition including configuration and metadata.",
        inputSchema: {
            type: "object",
            properties: {
                taskName: {
                    type: "string",
                    description: "Name of the task",
                },
            },
            required: ["taskName"],
        },
    },
    {
        name: "list_task_definitions",
        description: "List all registered task definitions. Returns metadata about all tasks registered in Conductor.",
        inputSchema: {
            type: "object",
            properties: {
                access: {
                    type: "string",
                    description: "Filter by access type (READ or CREATE)",
                    enum: ["READ", "CREATE"],
                },
            },
        },
    },
    {
        name: "create_task_definition",
        description: "Create or update a task definition. If the task already exists, it will be updated.",
        inputSchema: {
            type: "object",
            properties: {
                definition: {
                    type: "object",
                    description: "Complete task definition as a JSON object",
                },
            },
            required: ["definition"],
        },
    },
    {
        name: "get_event_handlers",
        description: "Get all event handlers or filter by event and active status. Event handlers define how Conductor responds to external events.",
        inputSchema: {
            type: "object",
            properties: {
                event: {
                    type: "string",
                    description: "Filter by event name",
                },
                activeOnly: {
                    type: "boolean",
                    description: "Return only active event handlers (default: true)",
                },
            },
        },
    },
];
// Create MCP server
const server = new Server({
    name: "conductor-mcp",
    version: "1.0.0",
}, {
    capabilities: {
        tools: {},
        resources: {},
        prompts: {},
    },
});
// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools,
    };
});
// Handle list resources request
server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
        resources,
    };
});
// Handle read resource request
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;
    try {
        switch (uri) {
            case "conductor://workflows/definitions": {
                const response = await conductorClient.get("/metadata/workflow");
                return {
                    contents: [
                        {
                            uri,
                            mimeType: "application/json",
                            text: JSON.stringify(response.data, null, 2),
                        },
                    ],
                };
            }
            case "conductor://tasks/definitions": {
                const response = await conductorClient.get("/metadata/taskdefs");
                return {
                    contents: [
                        {
                            uri,
                            mimeType: "application/json",
                            text: JSON.stringify(response.data, null, 2),
                        },
                    ],
                };
            }
            case "conductor://workflows/running": {
                const response = await conductorClient.get("/workflow/search", {
                    params: { status: "RUNNING", start: 0, size: 100 },
                });
                return {
                    contents: [
                        {
                            uri,
                            mimeType: "application/json",
                            text: JSON.stringify(response.data, null, 2),
                        },
                    ],
                };
            }
            case "conductor://workflows/failed": {
                const response = await conductorClient.get("/workflow/search", {
                    params: { status: "FAILED", start: 0, size: 100 },
                });
                return {
                    contents: [
                        {
                            uri,
                            mimeType: "application/json",
                            text: JSON.stringify(response.data, null, 2),
                        },
                    ],
                };
            }
            default:
                throw new Error(`Unknown resource: ${uri}`);
        }
    }
    catch (error) {
        throw new Error(formatError(error, `read resource ${uri}`));
    }
});
// Handle list prompts request
server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return {
        prompts,
    };
});
// Handle get prompt request
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;
    switch (name) {
        case "troubleshoot_workflow": {
            const workflowId = args.workflowId;
            return {
                messages: [
                    {
                        role: "user",
                        content: {
                            type: "text",
                            text: `I need help troubleshooting workflow ${workflowId}. Please:
1. Get the current status of the workflow
2. Identify any failed tasks
3. Check the task logs for errors
4. Suggest possible solutions based on the error messages
5. Recommend next steps to resolve the issue`,
                        },
                    },
                ],
            };
        }
        case "analyze_failures": {
            const workflowName = args.workflowName;
            const hours = args.hours || 24;
            const startTime = Date.now() - hours * 60 * 60 * 1000;
            let query = `List all failed workflows in the last ${hours} hours`;
            if (workflowName) {
                query += ` for workflow type "${workflowName}"`;
            }
            query += `. Then analyze the failures to identify:
1. Common error patterns
2. Most frequently failing tasks
3. Potential root causes
4. Recommendations to prevent future failures`;
            return {
                messages: [
                    {
                        role: "user",
                        content: {
                            type: "text",
                            text: query,
                        },
                    },
                ],
            };
        }
        case "create_workflow": {
            const workflowName = args.workflowName;
            const description = args.description;
            return {
                messages: [
                    {
                        role: "user",
                        content: {
                            type: "text",
                            text: `I want to create a new workflow called "${workflowName}".
Description: ${description}

Please help me:
1. Show me existing workflow definitions as examples
2. Guide me through creating the workflow definition JSON
3. Help me define the necessary tasks
4. Create the task definitions if needed
5. Register the workflow definition in Conductor`,
                        },
                    },
                ],
            };
        }
        case "monitor_workflow": {
            const workflowId = args.workflowId;
            return {
                messages: [
                    {
                        role: "user",
                        content: {
                            type: "text",
                            text: `Please monitor workflow ${workflowId} and provide:
1. Current status and progress
2. List of completed tasks
3. Currently running tasks
4. Pending tasks
5. Any warnings or issues
6. Estimated time to completion (if possible)`,
                        },
                    },
                ],
            };
        }
        default:
            throw new Error(`Unknown prompt: ${name}`);
    }
});
// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;
    try {
        switch (name) {
            case "list_workflows": {
                const params = {
                    start: 0,
                    size: 100,
                };
                if (args.workflowName)
                    params.workflowType = args.workflowName;
                if (args.status)
                    params.status = args.status;
                if (args.startTime)
                    params.startTime = args.startTime;
                if (args.endTime)
                    params.endTime = args.endTime;
                if (args.freeText)
                    params.freeText = args.freeText;
                const response = await conductorClient.get("/workflow/search", { params });
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(response.data, null, 2),
                        },
                    ],
                };
            }
            case "get_workflow_status": {
                const { workflowId, includeTaskDetails = true } = args;
                // Validate workflow ID
                const validation = validateWorkflowId(workflowId);
                if (!validation.valid) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `❌ Validation Error: ${validation.error}`,
                            },
                        ],
                        isError: true,
                    };
                }
                const url = `/workflow/${workflowId}`;
                const params = includeTaskDetails ? { includeTasks: true } : {};
                const response = await conductorClient.get(url, { params });
                // Add summary for better readability
                const summary = summarizeWorkflow(response.data);
                return {
                    content: [
                        {
                            type: "text",
                            text: `${summary}\n\n📄 Full Details:\n${JSON.stringify(response.data, null, 2)}`,
                        },
                    ],
                };
            }
            case "start_workflow": {
                const { workflowName, version, input = {}, correlationId, priority = 0 } = args;
                // Validate workflow name
                if (!workflowName || workflowName.trim() === "") {
                    return {
                        content: [
                            {
                                type: "text",
                                text: "❌ Validation Error: Workflow name is required",
                            },
                        ],
                        isError: true,
                    };
                }
                const requestBody = {
                    name: workflowName,
                    input,
                    priority,
                };
                if (version)
                    requestBody.version = version;
                if (correlationId)
                    requestBody.correlationId = correlationId;
                const response = await conductorClient.post("/workflow", requestBody);
                return {
                    content: [
                        {
                            type: "text",
                            text: `✅ Workflow started successfully!\n\n🆔 Workflow ID: ${response.data}\n📋 Workflow Name: ${workflowName}\n${version ? `📌 Version: ${version}\n` : ""}${correlationId ? `🔗 Correlation ID: ${correlationId}\n` : ""}\n💡 Tip: Use get_workflow_status with this ID to monitor progress.`,
                        },
                    ],
                };
            }
            case "pause_workflow": {
                const { workflowId } = args;
                await conductorClient.put(`/workflow/${workflowId}/pause`);
                return {
                    content: [
                        {
                            type: "text",
                            text: `Workflow ${workflowId} paused successfully.`,
                        },
                    ],
                };
            }
            case "resume_workflow": {
                const { workflowId } = args;
                await conductorClient.put(`/workflow/${workflowId}/resume`);
                return {
                    content: [
                        {
                            type: "text",
                            text: `Workflow ${workflowId} resumed successfully.`,
                        },
                    ],
                };
            }
            case "terminate_workflow": {
                const { workflowId, reason = "Terminated via MCP" } = args;
                await conductorClient.delete(`/workflow/${workflowId}`, {
                    params: { reason },
                });
                return {
                    content: [
                        {
                            type: "text",
                            text: `Workflow ${workflowId} terminated successfully. Reason: ${reason}`,
                        },
                    ],
                };
            }
            case "restart_workflow": {
                const { workflowId, useLatestDefinition = false } = args;
                const response = await conductorClient.post(`/workflow/${workflowId}/restart`, null, {
                    params: { useLatestDefinitions: useLatestDefinition },
                });
                return {
                    content: [
                        {
                            type: "text",
                            text: `Workflow restarted successfully. New Workflow ID: ${response.data}`,
                        },
                    ],
                };
            }
            case "retry_workflow": {
                const { workflowId, resumeSubworkflowTasks = false } = args;
                await conductorClient.post(`/workflow/${workflowId}/retry`, null, {
                    params: { resumeSubworkflowTasks },
                });
                return {
                    content: [
                        {
                            type: "text",
                            text: `Workflow ${workflowId} retry initiated successfully.`,
                        },
                    ],
                };
            }
            case "search_workflows": {
                const { query, start = 0, size = 100, sort } = args;
                const params = {
                    start,
                    size,
                    query,
                };
                if (sort)
                    params.sort = sort;
                const response = await conductorClient.get("/workflow/search-v2", { params });
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(response.data, null, 2),
                        },
                    ],
                };
            }
            case "get_workflow_definition": {
                const { workflowName, version } = args;
                const url = version
                    ? `/metadata/workflow/${workflowName}/${version}`
                    : `/metadata/workflow/${workflowName}`;
                const response = await conductorClient.get(url);
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(response.data, null, 2),
                        },
                    ],
                };
            }
            case "list_workflow_definitions": {
                const params = {};
                if (args.access)
                    params.access = args.access;
                if (args.tagKey)
                    params.tagKey = args.tagKey;
                if (args.tagValue)
                    params.tagValue = args.tagValue;
                const response = await conductorClient.get("/metadata/workflow", { params });
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(response.data, null, 2),
                        },
                    ],
                };
            }
            case "create_workflow_definition": {
                const { definition, overwrite = true } = args;
                const response = await conductorClient.post(`/metadata/workflow`, definition, {
                    params: { overwrite },
                });
                return {
                    content: [
                        {
                            type: "text",
                            text: `Workflow definition created/updated successfully.`,
                        },
                    ],
                };
            }
            case "get_task_details": {
                const { taskId } = args;
                const response = await conductorClient.get(`/tasks/${taskId}`);
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(response.data, null, 2),
                        },
                    ],
                };
            }
            case "get_task_logs": {
                const { taskId } = args;
                const response = await conductorClient.get(`/tasks/${taskId}/log`);
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(response.data, null, 2),
                        },
                    ],
                };
            }
            case "update_task_status": {
                const { taskId, workflowInstanceId, status, output = {}, logs = [] } = args;
                const taskUpdate = {
                    workflowInstanceId,
                    taskId,
                    status,
                    outputData: output,
                    logs,
                };
                await conductorClient.post("/tasks", taskUpdate);
                return {
                    content: [
                        {
                            type: "text",
                            text: `Task ${taskId} status updated to ${status} successfully.`,
                        },
                    ],
                };
            }
            case "get_task_definition": {
                const { taskName } = args;
                const response = await conductorClient.get(`/metadata/taskdefs/${taskName}`);
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(response.data, null, 2),
                        },
                    ],
                };
            }
            case "list_task_definitions": {
                const params = {};
                if (args.access)
                    params.access = args.access;
                const response = await conductorClient.get("/metadata/taskdefs", { params });
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(response.data, null, 2),
                        },
                    ],
                };
            }
            case "create_task_definition": {
                const { definition } = args;
                await conductorClient.post("/metadata/taskdefs", [definition]);
                return {
                    content: [
                        {
                            type: "text",
                            text: `Task definition created/updated successfully.`,
                        },
                    ],
                };
            }
            case "get_event_handlers": {
                const params = {};
                if (args.event)
                    params.event = args.event;
                if (args.activeOnly !== undefined)
                    params.activeOnly = args.activeOnly;
                else
                    params.activeOnly = true;
                const response = await conductorClient.get("/event", { params });
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(response.data, null, 2),
                        },
                    ],
                };
            }
            default:
                return {
                    content: [
                        {
                            type: "text",
                            text: `❌ Unknown tool: ${name}\n\n💡 Suggestion: Use list_tools to see available tools.`,
                        },
                    ],
                    isError: true,
                };
        }
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: formatError(error, name),
                },
            ],
            isError: true,
        };
    }
});
// Start the server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Conductor MCP Server running on stdio");
    console.error(`Connected to Conductor server at: ${config.baseUrl}${config.apiPath}`);
}
main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map