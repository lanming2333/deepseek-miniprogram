/**
 * 聊天页面逻辑
 */

import { chatWithAI, handleAPIError } from '../../services/api.service'
import * as storage from '../../services/storage.service'

const TIME_GAP = 5 * 60 * 1000 // 5分钟显示一次时间
const UPDATE_INTERVAL = 100 // 更新UI的最小间隔（毫秒）

// 生成唯一消息ID
let messageIdCounter = Date.now()
const generateMessageId = () => {
  return `msg_${messageIdCounter++}`
}

Page({
  data: {
    messages: [],
    inputText: '',
    scrollTop: 0,
    sending: false,
    isRefreshing: false,
    currentSessionId: null,
    statusBarHeight: 20,
    navHeight: 64,
    showSidebar: false,
    searchKeyword: '',
    thisWeekSessions: [],
    thisMonthSessions: [],
    earlierSessions: [],
    searchResults: [],
    isLoading: false,
    hasMore: true,
    sessionList: [],
    isIOS: false,
    keyboardHeight: 0,
    isKeyboardShow: false,
    'input-area-style': '',
    'bottom-space-style': ''
  },

  // 页面加载
  onLoad(options) {
    // 获取系统信息
    try {
      const windowInfo = wx.getWindowInfo();
      const systemInfo = wx.getAppBaseInfo();
      const menuButtonInfo = wx.getMenuButtonBoundingClientRect();
      
      // 设置自定义导航栏高度
      const customNavHeight = windowInfo.statusBarHeight + 44; // 44是导航栏的固定高度
      
      this.setData({
        statusBarHeight: windowInfo.statusBarHeight,
        navHeight: windowInfo.statusBarHeight + (menuButtonInfo.height || 32) + (menuButtonInfo.top - windowInfo.statusBarHeight) * 2,
        isIOS: systemInfo.platform === 'ios'
      });

      // 设置CSS变量
      wx.nextTick(() => {
        const query = wx.createSelectorQuery();
        query.select('.chat-page').node((res) => {
          if (res && res.node) {
            res.node.style.setProperty('--status-bar-height', windowInfo.statusBarHeight + 'px');
            res.node.style.setProperty('--custom-nav-height', customNavHeight + 'px');
          }
        }).exec();
      });
    } catch (error) {
      console.error('获取系统信息失败:', error);
      // 使用默认值
      this.setData({
        statusBarHeight: 20,
        navHeight: 64,
        isIOS: false
      });
    }

    // 设置导航栏按钮
    wx.setNavigationBarTitle({
      title: '深索AI助手'
    });

    // 使用传入的会话ID或创建新会话ID
    const sessionId = options.sessionId || storage.createNewSession();
    
    // 加载历史消息
    const allMessages = storage.getAllMessages()
    const messages = allMessages.filter(msg => msg.sessionId === sessionId)
    
    // 确保所有消息都有唯一ID和会话ID
    messages.forEach(msg => {
      if (!msg.id) {
        msg.id = generateMessageId()
      }
      if (!msg.sessionId) {
        msg.sessionId = sessionId
      }
    })
    
    // 按时间戳排序
    messages.sort((a, b) => a.timestamp - b.timestamp)
    
    // 如果是新会话且没有历史消息，添加欢迎消息
    if (messages.length === 0) {
      const welcomeMessage = {
        id: generateMessageId(),
        role: 'assistant',
        content: 'Hi，我是深索AI助手，很高兴遇见你！',
        timestamp: Date.now(),
        sessionId: sessionId
      }
      messages.push(welcomeMessage)
    }
    
    // 如果有时间戳参数，定位到特定消息
    if (options.timestamp) {
      const targetIndex = messages.findIndex(msg => 
        msg.timestamp === parseInt(options.timestamp)
      )
      if (targetIndex >= 0) {
        // TODO: 实现消息定位逻辑
      }
    }
    
    this.setData({ 
      messages,
      currentSessionId: sessionId,
      sending: false,
      isRefreshing: false
    }, () => {
      this.scrollToBottom()
    })

    // 初始化页面状态
    this._isPageActive = true

    // 加载历史会话
    this.loadHistorySessions();
  },

  // 页面显示
  onShow() {
    this._isPageActive = true
    
    // 检查是否有未完成的流式输出
    const streamState = storage.getStreamState(this.data.currentSessionId)
    if (streamState && this.data.sending) {
      this._currentStreamState = streamState
      this.resumeStreamOutput()
    }
  },

  // 页面隐藏
  onHide() {
    // 如果正在进行流式输出，保存当前状态
    if (this.data.sending && this._currentStreamState) {
      storage.saveStreamState(this.data.currentSessionId, this._currentStreamState)
    }
    
    this._isPageActive = false
    // 保存当前会话状态
    if (this.data.messages.length > 0) {
      storage.saveMessages(this.data.messages)
    }
    // 清理正在进行的请求
    if (this._currentRequest) {
      this._currentRequest.abort()
      this._currentRequest = null
    }
  },

  // 页面卸载
  onUnload() {
    this._isPageActive = false
    // 保存当前会话状态
    if (this.data.messages.length > 0) {
      storage.saveMessages(this.data.messages)
    }
    // 清理定时器和事件监听
    if (this.scrollTimer) {
      clearTimeout(this.scrollTimer)
      this.scrollTimer = null
    }
    // 清理正在进行的请求
    if (this._currentRequest) {
      this._currentRequest.abort()
      this._currentRequest = null
    }
  },

  // 开始新对话
  startNewChat() {
    console.log('=== 开始新对话 ===');
    // 如果当前有会话，先保存
    if (this.data.messages.length > 0) {
      console.log('当前会话消息数:', this.data.messages.length);
      console.log('当前会话ID:', this.data.currentSessionId);
      console.log('准备保存当前会话...');
      try {
        storage.saveMessages(this.data.messages);
        console.log('当前会话保存成功');
      } catch (error) {
        console.error('保存当前会话失败:', error);
      }
    } else {
      console.log('当前无会话消息，跳过保存');
    }
    
    // 创建新会话ID
    const newSessionId = storage.createNewSession();
    console.log('创建新会话ID:', newSessionId);
    
    // 创建欢迎消息
    const welcomeMessage = {
      id: generateMessageId(),
      role: 'assistant',
      content: 'Hi，我是深索AI助手，很高兴遇见你！',
      timestamp: Date.now(),
      sessionId: newSessionId
    }
    
    // 清空当前会话并添加欢迎消息
    this.setData({
      messages: [welcomeMessage],
      inputText: '',
      currentSessionId: newSessionId,
      showSidebar: false
    }, () => {
      console.log('当前会话已清空，准备加载历史会话列表');
      // 重新加载历史会话
      this.loadHistorySessions();
    });
  },

  // 打开历史记录
  openHistory() {
    wx.navigateTo({
      url: '/pages/history/index'
    })
  },

  // 格式化时间显示
  formatTime(timestamp) {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now - date
    
    // 今天的消息只显示时间
    if (date.toDateString() === now.toDateString()) {
      return this.formatTimeOnly(date)
    }
    
    // 昨天的消息显示"昨天"
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    if (date.toDateString() === yesterday.toDateString()) {
      return `昨天 ${this.formatTimeOnly(date)}`
    }
    
    // 一周内的消息显示星期几
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
      return `${weekdays[date.getDay()]} ${this.formatTimeOnly(date)}`
    }
    
    // 其他显示完整日期
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} ${this.formatTimeOnly(date)}`
  },

  // 格式化时间（时:分）
  formatTimeOnly(date) {
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  },

  // 输入框内容变化
  onInput(e) {
    this.setData({
      inputText: e.detail.value
    })
  },

  // 发送消息
  async sendMessage() {
    const content = this.data.inputText.trim()
    if (!content || this.data.sending) return
    
    console.log('=== 开始发送消息 ===')
    console.log('当前输入内容:', content)
    
    this.setData({ sending: true })
    console.log('设置发送状态: sending = true')
    
    const messages = [...this.data.messages]
    // 添加用户消息
    const userMessage = {
      id: generateMessageId(),
      role: 'user',
      content: content,
      timestamp: Date.now(),
      sessionId: this.data.currentSessionId
    }
    messages.push(userMessage)
    console.log('添加用户消息:', userMessage)
    
    // 添加一个带思考中状态的助手消息
    const assistantMessage = {
      id: generateMessageId(),
      role: 'assistant',
      content: '',
      reasoning_content: '',
      timestamp: Date.now() + 1,
      sessionId: this.data.currentSessionId,
      thinking: true // 添加思考中状态
    }
    messages.push(assistantMessage)
    console.log('添加助手消息(思考中):', JSON.stringify(assistantMessage))
    
    // 初始化流式输出状态
    this._currentStreamState = {
      messages,
      currentContent: '',
      currentReasoningContent: ''
    }
    console.log('初始化流式输出状态:', JSON.stringify(this._currentStreamState))
    
    // 先更新UI显示思考中状态，并滚动到底部（因为这是用户操作）
    console.log('准备更新UI显示思考中状态...')
    this.setData({ 
      messages,
      inputText: ''
    }, () => {
      console.log('UI状态更新完成，当前消息列表:', JSON.stringify(messages))
      this.scrollToBottom()
    })

    try {
      let isResponseComplete = false
      let hasReceivedContent = false
      let isFirstContent = true
      this._lastUpdateTime = Date.now()
      
      // 调用API并处理流式响应
      const result = await chatWithAI(messages.slice(0, -1), (chunk) => {
        if (!this._isPageActive) {
          console.log('页面不活跃，停止更新UI')
          return
        }
        
        const now = Date.now()
        const shouldUpdate = now - this._lastUpdateTime >= UPDATE_INTERVAL
        
        // 检查是否收到有效内容
        const hasValidContent = (chunk.content && chunk.content.trim()) || 
                              (chunk.reasoningContent && chunk.reasoningContent.trim())
        
        console.log('收到数据块:', {
          hasValidContent,
          hasReceivedContent,
          isThinking: assistantMessage.thinking,
          chunkContent: chunk.content,
          chunkReasoningContent: chunk.reasoningContent
        })
        
        if (hasValidContent && !hasReceivedContent) {
          console.log('收到第一个有效内容，准备移除思考中状态')
          hasReceivedContent = true
          assistantMessage.thinking = false
          // 立即更新UI移除思考中状态，但不滚动
          this.setData({ 
            messages: [...messages]  // 创建新数组触发更新
          })
        }
        
        if (chunk.content !== undefined) {
          // 处理最终回复内容
          const processedContent = this.processMessageContent(chunk.content, {
            isReasoning: false,
            hasReasoning: !!this._currentStreamState.currentReasoningContent,
            isFirstChunk: isFirstContent
          })
          
          if (!this._currentStreamState.currentContent) {
            this._currentStreamState.currentContent = processedContent
          } else {
            this._currentStreamState.currentContent += processedContent
          }
          
          isFirstContent = false
        }
        
        if (chunk.reasoningContent !== undefined) {
          // 处理推理过程内容
          const processedReasoning = this.processMessageContent(chunk.reasoningContent, {
            isReasoning: true,
            hasReasoning: false,
            isFirstChunk: !this._currentStreamState.currentReasoningContent
          })
          
          if (!this._currentStreamState.currentReasoningContent) {
            this._currentStreamState.currentReasoningContent = processedReasoning
          } else {
            this._currentStreamState.currentReasoningContent += processedReasoning
          }
          
          assistantMessage.showReasoning = true
        }
        
        // 更新消息内容，但不滚动
        if (shouldUpdate) {
          console.log('准备更新消息内容:', {
            hasContent: !!this._currentStreamState.currentContent,
            hasReasoning: !!this._currentStreamState.currentReasoningContent,
            thinking: assistantMessage.thinking
          })
          
          // 直接使用处理好的内容，不再重复处理
          if (this._currentStreamState.currentReasoningContent) {
            assistantMessage.reasoning_content = this._currentStreamState.currentReasoningContent
          }
          
          if (this._currentStreamState.currentContent?.trim()) {
            // 最终更新前再次处理一遍，确保换行正确
            assistantMessage.content = this.processMessageContent(
              this._currentStreamState.currentContent,
              {
                isReasoning: false,
                hasReasoning: !!assistantMessage.reasoning_content,
                isFirstChunk: false
              }
            )
          }
          
          this.setData({ 
            messages: [...messages]  // 创建新数组触发更新
          })
          this._lastUpdateTime = now
          
          // 保存当前状态
          this._currentStreamState.messages = messages
          storage.saveStreamState(this.data.currentSessionId, this._currentStreamState)
        }
        
        // 检查是否是最后一个数据块
        if (chunk.isLast) {
          console.log('收到最后一个数据块，清理状态')
          isResponseComplete = true
          if (this._isPageActive) {
            this.setData({ sending: false })
          }
          storage.clearStreamState(this.data.currentSessionId)
          this._currentStreamState = null
        }
      })
      
      // 更新最终内容，但不滚动
      if (result && this._isPageActive) {
        if (result.content || result.reasoningContent) {
          console.log('更新最终内容')
          assistantMessage.thinking = false
          assistantMessage.content = result.content || this._currentStreamState.currentContent
          assistantMessage.reasoning_content = result.reasoningContent || this._currentStreamState.currentReasoningContent
          assistantMessage.showReasoning = false
          this.setData({ 
            messages: [...messages]  // 创建新数组触发更新
          })
        }
        storage.clearStreamState(this.data.currentSessionId)
        this._currentStreamState = null
      }
      
      // 保存消息记录
      try {
        await storage.saveMessages(messages)
        console.log('消息记录保存成功')
      } catch (error) {
        console.error('保存消息失败:', error)
      }
      
      if (!isResponseComplete && this._isPageActive) {
        this.setData({ sending: false })
      }
    } catch (error) {
      console.error('发送消息失败:', error)
      if (this._isPageActive) {
        assistantMessage.thinking = false
        assistantMessage.content = handleAPIError(error)
        assistantMessage.isError = true
        this.setData({ 
          messages: [...messages],  // 创建新数组触发更新
          sending: false
        }, () => {
          console.log('错误状态已更新')
        })
      }
      storage.clearStreamState(this.data.currentSessionId)
      this._currentStreamState = null
    } finally {
      if (this._isPageActive) {
        this.setData({ sending: false })
      }
    }
  },

  // 判断是否显示时间
  shouldShowTime(current, previous) {
    if (!previous) return true
    return current.timestamp - previous.timestamp > TIME_GAP
  },

  // 滚动到顶部（加载更多历史消息）
  async onScrollToUpper() {
    if (this.data.isRefreshing) return
    
    this.setData({ isRefreshing: true })
    
    // TODO: 实现加载更多历史消息的逻辑
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    this.setData({ isRefreshing: false })
  },

  // 滚动到底部（使用防抖）
  scrollToBottom(isKeyboardShow = false) {
    if (this.scrollTimer) {
      clearTimeout(this.scrollTimer)
    }
    this.scrollTimer = setTimeout(() => {
      const query = wx.createSelectorQuery().in(this);
      query.select('.message-list').boundingClientRect();
      query.exec(res => {
        if (res && res[0]) {
          const scrollHeight = res[0].height;
          const keyboardOffset = isKeyboardShow ? this.data.keyboardHeight : 0;
          
          this.setData({
            scrollTop: scrollHeight + keyboardOffset
          });
        }
      });
    }, 100)
  },

  // 切换推理过程显示状态
  toggleReasoning(e) {
    const id = e.currentTarget.dataset.id
    const messages = this.data.messages
    const index = messages.findIndex(msg => msg.id === id)
    
    if (index !== -1) {
      const key = `messages[${index}].showReasoning`
      this.setData({
        [key]: !messages[index].showReasoning
      })
    }
  },

  // 处理消息内容
  processMessageContent(content, options = {}) {
    if (!content) return ''
    
    const {
      isReasoning = false,      // 是否是推理过程
      hasReasoning = false,     // 是否有推理过程
      isFirstChunk = false      // 是否是第一个数据块
    } = options
    
    // 统一换行符格式
    let processedContent = content
      .replace(/\\n/g, '\n')    // 先处理转义的换行符
      .replace(/\r\n/g, '\n')   // 统一 Windows 换行符
      .replace(/\r/g, '\n')     // 统一 Mac 旧式换行符
      .replace(/↵/g, '\n')      // 处理特殊换行符
    
    // 处理推理过程和最终回复之间的换行
    if (!isReasoning && hasReasoning && isFirstChunk) {
      // 如果是最终回复的第一个数据块，且有推理过程，则确保只有一个换行
      processedContent = processedContent.replace(/^\n+/, '\n')
    } else if (isReasoning) {
      // 如果是推理过程，保持原有换行
      processedContent = processedContent.trim()
    } else {
      // 如果是普通回复，保持原有换行
      processedContent = processedContent.replace(/\n{3,}/g, '\n\n') // 将连续3个以上换行替换为2个
    }
    
    return processedContent
  },

  // 切换侧边栏
  toggleSidebar: function() {
    this.setData({
      showSidebar: !this.data.showSidebar
    });
  },

  // 关闭侧边栏
  closeSidebar: function() {
    this.setData({
      showSidebar: false
    });
  },

  // 阻止遮罩层的触摸移动事件
  preventTouchMove: function() {
    return false;
  },

  // 搜索输入
  onSearchInput: function(e) {
    this.setData({
      searchKeyword: e.detail.value
    });
    if (e.detail.value) {
      this.searchSessions(e.detail.value);
    } else {
      this.setData({
        searchResults: []
      });
    }
  },

  // 清除搜索
  clearSearch: function() {
    this.setData({
      searchKeyword: '',
      searchResults: []
    });
  },

  // 执行搜索
  searchSessions: function(keyword) {
    const allSessions = [...this.data.thisWeekSessions, ...this.data.thisMonthSessions, ...this.data.earlierSessions];
    const results = allSessions.filter(session => 
      session.title && session.title.toLowerCase().includes(keyword.toLowerCase())
    );
    this.setData({
      searchResults: results
    });
  },

  // 加载历史会话
  loadHistorySessions: function() {
    console.log('=== 加载历史会话 ===');
    this.setData({ isLoading: true });
    
    // 从本地存储获取会话记录
    wx.getStorage({
      key: 'chatSessions',
      success: (res) => {
        console.log('成功获取本地存储的会话数据');
        const sessions = res.data || [];
        console.log('历史会话数量:', sessions.length);
        console.log('会话数据示例:', sessions.slice(0, 1));
        this.categorizeSessions(sessions);
      },
      fail: (error) => {
        console.error('获取本地存储会话失败:', error);
        this.setData({
          thisWeekSessions: [],
          thisMonthSessions: [],
          earlierSessions: [],
          hasMore: false
        });
      },
      complete: () => {
        this.setData({ isLoading: false });
      }
    });
  },

  // 分类会话记录
  categorizeSessions: function(sessions) {
    console.log('=== 开始分类会话 ===');
    const now = new Date();
    const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const thisWeek = [];
    const thisMonth = [];
    const earlier = [];

    sessions.forEach(session => {
      const sessionDate = new Date(session.timestamp);
      if (sessionDate >= oneWeekAgo) {
        thisWeek.push(session);
      } else if (sessionDate >= oneMonthAgo) {
        thisMonth.push(session);
      } else {
        earlier.push(session);
      }
    });

    console.log('本周会话数:', thisWeek.length);
    console.log('本月会话数:', thisMonth.length);
    console.log('更早会话数:', earlier.length);

    this.setData({
      thisWeekSessions: thisWeek,
      thisMonthSessions: thisMonth,
      earlierSessions: earlier,
      sessionList: sessions,
      hasMore: sessions.length >= 20
    }, () => {
      console.log('会话分类完成，数据已更新');
    });
  },

  // 选择会话
  selectSession: function(e) {
    const session = e.currentTarget.dataset.session;
    // 加载选中的会话
    this.loadSession(session);
    // 关闭侧边栏
    this.closeSidebar();
  },

  // 加载会话
  loadSession: function(session) {
    console.log('=== 加载指定会话 ===');
    console.log('会话信息:', session);
    
    if (!session || !session.messages) {
      console.error('无效的会话数据');
      return;
    }
    
    // 更新当前会话ID和消息列表
    this.setData({
      currentSessionId: session.id,
      messages: session.messages,
      showSidebar: false
    }, () => {
      console.log('会话加载完成');
      console.log('当前会话ID:', session.id);
      console.log('消息数量:', session.messages.length);
      // 滚动到底部
      this.scrollToBottom();
    });
  },

  // 加载更多
  onLoadMore: function() {
    if (this.data.isLoading || !this.data.hasMore) return;
    
    // TODO: 实现加载更多历史记录的逻辑
    console.log('Loading more sessions...');
  },

  // 恢复流式输出
  async resumeStreamOutput() {
    if (!this._currentStreamState) return
    
    const { messages, currentContent, currentReasoningContent } = this._currentStreamState
    
    // 恢复消息列表
    this.setData({ messages }, () => {
      this.scrollToBottom()
    })
    
    // 获取最后一条助手消息
    const assistantMessage = messages[messages.length - 1]
    
    try {
      // 继续接收流式输出
      const result = await chatWithAI(messages.slice(0, -1), (chunk) => {
        // 如果页面已经不活跃，不再更新UI
        if (!this._isPageActive) return
        
        const now = Date.now()
        const shouldUpdate = !this._lastUpdateTime || now - this._lastUpdateTime >= UPDATE_INTERVAL
        
        if (chunk.content !== undefined) {
          // 如果有之前的内容，拼接上去
          if (currentContent && !this._hasRestoredContent) {
            this._currentStreamState.currentContent = currentContent + chunk.content
            this._hasRestoredContent = true
          } else {
            this._currentStreamState.currentContent = (this._currentStreamState.currentContent || '') + chunk.content
          }
        }
        
        if (chunk.reasoningContent !== undefined) {
          const processedReasoning = chunk.reasoningContent
            .replace(/\r\n/g, '\n')  // 统一使用 \n
            .replace(/\r/g, '\n')    // 统一使用 \n
            .replace(/↵/g, '\n')     // 统一使用 \n
            .replace(/\\n/g, '\n')   // 处理转义的换行符
          
          if (!this._currentStreamState.currentReasoningContent) {
            // 如果是第一段推理内容，保留开头的换行
            this._currentStreamState.currentReasoningContent = processedReasoning
          } else {
            // 如果是后续内容，直接拼接
            this._currentStreamState.currentReasoningContent += processedReasoning
          }
          
          assistantMessage.showReasoning = true
        }
        
        // 更新消息内容
        if (shouldUpdate) {
          assistantMessage.reasoning_content = this._currentStreamState.currentReasoningContent
          if (this._currentStreamState.currentContent?.trim()) {
            assistantMessage.content = this.processMessageContent(this._currentStreamState.currentContent)
          }
          
          this.setData({ messages }, () => {
            this.scrollToBottom()
          })
          this._lastUpdateTime = now
          
          // 保存当前状态
          this._currentStreamState.messages = messages
          storage.saveStreamState(this.data.currentSessionId, this._currentStreamState)
        }
        
        // 检查是否是最后一个数据块
        if (chunk.isLast) {
          this.setData({ sending: false })
          storage.clearStreamState(this.data.currentSessionId)
          this._currentStreamState = null
        }
      })
      
      // 更新最终内容
      if (result && this._isPageActive) {
        if (result.content || result.reasoningContent) {
          assistantMessage.content = result.content || this._currentStreamState.currentContent
          assistantMessage.reasoning_content = result.reasoningContent || this._currentStreamState.currentReasoningContent
          assistantMessage.showReasoning = false
          this.setData({ messages }, () => {
            this.scrollToBottom()
          })
        }
        storage.clearStreamState(this.data.currentSessionId)
        this._currentStreamState = null
      }
    } catch (error) {
      console.error('恢复流式输出失败:', error)
      if (this._isPageActive) {
        assistantMessage.content = handleAPIError(error)
        assistantMessage.isError = true
        this.setData({ 
          messages,
          sending: false
        })
      }
      storage.clearStreamState(this.data.currentSessionId)
      this._currentStreamState = null
    }
  },

  // 分享给朋友
  onShareAppMessage(res) {
    console.log('触发分享给朋友:', res);
    const currentSession = this.data.messages;
    const lastUserMessage = currentSession.filter(msg => msg.role === 'user').pop();
    const title = lastUserMessage ? 
      (lastUserMessage.content.length > 20 ? lastUserMessage.content.slice(0, 20) + '...' : lastUserMessage.content) : 
      'AI 助手对话';

    return {
      title: title,
      path: `/pages/chat/index?sessionId=${this.data.currentSessionId}`,
      imageUrl: '/assets/images/share-cover.png' // 分享封面图，建议尺寸 5:4
    }
  },

  // 分享到朋友圈
  onShareTimeline() {
    console.log('触发分享到朋友圈');
    const currentSession = this.data.messages;
    const lastUserMessage = currentSession.filter(msg => msg.role === 'user').pop();
    const title = lastUserMessage ? 
      (lastUserMessage.content.length > 20 ? lastUserMessage.content.slice(0, 20) + '...' : lastUserMessage.content) : 
      'AI 助手对话';

    return {
      title: title,
      query: `sessionId=${this.data.currentSessionId}`,
      imageUrl: '/assets/images/share-cover.png' // 分享封面图，建议尺寸 1:1
    }
  },

  // 切换推理过程显示状态
  onToggleReasoning(e) {
    const { messageId } = e.detail;
    const messages = this.data.messages;
    const index = messages.findIndex(msg => msg.id === messageId);
    
    if (index !== -1) {
      const key = `messages[${index}].showReasoning`;
      this.setData({
        [key]: !messages[index].showReasoning
      });
    }
  },

  // 输入框获得焦点
  onInputFocus(e) {
    const keyboardHeight = e.detail.height || 0;
    console.log('键盘高度:', keyboardHeight);
    
    this.setData({
      keyboardHeight,
      isKeyboardShow: true,
      'input-area-style': `transform: translateY(-${keyboardHeight}px)`,
      'bottom-space-style': 'height: 0'  // 移除底部空间
    });
  },

  // 输入框失去焦点
  onInputBlur() {
    console.log('输入框失去焦点');
    this.setData({
      keyboardHeight: 0,
      isKeyboardShow: false,
      'input-area-style': '',
      'bottom-space-style': 'height: 0'  // 移除底部空间
    });
  },
}) 