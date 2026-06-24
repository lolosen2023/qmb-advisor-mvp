import { searchKnowledge } from "../../agent/tools/knowledge-search.mjs";

const query = process.argv.slice(2).join(" ") || "医保外能报吗";
const results = searchKnowledge({ query, topK: 8 });

for (const item of results) {
  console.log(`${item.score.toFixed(2)} ${item.chunk_id} ${item.document_title} ${item.section_path}`);
  console.log(item.content.slice(0, 180).replace(/\s+/g, " "));
  console.log("");
}
