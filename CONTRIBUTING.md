# Contributing

感谢参与数字人工作台。提交 Issue 或 Pull Request 前，请先确认：

- 不提交 API Key、Cookie、私有素材、真实声音样本、真实客户状态、签名 URL 或付费生成结果。
- 新增代码遵循仓库的 PolyForm Noncommercial License；`rachel-skill/` 继续遵循其独立 MIT 许可证。
- 任何真实提供商调用都必须保持显式确认、预览审批和 dry-run 默认门禁。
- 变更后至少运行 `npm run build`、`node --check server/index.mjs` 和 `python3 -m py_compile mcp/digital_human_server.py`。
- UI 变更请在 Pull Request 中说明测试页面、交互路径和已知限制。

提交 Pull Request 即表示你有权提交这些内容，并同意项目维护者按适用许可证发布你的贡献。项目不要求把第三方素材或密钥带入仓库。
