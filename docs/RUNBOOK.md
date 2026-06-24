# 运行手册

## 启动

```powershell
node knowledge/scripts/build-index.mjs
node server/server.mjs
```

## 检查模型

访问：`/api/model-health`

## 重建知识库

资料更新后执行：

```powershell
node knowledge/scripts/build-index.mjs
```

## 本地排障

- 页面打不开：确认 `server/server.mjs` 正在运行。
- 模型不可用：检查 `.env.local`。
- 答案缺资料：用 `inspect-index.mjs` 检查检索结果。
