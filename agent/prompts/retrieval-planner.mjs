export function buildRetrievalPlan({ message, route }) {
  return {
    query: message,
    topic: route.topic || route.intent || null,
    topK: route.risk_level === "high" ? 6 : 8,
  };
}

