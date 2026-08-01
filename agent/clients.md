# 多 Agent 客户端接入

工作台提供一个标准 MCP stdio Server。Codex、Claude Desktop、Hermes、WorkBuddy 如果启用了 MCP，都可以接入同一个服务；客户端不同，工具和状态不变。

## 通用配置

把下面的 `mcpServers` 内容合并到客户端的 MCP 配置文件：

```json
{
  "mcpServers": {
    "digital-human-workbench": {
      "command": "python3",
      "args": [
        "/absolute/path/to/workbench/mcp/digital_human_server.py"
      ],
      "env": {
        "WORKBENCH_ROOT": "/absolute/path/to/workbench"
      }
    }
  }
}
```

- Codex：使用项目根目录的 `.mcp.json`。
- Claude Desktop：把同名服务合并到 Claude 的 MCP 配置，并把示例路径替换成你的本地工作台路径。
- Hermes：在 MCP/stdio 工具配置中使用同一条 `command` 和 `args`。
- WorkBuddy：在 MCP Server 配置中使用同一条 `command` 和 `args`。

## 调用顺序

1. `digital_human_get_status`
2. `digital_human_preflight_assets`
3. `digital_human_prepare_stage`
4. `digital_human_approve_preview`
5. `digital_human_sync_workflow`
6. `digital_human_handoff` / `digital_human_get_inbox`

MCP 默认只做本地 dry-run；真实生成仍由后端适配层和用户明确确认控制。
