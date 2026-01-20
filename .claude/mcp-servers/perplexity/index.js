#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;

if (!PERPLEXITY_API_KEY) {
  console.error('PERPLEXITY_API_KEY environment variable is required');
  process.exit(1);
}

const API_BASE_URL = 'https://api.perplexity.ai';

async function makePerplexityRequest(endpoint, body) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json',
      'Accept-Language': 'en-US,en;q=0.9',
      'Origin': 'https://www.perplexity.ai',
      'Referer': 'https://www.perplexity.ai/',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Perplexity API error: ${response.status} ${response.statusText}\n${errorText}`);
  }

  return await response.json();
}

const server = new Server(
  {
    name: 'perplexity-custom',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'perplexity_ask',
        description: 'Engages in a conversation using the Sonar API. Accepts an array of messages (each with a role and content) and returns a chat completion response from the Perplexity model.',
        inputSchema: {
          type: 'object',
          properties: {
            messages: {
              type: 'array',
              description: 'Array of conversation messages',
              items: {
                type: 'object',
                properties: {
                  role: {
                    type: 'string',
                    description: 'Role of the message (e.g., system, user, assistant)',
                  },
                  content: {
                    type: 'string',
                    description: 'The content of the message',
                  },
                },
                required: ['role', 'content'],
              },
            },
          },
          required: ['messages'],
        },
      },
      {
        name: 'perplexity_research',
        description: 'Performs deep research using the Perplexity API. Accepts an array of messages (each with a role and content) and returns a comprehensive research response with citations.',
        inputSchema: {
          type: 'object',
          properties: {
            messages: {
              type: 'array',
              description: 'Array of conversation messages',
              items: {
                type: 'object',
                properties: {
                  role: {
                    type: 'string',
                    description: 'Role of the message (e.g., system, user, assistant)',
                  },
                  content: {
                    type: 'string',
                    description: 'The content of the message',
                  },
                },
                required: ['role', 'content'],
              },
            },
            strip_thinking: {
              type: 'boolean',
              description: 'If true, removes <think>...</think> tags and their content from the response to save context tokens. Default is false.',
            },
          },
          required: ['messages'],
        },
      },
      {
        name: 'perplexity_reason',
        description: 'Performs reasoning tasks using the Perplexity API. Accepts an array of messages (each with a role and content) and returns a well-reasoned response using the sonar-reasoning-pro model.',
        inputSchema: {
          type: 'object',
          properties: {
            messages: {
              type: 'array',
              description: 'Array of conversation messages',
              items: {
                type: 'object',
                properties: {
                  role: {
                    type: 'string',
                    description: 'Role of the message (e.g., system, user, assistant)',
                  },
                  content: {
                    type: 'string',
                    description: 'The content of the message',
                  },
                },
                required: ['role', 'content'],
              },
            },
            strip_thinking: {
              type: 'boolean',
              description: 'If true, removes <think>...</think> tags and their content from the response to save context tokens. Default is false.',
            },
          },
          required: ['messages'],
        },
      },
      {
        name: 'perplexity_search',
        description: 'Performs web search using the Perplexity Search API. Returns ranked search results with titles, URLs, snippets, and metadata. Perfect for finding up-to-date facts, news, or specific information.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query string',
            },
            max_results: {
              type: 'number',
              description: 'Maximum number of results to return (1-20, default: 10)',
              minimum: 1,
              maximum: 20,
            },
            country: {
              type: 'string',
              description: "ISO 3166-1 alpha-2 country code for regional results (e.g., 'US', 'GB')",
            },
            max_tokens_per_page: {
              type: 'number',
              description: 'Maximum tokens to extract per webpage (default: 1024)',
              minimum: 256,
              maximum: 2048,
            },
          },
          required: ['query'],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'perplexity_ask': {
        const result = await makePerplexityRequest('/chat/completions', {
          model: 'sonar',
          messages: args.messages,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'perplexity_research': {
        const result = await makePerplexityRequest('/chat/completions', {
          model: 'sonar-reasoning',
          messages: args.messages,
        });

        let responseText = JSON.stringify(result, null, 2);

        if (args.strip_thinking) {
          const parsed = result;
          if (parsed.choices && parsed.choices[0]?.message?.content) {
            parsed.choices[0].message.content = parsed.choices[0].message.content.replace(/<think>[\s\S]*?<\/think>/g, '');
            responseText = JSON.stringify(parsed, null, 2);
          }
        }

        return {
          content: [
            {
              type: 'text',
              text: responseText,
            },
          ],
        };
      }

      case 'perplexity_reason': {
        const result = await makePerplexityRequest('/chat/completions', {
          model: 'sonar-reasoning-pro',
          messages: args.messages,
        });

        let responseText = JSON.stringify(result, null, 2);

        if (args.strip_thinking) {
          const parsed = result;
          if (parsed.choices && parsed.choices[0]?.message?.content) {
            parsed.choices[0].message.content = parsed.choices[0].message.content.replace(/<think>[\s\S]*?<\/think>/g, '');
            responseText = JSON.stringify(parsed, null, 2);
          }
        }

        return {
          content: [
            {
              type: 'text',
              text: responseText,
            },
          ],
        };
      }

      case 'perplexity_search': {
        const searchBody = {
          query: args.query,
        };

        if (args.max_results) searchBody.max_results = args.max_results;
        if (args.country) searchBody.country = args.country;
        if (args.max_tokens_per_page) searchBody.max_tokens_per_page = args.max_tokens_per_page;

        const result = await makePerplexityRequest('/search', searchBody);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Perplexity MCP server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
