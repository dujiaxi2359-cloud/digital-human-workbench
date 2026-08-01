# 多 Agent 客户端接入

数字人工作台使用标准 MCP stdio，不绑定某一个 Agent 产品。只要客户端支持本地 MCP Server，就可以接入同一个 `digital-human-workbench` 服务，共享同一份项目状态。

## 前置条件

先完成工作台安装，并确认以下命令可以运行：

```bash
cd /absolute/path/to/digital-human-workbench
python3 --version
python3 mcp/digital_human_server.py
```

将下面两个路径替换为你电脑上的真实绝对路径：

- `WORKBENCH_ROOT`：工作台仓库根目录
- `mcp/digital_human_server.py`：MCP Server 文件

## 通用配置

把下面的 `mcpServers.digital-human-workbench` 合并到客户端的 MCP 配置文件：

```json
{
  "mcpServers": {
    "digital-human-workbench": {
      "command": "python3",
      "args": [
        "/absolute/path/to/digital-human-workbench/mcp/digital_human_server.py"
      ],
      "env": {
        "WORKBENCH_ROOT": "/absolute/path/to/digital-human-workbench"
      }
    }
  }
}
```

## 客户端说明

### Codex

在项目根目录打开 Codex。根目录的 [`.mcp.json`](../.mcp.json) 已经提供默认配置；如果客户端没有自动加载，复制通用配置并改成绝对路径。

### Claude Desktop

将通用配置合并到 Claude Desktop 的 MCP 配置文件，重启 Claude Desktop，然后在新会话中确认工具列表出现 `digital-human-workbench`。

### Hermes

在 Hermes 的 MCP / stdio Server 配置中新增一个服务，使用通用配置中的 `command`、`args` 和 `WORKBENCH_ROOT`。不要把 Python 脚本复制成第二份。

### WorkBuddy

在 WorkBuddy 的 MCP Server 配置中新增同名服务，使用同一条 `command`、`args` 和 `WORKBENCH_ROOT`。连接成功后，Agent 直接读取工作台状态即可。

> 不同客户端的配置文件位置和 UI 名称可能随版本变化；如果客户端支持导入 JSON，优先导入上面的通用配置。

## 第一次调用

连接成功后，让 Agent 按以下顺序调用：

1. `digital_human_get_status`：确认 Skill、MCP 和项目状态已读取。
2. `digital_human_preflight_assets`：传入脚本、肖像和声音的相对路径。
3. `digital_human_prepare_stage`：准备 `narration`、`preview` 或 `final` 阶段。
4. `digital_human_approve_preview`：只有用户确认预览后才传入 `approved: true`。
5. `digital_human_sync_workflow`：把页面进度同步回 Agent 状态。
6. `digital_human_handoff`：把下一步任务投递到工作台 inbox。

示例提示词：

```text
读取数字人工作台当前状态，先执行素材预检。
如果预检通过，只准备 15 秒预览，不要调用付费 API。
把结果和下一步动作写入工作台状态。
```

## 排查连接问题

- **没有工具**：确认客户端已重启，并检查 Server 的绝对路径。
- **找不到文件**：确认 `WORKBENCH_ROOT` 指向仓库根目录，而不是 `mcp/` 子目录。
- **状态不一致**：所有客户端必须连接同一个 `WORKBENCH_ROOT`，不要复制出多份工作台。
- **误触发真实调用**：确认后端 `ALLOW_PAID_GENERATION=false`，并重新启动 `npm run server`。
