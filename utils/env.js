/**
 * 环境变量加载工具
 */

// 从本地存储加载环境变量
const loadEnvFromStorage = () => {
  try {
    const envStr = wx.getStorageSync('env_variables')
    return envStr ? JSON.parse(envStr) : null
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
  const requiredKeys = [
    'SILICONFLOW_API_KEY',
    'DEEPSEEK_API_KEY',
    'ARK_API_KEY'
  ]
  
  const env = loadEnvFromStorage()
  if (!env) return false
  
  return requiredKeys.every(key => env[key])
}

// 从.env文件加载环境变量（仅开发环境使用）
export const loadEnvFromFile = () => {
  if (!wx.getFileSystemManager) return false
  
  try {
    const fs = wx.getFileSystemManager()
    const envContent = fs.readFileSync('.env', 'utf8')
    const env = {}
    
    envContent.split('\n').forEach(line => {
      line = line.trim()
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split('=')
        if (key && value) {
          env[key.trim()] = value.trim()
        }
      }
    })
    
    return saveEnvToStorage(env)
  } catch (error) {
    console.error('读取.env文件失败:', error)
    return false
  }
} 