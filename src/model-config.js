const STORAGE_KEY = 'digital-human-workbench:model-config:v1'

export const defaultModelConfig = {
  runtime: {
    mode: 'local-demo',
    requirePreviewApproval: true,
    requireAuthorizedAssets: true,
  },
  minimax: {
    provider: 'MiniMax',
    model: 'speech-2.8-hd',
    baseUrl: 'https://api.minimax.io',
    keyEnv: 'MINIMAX_API_KEY',
    configured: false,
  },
  heygen: {
    provider: 'HeyGen',
    model: 'avatar_iv',
    previewResolution: '720p',
    finalResolution: '1080p',
    baseUrl: 'https://api.heygen.com',
    keyEnv: 'HEYGEN_API_KEY',
    configured: false,
  },
  local: {
    scriptModel: 'structured-script-v1',
    imageModel: 'demo-avatar-v1',
  },
}

function mergeConfig(saved) {
  return {
    ...defaultModelConfig,
    ...saved,
    runtime: { ...defaultModelConfig.runtime, ...saved?.runtime },
    minimax: { ...defaultModelConfig.minimax, ...saved?.minimax },
    heygen: { ...defaultModelConfig.heygen, ...saved?.heygen },
    local: { ...defaultModelConfig.local, ...saved?.local },
  }
}

export function readModelConfig() {
  if (typeof window === 'undefined') return defaultModelConfig
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    return saved ? mergeConfig(JSON.parse(saved)) : defaultModelConfig
  } catch {
    return defaultModelConfig
  }
}

export function persistModelConfig(config) {
  const safeConfig = mergeConfig(config)
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(safeConfig))
  }
  return safeConfig
}

export function getProviderReadiness(config) {
  return {
    minimax: Boolean(config.minimax.configured),
    heygen: Boolean(config.heygen.configured),
    local: config.runtime.mode === 'local-demo',
  }
}
