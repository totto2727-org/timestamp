import OAuthProvider from '@cloudflare/workers-oauth-provider'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { DateTime, Effect, Match, pipe } from '@totto/function/effect'
import { McpAgent } from 'agents/mcp'
import app from './app'

export class MyMCP extends McpAgent {
  server = new McpServer({
    name: '@totto2727-org/mcp',
    version: '1.0.0',
  })
  timezone: DateTime.TimeZone = DateTime.zoneMakeLocal()

  #setTimezone(timezone: string) {
    pipe(
      DateTime.zoneFromString(timezone),
      Effect.tap((timezone) => {
        this.timezone = timezone
      }),
      Effect.runSync,
    )
  }

  fetch(...args: [Request]): Response | Promise<Response> {
    pipe(
      Effect.fromNullable(args[0].cf?.timezone),
      Effect.tap(Match.type().pipe(Match.when(Match.string, (timezone) => this.#setTimezone(timezone)))),
      Effect.runSync,
    )
    // biome-ignore lint/style/noNonNullAssertion: <explanation>
    return super.fetch!(...args)
  }

  async init() {
    const timezone = this.timezone

    this.server.tool('timestamp', {}, async () => {
      const effect = Effect.gen(function* () {
        const now = DateTime.toParts(DateTime.setZone(yield* DateTime.now, timezone))

        const year = now.year.toString().padStart(4, '0')
        const month = now.month.toString().padStart(2, '0')
        const day = now.day.toString().padStart(2, '0')
        const hours = now.hours.toString().padStart(2, '0')
        const minutes = now.minutes.toString().padStart(2, '0')
        const seconds = now.seconds.toString().padStart(2, '0')

        const timestamp = `${year}${month}${day}${hours}${minutes}${seconds}`

        return {
          content: [{ type: 'text', text: timestamp }],
        } satisfies CallToolResult
      })
      return await Effect.runPromise(effect)
    })
  }
}

export default new OAuthProvider({
  apiRoute: '/sse',
  // @ts-ignore
  apiHandler: MyMCP.mount('/sse'),
  // @ts-ignore
  defaultHandler: app,
  authorizeEndpoint: '/authorize',
  tokenEndpoint: '/token',
  clientRegistrationEndpoint: '/register',
})
