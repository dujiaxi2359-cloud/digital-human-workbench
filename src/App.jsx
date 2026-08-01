import { useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  Bell,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clapperboard,
  Clock3,
  FileAudio2,
  FileImage,
  FileText,
  FolderOpen,
  Image,
  LayoutDashboard,
  Menu,
  Mic2,
  MoreHorizontal,
  Pencil,
  Palette,
  Play,
  Plus,
  RefreshCw,
  Save,
  ScrollText,
  Send,
  Settings2,
  ShieldCheck,
  UploadCloud,
  UsersRound,
  X,
} from 'lucide-react'
import SpotlightCard from './components/SpotlightCard.jsx'
import { getProviderReadiness, persistModelConfig, readModelConfig } from './model-config.js'
import { getStageState, getWorkflowAction, hasRequiredAssets } from './workflow.js'

const navItems = [
  { label: '项目中心', icon: LayoutDashboard },
  { label: '素材管理', icon: FolderOpen },
  { label: '数字人管理', icon: UsersRound },
  { label: '语音管理', icon: Mic2 },
  { label: '脚本管理', icon: FileText },
  { label: '制作任务', icon: Clapperboard },
  { label: '审批中心', icon: ShieldCheck },
  { label: '成片库', icon: Play },
  { label: '数据看板', icon: LayoutDashboard },
  { label: '系统设置', icon: Settings2 },
  { label: 'Agent 配置', icon: Bot },
]

const workflowStages = [
  { key: 'assets', number: '01', label: '素材检查', detail: '数字人、语音、脚本' },
  { key: 'voice', number: '02', label: '克隆配音', detail: '生成专属音色' },
  { key: 'preview', number: '03', label: '15秒预览', detail: '确认口型与节奏' },
  { key: 'approval', number: '04', label: '审批确认', detail: '内容审核与确认' },
  { key: 'final', number: '05', label: '成片生成', detail: '输出最终视频' },
]

const generationModes = [
  {
    key: 'avatar',
    label: '数字人形象',
    title: '生成一个可复用的数字人形象',
    description: '输入人物设定，生成头像、半身像和适合口播的正面构图。',
    icon: Image,
    action: '生成人物形象',
  },
  {
    key: 'voice',
    label: '音色与旁白',
    title: '生成旁白或创建授权音色',
    description: '可用内置音色直接生成，也可以上传已获授权的声音样本进行克隆。',
    icon: Mic2,
    action: '生成试听音频',
  },
  {
    key: 'script',
    label: '脚本内容',
    title: '从主题开始生成口播脚本',
    description: '支持产品介绍、知识科普、培训讲解和短视频口播结构。',
    icon: ScrollText,
    action: '生成脚本初稿',
  },
  {
    key: 'visual',
    label: '视觉包装',
    title: '生成背景、封面与字幕风格',
    description: '一键补齐画面背景、封面候选和适合平台的字幕包装。',
    icon: Palette,
    action: '生成视觉方案',
  },
]

const initialActivity = [
  { time: '今天 11:06', actor: '你', action: '提交审批', status: '待审批', note: '等待预览确认' },
  { time: '今天 11:05', actor: '系统', action: '生成 15 秒预览', status: '已完成', note: '时长 00:15 · 720P' },
  { time: '今天 10:55', actor: '你', action: '完成克隆配音', status: '已完成', note: '中文 · 知性女声' },
  { time: '今天 10:40', actor: '系统', action: '素材检查通过', status: '已完成', note: '数字人、脚本、音频' },
]

const initialAssets = [
  {
    key: 'portrait',
    title: '数字人形象',
    label: '视觉资产',
    status: '已通过',
    icon: FileImage,
    meta: ['知性女声 · 商务版', '1080P', '正面半身构图'],
    kind: 'image',
  },
  {
    key: 'sourceVoice',
    title: '语音来源',
    label: '声音样本',
    status: '已就绪',
    icon: FileAudio2,
    meta: ['知性女声 · 试听样本', '00:28', '中文普通话'],
    kind: 'audio',
  },
  {
    key: 'script',
    title: '脚本文案',
    label: '内容资产',
    status: '已通过',
    icon: FileText,
    meta: ['产品介绍 · 口播版', '86 字', '预计 00:15'],
    kind: 'script',
  },
  {
    key: 'voiceover',
    title: '旁白（克隆结果）',
    label: '音频资产',
    status: '已完成',
    icon: FileAudio2,
    meta: ['知性女声 · 1.0x', '00:21', '可用于预览'],
    kind: 'audio',
  },
  {
    key: 'preview',
    title: '预览（15秒结果）',
    label: '视频资产',
    status: '已完成',
    icon: Clapperboard,
    meta: ['00:15', '720P', '待审批'],
    kind: 'preview',
  },
  {
    key: 'visualPackage',
    title: '视觉包装方案',
    label: '包装资产',
    status: '未开始',
    icon: Palette,
    meta: ['封面、字幕与背景', '3 个候选', '等待生成'],
    kind: 'visual',
  },
  {
    key: 'final',
    title: '成片（最终输出）',
    label: '视频资产',
    status: '未开始',
    icon: Clapperboard,
    meta: ['—', '1080P', '审批通过后生成'],
    kind: 'empty',
  },
]

function StatusDot({ tone = 'success' }) {
  return <span className={`status-dot status-dot-${tone}`} aria-hidden="true" />
}

function StatusLabel({ children, tone = 'success' }) {
  return (
    <span className={`status-label status-label-${tone}`}>
      <StatusDot tone={tone} />
      {children}
    </span>
  )
}

function Stepper({ currentStage, setCurrentStage, preflightStatus, narrationStatus, previewStatus, approved, finalStatus }) {
  return (
    <section className="stepper-panel" aria-label="制作流程">
      {workflowStages.map((stage, index) => {
        const state = getStageState({ stage: stage.key, preflightStatus, narrationStatus, previewStatus, approved, finalStatus })
        return (
          <div className="stepper-item" key={stage.key}>
            <button
              className={`stepper-button stepper-button-${state} ${currentStage === stage.key ? 'is-selected' : ''}`}
              onClick={() => setCurrentStage(stage.key)}
            >
              <span className="step-number">{state === 'done' ? <Check size={15} /> : stage.number}</span>
              <span className="step-copy">
                <strong>{stage.label}</strong>
                <small>{state === 'active' ? '当前处理' : stage.detail}</small>
              </span>
            </button>
            {index < workflowStages.length - 1 && <ArrowRight className="stepper-arrow" size={18} />}
          </div>
        )
      })}
    </section>
  )
}

function AudioWave({ compact = false }) {
  const heights = [18, 28, 14, 36, 24, 46, 30, 52, 22, 38, 26, 48, 32, 20, 42, 26, 34, 16, 28, 22, 44, 24, 36, 18, 30, 20, 40, 26]
  return (
    <div className={`audio-wave ${compact ? 'audio-wave-compact' : ''}`} aria-label="音频波形预览">
      {heights.map((height, index) => <span key={`${height}-${index}`} style={{ height }} />)}
    </div>
  )
}

function AssetCard({ asset, onOpen }) {
  const Icon = asset.icon
  return (
    <SpotlightCard className="asset-card-spotlight">
      <article className={`asset-card asset-card-${asset.kind}`}>
      <div className="asset-card-head">
        <div>
          <span className="eyebrow">{asset.label}</span>
          <h3>{asset.title}</h3>
        </div>
        <StatusLabel tone={asset.status === '未开始' ? 'neutral' : 'success'}>{asset.status}</StatusLabel>
      </div>
      {asset.kind === 'image' && <img className="asset-portrait" src="/demo-avatar.svg" alt="演示数字人肖像" />}
      {asset.kind === 'audio' && (
        <div className="audio-preview">
          <button className="icon-button icon-button-dark" aria-label="播放音频"><Play size={17} fill="currentColor" /></button>
          <AudioWave />
        </div>
      )}
      {asset.kind === 'script' && (
        <div className="script-preview">
          <p>大家好，欢迎了解我们的产品。<br />我们致力于为客户提供高效、稳定、智能的解决方案。</p>
          <span>86 字</span>
        </div>
      )}
      {asset.kind === 'preview' && (
        <div className="video-preview">
          <img src="/demo-avatar.svg" alt="15秒预览封面" />
          <button className="video-play" aria-label="播放预览"><Play size={22} fill="currentColor" /></button>
          <div className="video-time"><span>00:00</span><span>00:15</span></div>
        </div>
      )}
      {asset.kind === 'visual' && (
        <div className="visual-preview"><div className="visual-preview-swatch" /><div><strong>Clean Studio</strong><span>浅色背景 · 蓝色强调 · 现代字幕</span></div><Palette size={22} /></div>
      )}
      {asset.kind === 'empty' && (
        <div className="empty-video"><Clapperboard size={35} strokeWidth={1.5} /><span>审批后生成最终视频</span></div>
      )}
      <div className="asset-meta">
        {asset.meta.map((item) => <span key={item}>{item}</span>)}
      </div>
      <button className="outline-button asset-action" onClick={() => onOpen(asset)}>
        {asset.kind === 'empty' ? '查看生成条件' : '查看详情'}
        <ArrowRight size={14} />
      </button>
      </article>
    </SpotlightCard>
  )
}

function GenerationPanel({ mode, setMode, isBusy, onGenerate, onClose }) {
  const current = generationModes.find((item) => item.key === mode) || generationModes[0]
  const Icon = current.icon
  return (
    <aside className="generation-panel" aria-label="素材生成中心">
      <div className="panel-heading">
        <div>
          <span className="eyebrow eyebrow-accent">一站式素材工坊</span>
          <h2>生成中心</h2>
        </div>
        <button className="icon-button" onClick={onClose} aria-label="关闭生成中心"><X size={18} /></button>
      </div>
      <p className="panel-intro">能在工作台里完成的素材，都可以从这里直接生成并回填到当前项目。</p>
      <div className="generation-tabs">
        {generationModes.map((item) => {
          const TabIcon = item.icon
          return (
            <button className={mode === item.key ? 'generation-tab is-active' : 'generation-tab'} onClick={() => setMode(item.key)} key={item.key}>
              <TabIcon size={16} />
              {item.label}
            </button>
          )
        })}
      </div>
      <div className="generation-form">
        <div className="generation-icon"><Icon size={22} /></div>
        <h3>{current.title}</h3>
        <p>{current.description}</p>
        <label className="field-label" htmlFor="generation-prompt">生成要求</label>
        <textarea id="generation-prompt" defaultValue={mode === 'script' ? '为一款面向企业客户的 AI 工作流产品，生成一段 15 秒中文口播。' : mode === 'avatar' ? '专业、可信、自然的商务女性数字人，正面半身，浅色背景。' : '语气自然、语速适中，适合中文产品介绍。'} rows={4} />
        <div className="generation-note"><CircleHelp size={14} />演示模式：生成结果会先写入本地项目，不会调用付费 API。</div>
        <button className="primary-button full-width" onClick={onGenerate} disabled={isBusy}>
          {isBusy ? <><RefreshCw size={16} className="spin" />生成中…</> : <><ArrowRight size={16} />{current.action}</>}
        </button>
      </div>
      <div className="panel-footnote"><ShieldCheck size={15} />声音克隆仅适用于你拥有或获授权的声音样本。</div>
    </aside>
  )
}

function ModelConfigModule({ config, onSave, onToast }) {
  const [draft, setDraft] = useState(config)
  const readiness = getProviderReadiness(draft)
  const update = (section, key, value) => setDraft((current) => ({ ...current, [section]: { ...current[section], [key]: value } }))
  const save = () => {
    onSave(draft)
    onToast('模型配置已保存到当前浏览器。')
  }
  return (
    <>
      <div className="module-toolbar"><div><span className="eyebrow">Model routing</span><h3>模型配置中心</h3><p>配置 Skill 使用的模型、分辨率和密钥环境变量。密钥不会写入浏览器。</p></div><button className="primary-button" onClick={save}><Save size={15} />保存配置</button></div>
      <div className="config-section"><div className="config-section-heading"><div><strong>MiniMax · 克隆旁白</strong><span>用于音色克隆、中文旁白和 15 秒预览音频。</span></div><StatusLabel tone={readiness.minimax ? 'success' : 'neutral'}>{readiness.minimax ? '已配置' : '待配置'}</StatusLabel></div><div className="config-grid"><label><span>模型</span><select value={draft.minimax.model} onChange={(event) => update('minimax', 'model', event.target.value)}><option value="speech-2.8-hd">speech-2.8-hd</option><option value="speech-2.6-hd">speech-2.6-hd</option></select></label><label><span>Base URL</span><input value={draft.minimax.baseUrl} onChange={(event) => update('minimax', 'baseUrl', event.target.value)} /></label><label><span>密钥环境变量</span><input value={draft.minimax.keyEnv} onChange={(event) => update('minimax', 'keyEnv', event.target.value)} /></label><label className="config-toggle"><span>已在运行环境配置密钥</span><input type="checkbox" checked={draft.minimax.configured} onChange={(event) => update('minimax', 'configured', event.target.checked)} /></label></div></div>
      <div className="config-section"><div className="config-section-heading"><div><strong>HeyGen · 数字人视频</strong><span>使用 MiniMax 音频驱动 Image-to-Video，预览先用低分辨率。</span></div><StatusLabel tone={readiness.heygen ? 'success' : 'neutral'}>{readiness.heygen ? '已配置' : '待配置'}</StatusLabel></div><div className="config-grid"><label><span>视频模型</span><select value={draft.heygen.model} onChange={(event) => update('heygen', 'model', event.target.value)}><option value="avatar_iv">avatar_iv</option><option value="photo_avatar">photo_avatar</option></select></label><label><span>预览分辨率</span><select value={draft.heygen.previewResolution} onChange={(event) => update('heygen', 'previewResolution', event.target.value)}><option value="720p">720p</option><option value="1080p">1080p</option></select></label><label><span>最终分辨率</span><select value={draft.heygen.finalResolution} onChange={(event) => update('heygen', 'finalResolution', event.target.value)}><option value="1080p">1080p</option><option value="720p">720p</option></select></label><label><span>密钥环境变量</span><input value={draft.heygen.keyEnv} onChange={(event) => update('heygen', 'keyEnv', event.target.value)} /></label><label className="config-toggle"><span>已在运行环境配置密钥</span><input type="checkbox" checked={draft.heygen.configured} onChange={(event) => update('heygen', 'configured', event.target.checked)} /></label></div></div>
      <div className="config-section"><div className="config-section-heading"><div><strong>流程门禁</strong><span>按照 rachel Skill 强制预览审批，避免未经确认直接生成全片。</span></div><StatusLabel>{draft.runtime.requirePreviewApproval ? '已开启' : '已关闭'}</StatusLabel></div><div className="settings-list"><label><span><strong>必须完成 15 秒预览审批</strong><small>审批通过后才允许生成最终 1080P 视频</small></span><input type="checkbox" checked={draft.runtime.requirePreviewApproval} onChange={(event) => update('runtime', 'requirePreviewApproval', event.target.checked)} /></label><label><span><strong>要求素材授权确认</strong><small>声音克隆和数字人发布前保留授权门槛</small></span><input type="checkbox" checked={draft.runtime.requireAuthorizedAssets} onChange={(event) => update('runtime', 'requireAuthorizedAssets', event.target.checked)} /></label></div></div>
      <div className="config-note"><CircleHelp size={15} /><span>当前页面默认运行在“本地演示”模式，不会发起付费 API 请求。完成后端适配并配置环境变量，流程状态机可以沿用同一套门禁。</span></div>
    </>
  )
}

function AgentConfigModule({ onToast, onHandoff }) {
  const [skillEnabled, setSkillEnabled] = useState(true)
  const [mcpEnabled, setMcpEnabled] = useState(true)
  const [paidConfirmation, setPaidConfirmation] = useState(true)
  const [handoffPrompt, setHandoffPrompt] = useState('$rachel-digital-human-production\n请读取当前项目状态，按素材检查、克隆旁白、15 秒预览、审批、成片的门禁执行。任何付费 API 调用前先向我确认。')
  return (
    <>
      <div className="module-toolbar"><div><span className="eyebrow">Agent runtime</span><h3>Agent 配置</h3><p>让 Agent 按需读取 Rachel Skill，并通过 MCP 调用工作流工具。</p></div><StatusLabel>{skillEnabled && mcpEnabled ? '已就绪' : '待配置'}</StatusLabel></div>
      <div className="agent-config-card"><div className="agent-config-card-head"><div className="agent-config-icon"><Bot size={20} /></div><div><strong>数字人工作台 Agent</strong><span>Skill + MCP orchestration</span></div><StatusLabel>本地安全模式</StatusLabel></div><div className="agent-config-row"><div><strong>Rachel Digital Human Production</strong><span>显式调用：$rachel-digital-human-production</span><small>rachel-skill/SKILL.md · 预览审批门禁已开启</small></div><label className="agent-switch"><input type="checkbox" checked={skillEnabled} onChange={(event) => setSkillEnabled(event.target.checked)} /><i /></label></div><div className="agent-config-row"><div><strong>digital-human-workbench MCP</strong><span>本地命令：python3 mcp/digital_human_server.py</span><small>8 个工具 · 2 个资源 · Content-Length stdio transport</small></div><label className="agent-switch"><input type="checkbox" checked={mcpEnabled} onChange={(event) => setMcpEnabled(event.target.checked)} /><i /></label></div></div>
      <div className="agent-tool-grid"><div><span className="eyebrow">Registered tools</span><strong>8 个 MCP 工具</strong><p>状态读取、素材预检、模型配置、阶段准备、预览审批、任务收取、投递与状态同步。</p></div><div><span className="eyebrow">Registered resources</span><strong>2 个 MCP 资源</strong><p>Rachel Skill 文档与工作流配置状态。</p></div></div>
      <div className="config-section"><div className="config-section-heading"><div><strong>Agent 安全策略</strong><span>默认只允许 dry-run，涉及付费生成时必须由用户明确确认。</span></div><StatusLabel>{paidConfirmation ? '已保护' : '有风险'}</StatusLabel></div><div className="settings-list"><label><span><strong>付费阶段需要明确确认</strong><small>MiniMax 克隆和 HeyGen 视频生成不会被隐式调用</small></span><input type="checkbox" checked={paidConfirmation} onChange={(event) => setPaidConfirmation(event.target.checked)} /></label><label><span><strong>不保存 API Key</strong><small>只记录环境变量名，不把密钥写进前端或状态文件</small></span><input type="checkbox" checked readOnly /></label></div></div>
      <div className="config-section"><div className="config-section-heading"><div><strong>直接交给 Agent</strong><span>任务会写入本地 agent-runtime/inbox.json，Agent 可通过 MCP 读取并继续执行。</span></div><StatusLabel>可投递</StatusLabel></div><textarea className="agent-handoff-editor" value={handoffPrompt} onChange={(event) => setHandoffPrompt(event.target.value)} /><div className="module-actions"><button className="primary-button" onClick={() => onHandoff(handoffPrompt)}><Bot size={15} />交给 Agent 执行</button><button className="outline-button" onClick={() => { navigator.clipboard?.writeText(handoffPrompt); onToast('Agent 指令已复制。') }}><ArrowRight size={15} />复制指令</button></div></div>
      <div className="module-actions"><button className="primary-button" onClick={() => onToast('Agent 配置已保存。')}><Bot size={15} />保存 Agent 配置</button><button className="outline-button" onClick={() => onToast('MCP 自检通过：配置文件、Skill 和工具清单均可读取。')}><CheckCircle2 size={15} />运行 MCP 自检</button></div>
    </>
  )
}

function ModuleWorkspace({ module, assets, activity, approved, modelConfig, onSaveModelConfig, onHandoff, onClose, onOpenGeneration, onImport, onApprove, onToast }) {
  const [script, setScript] = useState('大家好，欢迎了解我们的产品。\n我们致力于为客户提供高效、稳定、智能的解决方案。')
  const [settings, setSettings] = useState({ autoSave: true, notifications: true })
  const visibleAssets = assets.filter((asset) => ['portrait', 'sourceVoice', 'script'].includes(asset.key))

  const renderModule = () => {
    if (module === '素材管理') return (
      <>
        <div className="module-toolbar"><div><span className="eyebrow">Asset library</span><h3>项目素材</h3><p>所有已导入和生成的素材都集中在这里。</p></div><button className="primary-button" onClick={() => onImport('portrait')}><UploadCloud size={15} />导入素材</button></div>
        <div className="module-asset-list">{assets.map((asset) => <div className="module-asset-row" key={asset.key}><div className="module-asset-thumb">{asset.kind === 'image' ? <img src="/demo-avatar.svg" alt="数字人肖像" /> : asset.kind === 'preview' ? <img src="/demo-avatar.svg" alt="视频预览" /> : <asset.icon size={20} />}</div><div className="module-asset-copy"><strong>{asset.title}</strong><span>{asset.label} · {asset.meta[0]}</span></div><StatusLabel tone={asset.status === '未开始' ? 'neutral' : 'success'}>{asset.status}</StatusLabel><button className="icon-button" onClick={() => onToast(`${asset.title}已选中，可在项目中继续编辑。`)} aria-label={`选择${asset.title}`}><ArrowRight size={15} /></button></div>)}</div>
      </>
    )
    if (module === '数字人管理') return (
      <>
        <div className="module-toolbar"><div><span className="eyebrow">Avatar library</span><h3>数字人管理</h3><p>管理可复用的人物形象和口播构图。</p></div><button className="primary-button" onClick={() => onOpenGeneration('avatar')}><Plus size={15} />新建数字人</button></div>
        <div className="module-profile-card"><img src="/demo-avatar.svg" alt="演示数字人" /><div><StatusLabel>已通过</StatusLabel><h4>知性女声 · 商务版</h4><p>1080P · 正面半身构图 · 当前项目使用中</p><div className="module-actions"><button className="outline-button" onClick={() => onToast('数字人预览已准备。')}><Play size={14} />预览</button><button className="outline-button" onClick={() => onOpenGeneration('avatar')}>生成新版本</button></div></div></div>
      </>
    )
    if (module === '语音管理') return (
      <>
        <div className="module-toolbar"><div><span className="eyebrow">Voice library</span><h3>语音管理</h3><p>试听内置音色，或导入已获授权的声音样本。</p></div><button className="primary-button" onClick={() => onOpenGeneration('voice')}><Plus size={15} />添加音色</button></div>
        <div className="module-voice-card"><div className="module-voice-icon"><Mic2 size={19} /></div><div className="module-asset-copy"><StatusLabel>已就绪</StatusLabel><strong>知性女声 · 中文普通话</strong><span>试听样本 00:28 · 当前项目使用中</span></div><button className="icon-button icon-button-dark" onClick={() => onToast('正在播放试听样本。')} aria-label="播放试听"><Play size={16} fill="currentColor" /></button><AudioWave compact /></div>
      </>
    )
    if (module === '脚本管理') return (
      <>
        <div className="module-toolbar"><div><span className="eyebrow">Script editor</span><h3>脚本管理</h3><p>在生成预览前直接调整口播内容。</p></div><button className="primary-button" onClick={() => { onToast('脚本已保存到当前项目。'); }}><Save size={15} />保存脚本</button></div>
        <label className="module-field-label" htmlFor="module-script">当前口播脚本</label><textarea id="module-script" className="module-script-editor" value={script} onChange={(event) => setScript(event.target.value)} /><div className="module-editor-footer"><span>{script.length} 字 · 预计 00:15</span><button className="outline-button" onClick={() => onOpenGeneration('script')}><ScrollText size={14} />生成新初稿</button></div>
      </>
    )
    if (module === '制作任务') return (
      <>
        <div className="module-toolbar"><div><span className="eyebrow">Production queue</span><h3>制作任务</h3><p>查看素材检查、预览和成片任务的进度。</p></div><button className="primary-button" onClick={() => onOpenGeneration('visual')}><Plus size={15} />新建任务</button></div>
        <div className="module-task-list">{activity.map((item, index) => <div className="module-task-row" key={`${item.time}-${index}`}><span className="task-index">0{index + 1}</span><div><strong>{item.action}</strong><span>{item.time} · {item.note}</span></div><StatusLabel tone={item.status === '处理中' || item.status === '待审批' ? 'warning' : 'success'}>{item.status}</StatusLabel></div>)}</div>
      </>
    )
    if (module === '审批中心') return (
      <>
        <div className="module-toolbar"><div><span className="eyebrow">Approval desk</span><h3>审批中心</h3><p>确认预览内容后，才能解锁最终视频生成。</p></div><StatusLabel tone={approved ? 'success' : 'warning'}>{approved ? '已通过' : '待审批'}</StatusLabel></div>
        <div className="approval-workspace"><div className="approval-workspace-preview"><img src="/demo-avatar.svg" alt="15秒预览封面" /><button className="video-play" onClick={() => onToast('正在播放 15 秒预览。')} aria-label="播放预览"><Play size={22} fill="currentColor" /></button><div className="video-time"><span>00:00</span><span>00:15</span></div></div><div className="module-checks"><strong><ShieldCheck size={16} />审批检查清单</strong><label><input type="checkbox" defaultChecked />人物口型与声音同步</label><label><input type="checkbox" defaultChecked />脚本内容准确完整</label><label><input type="checkbox" defaultChecked />画面构图适合发布</label><button className="primary-button full-width" onClick={onApprove} disabled={approved}><Check size={15} />{approved ? '已通过预览' : '通过预览并解锁成片'}</button></div></div>
      </>
    )
    if (module === '成片库') return (
      <>
        <div className="module-toolbar"><div><span className="eyebrow">Output library</span><h3>成片库</h3><p>集中查看预览结果与最终导出文件。</p></div><button className="outline-button" onClick={() => onToast('当前暂无可导出的最终文件。')}><FolderOpen size={15} />打开文件夹</button></div>
        <div className="module-output-grid"><div className="module-output-card"><div className="video-preview"><img src="/demo-avatar.svg" alt="15秒预览" /><button className="video-play" onClick={() => onToast('正在播放 15 秒预览。')} aria-label="播放15秒预览"><Play size={22} fill="currentColor" /></button></div><strong>15 秒预览</strong><span>720P · 待审批</span></div><div className="module-output-card is-empty"><div className="empty-video"><Clapperboard size={34} strokeWidth={1.5} /><span>通过审批后生成最终视频</span></div><strong>最终成片</strong><span>1080P · 尚未生成</span></div></div>
      </>
    )
    if (module === '数据看板') return (
      <>
        <div className="module-toolbar"><div><span className="eyebrow">Project analytics</span><h3>数据看板</h3><p>用几个关键数字掌握本项目的制作状态。</p></div><button className="outline-button" onClick={() => onToast('数据已刷新。')}><RefreshCw size={14} />刷新数据</button></div>
        <div className="metric-grid"><div><span>素材就绪</span><strong>{assets.filter((asset) => asset.status !== '未开始').length}/6</strong><small>当前项目</small></div><div><span>预览时长</span><strong>00:15</strong><small>720P</small></div><div><span>审批状态</span><strong>{approved ? '通过' : '待审'}</strong><small>内容质检</small></div><div><span>制作步骤</span><strong>3/5</strong><small>当前阶段</small></div></div>
      </>
    )
    if (module === 'Agent 配置') return <AgentConfigModule onToast={onToast} onHandoff={onHandoff} />
    return <ModelConfigModule config={modelConfig} onSave={onSaveModelConfig} onToast={onToast} />
  }

  return <div className="workspace-overlay" role="dialog" aria-modal="true" aria-label={module}><section className="module-workspace"><header className="module-heading"><div><span className="eyebrow eyebrow-accent">Digital human workbench</span><h2>{module}</h2></div><button className="icon-button" onClick={onClose} aria-label="关闭模块"><X size={19} /></button></header>{renderModule()}</section></div>
}

function QuickPanel({ type, onClose, onOpenModule, onToast }) {
  if (type === 'notifications') return <div className="quick-panel notifications-panel"><div className="quick-panel-heading"><strong>通知</strong><button className="icon-button" onClick={onClose}><X size={16} /></button></div><div className="notification-item is-new"><i /><div><strong>预览等待审批</strong><span>15 秒预览已完成，请确认口型和内容。</span><button onClick={() => { onOpenModule('审批中心'); onClose(); }}>去处理</button></div></div><div className="notification-item"><i /><div><strong>素材检查已通过</strong><span>数字人、声音和脚本均已准备。</span></div></div><div className="notification-item"><i /><div><strong>草稿已自动保存</strong><span>刚刚保存到本地项目。</span></div></div></div>
  if (type === 'help') return <div className="quick-panel help-panel"><div className="quick-panel-heading"><strong>帮助中心</strong><button className="icon-button" onClick={onClose}><X size={16} /></button></div><p>从素材管理开始导入文件，或打开生成中心自动补齐数字人、音色、脚本和视觉包装。</p><button className="outline-button full-width" onClick={() => onToast('操作说明已准备，当前版本支持本地演示流程。')}>查看操作说明 <ArrowRight size={14} /></button><button className="outline-button full-width" onClick={() => onToast('问题反馈入口已准备。')}>联系支持</button></div>
  return <div className="quick-panel profile-panel"><div className="profile-menu-head"><div className="profile-avatar">管</div><div><strong>管理员</strong><span>系统管理员</span></div></div><button onClick={() => { onToast('个人资料面板已打开。'); onClose(); }}><UsersRound size={15} />个人资料</button><button onClick={() => { onOpenModule('系统设置'); onClose(); }}><Settings2 size={15} />工作台设置</button><button onClick={() => { onToast('已安全退出当前演示账号。'); onClose(); }}><ArrowRight size={15} />退出登录</button></div>
}

function AssetDetailDialog({ asset, onClose, onOpenGeneration, onToast }) {
  return <div className="workspace-overlay" role="dialog" aria-modal="true" aria-label={`${asset.title}详情`}><section className="asset-detail-dialog"><header className="module-heading"><div><span className="eyebrow eyebrow-accent">Asset detail</span><h2>{asset.title}</h2></div><button className="icon-button" onClick={onClose} aria-label="关闭详情"><X size={19} /></button></header><div className="asset-detail-preview">{asset.kind === 'image' || asset.kind === 'preview' ? <img src="/demo-avatar.svg" alt={asset.title} /> : asset.kind === 'audio' ? <><button className="icon-button icon-button-dark" onClick={() => onToast('正在播放素材试听。')}><Play size={18} fill="currentColor" /></button><AudioWave /></> : asset.kind === 'script' ? <p>大家好，欢迎了解我们的产品。<br />我们致力于为客户提供高效、稳定、智能的解决方案。</p> : <div className="empty-video"><Clapperboard size={34} /><span>审批后生成最终视频</span></div>}</div><div className="asset-detail-meta">{asset.meta.map((item) => <span key={item}>{item}</span>)}</div><div className="module-actions"><button className="outline-button" onClick={onClose}>返回项目</button>{asset.key === 'portrait' && <button className="primary-button" onClick={() => onOpenGeneration('avatar')}>生成新版本 <ArrowRight size={14} /></button>}{asset.key === 'sourceVoice' && <button className="primary-button" onClick={() => onOpenGeneration('voice')}>生成试听 <ArrowRight size={14} /></button>}{asset.key === 'script' && <button className="primary-button" onClick={() => onOpenGeneration('script')}>生成新初稿 <ArrowRight size={14} /></button>}</div></section></div>
}

function NewProjectDialog({ onClose, onCreate }) {
  const [name, setName] = useState('新数字人视频项目')
  return <div className="workspace-overlay" role="dialog" aria-modal="true" aria-label="新建项目"><section className="new-project-dialog"><header className="module-heading"><div><span className="eyebrow eyebrow-accent">New project</span><h2>新建项目</h2></div><button className="icon-button" onClick={onClose} aria-label="关闭新建项目"><X size={19} /></button></header><p>创建一个本地项目，随后可以导入素材或从生成中心开始。</p><label className="module-field-label" htmlFor="new-project-name">项目名称</label><input id="new-project-name" value={name} onChange={(event) => setName(event.target.value)} autoFocus /><div className="module-actions"><button className="outline-button" onClick={onClose}>取消</button><button className="primary-button" onClick={() => onCreate(name.trim() || '新数字人视频项目')}><Plus size={15} />创建项目</button></div></section></div>
}

export function App() {
  const [activeNav, setActiveNav] = useState('项目中心')
  const [projectName, setProjectName] = useState('数字人视频项目')
  const [currentStage, setCurrentStage] = useState('assets')
  const [generationOpen, setGenerationOpen] = useState(false)
  const [generationMode, setGenerationMode] = useState('avatar')
  const [generationBusy, setGenerationBusy] = useState(false)
  const [preflightStatus, setPreflightStatus] = useState('passed')
  const [narrationStatus, setNarrationStatus] = useState('completed')
  const [previewStatus, setPreviewStatus] = useState('ready')
  const [approved, setApproved] = useState(false)
  const [finalStatus, setFinalStatus] = useState('idle')
  const [toast, setToast] = useState('')
  const [assets, setAssets] = useState(initialAssets)
  const [activity, setActivity] = useState(initialActivity)
  const [selectedFiles, setSelectedFiles] = useState({ portrait: null, voice: null, script: null })
  const [openModule, setOpenModule] = useState('')
  const [quickPanel, setQuickPanel] = useState(null)
  const [assetDetail, setAssetDetail] = useState(null)
  const [newProjectOpen, setNewProjectOpen] = useState(false)
  const [modelConfig, setModelConfig] = useState(() => readModelConfig())
  const fileInputRef = useRef(null)

  const completedCount = useMemo(() => assets.filter((asset) => asset.status !== '未开始').length, [assets])
  const workflowAction = useMemo(() => getWorkflowAction({ assets, preflightStatus, narrationStatus, previewStatus, approved, finalStatus }), [assets, preflightStatus, narrationStatus, previewStatus, approved, finalStatus])

  const showToast = (message) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 2800)
  }

  const syncWorkflow = async (stage, status) => {
    try {
      const response = await fetch('http://127.0.0.1:3001/api/workflow/transition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage, status, source: 'digital-human-workbench' }),
      })
      if (!response.ok) throw new Error('workflow backend unavailable')
      return await response.json()
    } catch {
      return null
    }
  }

  const appendActivity = (action, status, note) => {
    setActivity((items) => [{ time: '刚刚', actor: '你', action, status, note }, ...items].slice(0, 5))
  }

  const openFilePicker = (kind) => {
    fileInputRef.current.dataset.kind = kind
    fileInputRef.current.accept = kind === 'portrait' ? '.jpg,.jpeg,.png' : kind === 'voice' ? '.mp3,.m4a,.wav' : '.md,.txt'
    fileInputRef.current.click()
  }

  const handleFileChange = (event) => {
    const kind = event.target.dataset.kind
    const file = event.target.files?.[0]
    if (!file) return
    const maxBytes = kind === 'voice' ? 20 * 1024 * 1024 : 32 * 1024 * 1024
    if (file.size > maxBytes) {
      showToast('素材超过大小限制，请压缩后再导入。')
      return
    }
    setSelectedFiles((items) => ({ ...items, [kind]: file }))
    setPreflightStatus('idle')
    setNarrationStatus(kind === 'voice' || kind === 'script' ? 'idle' : narrationStatus)
    setPreviewStatus('idle')
    setApproved(false)
    setFinalStatus('idle')
    setAssets((items) => items.map((asset) => {
      const map = { portrait: 'portrait', voice: 'sourceVoice', script: 'script' }
      return asset.key === map[kind] ? { ...asset, status: '已导入', meta: [file.name, `${Math.round(file.size / 1024)} KB`, '等待预检'] } : asset
    }))
    showToast(`${file.name} 已导入，等待预检。`)
  }

  const runPreflight = () => {
    if (!hasRequiredAssets(assets)) {
      setCurrentStage('assets')
      showToast('请先补齐数字人形象、声音样本和脚本。')
      return
    }
    setCurrentStage('assets')
    setPreflightStatus('running')
    showToast('正在检查素材格式、大小与完整性…')
    window.setTimeout(() => {
      setPreflightStatus('passed')
      setAssets((items) => items.map((asset) => ['portrait', 'sourceVoice', 'script'].includes(asset.key) ? { ...asset, status: '已通过' } : asset))
      void syncWorkflow('assets', 'passed')
      appendActivity('素材检查通过', '已完成', '格式、大小与项目完整性检查通过')
      showToast('素材检查通过，可以进入下一步。')
    }, 900)
  }

  const generatePreview = () => {
    if (previewStatus === 'generating') return
    if (preflightStatus !== 'passed') {
      showToast('请先完成素材检查。')
      setCurrentStage('assets')
      return
    }
    if (narrationStatus !== 'completed') {
      showToast('请先生成克隆旁白。')
      setCurrentStage('voice')
      return
    }
    setCurrentStage('preview')
    setPreviewStatus('generating')
    appendActivity('开始生成 15 秒预览', '处理中', '本地演示任务，不会调用付费 API')
    showToast('预览任务已加入制作队列。')
    window.setTimeout(() => {
      setPreviewStatus('ready')
      void syncWorkflow('preview', 'completed')
      appendActivity('生成 15 秒预览', '已完成', '时长 00:15 · 720P')
      showToast('15 秒预览已生成，请检查口型和内容。')
    }, 1600)
  }

  const approvePreview = () => {
    if (previewStatus !== 'ready') {
      showToast('预览尚未完成，暂时不能审批。')
      return
    }
    setApproved(true)
    setCurrentStage('final')
    void syncWorkflow('approval', 'approved')
    appendActivity('通过预览审批', '已完成', '可以生成最终 1080P 视频')
    showToast('预览已通过，最终生成已解锁。')
  }

  const rejectPreview = () => {
    setApproved(false)
    setCurrentStage('preview')
    void syncWorkflow('approval', 'rejected')
    appendActivity('退回预览修改', '待处理', '请调整脚本、音色或数字人形象')
    showToast('已退回修改，完成调整后可以重新生成预览。')
  }

  const generateFinal = () => {
    if (modelConfig.runtime.requirePreviewApproval && !approved) {
      showToast('请先通过 15 秒预览审批。')
      setCurrentStage('approval')
      return
    }
    setFinalStatus('generating')
    setCurrentStage('final')
    appendActivity('开始生成最终视频', '处理中', '目标输出 1080P MP4')
    window.setTimeout(() => {
      setFinalStatus('done')
      void syncWorkflow('final', 'completed')
      setAssets((items) => items.map((asset) => asset.key === 'final' ? { ...asset, status: '已完成', meta: ['00:15', '1080P', 'MP4 已就绪'], kind: 'preview' } : asset))
      appendActivity('生成最终视频', '已完成', '1080P MP4 已就绪')
      showToast('最终视频已生成，演示文件已就绪。')
    }, 1800)
  }

  const generateNarration = () => {
    if (preflightStatus !== 'passed') {
      showToast('请先完成素材检查。')
      setCurrentStage('assets')
      return
    }
    if (narrationStatus === 'generating') return
    setNarrationStatus('generating')
    setCurrentStage('voice')
    appendActivity('开始生成克隆旁白', '处理中', `MiniMax · ${modelConfig.minimax.model} · 本地演示任务`)
    showToast('旁白任务已加入制作队列。')
    window.setTimeout(() => {
      setNarrationStatus('completed')
      void syncWorkflow('narration', 'completed')
      setAssets((items) => items.map((asset) => asset.key === 'voiceover' ? { ...asset, status: '已完成', meta: ['MiniMax 克隆旁白', '00:15', '可驱动 HeyGen 预览'] } : asset))
      appendActivity('生成克隆旁白', '已完成', `MiniMax · ${modelConfig.minimax.model}`)
      showToast('克隆旁白已准备，可以生成 15 秒预览。')
    }, 1400)
  }

  const runGeneration = () => {
    if (generationBusy) return
    const current = generationModes.find((item) => item.key === generationMode)
    setGenerationBusy(true)
    window.setTimeout(() => {
      setGenerationBusy(false)
      if (generationMode === 'avatar') {
        setAssets((items) => items.map((asset) => asset.key === 'portrait' ? { ...asset, status: '已生成', meta: ['AI 生成 · 商务版', '1080P', '正面半身构图'] } : asset))
      }
      if (generationMode === 'voice') {
        setAssets((items) => items.map((asset) => asset.key === 'voiceover' ? { ...asset, status: '已生成', meta: ['内置音色 · 知性女声', '00:15', '可用于预览'] } : asset))
      }
      if (generationMode === 'script') {
        setAssets((items) => items.map((asset) => asset.key === 'script' ? { ...asset, status: '已生成', meta: ['AI 初稿 · 产品介绍', '92 字', '预计 00:16'] } : asset))
      }
      if (generationMode === 'visual') {
        setAssets((items) => items.map((asset) => asset.key === 'visualPackage' ? { ...asset, status: '已生成', meta: ['Clean Studio · 商务版', '3 个候选', '可应用到预览'] } : asset))
      }
      setPreflightStatus('idle')
      setNarrationStatus(generationMode === 'script' ? 'idle' : narrationStatus)
      setPreviewStatus('idle')
      setApproved(false)
      setFinalStatus('idle')
      appendActivity(current.action, '已完成', '生成结果已回填到当前项目')
      showToast(`${current.label}已生成并回填到当前项目。`)
    }, 1200)
  }

  const runWorkflowAction = () => {
    if (workflowAction.disabled) return
    if (workflowAction.key === 'assets' || workflowAction.key === 'preflight') return runPreflight()
    if (workflowAction.key === 'narration') return generateNarration()
    if (workflowAction.key === 'preview') return generatePreview()
    if (workflowAction.key === 'approval') {
      setOpenModule('审批中心')
      return
    }
    if (workflowAction.key === 'final') return generateFinal()
    if (workflowAction.key === 'done') {
      setOpenModule('成片库')
    }
  }

  const saveModelConfig = async (nextConfig) => {
    const persisted = persistModelConfig(nextConfig)
    setModelConfig(persisted)
    try {
      await fetch('http://127.0.0.1:3001/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(persisted) })
    } catch {
      showToast('模型配置已保存到浏览器；后端尚未连接。')
    }
  }

  const handoffAgent = async (prompt) => {
    try {
      const response = await fetch('http://127.0.0.1:3001/api/agent/handoff', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, source: 'digital-human-workbench' }) })
      if (!response.ok) throw new Error('backend unavailable')
      showToast('任务已投递到 Agent inbox。')
    } catch {
      await navigator.clipboard?.writeText(prompt)
      showToast('后端尚未启动，Agent 指令已复制到剪贴板。')
    }
  }

  const navClick = (label) => {
    setActiveNav(label)
    if (label === '项目中心') {
      setOpenModule('')
      return
    }
    setQuickPanel(null)
    setOpenModule(label)
  }

  const openGenerationFromModule = (mode) => {
    setGenerationMode(mode)
    setOpenModule('')
    setAssetDetail(null)
    setGenerationOpen(true)
  }

  const createProject = (name) => {
    setProjectName(name)
    setActiveNav('项目中心')
    setNewProjectOpen(false)
    appendActivity('创建新项目', '已完成', `${name} 已准备好`)
    showToast(`${name} 已创建，可以开始导入素材。`)
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark"><Clapperboard size={16} /></div>
          <div><strong>数字人工作台</strong><span>AI VIDEO STUDIO</span></div>
        </div>
        <button className="new-project-button" onClick={() => setNewProjectOpen(true)}><Plus size={16} />新建项目</button>
        <nav className="main-nav" aria-label="主导航">
          {navItems.map(({ label, icon: Icon }) => (
            <button key={label} className={activeNav === label ? 'nav-item is-active' : 'nav-item'} onClick={() => navClick(label)}>
              <Icon size={17} strokeWidth={1.8} /><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="storage-title"><span>存储空间</span><strong>320 GB / 1 TB</strong></div>
          <div className="storage-bar"><span style={{ width: '32%' }} /></div>
          <button className="storage-button" onClick={() => showToast('存储管理暂未接入云端。')}>管理空间</button>
          <div className="profile-card"><div className="profile-avatar">管</div><div><strong>管理员</strong><span>系统管理员</span></div><ChevronDown size={16} /></div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb"><button className="mobile-menu icon-button" onClick={() => setQuickPanel('help')}><Menu size={18} /></button><span>项目中心</span><span>/</span><strong>{projectName}</strong></div>
          <div className="topbar-actions"><button className="save-button" onClick={() => showToast('项目草稿已保存。')}><Save size={15} />保存草稿</button><button className="top-icon icon-button" aria-label="通知" onClick={() => setQuickPanel(quickPanel === 'notifications' ? null : 'notifications')}><Bell size={18} /><i>3</i></button><button className="top-icon icon-button" aria-label="帮助" onClick={() => setQuickPanel(quickPanel === 'help' ? null : 'help')}><CircleHelp size={18} /></button><button className="mini-profile" onClick={() => setQuickPanel(quickPanel === 'profile' ? null : 'profile')}><span>管理员</span><ChevronDown size={14} /></button></div>
        </header>

        <section className="project-hero">
          <div className="project-hero-copy">
            <div className="section-kicker section-kicker-inverse">PROJECT / 2025-05-20</div>
            <h1>{projectName} <button className="inline-edit inline-edit-inverse" onClick={() => setNewProjectOpen(true)} aria-label="编辑项目名称"><Pencil size={15} /></button></h1>
            <p>从素材生成到成片交付，所有步骤都在同一个项目里完成。</p>
            <div className="project-hero-meta"><span><i className="hero-status-dot" />制作中</span><span>15 秒预览</span><span>720P</span><span>中文普通话</span></div>
            <div className="heading-actions"><button className="hero-outline-button" onClick={() => showToast('更多操作已展开。')}><MoreHorizontal size={16} />更多操作</button><button className="hero-primary-button" onClick={() => setGenerationOpen(true)}><FolderOpen size={16} />打开生成中心</button></div>
          </div>
          <div className="project-hero-preview">
            <div className="hero-preview-top"><span>15 秒预览</span><span>00:15 / 00:15</span></div>
            <div className="hero-preview-media"><img src="/demo-avatar.svg" alt="数字人项目预览" /><div className="hero-preview-shade" /><button className="hero-play" aria-label="播放项目预览"><Play size={18} fill="currentColor" /></button></div>
            <div className="hero-progress"><span /></div>
          </div>
        </section>

        <Stepper currentStage={currentStage} setCurrentStage={setCurrentStage} preflightStatus={preflightStatus} narrationStatus={narrationStatus} previewStatus={previewStatus} approved={approved} finalStatus={finalStatus} />
        <section className="workflow-command"><div><span className="eyebrow eyebrow-accent">Workflow control</span><strong>{workflowAction.label}</strong><p>{workflowAction.description}</p></div><button className="primary-button" onClick={runWorkflowAction} disabled={workflowAction.disabled}>{workflowAction.key.endsWith('-busy') ? <RefreshCw size={15} className="spin" /> : <ArrowRight size={15} />}{workflowAction.label}</button></section>

        <div className="workbench-grid">
          <section className="project-board">
            <div className="board-toolbar"><div><span className="eyebrow">当前项目资产</span><h2>素材准备与生产状态</h2></div><div className="board-toolbar-actions"><span className="completion"><CheckCircle2 size={15} />{completedCount}/{assets.length} 项就绪</span><button className="outline-button small" onClick={runWorkflowAction} disabled={workflowAction.disabled}><RefreshCw size={14} />{workflowAction.key === 'preflight' ? '开始检查' : '继续流程'}</button></div></div>
            <div className="source-imports"><span>已有素材</span><button onClick={() => openFilePicker('portrait')}><FileImage size={14} />导入形象</button><button onClick={() => openFilePicker('voice')}><FileAudio2 size={14} />导入声音</button><button onClick={() => openFilePicker('script')}><FileText size={14} />导入脚本</button><button onClick={() => { setGenerationMode('visual'); setGenerationOpen(true) }}><Palette size={14} />生成包装</button><span className="source-imports-hint">导入或生成的素材都会回填到当前项目</span></div>
            <div className="asset-grid">{assets.map((asset) => <AssetCard key={asset.key} asset={asset} onOpen={(selectedAsset) => setAssetDetail(selectedAsset)} />)}</div>
            <div className="approval-strip">
              <div className="approval-icon"><ShieldCheck size={20} /></div><div className="approval-copy"><strong>当前审批 <StatusLabel tone={approved ? 'success' : 'warning'}>{approved ? '已通过' : '待审批'}</StatusLabel></strong><span>{approved ? '预览已确认，可以生成最终视频。' : '请先检查预览效果，再进入下一步。'}</span></div><div className="approval-actions"><button className="outline-button" onClick={rejectPreview}>退回修改</button><button className="primary-button" onClick={approvePreview} disabled={previewStatus !== 'ready'}><Check size={16} />通过预览</button></div>
            </div>
          </section>

          <aside className="queue-panel">
            <div className="queue-heading"><div><span className="eyebrow">制作队列</span><h2>当前项目</h2></div><span className="queue-count">1 / 5</span></div>
            <div className="queue-card is-active"><div className="queue-thumb"><img src="/demo-avatar.svg" alt="项目预览" /></div><div><strong>{projectName}</strong><span>预计时长 00:15</span></div><StatusLabel tone="warning">待审批</StatusLabel></div>
            <button className="queue-add" onClick={() => showToast('可以从生成中心创建新的项目素材。')}><Plus size={15} />添加到队列</button>
            <div className="preview-gate"><div className="queue-heading"><div><span className="eyebrow eyebrow-accent">Preview Gate</span><h2>预览闸门 <small>15秒</small></h2></div><Clock3 size={17} /></div><div className="gate-video"><img src="/demo-avatar.svg" alt="数字人预览画面" /><button className="video-play" aria-label="播放预览"><Play size={22} fill="currentColor" /></button><div className="video-time"><span>00:00</span><span>00:15</span></div></div><div className="gate-checklist"><strong><AlertCircle size={15} />确认以下内容</strong><label><input type="checkbox" defaultChecked />口型自然，无明显错位</label><label><input type="checkbox" defaultChecked />语音流畅，无杂音或断句异常</label><label><input type="checkbox" defaultChecked />内容准确，信息无误</label></div><button className="primary-button full-width" onClick={runWorkflowAction} disabled={workflowAction.disabled}>{workflowAction.key === 'final-busy' ? <><RefreshCw size={16} className="spin" />成片生成中…</> : workflowAction.key === 'done' ? <><Check size={16} />查看最终成片</> : <><ArrowRight size={16} />{workflowAction.label}</>}</button></div>
          </aside>
        </div>

        <section className="activity-section"><div className="activity-heading"><div><span className="eyebrow">Project history</span><h2>操作记录</h2></div><button className="filter-button" onClick={() => showToast('已显示全部操作记录。')}>全部记录 <ChevronDown size={14} /></button></div><div className="activity-table"><div className="table-row table-header"><span>时间</span><span>操作人</span><span>操作内容</span><span>状态</span><span>备注</span></div>{activity.map((item, index) => <div className="table-row" key={`${item.time}-${item.action}-${index}`}><span>{item.time}</span><span>{item.actor}</span><span>{item.action}</span><span><StatusLabel tone={item.status === '待审批' || item.status === '处理中' ? 'warning' : 'success'}>{item.status}</StatusLabel></span><span>{item.note}</span></div>)}</div></section>
        <footer className="page-footer"><span><span className="online-dot" />服务正常</span><button onClick={() => showToast('问题反馈入口已准备。')}>问题反馈</button></footer>
      </main>

      {generationOpen && <GenerationPanel mode={generationMode} setMode={setGenerationMode} isBusy={generationBusy} onGenerate={runGeneration} onClose={() => setGenerationOpen(false)} />}
      {quickPanel && <QuickPanel type={quickPanel} onClose={() => setQuickPanel(null)} onOpenModule={navClick} onToast={showToast} />}
      {openModule && <ModuleWorkspace module={openModule} assets={assets} activity={activity} approved={approved} modelConfig={modelConfig} onSaveModelConfig={saveModelConfig} onHandoff={handoffAgent} onClose={() => setOpenModule('')} onOpenGeneration={openGenerationFromModule} onImport={openFilePicker} onApprove={() => { approvePreview(); setOpenModule('') }} onToast={showToast} />}
      {assetDetail && <AssetDetailDialog asset={assetDetail} onClose={() => setAssetDetail(null)} onOpenGeneration={openGenerationFromModule} onToast={showToast} />}
      {newProjectOpen && <NewProjectDialog onClose={() => setNewProjectOpen(false)} onCreate={createProject} />}
      <input ref={fileInputRef} className="visually-hidden" type="file" onChange={handleFileChange} />
      {toast && <div className="toast"><CheckCircle2 size={16} />{toast}</div>}
    </div>
  )
}

export default App
