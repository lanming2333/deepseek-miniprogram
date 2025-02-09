/**
 * 历史记录页面逻辑
 */

import * as storage from '../../services/storage.service'

const PAGE_SIZE = 20 // 每页显示的会话数量

Page({
  data: {
    sessionList: [],
    currentPage: 1,
    hasMore: true,
    isLoading: false,
    showActionSheet: false,
    selectedSession: null,
    searchKeyword: '', // 搜索关键词
    originalSessions: [], // 保存原始会话列表
    isSearching: false // 是否处于搜索状态
  },

  onLoad() {
    this.loadSessionData()
  },

  // 页面显示时刷新数据
  onShow() {
    this.loadSessionData()
  },

  // 加载会话数据
  async loadSessionData(page = 1) {
    if (this.data.isLoading) return
    
    this.setData({ isLoading: true })
    try {
      const sessions = storage.getSessionList()
      // 按时间倒序排序
      sessions.sort((a, b) => b.timestamp - a.timestamp)
      
      // 保存原始会话列表
      this.setData({ originalSessions: sessions })
      
      if (this.data.searchKeyword) {
        // 如果有搜索关键词，进行搜索
        this.performSearch(this.data.searchKeyword)
      } else {
        // 分页处理
        const start = (page - 1) * PAGE_SIZE
        const end = start + PAGE_SIZE
        const pageSessions = sessions.slice(start, end)
        
        this.setData({
          sessionList: page === 1 ? pageSessions : [...this.data.sessionList, ...pageSessions],
          currentPage: page,
          hasMore: sessions.length > end,
          isLoading: false
        })
      }
    } catch (error) {
      console.error('加载历史记录失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
      this.setData({ isLoading: false })
    }
  },

  // 搜索输入处理
  onSearchInput(e) {
    const keyword = e.detail.value.trim()
    this.setData({ searchKeyword: keyword })
    
    if (keyword) {
      this.performSearch(keyword)
    } else {
      // 恢复原始列表
      this.resetSearch()
    }
  },

  // 执行搜索
  performSearch(keyword) {
    if (!keyword) return
    
    const searchResult = this.data.originalSessions.filter(session => {
      // 搜索标题
      if (session.title && session.title.toLowerCase().includes(keyword.toLowerCase())) {
        return true
      }
      
      // 搜索消息内容
      if (session.messages && session.messages.length) {
        return session.messages.some(msg => 
          msg.content && msg.content.toLowerCase().includes(keyword.toLowerCase())
        )
      }
      
      return false
    })
    
    this.setData({
      sessionList: searchResult,
      isSearching: true,
      hasMore: false
    })
  },

  // 清空搜索
  clearSearch() {
    this.setData({
      searchKeyword: '',
      isSearching: false
    }, () => {
      this.resetSearch()
    })
  },

  // 重置搜索状态
  resetSearch() {
    const start = 0
    const end = PAGE_SIZE
    const pageSessions = this.data.originalSessions.slice(start, end)
    
    this.setData({
      sessionList: pageSessions,
      currentPage: 1,
      hasMore: this.data.originalSessions.length > end,
      isSearching: false
    })
  },

  // 确认搜索
  onSearch() {
    if (this.data.searchKeyword) {
      this.performSearch(this.data.searchKeyword)
    }
  },

  // 加载更多
  onLoadMore() {
    if (this.data.hasMore && !this.data.isLoading && !this.data.isSearching) {
      this.loadSessionData(this.data.currentPage + 1)
    }
  },

  // 显示操作菜单
  showActions(e) {
    const { session } = e.currentTarget.dataset
    this.setData({
      showActionSheet: true,
      selectedSession: session
    })
  },

  // 隐藏操作菜单
  hideActionSheet() {
    this.setData({
      showActionSheet: false,
      selectedSession: null
    })
  },

  // 删除会话
  async deleteSession() {
    if (!this.data.selectedSession) return
    
    try {
      // 从存储中删除会话
      const messages = storage.getAllMessages()
      const sessionMessages = this.data.selectedSession.messages
      const sessionStart = sessionMessages[0].timestamp
      const sessionEnd = sessionMessages[sessionMessages.length - 1].timestamp
      
      const filteredMessages = messages.filter(msg => 
        msg.timestamp < sessionStart || msg.timestamp > sessionEnd
      )
      await storage.saveMessages(filteredMessages)
      
      // 更新界面
      this.hideActionSheet()
      this.loadSessionData(1) // 重新加载第一页
      
      wx.showToast({
        title: '删除成功',
        icon: 'success'
      })
    } catch (error) {
      console.error('删除会话失败:', error)
      wx.showToast({
        title: '删除失败',
        icon: 'none'
      })
    }
  },

  // 清空所有历史记录
  async clearAllHistory() {
    try {
      await wx.showModal({
        title: '确认清空',
        content: '确定要清空所有聊天记录吗？此操作不可恢复。',
        confirmText: '清空',
        confirmColor: '#ff4d4f'
      })
      
      await storage.clearMessages()
      this.setData({
        sessionList: [],
        currentPage: 1,
        hasMore: false
      })
      
      wx.showToast({
        title: '已清空',
        icon: 'success'
      })
    } catch (error) {
      console.error('清空历史记录失败:', error)
      if (error.errMsg !== 'showModal:fail cancel') {
        wx.showToast({
          title: '操作失败',
          icon: 'none'
        })
      }
    }
  },

  // 跳转到聊天页面
  navigateToChat(e) {
    const { session } = e.currentTarget.dataset
    if (!session || !session.id) {
      wx.showToast({
        title: '会话信息无效',
        icon: 'none'
      })
      return
    }
    
    wx.navigateTo({
      url: `/pages/chat/index?sessionId=${session.id}`
    })
  },

  // 格式化时间显示
  formatTime(timestamp) {
    if (!timestamp) return ''
    
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
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${this.formatTimeOnly(date)}`
  },

  // 格式化时间（时:分）
  formatTimeOnly(date) {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  }
}) 