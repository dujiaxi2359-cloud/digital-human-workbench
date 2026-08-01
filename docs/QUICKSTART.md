# 快速开始

这份文档带你从下载安装到完成一次本地 dry-run。第一次使用不需要 API Key，也不会产生付费调用。

## 1. 安装依赖

需要 Node.js 20 或更高版本；如果要连接 Agent，再准备 Python 3.10 或更高版本。

```bash
git clone https://github.com/dujiaxi2359-cloud/digital-human-workbench.git
cd digital-human-workbench
npm install
```

## 2. 启动服务

启动本地 API：

```bash
npm run server
```

保持这个终端运行，再打开第二个终端启动前端：

```bash
cd /absolute/path/to/digital-human-workbench
npm run dev
```

打开 <http://127.0.0.1:5173/>。页面打不开时，先确认两个终端都没有报错。

## 3. 完成一次本地流程

工作台的完整顺序是：

```text
素材准备 → 素材检查 → 旁白 → 15 秒预览 → 审批确认 → 最终成片
```

建议第一次这样操作：

1. 打开“数字人工作台”，进入默认项目。
2. 在“生成中心”使用演示素材，或导入自己的肖像、声音和脚本。
3. 点击“开始检查”，确认三类素材状态为已通过。
4. 进入旁白阶段，生成或准备旁白。
5. 生成 15 秒预览，检查人物形象、声音、字幕和画面。
6. 点击审批确认；未审批不能进入最终成片。
7. 进入最终成片阶段，查看输出状态和项目记录。

没有真实服务密钥时，工作台会展示本地 dry-run 结果，用来验证流程、门禁、状态和 Agent 接入。

## 4. 配置真实服务

复制环境变量模板：

```bash
cp .env.example .env
```

编辑 `.env`：

```env
PORT=3001
ALLOW_PAID_GENERATION=false
MINIMAX_API_KEY=
HEYGEN_API_KEY=
```

只有在确认会产生真实服务调用并获得用户授权后，才填写对应密钥并改为：

```env
ALLOW_PAID_GENERATION=true
```

然后重启后端：

```bash
npm run server
```

API Key 只放在本地环境变量中，不要写进前端配置、MCP JSON、截图或 Git 提交。

## 5. 接入 Agent

MCP Server 使用标准 stdio：

```bash
python3 mcp/digital_human_server.py
```

Codex 可直接读取仓库根目录的 `.mcp.json`；Claude Desktop、Hermes 和 WorkBuddy 使用同一份绝对路径配置。完整内容见 [`../agent/clients.md`](../agent/clients.md)。

连接后先让 Agent 执行：

```text
读取工作台状态 → 执行素材预检 → 只准备 15 秒预览 → 等待人工审批
```

## 6. 生产构建

验证前端构建：

```bash
npm run build
npm run preview
```

## 7. 常见问题

### 端口被占用

前端端口由 Vite 自动提示；后端默认使用 3001，可通过 `.env` 中的 `PORT` 修改。

### 页面显示但按钮报错

确认后端服务仍在运行，并刷新页面。前端默认访问本地 API；不要只启动 Vite 而忘记 `npm run server`。

### 想恢复初始状态

停止服务后，删除 `agent-runtime/` 内的本地运行状态文件，再重新启动。不要删除源代码或 `rachel-skill/`。
