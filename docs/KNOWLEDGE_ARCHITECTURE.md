# 知识库架构

## 目录

- `knowledge/sources/`：完整原始资料。
- `knowledge/curated/`：人工整理摘要。
- `knowledge/index/manifest.json`：资料清单和元数据。
- `knowledge/index/chunks.json`：检索切块。
- `knowledge/index/bm25.json`：本地检索索引。

## 规则

- 文档不直接粘贴知识正文。
- 新版正式资料优先于旧问答。
- 服务手册用于权益和流程解释。
- 旧问答和话术只作为表达参考。
- 检索结果只给 Agent 使用，不向客户展示来源。
