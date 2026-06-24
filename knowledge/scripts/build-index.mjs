import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const sourceDirs = [
  path.join(root, "knowledge", "sources"),
  path.join(root, "knowledge", "curated"),
];
const indexDir = path.join(root, "knowledge", "index");

function listMarkdownFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return listMarkdownFiles(fullPath);
    if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) return [fullPath];
    return [];
  });
}

function normalizePath(filePath) {
  return path.relative(root, filePath).replace(/\\/g, "/");
}

function classify(filePath, text) {
  const sourcePath = normalizePath(filePath);
  const haystack = `${sourcePath}\n${text.slice(0, 2000)}`;
  const isUpdated = sourcePath.includes("全民保尊享版 - 更新") || /方案|投保须知|责任免除|条款/.test(sourcePath);
  const topic = /退保|违规|投诉|免费|扣费/.test(haystack)
    ? "compliance"
    : /理赔|赔付|报案|发票/.test(haystack)
      ? "claim"
      : /药|特药|药店|用药/.test(haystack)
        ? "drug_benefit"
        : /既往症|高血压|糖尿病|责任免除/.test(haystack)
          ? "pre_existing"
          : /垫付|绿通|服务|权益/.test(haystack)
            ? "service"
            : /价格|保费|缴费/.test(haystack)
              ? "payment"
              : "coverage";

  const priority = sourcePath.includes("curated/")
    ? "curated"
    : /违规|退保|投诉/.test(sourcePath)
      ? "compliance"
      : /3\.健康服务手册|权益服务/.test(sourcePath)
        ? "service_manual"
        : isUpdated
          ? "official_updated"
          : /问答|口播|话术/.test(sourcePath)
            ? "legacy_faq"
            : "source";

  const riskLevel = topic === "compliance" || /责任免除|既往症|理赔|赔付/.test(haystack) ? "high" : topic === "coverage" ? "medium" : "low";

  return {
    source_path: sourcePath,
    document_title: path.basename(filePath),
    topic,
    priority,
    risk_level: riskLevel,
    updated_or_legacy: isUpdated ? "updated" : priority === "legacy_faq" ? "legacy" : "curated_or_source",
  };
}

function splitByHeadings(text) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const sections = [];
  let currentTitle = "正文";
  let buffer = [];

  function flush() {
    const content = buffer.join("\n").trim();
    if (content) sections.push({ section_path: currentTitle, content });
    buffer = [];
  }

  for (const line of lines) {
    const heading = line.match(/^(#{1,6})\s+(.+?)\s*$/);
    if (heading) {
      flush();
      currentTitle = heading[2].trim();
      buffer.push(line);
    } else {
      buffer.push(line);
    }
  }
  flush();
  return sections;
}

function splitLongContent(content, maxLength = 1200) {
  const paragraphs = content.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
  const chunks = [];
  let buffer = "";
  for (const paragraph of paragraphs) {
    if (buffer && (buffer.length + paragraph.length + 2 > maxLength)) {
      chunks.push(buffer);
      buffer = paragraph;
    } else {
      buffer = buffer ? `${buffer}\n\n${paragraph}` : paragraph;
    }
  }
  if (buffer) chunks.push(buffer);
  return chunks;
}

function tokenize(text) {
  const words = String(text || "")
    .toLowerCase()
    .match(/[a-z0-9]+|[\u4e00-\u9fff]{2,}/g) || [];
  const chars = [...String(text || "").replace(/\s/g, "")].filter((char) => /[\u4e00-\u9fff]/.test(char));
  const bigrams = [];
  for (let i = 0; i < chars.length - 1; i += 1) bigrams.push(`${chars[i]}${chars[i + 1]}`);
  return [...words, ...bigrams];
}

function build() {
  fs.mkdirSync(indexDir, { recursive: true });
  const files = sourceDirs.flatMap(listMarkdownFiles);
  const documents = [];
  const chunks = [];

  files.forEach((filePath, docIndex) => {
    const text = fs.readFileSync(filePath, "utf8");
    const metadata = classify(filePath, text);
    documents.push({
      doc_id: `doc-${docIndex + 1}`,
      ...metadata,
      bytes: Buffer.byteLength(text),
    });

    splitByHeadings(text).forEach((section, sectionIndex) => {
      splitLongContent(section.content).forEach((content, chunkIndex) => {
        chunks.push({
          chunk_id: `chunk-${docIndex + 1}-${sectionIndex + 1}-${chunkIndex + 1}`,
          ...metadata,
          section_path: section.section_path,
          content,
        });
      });
    });
  });

  const bm25 = {
    generated_at: new Date().toISOString(),
    total_chunks: chunks.length,
    terms: Object.fromEntries(chunks.map((chunk) => [chunk.chunk_id, tokenize(`${chunk.document_title} ${chunk.section_path} ${chunk.content}`)])),
  };

  fs.writeFileSync(path.join(indexDir, "manifest.json"), JSON.stringify({ generated_at: new Date().toISOString(), documents }, null, 2), "utf8");
  fs.writeFileSync(path.join(indexDir, "chunks.json"), JSON.stringify(chunks, null, 2), "utf8");
  fs.writeFileSync(path.join(indexDir, "bm25.json"), JSON.stringify(bm25, null, 2), "utf8");
  return { documents: documents.length, chunks: chunks.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = build();
  console.log(`Indexed ${result.documents} documents into ${result.chunks} chunks.`);
}

export { build, tokenize };
