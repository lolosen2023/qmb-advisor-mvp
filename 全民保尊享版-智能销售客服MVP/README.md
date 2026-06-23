# 全民保尊享版智能销售客服 MVP

这是一个用于网站/落地页的静态智能销售客服原型，包含：

- 客户侧在线问答入口
- 真实产品咨询式聊天体验
- 常见问题快捷提问
- 高风险问题的人工顾问承接提示
- 独立管理端查看意图、风险、转人工原因和知识主题
- 规则型知识检索、合规后审、转人工判断
- GPT API 驱动的本地 Agent Harness，模型异常时自动回退到本地规则引擎
- 首页自包含 HTML，支持亮色/暗色模式
- Node 内置测试，无需安装依赖

## HTML Plan

方案页：

```text
implementation-plan.html
```

`index.html`、`admin.html` 和这个方案页都是自包含 HTML，可直接在浏览器打开，包含暗色模式。

## 本地运行

先在 `.env.local` 中配置。当前默认切到 DeepSeek：

```env
API_PROVIDER=deepseek
DEEPSEEK_API_KEY=您的 DeepSeek API key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
MODEL_API_TYPE=chat_completions
MODEL_STREAM=true
```

如果后续切回 OpenAI，可以改为 `API_PROVIDER=openai`，并配置 `OPENAI_API_KEY`、`OPENAI_BASE_URL`、`MODEL_NAME` 和 `MODEL_API_TYPE=responses`。

启动静态服务：

```powershell
node .\全民保尊享版-智能销售客服MVP\server.mjs
```

Windows 也可以直接双击项目里的：

```text
start-server.cmd
```

然后打开：

```text
http://127.0.0.1:4173/
```

管理端：

```text
http://127.0.0.1:4173/admin.html
```

## 测试

```powershell
node --test .\全民保尊享版-智能销售客服MVP\tests\*.test.mjs
```

## 当前 API

客户页会请求本地接口：

```text
POST /api/chat
```

该接口会先经过 Agent Harness：本地意图识别、知识块检索、合规判断、必要时 mock 转人工；低风险场景再调用 GPT API 生成保障顾问回复。若 GPT API 不可用，会自动回退到本地规则回复，页面不会中断。
