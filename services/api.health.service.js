/**
 * API 健康状态管理服务
 * 基于实际请求结果进行 API 健康状态跟踪
 */

import config from '../config/api.config'

// API 健康状态记录
const apiHealthStatus = {
  siliconflow: { failures: 0, lastFailureTime: 0, cooldownUntil: 0, lastPingTime: 0, isAvailable: true },
  deepseek: { failures: 0, lastFailureTime: 0, cooldownUntil: 0, lastPingTime: 0, isAvailable: true },
  ark: { failures: 0, lastFailureTime: 0, cooldownUntil: 0, lastPingTime: 0, isAvailable: true }
}

// 配置常量
const FAILURE_THRESHOLD = 1  // 一次失败就切换
const COOLDOWN_PERIOD = 5 * 60 * 1000  // 冷却时间（5分钟）
const FAILURE_RESET_TIME = 10 * 60 * 1000  // 失败计数重置时间（10分钟）
const PING_INTERVAL = 30 * 1000  // 健康检查间隔（30秒）
const PING_TIMEOUT = 5000  // 健康检查超时时间（5秒）

// API 优先级顺序
const API_PRIORITY = ['ark', 'siliconflow', 'deepseek']

/**
 * 检查 API 健康状态
 * 使用简单的 POST 请求检查 API 可用性
 * @param {string} apiName API 名称
 * @returns {Promise<boolean>} API 是否可用
 */
const checkAPIHealth = async (apiName) => {
  const status = apiHealthStatus[apiName]
  const now = Date.now()
  
  // 如果距离上次检查时间不足间隔时间，直接返回当前状态
  if (now - status.lastPingTime < PING_INTERVAL) {
    return status.isAvailable
  }
  
  try {
    const api = config[apiName]
    if (!api || !api.url || !api.apiKey) {
      console.warn(`API ${apiName} 配置不完整`)
      status.isAvailable = false
      status.lastPingTime = now
      return false
    }
    
    console.log(`检查 API 健康状态: ${apiName}`, {
      url: api.url,
      model: api.model,
      hasKey: !!api.apiKey
    })
    
    // 使用简单的消息请求检查 API 可用性
    const result = await new Promise((resolve, reject) => {
      const requestTask = wx.request({
        url: api.url,
        method: 'POST',
        timeout: PING_TIMEOUT,
        header: {
          'Authorization': `Bearer ${api.apiKey}`,
          'Content-Type': 'application/json'
        },
        data: {
          model: api.model,
          messages: [{ role: 'user', content: 'ping' }],
          stream: false,
          max_tokens: 1,
          temperature: 0.1
        },
        success: (res) => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(true)
          } else {
            reject(new Error(`Status code: ${res.statusCode}`))
          }
        },
        fail: reject
      })
      
      // 设置超时
      setTimeout(() => {
        if (requestTask) {
          requestTask.abort()
          reject(new Error('Timeout'))
        }
      }, PING_TIMEOUT)
    })
    
    // 更新状态
    status.isAvailable = true
    status.lastPingTime = now
    console.log(`API ${apiName} 健康检查通过`)
    return true
    
  } catch (error) {
    console.warn(`API ${apiName} 健康检查失败:`, error)
    status.isAvailable = false
    status.lastPingTime = now
    return false
  }
}

/**
 * 判断错误是否需要触发 API 切换
 * @param {Error} error 错误对象
 * @returns {boolean} 是否需要切换 API
 */
export const shouldSwitchAPI = (error) => {
  if (!error) return false

  const errMsg = error.errMsg || error.message || String(error)
  
  // 判断错误类型
  return errMsg.includes('timeout') || 
         errMsg.includes('request:fail') ||
         error.statusCode === 429 ||  // 请求过于频繁
         error.statusCode >= 500      // 服务器错误
}

/**
 * 记录 API 失败并切换到下一个可用的 API
 * @param {string} apiName API 名称
 */
export const recordFailure = async (apiName) => {
  const status = apiHealthStatus[apiName]
  if (!status) return

  const now = Date.now()
  
  // 记录失败并立即进入冷却期
  status.failures = 1
  status.lastFailureTime = now
  status.cooldownUntil = now + COOLDOWN_PERIOD
  status.isAvailable = false
  
  console.warn(`API ${apiName} 失败，立即切换到下一个可用的 API`)
  
  // 获取下一个可用的 API
  const currentIndex = API_PRIORITY.indexOf(apiName)
  const nextAPIs = API_PRIORITY.slice(currentIndex + 1)
  
  // 检查剩余的 API
  for (const nextAPI of nextAPIs) {
    const nextStatus = apiHealthStatus[nextAPI]
    if (nextStatus.isAvailable && nextStatus.cooldownUntil <= now) {
      const isHealthy = await checkAPIHealth(nextAPI)
      if (isHealthy) {
        console.log(`切换到 API: ${nextAPI}`)
        return
      }
    }
  }
  
  // 如果没有找到可用的 API，从头开始检查（除了刚失败的）
  for (const nextAPI of API_PRIORITY) {
    if (nextAPI === apiName) continue
    const nextStatus = apiHealthStatus[nextAPI]
    if (nextStatus.cooldownUntil <= now) {
      const isHealthy = await checkAPIHealth(nextAPI)
      if (isHealthy) {
        console.log(`切换到 API: ${nextAPI}`)
        return
      }
    }
  }
  
  console.warn('没有找到可用的 API，将在冷却期后重试')
}

/**
 * 记录 API 成功
 * @param {string} apiName API 名称
 */
export const recordSuccess = (apiName) => {
  const status = apiHealthStatus[apiName]
  if (!status) return
  
  // 重置失败计数
  status.failures = 0
  status.lastFailureTime = 0
  status.cooldownUntil = 0
  status.isAvailable = true
}

/**
 * 获取当前可用的 API
 * @returns {Object} API 配置
 */
export const getCurrentAPI = async () => {
  const now = Date.now()
  
  // 按优先级顺序查找可用的 API
  for (const apiName of API_PRIORITY) {
    const status = apiHealthStatus[apiName]
    
    // 如果 API 在冷却期且未结束，跳过
    if (status.cooldownUntil > now) {
      console.log(`API ${apiName} 仍在冷却期`)
      continue
    }
    
    // 如果 API 可用，直接返回
    if (status.isAvailable) {
      const apiConfig = config[apiName]
      console.log('当前使用的API配置:', {
        name: apiName,
        url: apiConfig.url,
        model: apiConfig.model,
        hasKey: !!apiConfig.apiKey
      })
      return {
        name: apiName,
        ...apiConfig
      }
    }
  }
  
  // 如果所有 API 都不可用，重置状态并返回主 API
  console.warn('所有 API 都不可用，重置状态并使用主 API')
  Object.values(apiHealthStatus).forEach(status => {
    status.failures = 0
    status.lastFailureTime = 0
    status.cooldownUntil = 0
    status.isAvailable = true
  })
  
  const mainApiConfig = config.ark
  console.log('重置后使用主API配置:', {
    name: 'ark',
    url: mainApiConfig.url,
    model: mainApiConfig.model,
    hasKey: !!mainApiConfig.apiKey
  })
  
  return {
    name: 'ark',
    ...mainApiConfig
  }
}

/**
 * 获取所有 API 的健康状态
 * @returns {Object} API 健康状态信息
 */
export const getAPIHealthStatus = () => {
  const now = Date.now()
  return Object.entries(apiHealthStatus).reduce((acc, [name, status]) => {
    acc[name] = {
      isAvailable: status.isAvailable && status.failures < FAILURE_THRESHOLD && status.cooldownUntil <= now,
      failures: status.failures,
      inCooldown: status.cooldownUntil > now,
      cooldownRemaining: Math.max(0, status.cooldownUntil - now),
      lastChecked: status.lastPingTime
    }
    return acc
  }, {})
} 