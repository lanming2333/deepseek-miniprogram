/**
 * API服务封装
 * 实现与AI模型的通信、错误处理、重试机制等
 */

import config from '../config/api.config'
import * as healthService from './api.health.service'

// 解码 UTF-8 字符串
const decodeUTF8 = (str) => {
  try {
    // 如果已经是正确的中文，直接返回
    if (/[\u4e00-\u9fa5]/.test(str)) {
      return str;
    }
    // 尝试 URI 解码
    if (str.includes('%')) {
      return decodeURIComponent(str);
    }
    // 尝试 Base64 解码
    try {
      const decoded = atob(str);
      if (/[\u4e00-\u9fa5]/.test(decoded)) {
        return decoded;
      }
    } catch (e) {
      // 忽略 Base64 解码错误
    }
    // 尝试 escape/unescape
    return unescape(encodeURIComponent(str));
  } catch (e) {
    console.warn('UTF-8解码失败:', e);
    return str;
  }
}

// 请求重试函数
const retryRequest = async (fn, retryTimes = config.request.retryTimes) => {
  for (let i = 0; i < retryTimes; i++) {
    try {
      return await fn()
    } catch (error) {
      if (i === retryTimes - 1) throw error
      await new Promise(resolve => setTimeout(resolve, config.request.retryDelay))
    }
  }
}

// 获取当前API配置
const getCurrentAPI = () => {
  const provider = config.currentProvider
  return config[provider]
}

// 准备消息数据
const prepareMessages = (messages) => {
  // 验证消息格式并只保留最近的消息
  return messages.slice(-10).map(msg => {
    if (typeof msg.content !== 'string') {
      console.warn('消息内容不是字符串:', msg.content)
      return {
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: String(msg.content)
      }
    }
    return {
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content
    }
  })
}

// 处理数据块
const processChunk = (chunk, apiConfig, onProgress) => {
  if (!chunk || !chunk.data) {
    return false;
  }

  try {
    // 统一使用 TextDecoder 解码二进制数据
    const text = new TextDecoder('utf-8').decode(new Uint8Array(chunk.data));
    console.log('收到数据块:', text);  // 添加日志
    
    const lines = text.split('\n');
    let hasProgress = false;
    let isLast = false;
    let content = '';
    let reasoningContent = '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      // 检查是否是结束标记
      if (trimmed === 'data: [DONE]') {
        console.log('收到结束标记');  // 添加日志
        isLast = true;
        hasProgress = true;
        break;
      }

      // 只处理 data: 开头的行
      if (!trimmed.startsWith('data: ')) continue;

      try {
        // 解析 JSON 数据
        const data = JSON.parse(trimmed.slice(6));
        console.log('解析的数据:', data);  // 添加日志
        
        // 检查是否是最后一个数据块
        if (data.choices?.[0]?.finish_reason === 'stop') {
          console.log('检测到结束原因: stop');  // 添加日志
          isLast = true;
        }
        
        // 提取增量内容
        const delta = data.choices?.[0]?.delta;
        if (!delta) continue;

        // 累积内容
        if (delta.content) {
          content += delta.content;
          console.log('累积内容:', content);  // 添加日志
        }
        if (delta.reasoning_content) {
          reasoningContent += delta.reasoning_content;
          console.log('累积推理内容:', reasoningContent);  // 添加日志
        }
        
        hasProgress = true;
      } catch (e) {
        console.error('解析JSON数据失败:', e, '原始数据:', trimmed);
      }
    }
    
    // 如果有内容或是最后一块，触发回调
    if (hasProgress || isLast) {
      // 处理换行符
      if (content) {
        content = content.replace(/\\n/g, '\n').replace(/\r\n/g, '\n');
      }
      if (reasoningContent) {
        reasoningContent = reasoningContent.replace(/\\n/g, '\n').replace(/\r\n/g, '\n');
      }
      
      const progressData = {
        content: content || '',
        reasoningContent: reasoningContent || '',
        isLast: isLast,
        raw: { content, reasoningContent }
      };
      
      console.log('触发进度回调:', progressData);  // 添加日志
      onProgress(progressData);
    }
    
    return hasProgress || isLast;
  } catch (error) {
    console.error('处理数据块失败:', error, '原始数据:', chunk);
    return false;
  }
}

/**
 * 与AI模型对话
 * @param {Array} messages 消息历史
 * @param {Function} onProgress 处理流式响应的回调函数
 * @returns {Promise} 返回对话结果
 */
export const chatWithAI = async (messages, onProgress) => {
  // 检查网络状态
  try {
    const networkType = await new Promise((resolve, reject) => {
      wx.getNetworkType({
        success: (res) => resolve(res.networkType),
        fail: (err) => reject(err)
      })
    })
    
    if (networkType === 'none') {
      throw new Error('当前无网络连接，请检查网络设置')
    }
    console.log('当前网络类型:', networkType)
  } catch (error) {
    console.error('获取网络状态失败:', error)
    throw new Error('网络状态检查失败，请确保网络正常')
  }

  // 获取当前可用的 API
  const api = await healthService.getCurrentAPI()
  if (!api || !api.url || !api.apiKey) {
    throw new Error('无可用的 API 配置')
  }
  
  console.log('使用 API:', {
    name: api.name,
    url: api.url,
    model: api.model,
    hasKey: !!api.apiKey
  })
  
  try {
    // 准备消息数据
    const validMessages = prepareMessages(messages)
    console.log('发送请求到:', api.url)
    console.log('使用模型:', api.model)
    
    let requestTask = null
    let timeoutCheck = null
    let lastProgressTime = Date.now()
    let isCompleted = false
    let finalContent = ''
    let finalReasoningContent = ''
    let hasError = false

    const response = await new Promise((resolve, reject) => {
      requestTask = wx.request({
        url: api.url,
        method: 'POST',
        timeout: 30000,
        responseType: 'arraybuffer',
        header: {
          'Authorization': `Bearer ${api.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        },
        data: {
          model: api.model,
          messages: validMessages,
          stream: true,
          temperature: api.temperature || 0.7,
          max_tokens: api.maxTokens || 2000,
          top_p: api.topP || 0.95
        },
        enableChunked: true,
        success: (res) => {
          if (res.statusCode === 401) {
            console.error('API认证失败:', res)
            healthService.recordFailure(api.name)
            reject(new Error('API认证失败，请检查API密钥是否正确'))
            return
          }
          if (res.statusCode === 403) {
            console.error('API访问被拒绝:', res)
            healthService.recordFailure(api.name)
            reject(new Error('API访问被拒绝，可能是域名未配置或API密钥无效'))
            return
          }
          if (res.statusCode !== 200) {
            console.error('API请求失败:', res)
            healthService.recordFailure(api.name)
            reject(new Error(`请求失败(${res.statusCode})，请检查网络连接和API配置`))
            return
          }
          // 记录成功
          healthService.recordSuccess(api.name)
          resolve(res)
        },
        fail: (error) => {
          console.error('API请求失败:', error)
          healthService.recordFailure(api.name)
          
          // 根据错误类型提供具体提示
          if (error.errMsg.includes('timeout')) {
            reject(new Error('请求超时，请检查网络连接'))
          } else if (error.errMsg.includes('domain')) {
            reject(new Error('域名访问失败，请在开发工具中关闭域名校验或在小程序后台配置域名'))
          } else if (error.errMsg.includes('ssl')) {
            reject(new Error('SSL证书验证失败，请在开发工具中关闭域名校验'))
          } else {
            reject(new Error(`请求失败: ${error.errMsg}`))
          }
        }
      })

      if (requestTask.onChunkReceived) {
        requestTask.onChunkReceived((chunk) => {
          try {
            const result = processChunk(chunk, api, (data) => {
              if (isCompleted) return
              
              if (data.content) {
                finalContent += data.content
              }
              if (data.reasoningContent) {
                finalReasoningContent += data.reasoningContent
              }
              
              // 调用进度回调
              onProgress(data)
              
              // 如果是最后一块数据
              if (data.isLast) {
                isCompleted = true
                // 清理资源
                if (timeoutCheck) {
                  clearInterval(timeoutCheck)
                  timeoutCheck = null
                }
                if (requestTask) {
                  requestTask = null
                }
              }
            })
            
            if (result) {
              lastProgressTime = Date.now()
            }
          } catch (error) {
            console.error('处理数据块失败:', error)
            if (!isCompleted) {
              hasError = true
              reject(error)
            }
          }
        })
      }

      // 设置超时检查
      timeoutCheck = setInterval(() => {
        const now = Date.now()
        if (now - lastProgressTime > config.request.timeout) {
          isCompleted = true
          hasError = true
          if (timeoutCheck) {
            clearInterval(timeoutCheck)
            timeoutCheck = null
          }
          if (requestTask) {
            requestTask.abort()
            requestTask = null
            reject(new Error(config.errorMessages.timeout))
          }
        }
      }, 5000)
    })

    // 如果已经完成，返回最终内容
    if (isCompleted) {
      return {
        content: finalContent.trim(),
        reasoningContent: finalReasoningContent.trim()
      }
    }

    // 如果没有完成但没有错误，返回已收到的内容
    if (!hasError) {
      return {
        content: finalContent.trim(),
        reasoningContent: finalReasoningContent.trim()
      }
    }

    throw new Error('请求未完成且发生错误')

  } catch (error) {
    console.error('API请求失败:', error)
    
    // 检查是否需要切换 API
    if (healthService.shouldSwitchAPI(error)) {
      // 记录失败并重试
      await healthService.recordFailure(api.name)
      
      // 获取新的 API 并重试
      const newApi = await healthService.getCurrentAPI()
      if (newApi.name !== api.name) {
        console.log('切换到备用 API:', newApi.name)
        return chatWithAI(messages, onProgress)
      }
    }
    
    throw error
  }
}

// 导出错误处理函数供外部使用
export const handleAPIError = (error) => {
  console.error('API请求失败:', error)
  
  // 获取当前API名称
  const currentAPI = healthService.getCurrentAPI().name
  
  // 检查是否需要切换API
  if (healthService.shouldSwitchAPI(error)) {
    healthService.recordFailure(currentAPI)
    return '网络连接不稳定，正在切换备用服务器...'
  }
  
  // 其他错误处理
  if (error.errMsg && error.errMsg.includes('timeout')) {
    return '请求超时，请稍后重试'
  }
  
  if (error.statusCode === 401) {
    return 'API密钥无效，请联系管理员'
  }
  
  if (error.statusCode === 429) {
    return '请求过于频繁，请稍后重试'
  }
  
  return '服务暂时不可用，请稍后重试'
}

/**
 * 获取当前使用的API信息
 * @returns {Object} API信息
 */
export const getCurrentAPIInfo = () => {
  const api = healthService.getCurrentAPI()
  return {
    name: api.name,
    url: api.url,
    model: api.model
  }
}