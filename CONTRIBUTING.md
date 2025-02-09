# 贡献指南

感谢你考虑为 DeepSeek 智能对话小程序做出贡献！

## 开发流程

1. Fork 本仓库
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的改动 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启一个 Pull Request

## 环境配置

1. 克隆项目后，复制环境变量文件：
```bash
cp .env.example .env
```

2. 编辑 `.env` 文件，填入你的 API 密钥：
```
SILICONFLOW_API_KEY=your_siliconflow_api_key
DEEPSEEK_API_KEY=your_deepseek_api_key
ARK_API_KEY=your_ark_api_key
```

3. 在微信开发者工具中：
- 导入项目
- 开启"不校验合法域名..."选项
- 确保已开启 ES6 转 ES5、增强编译等功能

## 代码规范

1. 遵循项目现有的代码风格
2. 保持代码整洁，添加必要的注释
3. 每个功能模块添加清晰的注释头
4. 使用有意义的变量名和函数名
5. 保持代码的模块化和可复用性

## 提交规范

提交信息格式：`type(scope): message`

- type: 
  - feat: 新功能
  - fix: 修复
  - docs: 文档
  - style: 格式
  - refactor: 重构
  - test: 测试
  - chore: 其他
- scope: 影响范围，如 api, ui, core 等
- message: 具体改动说明

示例：
- `feat(chat): 完成基础聊天功能`
- `fix(api): 修复API超时问题`
- `docs(readme): 更新项目文档`

## 注意事项

1. 不要提交任何包含 API 密钥的文件
2. 确保代码通过所有现有测试
3. 如果添加新功能，请添加相应的测试
4. 更新相关文档
5. 保持提交历史清晰

## 问题反馈

如果你发现了 bug 或有新功能建议，请：

1. 检查现有的 Issues 是否已经报告过该问题
2. 如果没有，创建一个新的 Issue
3. 清晰描述问题或建议
4. 如果可能，提供重现步骤或示例代码

## 安全问题

如果你发现了安全漏洞，请不要直接在 Issues 中报告。请发送邮件到 lanming2333@gmail.com。 