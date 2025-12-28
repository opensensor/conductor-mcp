#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import axios, { AxiosInstance } from "axios";

// Conductor API client configuration
interface ConductorConfig {
  baseUrl: string;
  apiPath?: string;
}

// Get configuration from environment variables
const config: ConductorConfig = {
  baseUrl: process.env.CONDUCTOR_SERVER_URL || "http://localhost:8080",
  apiPath: process.env.CONDUCTOR_API_PATH || "/api",
};

// Create axios instance for Conductor API
const conductorClient: AxiosInstance = axios.create({
  baseURL: `${config.baseUrl}${config.apiPath}`,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

// Define available tools
const tools: Tool[] = [
  {
    name: "list_workflows",
    description:
      "List workflow executions with optional filters. Returns a list of workflow executions matching the criteria.",
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
    description:
      "Get the current status and details of a specific workflow execution by its ID. Returns complete workflow execution details including tasks, input/output, and current status.",
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
    description:
      "Start a new workflow execution. Returns the workflow execution ID of the newly started workflow.",
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
    description:
      "Pause a running workflow execution. The workflow will pause and can be resumed later.",
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
    description:
      "Resume a paused workflow execution. The workflow will continue from where it was paused.",
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
    description:
      "Terminate a workflow execution. This will stop the workflow and mark it as terminated.",
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
    description:
      "Restart a workflow execution from the beginning. This creates a new execution with the same input.",
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
    description:
      "Retry a failed workflow execution from the last failed task.",
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
    description:
      "Advanced search for workflow executions using query syntax. Supports complex queries with multiple criteria.",
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
    description:
      "Get the definition of a workflow by name and version. Returns the complete workflow definition including all tasks and configuration.",
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
    description:
      "List all registered workflow definitions. Returns metadata about all workflows registered in Conductor.",
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
    description:
      "Create or update a workflow definition. If the workflow already exists, it will be updated.",
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
    description:
      "Get details of a specific task execution by task ID. Returns task status, input/output, and execution details.",
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
    description:
      "Get execution logs for a specific task. Returns log entries generated during task execution.",
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
    description:
      "Update the status of a task execution. This is typically used by workers to update task status.",
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
    description:
      "Get the definition of a task by name. Returns the task definition including configuration and metadata.",
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
    description:
      "List all registered task definitions. Returns metadata about all tasks registered in Conductor.",
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
    description:
      "Create or update a task definition. If the task already exists, it will be updated.",
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
    description:
      "Get all event handlers or filter by event and active status. Event handlers define how Conductor responds to external events.",
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
const server = new Server(
  {
    name: "conductor-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools,
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  try {
    switch (name) {
      case "list_workflows": {
        const params: any = {
          start: 0,
          size: 100,
        };
        
        if ((args as any).workflowName) params.workflowType = (args as any).workflowName;
        if ((args as any).status) params.status = (args as any).status;
        if ((args as any).startTime) params.startTime = (args as any).startTime;
        if ((args as any).endTime) params.endTime = (args as any).endTime;
        if ((args as any).freeText) params.freeText = (args as any).freeText;

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
        const { workflowId, includeTaskDetails = true } = args as any;
        const url = `/workflow/${workflowId}`;
        const params = includeTaskDetails ? { includeTasks: true } : {};
        
        const response = await conductorClient.get(url, { params });
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      }

      case "start_workflow": {
        const { workflowName, version, input = {}, correlationId, priority = 0 } = args as any;
        
        const requestBody: any = {
          name: workflowName,
          input,
          priority,
        };
        
        if (version) requestBody.version = version;
        if (correlationId) requestBody.correlationId = correlationId;
        
        const response = await conductorClient.post("/workflow", requestBody);
        
        return {
          content: [
            {
              type: "text",
              text: `Workflow started successfully. Workflow ID: ${response.data}`,
            },
          ],
        };
      }

      case "pause_workflow": {
        const { workflowId } = args as any;
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
        const { workflowId } = args as any;
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
        const { workflowId, reason = "Terminated via MCP" } = args as any;
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
        const { workflowId, useLatestDefinition = false } = args as any;
        const response = await conductorClient.post(
          `/workflow/${workflowId}/restart`,
          null,
          {
            params: { useLatestDefinitions: useLatestDefinition },
          }
        );
        
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
        const { workflowId, resumeSubworkflowTasks = false } = args as any;
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
        const { query, start = 0, size = 100, sort } = args as any;
        
        const params: any = {
          start,
          size,
          query,
        };
        
        if (sort) params.sort = sort;
        
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
        const { workflowName, version } = args as any;
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
        const params: any = {};
        
        if ((args as any).access) params.access = (args as any).access;
        if ((args as any).tagKey) params.tagKey = (args as any).tagKey;
        if ((args as any).tagValue) params.tagValue = (args as any).tagValue;
        
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
        const { definition, overwrite = true } = args as any;
        
        const response = await conductorClient.post(
          `/metadata/workflow`,
          definition,
          {
            params: { overwrite },
          }
        );
        
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
        const { taskId } = args as any;
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
        const { taskId } = args as any;
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
        const { taskId, workflowInstanceId, status, output = {}, logs = [] } = args as any;
        
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
        const { taskName } = args as any;
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
        const params: any = {};
        
        if ((args as any).access) params.access = (args as any).access;
        
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
        const { definition } = args as any;
        
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
        const params: any = {};
        
        if ((args as any).event) params.event = (args as any).event;
        if ((args as any).activeOnly !== undefined) params.activeOnly = (args as any).activeOnly;
        else params.activeOnly = true;
        
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
              text: `Unknown tool: ${name}`,
            },
          ],
          isError: true,
        };
    }
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || error.message || "Unknown error";
    const statusCode = error.response?.status || 500;
    
    return {
      content: [
        {
          type: "text",
          text: `Error executing ${name}: [${statusCode}] ${errorMessage}`,
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
