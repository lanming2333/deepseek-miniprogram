/**
 * 小程序入口文件
 */
import { loadEnvFromFile, checkEnvConfig } from './utils/env'

App({
  onLaunch() {
    // 加载环境变量
    console.log('开始加载环境变量')
    const envLoaded = loadEnvFromFile()
    if (envLoaded) {
      console.log('成功加载环境变量')
    } else {
      console.warn('加载环境变量失败，请确保已配置至少一个有效的API密钥')
    }
    
    // 初始化全局数据
    this.globalData = {}
    
    // 获取系统信息（使用新的 API）
    try {
      // 获取窗口信息
      const windowInfo = wx.getWindowInfo()
      // 获取设备信息
      const deviceInfo = wx.getDeviceInfo()
      // 获取应用基础信息
      const appBaseInfo = wx.getAppBaseInfo()
      
      // 合并所需信息
      this.globalData.systemInfo = {
        ...windowInfo,
        ...deviceInfo,
        ...appBaseInfo,
        // 计算安全区域
        safeAreaBottom: windowInfo.screenHeight - windowInfo.safeArea.bottom
      }
    } catch (e) {
      console.error('获取系统信息失败:', e)
    }

    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 登录
    wx.login({
      success: res => {
        // 发送 res.code 到后台换取 openId, sessionKey, unionId
      }
    })
  },

  onShow() {
    // 小程序切换到前台时
  },

  onHide() {
    // 小程序切换到后台时
  },

  globalData: {
    systemInfo: null
  }
})
