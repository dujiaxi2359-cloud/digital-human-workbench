# Agent 接入

工作台把 rachel-skill/SKILL.md 作为显式 Skill 注册，并通过 .mcp.json 注册本地 digital-human-workbench MCP Server。

MCP 工具默认是 local-dry-run：

- digital_human_get_status 读取当前工作流状态。
- digital_human_preflight_assets 调用 Rachel Skill 的素材预检脚本。
- digital_human_configure_models 保存模型路由和环境变量名，不保存 API Key。
- digital_human_prepare_stage 按门禁准备旁白、预览或成片阶段。
- digital_human_approve_preview 记录预览审批。
- digital_human_get_inbox 读取工作台投递给 Agent 的任务。
- digital_human_handoff 把任务写入 Agent inbox。
- digital_human_sync_workflow 把前端完成的阶段同步给 Agent 状态。

真实 MiniMax / HeyGen 请求需要后端适配层、用户明确确认和运行环境中的 MINIMAX_API_KEY / HEYGEN_API_KEY，不会由本地 MCP Server 隐式发起。

## 多 Agent 客户端

Codex、Claude Desktop、Hermes、WorkBuddy 只要支持标准 MCP stdio，都可以复用同一个 `digital-human-workbench` 服务。Codex 直接读取项目根目录的 `.mcp.json`；其他客户端复制同一段 `mcpServers.digital-human-workbench` 配置即可，入口始终是 `mcp/digital_human_server.py`，不会产生多套状态。
