<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture
- Research pipeline runs as separate auth-protected server functions per stage (plan, search, analyze, review) in src/lib/research.functions.ts, driven by the report page; each stage persists to research_reports so failures keep completed work and stay under worker time limits.
- Agents live in src/lib/agents.server.ts; AI calls go through src/lib/ai.server.ts (Lovable AI Gateway Responses, streamed structured output) so the provider can be swapped in one place.
- Live search uses Tavily (TAVILY_API_KEY secret); never fabricate sources or figures — analysis must cite numbered source ids.
- PDF/CSV exports are generated client-side in src/lib/exports.ts.
- Workspace destinations use separate protected routes and a shared query over saved reports; report selection and filters stay in URL search so navigation is shareable and consistent.
- Workspace chart series group cited numeric metrics by exact label and unit; unrelated market quantities must never be combined into a misleading comparison.
