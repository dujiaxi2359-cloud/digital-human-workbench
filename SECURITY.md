# Security Policy

## 不要公开提交

请不要在 Issue、Pull Request、截图或日志中提交 API Key、Authorization
Header、Cookie、签名 URL、私有肖像、声音样本或真实客户数据。

## 报告方式

如果问题可能导致密钥泄露、越权调用、绕过审批或读取工作区外文件，请优先使用 GitHub 的 Private Vulnerability Reporting；如果仓库尚未开启，请联系维护者后再公开描述。

报告应包含受影响版本、复现步骤、影响范围和安全的最小复现，不要包含真实密钥。

## 当前安全边界

- 默认 `ALLOW_PAID_GENERATION=false`。
- API Key 只从环境变量读取，不写入浏览器配置或运行时配置文件。
- 最终视频必须经过预览审批。
- 本地文件路径必须位于工作台根目录内。
