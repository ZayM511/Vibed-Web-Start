#!/usr/bin/env node

/**
 * Time MCP Server
 * Provides tools for time, date, and timezone operations
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');

// Create server instance
const server = new Server(
  {
    name: 'time-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_current_time',
        description: 'Get the current date and time in various formats and timezones',
        inputSchema: {
          type: 'object',
          properties: {
            timezone: {
              type: 'string',
              description: 'Timezone (e.g., America/New_York, Europe/London, UTC)',
              default: 'UTC',
            },
            format: {
              type: 'string',
              description: 'Format: iso, locale, unix, or custom date format',
              default: 'iso',
            },
          },
        },
      },
      {
        name: 'convert_timezone',
        description: 'Convert time from one timezone to another',
        inputSchema: {
          type: 'object',
          properties: {
            datetime: {
              type: 'string',
              description: 'Date/time to convert (ISO format)',
            },
            from_timezone: {
              type: 'string',
              description: 'Source timezone',
            },
            to_timezone: {
              type: 'string',
              description: 'Target timezone',
            },
          },
          required: ['datetime', 'from_timezone', 'to_timezone'],
        },
      },
      {
        name: 'time_until',
        description: 'Calculate time until a future date/time',
        inputSchema: {
          type: 'object',
          properties: {
            target_datetime: {
              type: 'string',
              description: 'Target date/time (ISO format)',
            },
            unit: {
              type: 'string',
              description: 'Unit: seconds, minutes, hours, days',
              default: 'hours',
            },
          },
          required: ['target_datetime'],
        },
      },
    ],
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'get_current_time': {
      const timezone = args.timezone || 'UTC';
      const format = args.format || 'iso';
      const now = new Date();

      let result;
      if (format === 'iso') {
        result = now.toISOString();
      } else if (format === 'locale') {
        result = now.toLocaleString('en-US', { timeZone: timezone });
      } else if (format === 'unix') {
        result = Math.floor(now.getTime() / 1000);
      } else {
        result = now.toISOString();
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              current_time: result,
              timezone: timezone,
              format: format,
              utc: now.toISOString(),
            }, null, 2),
          },
        ],
      };
    }

    case 'convert_timezone': {
      const datetime = new Date(args.datetime);
      const result = datetime.toLocaleString('en-US', {
        timeZone: args.to_timezone,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              original: args.datetime,
              from_timezone: args.from_timezone,
              to_timezone: args.to_timezone,
              converted: result,
            }, null, 2),
          },
        ],
      };
    }

    case 'time_until': {
      const now = new Date();
      const target = new Date(args.target_datetime);
      const diffMs = target - now;
      const unit = args.unit || 'hours';

      let value;
      switch (unit) {
        case 'seconds':
          value = Math.floor(diffMs / 1000);
          break;
        case 'minutes':
          value = Math.floor(diffMs / 60000);
          break;
        case 'hours':
          value = Math.floor(diffMs / 3600000);
          break;
        case 'days':
          value = Math.floor(diffMs / 86400000);
          break;
        default:
          value = diffMs;
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              target: args.target_datetime,
              time_until: value,
              unit: unit,
              is_future: diffMs > 0,
            }, null, 2),
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Time MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
