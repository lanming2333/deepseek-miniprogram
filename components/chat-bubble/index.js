Component({
  properties: {
    // 消息数据
    message: {
      type: Object,
      value: {}
    },
    // 是否显示时间
    showTime: {
      type: Boolean,
      value: true
    }
  },

  data: {
    // 格式化后的时间
    formattedTime: '',
    isReasoningExpanded: true,  // 默认展开
    isThinking: false,
    hasManuallyCollapsed: false,  // 记录用户是否手动折叠
    isFirstContent: true  // 记录是否是第一次收到内容
  },

  lifetimes: {
    attached() {
      if (this.properties.message.timestamp) {
        this.formatTime()
      }
      // 初始化思考中状态和推理展开状态
      this.setData({
        isThinking: this.properties.message.thinking || false,
        isReasoningExpanded: true,
        hasManuallyCollapsed: false,
        isFirstContent: true
      })
    }
  },

  observers: {
    'message.timestamp': function(timestamp) {
      if (timestamp) {
        this.formatTime()
      }
    },
    'message.thinking': function(thinking) {
      console.log('思考中状态变化:', thinking)
      // 如果开始思考，则展开推理过程
      this.setData({
        isThinking: thinking || false,
        isReasoningExpanded: thinking ? true : this.data.isReasoningExpanded
      })
    },
    'message.content': function(content) {
      // 只在第一次收到最终回答时，如果用户没有手动折叠过，则折叠推理过程
      if (content && this.data.isFirstContent && !this.data.hasManuallyCollapsed) {
        this.setData({
          isReasoningExpanded: false,
          isFirstContent: false
        })
      }
    }
  },

  methods: {
    // 格式化时间
    formatTime() {
      const date = new Date(this.properties.message.timestamp)
      const hours = date.getHours().toString().padStart(2, '0')
      const minutes = date.getMinutes().toString().padStart(2, '0')
      this.setData({
        formattedTime: `${hours}:${minutes}`
      })
    },

    // 切换推理过程的展开/折叠状态
    toggleReasoning() {
      if (this.data.isThinking) return
      
      const newExpanded = !this.data.isReasoningExpanded
      
      // 记录用户手动折叠状态
      this.setData({
        hasManuallyCollapsed: true,
        isReasoningExpanded: newExpanded
      })
      
      // 触发自定义事件
      this.triggerEvent('toggle-reasoning', {
        messageId: this.properties.message.id,
        expanded: newExpanded
      })
    }
  }
}) 