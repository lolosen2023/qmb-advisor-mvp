# Agent 架构

## 调度链路

1. API 接收客户消息和最近会话。
2. Orchestrator 构建会话上下文。
3. Router LLM 输出结构化意图和风险。
4. 高风险问题进入 Handoff Tool。
5. 低/中风险问题进入 Retrieval Planner 和 Knowledge Search。
6. Answer Composer LLM 基于 evidence pack 回复。
7. Compliance Reviewer 做最终审查。
8. Response Formatter 输出客户可见字段。

## 设计原则

- 产品事实来自知识库检索，不来自固定代码模板。
- 本地规则只做安全守门，不生成产品答案。
- 所有 Agent 步骤可在 debug 模式查看。
