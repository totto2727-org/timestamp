import OAuthProvider from '@cloudflare/workers-oauth-provider'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { McpAgent } from 'agents/mcp'
import app from './app'

export class MyMCP extends McpAgent {
  server = new McpServer({
    name: 'Timestamp',
    version: '1.0.0',
  })

  async init() {
    this.server.tool('timestamp', {}, async () => ({
      content: [{ type: 'text', text: String(Date.now()) }],
    }))
  }
}

// Export the OAuth handler as the default
export default new OAuthProvider({
  apiRoute: '/sse',
  // TODO: fix these types
  // @ts-ignore
  apiHandler: MyMCP.mount('/sse'),
  // @ts-ignore
  defaultHandler: app,
  authorizeEndpoint: '/authorize',
  tokenEndpoint: '/token',
  clientRegistrationEndpoint: '/register',
})
