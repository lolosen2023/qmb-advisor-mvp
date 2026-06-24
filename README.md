# 全民保智能销售顾问 MVP

这是一个本地运行的保险销售客服 Agent MVP。项目采用完整知识库索引、LLM Agent 调度、合规守门和人工转接机制，不在代码里硬编码产品知识或固定问答模板。

## 快速启动

```powershell
copy .env.example .env.local
# 填写 API Key 后执行
node knowledge/scripts/build-index.mjs
node server/server.mjs
```

访问：http://127.0.0.1:4173/

## 核心目录

- `app/`：客户侧聊天页面。
- `server/`：本地 API 服务。
- `agent/`：LLM Agent 编排、提示词、工具和模型适配器。
- `knowledge/`：原始资料、人工摘要、索引和构建脚本。
- `docs/`：产品、架构、合规、API、测试和运维文档。
- `tests/`：知识库、检索、Agent、API、UI 测试。

## 安全边界

- `.env.local` 不提交。
- 客户侧不展示知识来源、检索片段、风险等级或内部判断。
- 退保、投诉、具体理赔金额、保单查询、敏感信息和实时权益状态强制转人工。
