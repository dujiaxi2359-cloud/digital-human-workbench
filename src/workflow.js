const requiredAssetKeys = ['portrait', 'sourceVoice', 'script']

export function hasRequiredAssets(assets) {
  return requiredAssetKeys.every((key) => {
    const asset = assets.find((item) => item.key === key)
    return asset && asset.status !== '未开始'
  })
}

export function getWorkflowAction({ assets, preflightStatus, narrationStatus, previewStatus, approved, finalStatus }) {
  if (!hasRequiredAssets(assets)) return { key: 'assets', label: '补齐素材', description: '导入数字人形象、声音样本和脚本后继续。', disabled: false }
  if (preflightStatus === 'running') return { key: 'preflight-busy', label: '素材检查中…', description: '正在检查格式、大小、完整性和授权状态。', disabled: true }
  if (preflightStatus !== 'passed') return { key: 'preflight', label: '开始素材检查', description: '先检查格式、大小、完整性和授权状态。', disabled: false }
  if (narrationStatus === 'generating') return { key: 'narration-busy', label: '克隆旁白生成中…', description: '正在准备 MiniMax 旁白和 15 秒音频。', disabled: true }
  if (narrationStatus !== 'completed') return { key: 'narration', label: '生成克隆旁白', description: '按 Skill 配置生成 MiniMax 旁白并准备 15 秒音频。', disabled: false }
  if (previewStatus === 'generating') return { key: 'preview-busy', label: '预览生成中…', description: '正在等待 15 秒预览任务完成。', disabled: true }
  if (previewStatus !== 'ready') return { key: 'preview', label: '生成 15 秒预览', description: '使用 HeyGen 预览配置生成低分辨率样片。', disabled: false }
  if (!approved) return { key: 'approval', label: '打开审批中心', description: '确认口型、声音、构图和脚本后解锁全片。', disabled: false }
  if (finalStatus === 'generating') return { key: 'final-busy', label: '最终视频生成中…', description: '正在等待 1080P 成片任务完成。', disabled: true }
  if (finalStatus !== 'done') return { key: 'final', label: '生成最终视频', description: '仅在预览审批通过后生成 1080P 成片。', disabled: false }
  return { key: 'done', label: '查看成片库', description: '最终视频已完成，可进入成片库查看。', disabled: false }
}

export function getStageState({ stage, preflightStatus, narrationStatus, previewStatus, approved, finalStatus }) {
  if (stage === 'assets') return preflightStatus === 'passed' ? 'done' : 'active'
  if (stage === 'voice') return narrationStatus === 'completed' ? 'done' : preflightStatus === 'passed' ? 'active' : 'idle'
  if (stage === 'preview') return previewStatus === 'ready' ? 'done' : narrationStatus === 'completed' ? 'active' : 'idle'
  if (stage === 'approval') return approved ? 'done' : previewStatus === 'ready' ? 'active' : 'idle'
  return finalStatus === 'done' ? 'done' : approved ? 'active' : 'idle'
}
