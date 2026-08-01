# Agent 接入

数字人工作台提供一个标准 MCP stdio Server。Agent 可以读取项目状态、执行素材预检、准备下一阶段、记录预览审批、同步流程和投递任务。

## 连接方式

从工作台仓库根目录运行：

```bash
python3 mcp/digital_human_server.py
```

项目根目录的 [`.mcp.json`](../.mcp.json) 已经包含 Codex 所需配置。其他客户端请使用 [多客户端接入说明](./clients.md) 中的绝对路径配置。

## 工具清单

| 工具 | 用途 | 是否调用付费 API |
| --- | --- | --- |
| `digital_human_get_status` | 读取项目、Skill、MCP 和工作流状态 | 否 |
| `digital_human_preflight_assets` | 检查脚本、肖像和声音样本 | 否 |
| `digital_human_configure_models` | 保存模型路由和环境变量名 | 否 |
| `digital_human_prepare_stage` | 按门禁准备旁白、预览或成片阶段 | 否 |
| `digital_human_approve_preview` | 记录 15 秒预览审批结果 | 否 |
| `digital_human_sync_workflow` | 同步前端已完成阶段 | 否 |
| `digital_human_handoff` | 将显式任务写入 Agent inbox | 否 |
| `digital_human_get_inbox` | 读取工作台投递给 Agent 的任务 | 否 |

## 推荐调用顺序

```text
1. digital_human_get_status
2. digital_human_preflight_assets
3. digital_human_prepare_stage
4. digital_human_approve_preview
5. digital_human_sync_workflow
6. digital_human_handoff / digital_human_get_inbox
```

Agent 不应跳过素材预检或预览审批。只有用户明确确认、后端允许付费调用并且服务密钥存在时，才可以进入真实生成阶段。

## 状态与安全

- MCP 默认运行在 `local-dry-run` 模式。
- `WORKBENCH_ROOT` 用于确定项目根目录；文件路径必须留在该目录内。
- API Key 只从后端环境变量读取，MCP 配置和状态文件不保存密钥值。
- `agent-runtime/` 是本地运行状态目录，不应提交到 Git。
- 真实 MiniMax / HeyGen 请求由后端适配层控制，MCP Server 不会隐式触发付费调用。

更多客户端配置见 [`clients.md`](./clients.md)。
