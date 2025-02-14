/**
 * 环境变量加载工具
 */

// 从本地存储加载环境变量
const loadEnvFromStorage = () => {
  try {
    const envStr = wx.getStorageSync('env_variables')
    console.log('从存储加载的环境变量:', envStr ? '有数据' : '无数据')
    const env = envStr ? JSON.parse(envStr) : null
    if (env) {
      console.log('已加载的API密钥:', {
        ark: env.ARK_API_KEY ? '已配置' : '未配置',
        siliconflow: env.SILICONFLOW_API_KEY ? '已配置' : '未配置',
        deepseek: env.DEEPSEEK_API_KEY ? '已配置' : '未配置'
      })
    }
    return env
  } catch (error) {
    console.error('加载环境变量失败:', error)
    return null
  }
}

// 保存环境变量到本地存储
const saveEnvToStorage = (env) => {
  try {
    wx.setStorageSync('env_variables', JSON.stringify(env))
    return true
  } catch (error) {
    console.error('保存环境变量失败:', error)
    return false
  }
}

// 获取环境变量
export const getEnv = (key, defaultValue = '') => {
  const env = loadEnvFromStorage()
  return env && env[key] ? env[key] : defaultValue
}

// 设置环境变量
export const setEnv = (key, value) => {
  const env = loadEnvFromStorage() || {}
  env[key] = value
  return saveEnvToStorage(env)
}

// 批量设置环境变量
export const setEnvBatch = (envVariables) => {
  const env = loadEnvFromStorage() || {}
  Object.assign(env, envVariables)
  return saveEnvToStorage(env)
}

// 检查是否已配置环境变量
export const checkEnvConfig = () => {
  const env = loadEnvFromStorage()
  if (!env) return false
  
  // 只要有一个有效的API密钥即可
  return env.ARK_API_KEY || env.SILICONFLOW_API_KEY || env.DEEPSEEK_API_KEY
}

// 从.env文件加载环境变量（仅开发环境使用）
export const loadEnvFromFile = () => {
  try {
    // 从.env文件读取的环境变量
    const envVariables = {
      SILICONFLOW_API_KEY: 'your_siliconflow_api_key',
      DEEPSEEK_API_KEY: 'your_deepseek_api_key',
      ARK_API_KEY: 'dbff1d9b-bcf5-4089-8bde-52a4ce875589',
      SILICONFLOW_API_URL: 'https://api.siliconflow.cn/v1/chat/completions',
      DEEPSEEK_API_URL: 'https://api.deepseek.com/v1/chat/completions',
      ARK_API_URL: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
      SILICONFLOW_MODEL: 'deepseek-ai/DeepSeek-R1',
      DEEPSEEK_MODEL: 'deepseek-chat',
      ARK_MODEL: 'ep-20250208164736-4s8c4'
    }
    
    // 保存到本地存储
    wx.setStorageSync('env_variables', JSON.stringify(envVariables))
    console.log('环境变量已保存到存储')
    return true
  } catch (error) {
    console.error('保存环境变量失败:', error)
    return false
  }
} 