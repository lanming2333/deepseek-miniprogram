# DeepSeek 智能对话小程序

基于 DeepSeek API 的微信小程序，实现智能聊天功能。本项目是参加 24 小时极速编程比赛的作品。

## 功能特点

- 🤖 智能对话：支持与 DeepSeek 等多个模型进行流畅对话
- 🔄 推理过程：实时展示 AI 的推理过程，帮助理解思考过程
- 📝 实时聊天：自动保存并实时显示最新的对话内容
- 📚 历史记录：
  - 侧边栏快速访问历史记录
  - 按时间智能分类（本周/本月/更早）
  - 实时搜索功能
  - 支持分页加载
- ⚡ 流畅体验：
  - 优化的 API 请求和界面渲染
  - 平滑的动画效果
  - 流畅的侧边栏交互
- 🔄 多模型支持：集成多个 AI 服务提供商，自动容灾切换
- 🔗 分享功能：支持分享对话到微信好友和朋友圈

## 技术特点

- 🎯 无服务器架构：直接调用 AI API，降低部署复杂度
- 💾 本地存储：使用微信 Storage 存储聊天记录
- 🌐 多 API 支持：
  - Ark火山引擎 API（主要）
  - DeepSeek API（备用）
  - SiliconFlow API（备用）
- 📱 优秀体验：
  - 流式输出优化
  - 推理过程展示
  - 响应式设计
  - 平滑动画效果
- 🔒 安全可靠：
  - 完善的错误处理
  - 自动重试机制
  - API 自动切换
- 🎨 UI/UX：
  - 参考 Deepseek 官方配色
  - 流畅的动画效果
  - 优化的交互体验

## 项目结构

```
project/
├── app
│   ├── config                  // 配置文件
│   │   └── api.config.js       // API配置（包括备用API）
│   ├── services               // 服务层
│   │   ├── api.service.js     // 封装API请求
│   │   └── storage.service.js // 封装本地存储
│   └── styles                 // 全局样式
├── components                 // 公共组件
│   ├── chat-bubble           // 聊天气泡组件
│   ├── loading               // 加载动画组件
│   └── model-switch          // 模型切换组件
└── pages                     // 页面
    ├── chat                  // 主聊天页面
    └── history              // 历史记录页面
```

## 开发进度

### 已完成功能
- [x] 基础架构搭建
  - [x] API 服务配置和封装
  - [x] 全局样式设计
  - [x] 系统信息获取优化
- [x] 核心聊天功能
  - [x] 聊天页面布局
  - [x] 消息处理逻辑
  - [x] 本地缓存集成
  - [x] 流式输出支持
  - [x] 推理过程展示
- [x] 错误处理优化
  - [x] API 超时处理
  - [x] 重试机制
  - [x] 友好的错误提示
- [x] 多 API 支持
  - [x] SiliconFlow API 集成
  - [x] DeepSeek API 集成
  - [x] Ark API 集成
  - [x] 自动切换机制
- [x] UI 优化
  - [x] Deepseek 官方配色
  - [x] 流畅的动画效果
  - [x] 响应式布局
- [x] 历史记录功能
  - [x] 侧边栏集成
  - [x] 历史记录分类展示
  - [x] 实时搜索功能
  - [x] 分页加载优化
- [x] 分享功能
  - [x] 分享给好友
  - [x] 分享到朋友圈

### 开发中功能
  - [ ] 多模型切换组件
  - [ ] 用户登录集成

## 最新更新（v0.5.0 2024-02-09）

- ✨ 优化组件复用
  - 重构聊天气泡组件
  - 统一消息展示样式
  - 优化组件接口设计
- 🎨 改进交互体验
  - 优化推理过程显示
  - 改进消息复制方式
  - 优化思考状态动画
- 🔧 完善错误处理
  - 优化 API 健康检查
  - 完善自动切换逻辑
  - 改进错误提示
- 📱 优化界面布局
  - 优化导航栏样式
  - 完善动画效果
  - 统一使用 SVG 图标

## 开发环境

- 操作系统：Windows
- CPU：11th Gen Intel(R) Core(TM) i5-11400H @ 2.70GHz
- GPU：NVIDIA GeForce RTX 3060 Laptop Mode
- 开发工具：微信开发者工具、Cursor

## 使用说明

1. 克隆项目
2. 修改.env.example，修改为个人API Key，重命名为.env
3. 在微信开发者工具中导入项目
4. 在开发工具中开启"不校验合法域名..."选项
5. 编译运行

## 注意事项

- 请确保 API 密钥的安全性
- 建议在正式环境中启用数据加密
- 注意遵守 API 服务提供商的使用规范
- 在生产环境中需要配置以下合法域名：
  - api.siliconflow.cn
  - api.deepseek.com
  - ark.cn-beijing.volces.com

## 已知问题

### 1. 微信小程序发布环境 API 访问问题 🆘

**问题描述**：
- 在微信开发者工具和体验版中可以正常访问 API
- 发布到正式版后无法正确请求访问 AI 服务接口
- 已在微信小程序管理后台配置相关域名

**可能原因**：
- 微信小程序发布环境的网络请求限制
- API 服务器的跨域设置问题
- SSL 证书验证问题
- 请求头部配置问题

**寻求帮助**：
如果您有解决此问题的经验或建议，欢迎：
1. 提交 Issue 或 Pull Request
2. 通过邮件联系：yangming0604@qq.com
3. 在项目 Discussions 中分享您的解决方案

**临时解决方案**：
目前可以通过以下方式临时使用：
1. 使用开发版或体验版
2. 在开发者工具中关闭域名校验

## 版本历史

### v0.5.0 (2024-02-09)
- ✨ 优化组件复用和交互体验
- 🎨 改进推理过程显示
- 🔧 完善错误处理机制
- 📱 优化界面布局和动画

### v0.4.0 (2024-02-09)
- ✨ 完成历史记录侧边栏
- 🎨 优化历史记录交互
- 🔍 添加搜索功能
- 💫 添加平滑动画

### v0.3.0 (2024-02-09)
- ✨ 完成历史记录功能
- 🔧 修复会话管理问题
- 🎨 优化UI交互体验
- 📝 更新项目文档

### v0.2.0 (2024-02-09)
- 🔄 完成多API支持和自动切换
- 🎨 优化UI样式和交互体验
- 🐛 完善错误处理和重试机制

### v0.1.0 (2024-02-09)
- 🎉 完成基础架构搭建
- 💬 实现核心聊天功能
- ⚡ 添加流式输出支持

## 许可证

MIT License 
