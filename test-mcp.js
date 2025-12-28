#!/usr/bin/env node

/**
 * Simple test script to verify the MCP server is working
 * This simulates what an MCP client would do
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Start the MCP server
const serverPath = join(__dirname, 'build', 'index.js');
const server = spawn('node', [serverPath], {
  env: {
    ...process.env,
    CONDUCTOR_SERVER_URL: 'http://localhost:8080',
    CONDUCTOR_API_PATH: '/api'
  },
  stdio: ['pipe', 'pipe', 'inherit']
});

let responseBuffer = '';

server.stdout.on('data', (data) => {
  responseBuffer += data.toString();
  
  // Try to parse complete JSON-RPC messages
  const lines = responseBuffer.split('\n');
  responseBuffer = lines.pop() || ''; // Keep incomplete line in buffer
  
  lines.forEach(line => {
    if (line.trim()) {
      try {
        const message = JSON.parse(line);
        console.log('Received:', JSON.stringify(message, null, 2));
      } catch (e) {
        console.log('Raw output:', line);
      }
    }
  });
});

server.on('error', (error) => {
  console.error('Server error:', error);
  process.exit(1);
});

// Wait a bit for server to start
setTimeout(() => {
  console.log('\n=== Testing MCP Server ===\n');
  
  // Test 1: List tools
  console.log('Test 1: Listing available tools...');
  const listToolsRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
    params: {}
  };
  
  server.stdin.write(JSON.stringify(listToolsRequest) + '\n');
  
  // Test 2: List workflow definitions
  setTimeout(() => {
    console.log('\nTest 2: Listing workflow definitions...');
    const callToolRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'list_workflow_definitions',
        arguments: {}
      }
    };
    
    server.stdin.write(JSON.stringify(callToolRequest) + '\n');
    
    // Give it time to respond then exit
    setTimeout(() => {
      console.log('\n=== Tests Complete ===');
      server.kill();
      process.exit(0);
    }, 2000);
  }, 2000);
}, 1000);

// Handle cleanup
process.on('SIGINT', () => {
  server.kill();
  process.exit(0);
});

