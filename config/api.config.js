/**
 * API 配置文件
 */

import { getEnv } from '../utils/env'

// 默认配置
const defaultConfig = {
  request: {
    timeout: 30000,      // 请求超时时间（毫秒）
    retryTimes: 3,       // 重试次数
    retryDelay: 1000,    // 重试延迟（毫秒）
  },
  errorMessages: {
    timeout: '请求超时，请重试',
    networkError: '网络错误，请检查网络连接',
    serverError: '服务器错误，请稍后重试',
    invalidResponse: '无效的响应数据',
  }
}

// SiliconFlow API 配置
const siliconflow = {
  url: getEnv('SILICONFLOW_API_URL', 'https://api.siliconflow.cn/v1/chat/completions'),
  apiKey: getEnv('SILICONFLOW_API_KEY'),
  model: getEnv('SILICONFLOW_MODEL', 'deepseek-ai/DeepSeek-R1'),
  maxTokens: 4096,
  temperature: 0.7,
  topP: 0.95,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'text/event-stream'
  }
}

// DeepSeek API 配置（备用）
const deepseek = {
  url: getEnv('DEEPSEEK_API_URL', 'https://api.deepseek.com/v1/chat/completions'),
  apiKey: getEnv('DEEPSEEK_API_KEY'),
  model: getEnv('DEEPSEEK_MODEL', 'deepseek-chat'),
  maxTokens: 4096,
  temperature: 0.7,
  topP: 0.95,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'text/event-stream'
  }
}

// Ark API 配置（备用）
const ark = {
  url: getEnv('ARK_API_URL', 'https://ark.cn-beijing.volces.com/api/v3/chat/completions'),
  apiKey: getEnv('ARK_API_KEY'),
  model: getEnv('ARK_MODEL', 'ep-20250208164736-4s8c4'),
  maxTokens: 4096,
  temperature: 0.7,
  topP: 0.95,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'text/event-stream'
  }
}

// 当前使用的 API 提供商
const currentProvider = 'ark'

export default {
  ...defaultConfig,
  currentProvider,
  siliconflow,
  deepseek,
  ark,
} 