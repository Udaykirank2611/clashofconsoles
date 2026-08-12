# Remove the MCP server

Take the app's agent-integration (MCP) server out entirely, so nothing is exposed at `/mcp` and the public-access security warning goes away. No changes to the website itself.

## What gets removed

- The MCP tool definitions (games, pricing, event packages, venue info, FAQ search) and their shared data file.
- The MCP server definition and its generated HTTP routes, including the OAuth metadata route.
- The build plugin that generates those routes.
- The MCP package dependency and the stored manifest.

## Technical details

- Delete `src/lib/mcp/` (data.ts, index.ts, tools/).
- Delete the generated routes: `src/routes/mcp.ts`, `src/routes/[.mcp]/`, `src/routes/[.well-known]/oauth-protected-resource.ts` (and the `[.well-known]` folder if it becomes empty).
- Remove the `mcpPlugin` import and its entry in the `plugins` array in `vite.config.ts`.
- Remove `@lovable.dev/mcp-js` from `package.json` (`bun remove`) and drop its entry from `minimumReleaseAgeExcludes` in `bunfig.toml`.
- Delete `.lovable/mcp/manifest.json`.
- Verify the dev server builds and the site loads, and that `/mcp` no longer responds.
