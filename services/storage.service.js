/**
 * 存储服务
 * 管理聊天记录的本地存储
 */

const CHAT_HISTORY_KEY = 'chat_history'
const MAX_HISTORY_LENGTH = 100 // 最多保存100条历史记录

/**
 * 流式输出状态存储键
 */
const STREAM_STATE_KEY = 'stream_state'

// 获取会话标题（取第一个用户提问）
const getSessionTitle = (messages) => {
  console.log('获取会话标题，消息数量:', messages.length);
  const firstUserMessage = messages.find(msg => msg.role === 'user')
  if (firstUserMessage) {
    // 截取前20个字符，如果有更多则加上省略号
    const title = firstUserMessage.content.trim()
    const finalTitle = title.length > 20 ? title.substring(0, 20) + '...' : title;
    console.log('会话标题:', finalTitle);
    return finalTitle;
  }
  console.log('未找到用户消息，使用默认标题');
  return '新对话'
}

// 生成会话ID
const generateSessionId = () => {
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log('生成新会话ID:', sessionId);
  return sessionId;
}

// 获取所有聊天记录
export const getAllMessages = () => {
  console.log('=== 获取所有聊天记录 ===');
  try {
    const messages = wx.getStorageSync(CHAT_HISTORY_KEY) || []
    console.log('获取到消息数量:', messages.length);
    // 确保所有消息都有会话ID
    messages.forEach(msg => {
      if (!msg.sessionId) {
        console.log('发现无会话ID的消息，自动分配ID');
        msg.sessionId = generateSessionId()
      }
    })
    return messages
  } catch (error) {
    console.error('读取聊天记录失败:', error)
    return []
  }
}

// 保存聊天记录
export const saveMessages = async (messages) => {
  console.log('=== 保存聊天记录 ===');
  console.log('待保存消息数量:', messages.length);
  try {
    // 获取现有的所有消息
    const existingMessages = getAllMessages()
    console.log('已存在消息数量:', existingMessages.length);
    
    // 创建一个 Map 以会话 ID 为键存储最新的消息
    const messageMap = new Map()
    
    // 首先添加现有消息
    existingMessages.forEach(msg => {
      if (!messageMap.has(msg.sessionId)) {
        messageMap.set(msg.sessionId, [])
      }
      messageMap.get(msg.sessionId).push(msg)
    })
    
    // 然后添加或更新新消息
    messages.forEach(msg => {
      if (!msg.sessionId) {
        console.warn('消息缺少sessionId:', msg)
        return
      }
      
      if (!messageMap.has(msg.sessionId)) {
        messageMap.set(msg.sessionId, [])
      }
      
      // 检查消息是否已存在
      const sessionMessages = messageMap.get(msg.sessionId)
      const existingIndex = sessionMessages.findIndex(m => m.id === msg.id)
      if (existingIndex >= 0) {
        sessionMessages[existingIndex] = msg
      } else {
        sessionMessages.push(msg)
      }
    })
    
    // 将所有会话的消息合并为一个数组
    const allMessages = Array.from(messageMap.values()).flat()
    console.log('合并后总消息数:', allMessages.length);
    
    // 按时间戳排序
    allMessages.sort((a, b) => a.timestamp - b.timestamp)
    
    // 只保留最近的消息
    const messagesToSave = allMessages.slice(-MAX_HISTORY_LENGTH)
    console.log('最终保存消息数:', messagesToSave.length);
    
    await wx.setStorage({
      key: CHAT_HISTORY_KEY,
      data: messagesToSave
    })
    
    // 更新会话列表
    await updateSessionList(messagesToSave);
    
    console.log('消息保存成功');
    return true
  } catch (error) {
    console.error('保存聊天记录失败:', error)
    return false
  }
}

// 更新会话列表
const updateSessionList = async (messages) => {
  console.log('=== 更新会话列表 ===');
  try {
    const sessions = getSessionList();
    console.log('当前会话列表数量:', sessions.length);
    
    // 保存会话列表
    await wx.setStorage({
      key: 'chatSessions',
      data: sessions
    });
    console.log('会话列表更新成功');
  } catch (error) {
    console.error('更新会话列表失败:', error);
  }
}

// 获取会话列表
export const getSessionList = () => {
  console.log('=== 获取会话列表 ===');
  const messages = getAllMessages()
  const sessionMap = new Map()

  // 按会话ID分组
  messages.forEach(msg => {
    if (!msg.sessionId) return
    
    if (!sessionMap.has(msg.sessionId)) {
      sessionMap.set(msg.sessionId, [])
    }
    sessionMap.get(msg.sessionId).push(msg)
  })

  // 转换为会话列表
  const sessions = Array.from(sessionMap.entries()).map(([id, msgs]) => {
    // 按时间戳排序
    msgs.sort((a, b) => a.timestamp - b.timestamp)
    
    return {
      id,
      title: getSessionTitle(msgs),
      messages: msgs,
      timestamp: msgs[msgs.length - 1].timestamp // 使用最后一条消息的时间戳
    }
  })

  // 按最后消息时间倒序排序
  sessions.sort((a, b) => b.timestamp - a.timestamp)
  
  console.log('会话列表数量:', sessions.length);
  return sessions
}

// 创建新会话ID
export const createNewSession = () => {
  return generateSessionId()
}

// 添加新消息
export const addMessage = (message) => {
  const messages = getAllMessages()
  messages.push(message)
  return saveMessages(messages)
}

// 清空聊天记录
export const clearMessages = () => {
  try {
    wx.removeStorageSync(CHAT_HISTORY_KEY)
    return true
  } catch (error) {
    console.error('清空聊天记录失败:', error)
    return false
  }
}

// 保存流式输出状态
export const saveStreamState = async (sessionId, state) => {
  console.log('=== 保存流式输出状态 ===')
  console.log('会话ID:', sessionId)
  console.log('状态:', state)
  
  try {
    const allStates = wx.getStorageSync(STREAM_STATE_KEY) || {}
    allStates[sessionId] = {
      ...state,
      timestamp: Date.now()
    }
    await wx.setStorage({
      key: STREAM_STATE_KEY,
      data: allStates
    })
    console.log('流式输出状态保存成功')
    return true
  } catch (error) {
    console.error('保存流式输出状态失败:', error)
    return false
  }
}

// 获取流式输出状态
export const getStreamState = (sessionId) => {
  console.log('=== 获取流式输出状态 ===')
  console.log('会话ID:', sessionId)
  
  try {
    const allStates = wx.getStorageSync(STREAM_STATE_KEY) || {}
    const state = allStates[sessionId]
    console.log('获取到的状态:', state)
    return state
  } catch (error) {
    console.error('获取流式输出状态失败:', error)
    return null
  }
}

// 清除流式输出状态
export const clearStreamState = async (sessionId) => {
  console.log('=== 清除流式输出状态 ===')
  console.log('会话ID:', sessionId)
  
  try {
    const allStates = wx.getStorageSync(STREAM_STATE_KEY) || {}
    delete allStates[sessionId]
    await wx.setStorage({
      key: STREAM_STATE_KEY,
      data: allStates
    })
    console.log('流式输出状态清除成功')
    return true
  } catch (error) {
    console.error('清除流式输出状态失败:', error)
    return false
  }
} 