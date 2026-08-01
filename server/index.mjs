import { createServer } from 'node:http'
import { basename, extname, resolve, relative, sep } from 'node:path'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'

const serverDir = resolve(fileURLToPath(new URL('.', import.meta.url)))
const root = resolve(process.env.WORKBENCH_ROOT || resolve(serverDir, '..'))
const runtimeDir = resolve(root, 'agent-runtime')
const statePath = resolve(runtimeDir, 'job-state.json')
const configPath = resolve(runtimeDir, 'config.json')
const port = Number(process.env.PORT || 3001)

const defaultState = {
  project: '数字人视频项目',
  skill: 'rachel-digital-human-production',
  workflow: { assets: 'passed', narration: 'completed', preview: 'completed', approved: false, final: 'not_started' },
  last_action: null,
}

const defaultConfig = {
  runtime_mode: 'local-dry-run',
  minimax: { model: 'speech-2.8-hd', key_env: 'MINIMAX_API_KEY', configured: false },
  heygen: { model: 'avatar_iv', previewResolution: '720p', finalResolution: '1080p', key_env: 'HEYGEN_API_KEY', configured: false },
}

const mimeTypes = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.md': 'text/markdown',
  '.txt': 'text/plain',
}

async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, 'utf8'))
  } catch {
    return fallback
  }
}

async function writeJson(path, value) {
  await mkdir(resolve(path, '..'), { recursive: true })
  await writeFile(path, JSON.stringify(value, null, 2) + '\n', 'utf8')
}

function safePath(value, fallback) {
  const candidate = resolve(root, value || fallback)
  const outside = relative(root, candidate).startsWith('..' + sep) || resolve(candidate) === resolve('..')
  if (outside) throw new Error('file path must stay inside the workbench root')
  return candidate
}

function sendJson(res, status, value) {
  const body = JSON.stringify(value)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  })
  res.end(body)
}

async function bodyJson(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const text = Buffer.concat(chunks).toString('utf8')
  return text ? JSON.parse(text) : {}
}

async function providerJson(url, options) {
  const response = await fetch(url, options)
  const text = await response.text()
  let data
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = { raw: text }
  }
  if (!response.ok) {
    const message = data?.error?.message || data?.base_resp?.status_msg || response.statusText
    throw new Error('provider request failed: ' + response.status + ' ' + message)
  }
  return data
}

function requireProviderKey(provider) {
  const key = provider === 'minimax' ? process.env.MINIMAX_API_KEY : process.env.HEYGEN_API_KEY
  if (!key) throw new Error(provider.toUpperCase() + '_API_KEY is not configured')
  return key
}

function requirePaid(provider, body) {
  if (body.confirmPaid !== true) throw new Error('paid provider call requires confirmPaid=true')
  if (process.env.ALLOW_PAID_GENERATION !== 'true') throw new Error('server is in safe mode; set ALLOW_PAID_GENERATION=true after explicit user approval')
  return requireProviderKey(provider)
}

function sanitizeConfigSection(section = {}) {
  const { apiKey, key, token, accessToken, secret, ...safe } = section
  return safe
}

async function updateState(mutator) {
  const state = await readJson(statePath, structuredClone(defaultState))
  const next = mutator(state) || state
  await writeJson(statePath, next)
  return next
}

async function uploadHeygenAsset(filePath, key) {
  const bytes = await readFile(filePath)
  const form = new FormData()
  form.append('file', new Blob([bytes], { type: mimeTypes[extname(filePath).toLowerCase()] || 'application/octet-stream' }), basename(filePath))
  return providerJson('https://api.heygen.com/v3/assets', {
    method: 'POST',
    headers: { 'x-api-key': key, 'Idempotency-Key': randomUUID() },
    body: form,
  })
}

async function handleMinimaxClone(body) {
  const key = requirePaid('minimax', body)
  const sourcePath = safePath(body.voiceFile, 'inputs/voice-source.mp3')
  const sourceBytes = await readFile(sourcePath)
  const form = new FormData()
  form.append('purpose', 'voice_clone')
  form.append('file', new Blob([sourceBytes], { type: mimeTypes[extname(sourcePath).toLowerCase()] || 'audio/mpeg' }), basename(sourcePath))
  const upload = await providerJson('https://api.minimax.io/v1/files/upload', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + key },
    body: form,
  })
  const fileId = upload?.file?.file_id
  if (!fileId) throw new Error('MiniMax upload did not return file_id')
  const voiceId = body.voiceId || 'digital_human_' + Date.now()
  const clone = await providerJson('https://api.minimax.io/v1/voice_clone', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      file_id: fileId,
      voice_id: voiceId,
      text: body.previewText || '',
      model: body.model || 'speech-2.8-hd',
    }),
  })
  await updateState((state) => ({
    ...state,
    minimax: { source_file_id: fileId, voice_id: voiceId, model: body.model || 'speech-2.8-hd' },
    last_action: { provider: 'minimax', action: 'voice_clone', voice_id: voiceId },
  }))
  return { fileId, voiceId, provider: 'minimax', response: clone }
}

async function handleMinimaxSynthesis(body) {
  const key = requirePaid('minimax', body)
  if (!body.voiceId || !body.text) throw new Error('voiceId and text are required')
  const result = await providerJson('https://api.minimax.io/v1/t2a_v2', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: body.model || 'speech-2.8-hd',
      text: body.text,
      stream: false,
      language_boost: 'auto',
      output_format: 'hex',
      voice_setting: { voice_id: body.voiceId, speed: 1, vol: 1, pitch: 0 },
      audio_setting: { sample_rate: 32000, bitrate: 128000, format: 'mp3', channel: 1 },
    }),
  })
  const audioHex = result?.data?.audio
  if (!audioHex) throw new Error('MiniMax T2A did not return audio')
  const outputPath = safePath(body.outputFile, 'work/voiceover-full.mp3')
  await mkdir(resolve(outputPath, '..'), { recursive: true })
  await writeFile(outputPath, Buffer.from(audioHex, 'hex'))
  await updateState((state) => ({ ...state, minimax: { ...(state.minimax || {}), voice_id: body.voiceId, full_audio: outputPath }, last_action: { provider: 'minimax', action: 't2a' } }))
  return { outputFile: relative(root, outputPath), provider: 'minimax', traceId: result.trace_id || null }
}

async function handleHeygenVideo(body) {
  const key = requirePaid('heygen', body)
  const state = await readJson(statePath, structuredClone(defaultState))
  if (body.stage === 'final' && !state.workflow?.approved) throw new Error('preview approval is required before final video')
  let imageAssetId = body.imageAssetId
  let audioAssetId = body.audioAssetId
  if (!imageAssetId && body.portraitFile) imageAssetId = (await uploadHeygenAsset(safePath(body.portraitFile), key))?.data?.asset_id
  if (!audioAssetId && body.audioFile) audioAssetId = (await uploadHeygenAsset(safePath(body.audioFile), key))?.data?.asset_id
  if (!imageAssetId && !body.imageUrl && !body.avatarId) throw new Error('one visual source is required')
  if (!audioAssetId && !body.audioUrl && !body.script) throw new Error('one audio or script source is required')
  const payload = {
    type: 'avatar',
    title: body.title || 'Digital Human Workbench',
    output_format: 'mp4',
    aspect_ratio: body.aspectRatio || '16:9',
    engine: { type: body.engine || 'avatar_iv' },
  }
  if (imageAssetId) payload.image_asset_id = imageAssetId
  else if (body.imageUrl) payload.image_url = body.imageUrl
  else payload.avatar_id = body.avatarId
  if (audioAssetId) payload.audio_asset_id = audioAssetId
  else if (body.audioUrl) payload.audio_url = body.audioUrl
  else payload.script = body.script
  const result = await providerJson('https://api.heygen.com/v3/videos', {
    method: 'POST',
    headers: { 'x-api-key': key, 'Content-Type': 'application/json', 'Idempotency-Key': body.idempotencyKey || randomUUID() },
    body: JSON.stringify(payload),
  })
  const videoId = result?.data?.video_id || result?.data?.id
  await updateState((current) => ({
    ...current,
    heygen: { ...(current.heygen || {}), image_asset_id: imageAssetId || null, preview_video_id: body.stage === 'preview' ? videoId : current.heygen?.preview_video_id, full_video_id: body.stage === 'final' ? videoId : current.heygen?.full_video_id },
    workflow: { ...current.workflow, [body.stage === 'final' ? 'final' : 'preview']: 'submitted' },
    last_action: { provider: 'heygen', action: 'create_video', video_id: videoId, stage: body.stage || 'preview' },
  }))
  return { videoId, provider: 'heygen', stage: body.stage || 'preview' }
}

async function handleHeygenStatus(videoId) {
  const key = requireProviderKey('heygen')
  return providerJson('https://api.heygen.com/v3/videos/' + encodeURIComponent(videoId), { headers: { 'x-api-key': key } })
}

async function handleHandoff(body) {
  if (!body.prompt || typeof body.prompt !== 'string') throw new Error('prompt is required')
  const payload = { id: randomUUID(), status: 'pending', prompt: body.prompt, source: body.source || 'workbench', createdAt: new Date().toISOString() }
  await writeJson(resolve(runtimeDir, 'inbox.json'), payload)
  return { accepted: true, inbox: 'agent-runtime/inbox.json', id: payload.id }
}

async function handleWorkflowTransition(body) {
  const allowedStages = new Set(['assets', 'narration', 'preview', 'approval', 'final'])
  const allowedStatuses = new Set(['passed', 'completed', 'submitted', 'approved', 'rejected', 'not_started'])
  if (!allowedStages.has(body.stage)) throw new Error('unknown workflow stage')
  if (!allowedStatuses.has(body.status)) throw new Error('unknown workflow status')
  const current = await readJson(statePath, structuredClone(defaultState))
  const workflow = current.workflow || defaultState.workflow
  if (body.stage === 'narration' && body.status === 'completed' && workflow.assets !== 'passed') throw new Error('asset preflight must pass before narration')
  if (body.stage === 'preview' && body.status === 'completed' && workflow.narration !== 'completed') throw new Error('narration must complete before preview')
  if (body.stage === 'approval' && body.status === 'approved' && workflow.preview !== 'completed') throw new Error('preview must complete before approval')
  if (body.stage === 'final' && body.status === 'completed' && !workflow.approved) throw new Error('preview approval is required before final video')
  const next = await updateState((current) => {
    const workflow = { ...current.workflow }
    if (body.stage === 'assets') workflow.assets = body.status
    if (body.stage === 'narration') workflow.narration = body.status
    if (body.stage === 'preview') workflow.preview = body.status
    if (body.stage === 'approval') workflow.approved = body.status === 'approved'
    if (body.stage === 'final') workflow.final = body.status
    return {
      ...current,
      workflow,
      last_action: { action: 'workflow_transition', stage: body.stage, status: body.status, source: body.source || 'workbench', at: new Date().toISOString() },
    }
  })
  return { synced: true, workflow: next.workflow }
}

async function route(req, res) {
  if (req.method === 'OPTIONS') return sendJson(res, 204, {})
  const url = new URL(req.url, 'http://127.0.0.1')
  if (req.method === 'GET' && url.pathname === '/api/health') return sendJson(res, 200, { ok: true, mode: process.env.ALLOW_PAID_GENERATION === 'true' ? 'provider-ready' : 'safe-dry-run' })
  if (req.method === 'GET' && url.pathname === '/api/agent/status') return sendJson(res, 200, await readJson(statePath, structuredClone(defaultState)))
  try {
    const body = await bodyJson(req)
    if (req.method === 'POST' && url.pathname === '/api/agent/handoff') return sendJson(res, 200, await handleHandoff(body))
    if (req.method === 'POST' && url.pathname === '/api/config') {
      const current = await readJson(configPath, defaultConfig)
      const next = {
        ...current,
        ...body,
        minimax: { ...current.minimax, ...sanitizeConfigSection(body.minimax) },
        heygen: { ...current.heygen, ...sanitizeConfigSection(body.heygen) },
      }
      delete next.apiKey
      delete next.token
      await writeJson(configPath, next)
      return sendJson(res, 200, { saved: true, config: { ...next, minimax: { ...next.minimax, apiKey: undefined }, heygen: { ...next.heygen, apiKey: undefined } } })
    }
    if (req.method === 'POST' && url.pathname === '/api/workflow/transition') return sendJson(res, 200, await handleWorkflowTransition(body))
    if (req.method === 'POST' && url.pathname === '/api/workflow/prepare') {
      const state = await readJson(statePath, structuredClone(defaultState))
      if (body.stage === 'final' && !state.workflow?.approved) return sendJson(res, 409, { error: 'preview approval is required before final video' })
      if (!body.confirmed) return sendJson(res, 200, { ready: false, requiresConfirmation: true, mode: 'safe-dry-run' })
      await updateState((current) => ({ ...current, last_action: { action: 'prepare', stage: body.stage, confirmedAt: new Date().toISOString() } }))
      return sendJson(res, 200, { ready: true, stage: body.stage, mode: process.env.ALLOW_PAID_GENERATION === 'true' ? 'provider-ready' : 'safe-dry-run' })
    }
    if (req.method === 'POST' && url.pathname === '/api/providers/minimax/voice-clone') return sendJson(res, 200, await handleMinimaxClone(body))
    if (req.method === 'POST' && url.pathname === '/api/providers/minimax/synthesize') return sendJson(res, 200, await handleMinimaxSynthesis(body))
    if (req.method === 'POST' && url.pathname === '/api/providers/heygen/video') return sendJson(res, 200, await handleHeygenVideo(body))
    if (req.method === 'POST' && url.pathname === '/api/providers/heygen/status') return sendJson(res, 200, await handleHeygenStatus(body.videoId))
    return sendJson(res, 404, { error: 'not found' })
  } catch (error) {
    return sendJson(res, 400, { error: error.message })
  }
}

createServer(route).listen(port, '127.0.0.1', () => {
  process.stdout.write('digital-human backend listening on http://127.0.0.1:' + port + '\n')
})
