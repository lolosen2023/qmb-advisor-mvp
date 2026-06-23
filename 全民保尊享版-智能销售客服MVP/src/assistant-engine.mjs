const PREMIUM_TEXT =
  "0-60 周岁为 47.8 元/月，61-75 周岁为 89.9 元/月；本产品是一年期、月缴产品，不保证续保，后续规则以保险公司届时政策为准。";

const HANDOFF_REPLY =
  "这个问题涉及您的具体保单、理赔、退保或权益状态，我不建议在这里直接下结论。我先帮您转人工顾问进一步确认，人工顾问会结合您的信息和保险公司审核口径处理。您可以先准备保单号、投保手机号后四位或订单页面信息，注意不要在对话里发送完整身份证号、银行卡号等敏感信息。";

export const ADVISOR_PERSONA_PROMPT =
  "你是全民保顾问经理-张小民。客户侧回复必须亲和、克制、可信，默认使用尊称“您”，短句可以自然承接，但不得使用不礼貌或命令式的“你”。先接住用户问题，再用白话解释产品，再提醒关键限制，最后给出自然下一步。不要像机器人、系统说明书或销售话术，不暴露内部判断、知识来源、风险等级或检索结果。";

export const STYLE_RULES = [
  "始终以全民保顾问经理-张小民身份回复，普通咨询用白话，复杂或高风险问题转人工顾问。",
  "寒暄和低信息输入时，像真人一样口语承接，不要讲产品定义、保障结构、等待期、免赔额、理赔审核或转人工。",
  "销售推进必须温和，不制造焦虑，不催促购买，不承诺理赔。",
  "客户侧禁用机械引导、内部判断、检索痕迹和生硬产品术语。",
];

export const KNOWLEDGE_CHUNKS = [
  {
    chunk_id: "product-facts",
    title: "产品基础事实",
    topic: "product",
    priority: "official_updated",
    risk_level: "low",
    content:
      "全民保尊享版是一年期、月缴住院医疗险。被保险人年龄为出生满30天至75周岁，需为基本医保已缴费且在保状态的参保人。投保人为自然人，可为本人、配偶、父母、子女投保。同一期间每名被保险人限投一份。",
    customer_visible: false,
  },
  {
    chunk_id: "updated-coverage",
    title: "新版保障责任",
    topic: "coverage",
    priority: "official_updated",
    risk_level: "medium",
    content:
      "新版全民保尊享版最高合计1000万：社保内住院医疗400万，社保外住院医疗300万，特定药品医疗200万，质子重离子医疗100万，各项保额不共享。社保内和社保外住院医疗各有1万元免赔额。",
    customer_visible: false,
  },
  {
    chunk_id: "waiting-period",
    title: "生效和等待期",
    topic: "coverage",
    priority: "official_updated",
    risk_level: "medium",
    content:
      "投保后T+3日零时生效。疾病等待期为30天，意外医疗无等待期。等待期内非意外原因发生的医疗费用不承担给付责任。",
    customer_visible: false,
  },
  {
    chunk_id: "pre-existing",
    title: "既往症",
    topic: "coverage",
    priority: "official_updated",
    risk_level: "medium",
    content:
      "产品无健康告知，可以投保，但投保前已患的特定既往症及其并发症导致的医疗费用不赔。重点包括恶性肿瘤、高血压3级或以上、冠心病、心功能不全三级以上、脑梗死、脑出血、慢性肾衰、肝硬化、系统性红斑狼疮、糖尿病且存在动脉粥样硬化等。",
    customer_visible: false,
  },
  {
    chunk_id: "drug-benefit",
    title: "用药权益",
    topic: "service",
    priority: "service_manual",
    risk_level: "medium",
    content:
      "用药权益由小雨竹保险商城平台提供，不属于人保保险责任。0-60周岁全年最高600元，61-75周岁全年最高1000元，通常需缴费满6个月后按规则领取，具体以保单权益页面或服务号显示为准。",
    customer_visible: false,
  },
  {
    chunk_id: "claims",
    title: "理赔流程",
    topic: "claim",
    priority: "official_updated",
    risk_level: "medium",
    content:
      "出险后尽快拨打人保客服95518或资料中的027-95518报案，按指引提交申请书、身份证明、病历、诊断证明、出院证明、医疗费发票、费用清单、医保结算记录等材料。最终以保险公司审核为准。",
    customer_visible: false,
  },
  {
    chunk_id: "sales-guidance",
    title: "销售辅助原则",
    topic: "sales",
    priority: "service_manual",
    risk_level: "low",
    content:
      "销售型客服应先答疑，再判断需求，只问年龄段、医保状态、给谁看和主要担心点等低敏信息。适合表达为补充住院医疗费用压力，不得强推或制造焦虑。",
    customer_visible: false,
  },
  {
    chunk_id: "compliance",
    title: "合规红线",
    topic: "compliance",
    priority: "compliance",
    risk_level: "high",
    content:
      "不得承诺一定理赔，不得说什么病都能报、花多少报多少、买了马上赔、没有医保也能报、免费保险、交一个月保一年、终身保障、终身不涨价、买了就能领药、所有进口药靶向药都100%报销，不得引导退旧买新。",
    customer_visible: false,
  },
];

const INTENT_PATTERNS = [
  ["complaint", /投诉|骗人|骗|误导|直播间|免费.*扣|强制扣|乱扣|忽悠|不一致/],
  ["surrender", /退保|退款|不想买|取消保单|解除合同/],
  ["policy_status", /查保单|保单状态|扣费状态|订单|我的保单|保单号|是否生效/],
  ["sales_objection", /退.*(旧|之前|原来|已有|以前)|之前.*保险.*退|退掉.*买这个|替换|换成这个|升级成这个/],
  ["correction", /我让你|不是这个|不是问这个|你没回答|没有回答|我是问|重新说|别反问|不要反问|问的是.*产品|介绍.*内容/],
  ["product_intro", /介绍.*(产品|这款|保险)|产品介绍|这款产品.*(是什么|内容|介绍)|这个保险.*(是什么|介绍|内容)|说说.*(产品|保险)|了解一下.*(产品|保险)/],
  ["value_prop", /能.*给我.*带来什么|能.*带来什么|有什么用|你能帮我什么|你能做什么|价值/],
  ["identity_intro", /介绍.*自己|你是谁|你是.*什么|什么身份|自我介绍/],
  ["greeting", /^(哈+|哈哈啊|哈哈|哈喽|hello|hi|嗨)[\s，。,.!！?？]*(你|您)?(好|在吗|在不在)?[\s，。,.!！?？]*$/i],
  ["greeting", /^(你好|您好|在吗|在不在|有人吗|哈喽|hello|hi|嗨)[\s，。,.!！?？]*(在吗)?$/i],
  ["acknowledgement", /^(好的|好|嗯|嗯嗯|行|可以|知道了|明白了|了解|收到|ok|OK)[\s，。,.!！?？]*$/],
  ["clarify_plainly", /没看懂|看不懂|听不懂|不明白|说人话|讲人话|别绕|太复杂|太官方/],
  ["simplify", /简单点|再简单|简短点|一句话|说重点|太长/],
  ["bot_identity", /机器人|真人吗|人工智能|AI|ai|自动回复|不是人/],
  ["low_information", /^[？?。.!！…~\s]+$|^再说说$|^继续$|^还有呢$|^然后呢$|^比如呢$|^怎么说$/],
  ["trust_objection", /靠谱吗|真的假的|是不是.*假|可信|安全吗|正规/],
  ["medical_insurance_check", /没有医保|没医保|无医保|医保断了|社保断了|医保.*能不能买|医保.*能买吗|有医保.*需要|有医保.*还需要/],
  ["parent_purchase", /父母|爸妈|爸爸|妈妈|老人|老年/],
  ["pre_existing", /既往症|带病|高血压|糖尿病|冠心病|脑梗|肺结节|甲状腺|小三阳|大三阳|以前.*病/],
  ["drug_benefit", /领药|用药权益|药卡|特药|靶向药|进口药|药品/],
  ["claim", /理赔|赔多少|能赔|报销|赔付|住院花|发票|医保报|全报/],
  ["payment", /缴费|续费|自动扣|宽限期|月缴|扣费|重新签约|支付/],
  ["price", /多少钱|价格|保费|贵不贵|费用|每月|一个月/],
  ["fit_assessment", /适合我|适不适合|适合谁|值不值得|有没有必要|需要买|该不该买/],
  ["needs_discovery", /怎么选|不知道|纠结|担心|自费|大病|住院压力|能解决什么/],
  ["purchase_guidance", /能买吗|怎么买|投保|孩子|家人|本人|自己买/],
  ["coverage", /保什么|保障|保额|总保额|1000万|社保内|社保外|质子重离子|免赔额|等待期/],
];

const ILLEGAL_REPLACEMENTS = [
  {
    pattern: /什么病都能报/g,
    replacement: "符合保险责任范围的医疗费用可按条款申请理赔",
  },
  {
    pattern: /花多少报多少/g,
    replacement: "符合保险责任范围、扣除免赔额和已获得补偿后，按条款约定比例给付",
  },
  {
    pattern: /买了马上赔/g,
    replacement: "疾病有 30 天等待期，意外医疗无等待期",
  },
  {
    pattern: /终身保障/g,
    replacement: "本产品是一年期，不保证续保",
  },
  {
    pattern: /一定理赔/g,
    replacement: "最终以保险公司审核为准",
  },
  {
    pattern: /免费保险/g,
    replacement: "月缴医疗险",
  },
  {
    pattern: /没有医保也能报/g,
    replacement: "本产品要求被保险人有基本医保且在保",
  },
];

function detectIntent(text) {
  const normalized = normalizeForIntent(text);
  for (const [intent, pattern] of INTENT_PATTERNS) {
    if (pattern.test(text)) return intent;
    if (normalized !== text && pattern.test(normalized)) return intent;
  }
  return "unknown";
}

function normalizeForIntent(text) {
  let next = String(text || "").trim();
  next = next.replace(/^[\d\s，。,.!！?？]+/, "");
  next = next.replace(/^(啊+|呀+|诶+|额+|呃+|嗯+)[\s，。,.!！?？]+/g, "");
  next = next.replace(/^(哈+|哈哈啊|哈哈)[\s，。,.!！?？]+(?=(你|您)?(在吗|在不在|有人吗|好))/g, "");
  next = next.replace(/^(你|您)(?=在吗|在不在|有人吗)/, "");
  next = next.replace(/呀/g, "");
  return next.trim();
}

function detectSensitiveInfo(text) {
  return [
    /\d{17}[\dXx]/.test(text),
    /银行卡|卡号/.test(text) && /\d{12,}/.test(text),
    /1[3-9]\d{9}/.test(text),
    /病历|诊断报告|身份证照片|发票照片|上传/.test(text),
  ].some(Boolean);
}

function getHandoffReason(intent, text, hasSensitiveInfo) {
  if (hasSensitiveInfo) return "检测到敏感信息或病历资料，需要人工通过正规流程处理";
  if (intent === "complaint") return "客户涉及投诉、误导、免费或扣费争议";
  if (intent === "surrender") return "客户要求退保或退款";
  if (intent === "policy_status") return "客户要求查询具体保单或订单状态";
  if (intent === "claim" && /(算|计算|多少钱|赔多少|8万|[0-9]+万|具体)/.test(text)) {
    return "客户询问具体理赔金额，需要人工结合材料和保险公司审核";
  }
  if (/(一定能不能赔|到底赔不赔|一定赔吗|保证赔吗)/.test(text)) {
    return "客户询问具体疾病或个案是否一定理赔，需要人工结合材料确认";
  }
  if (/(某家|哪家医院|药店|库存|清单里有没有|当前|现在还能不能用)/.test(text)) {
    return "客户询问实时医院、药店、药品或权益状态";
  }
  return null;
}

function getRiskLevel(intent, handoffRequired, text) {
  if (handoffRequired) return "high";
  if (
    ["claim", "pre_existing", "drug_benefit", "trust_objection", "sales_objection"].includes(intent) ||
    /一定|保证|全报|都报|马上赔|终身|免费/.test(text)
  ) {
    return "medium";
  }
  return "low";
}

function getConversationStage(intent, handoffRequired) {
  if (handoffRequired) return "handoff";
  if (["identity_intro", "greeting", "acknowledgement", "low_information", "clarify_plainly", "simplify", "bot_identity"].includes(intent)) {
    return "intro";
  }
  if (intent === "correction") return "recommendation";
  if (["value_prop", "needs_discovery", "fit_assessment"].includes(intent)) return "discovery";
  if (["parent_purchase", "medical_insurance_check", "purchase_guidance", "price"].includes(intent)) {
    return "qualification";
  }
  if (["product_intro", "coverage", "drug_benefit", "claim", "pre_existing"].includes(intent)) return "recommendation";
  if (["trust_objection", "sales_objection"].includes(intent)) return "objection";
  if (["payment", "surrender", "policy_status", "complaint"].includes(intent)) return "after_sale";
  return "discovery";
}

function getSuggestedNextAction(intent, handoffRequired, riskLevel) {
  if (handoffRequired) return "handoff";
  if (intent === "sales_objection") return "handoff";
  if (intent === "medical_insurance_check") return "answer_only";
  if (intent === "product_intro" || intent === "correction") return "answer_only";
  if (["identity_intro", "bot_identity"].includes(intent)) return "answer_only";
  if (
    [
      "greeting",
      "acknowledgement",
      "low_information",
      "clarify_plainly",
      "simplify",
      "value_prop",
      "needs_discovery",
      "fit_assessment",
      "parent_purchase",
    ].includes(intent)
  ) {
    return "ask_one_question";
  }
  if (["price", "coverage", "purchase_guidance"].includes(intent)) {
    return riskLevel === "low" ? "guide_to_purchase" : "ask_one_question";
  }
  if (intent === "unknown") return "ask_one_question";
  return "answer_only";
}

export function analyzeMessage(message) {
  const text = String(message || "").trim();
  const intent = detectIntent(text);
  const hasSensitiveInfo = detectSensitiveInfo(text);
  const handoffReason = getHandoffReason(intent, text, hasSensitiveInfo);
  const handoffRequired = Boolean(handoffReason);
  const riskLevel = getRiskLevel(intent, handoffRequired, text);
  const complianceNotes = [];

  if (hasSensitiveInfo) complianceNotes.push("检测到敏感信息，禁止继续在公开对话中收集或展示");
  if (/(什么病都能报|花多少报多少|买了马上赔|终身保障|免费保险|一定理赔|全报|都报)/.test(text)) {
    complianceNotes.push("客户问题包含高风险承诺表达，回复必须使用合规替代表达");
  }
  if (/退.*(旧|之前|原来|已有|以前)|之前.*保险.*退|替换|换成这个|升级/.test(text)) {
    complianceNotes.push("涉及退旧买新风险，不得引导客户退掉已有保障");
  }

  return {
    intent,
    riskLevel,
    handoffRequired,
    handoffReason,
    complianceNotes,
    suggestedNextAction: getSuggestedNextAction(intent, handoffRequired, riskLevel),
    conversationStage: getConversationStage(intent, handoffRequired),
  };
}

export function retrieveKnowledge(intent, message) {
  const text = String(message || "");
  const topicMap = {
    identity_intro: ["product", "sales", "compliance"],
    product_intro: ["product", "coverage", "compliance"],
    correction: ["product", "coverage", "compliance"],
    greeting: ["product", "sales"],
    acknowledgement: ["product", "sales"],
    low_information: ["product", "sales"],
    clarify_plainly: ["product", "sales"],
    simplify: ["product", "sales"],
    bot_identity: ["product", "sales", "compliance"],
    value_prop: ["product", "coverage", "sales"],
    fit_assessment: ["product", "coverage", "sales"],
    needs_discovery: ["product", "coverage", "sales"],
    parent_purchase: ["product", "coverage"],
    medical_insurance_check: ["product", "compliance"],
    price: ["product"],
    payment: ["product", "service"],
    coverage: ["coverage", "product"],
    purchase_guidance: ["product", "coverage", "sales"],
    pre_existing: ["coverage", "compliance"],
    claim: ["claim", "coverage", "compliance"],
    drug_benefit: ["service", "coverage"],
    trust_objection: ["compliance", "product"],
    sales_objection: ["compliance", "sales"],
    complaint: ["compliance"],
    surrender: ["compliance"],
  };
  const topics = topicMap[intent] || ["product", "coverage", "compliance"];
  const scored = KNOWLEDGE_CHUNKS.map((chunk) => {
    const topicScore = topics.includes(chunk.topic) ? 5 : 0;
    const textScore = chunk.content
      .split(/[，。、；\s]+/)
      .filter((token) => token.length > 1 && text.includes(token)).length;
    const priorityScore = chunk.priority === "official_updated" ? 2 : chunk.priority === "compliance" ? 1 : 0;
    return { chunk, score: topicScore + textScore + priorityScore };
  });
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((item) => item.chunk);
}

function profileFromRequest(request, message) {
  const known = request?.known_user_state || {};
  const profile = {
    target: known.target || known.insured_for || "unknown",
    ageBand: known.age_band || known.ageBand || "unknown",
    hasMedicalInsurance: known.has_social_insurance || known.hasMedicalInsurance || "unknown",
    concern: known.concern || "unknown",
    conditions: Array.isArray(known.conditions) ? [...known.conditions] : [],
  };
  const text = String(message || "");

  if (/父母|爸妈|爸爸|妈妈|老人|老年/.test(text)) profile.target = "parents";
  else if (/孩子|小孩|宝宝|儿子|女儿/.test(text)) profile.target = "child";
  else if (/(我自己|本人|自己买)/.test(text)) profile.target = "self";

  if (/6[1-9]|7[0-5]|六十|七十|老人|父母|爸妈/.test(text)) profile.ageBand = "61-75";
  else if (/[1-5]\d岁|0-60|三十|四十|五十|年轻/.test(text)) profile.ageBand = "0-60";

  if (/没有医保|没医保|无医保|医保断了|社保断了/.test(text)) profile.hasMedicalInsurance = "no";
  else if (/有医保|有社保|医保在保|社保在保|参加医保/.test(text)) profile.hasMedicalInsurance = "yes";

  if (/住院|手术|住院费|大病|自费/.test(text)) profile.concern = "hospital";
  else if (/药|特药|靶向药|进口药|领药/.test(text)) profile.concern = "drug";
  else if (/理赔|报销|赔/.test(text)) profile.concern = "claim";

  for (const word of ["高血压", "糖尿病", "冠心病", "脑梗", "肺结节", "甲状腺", "肝硬化"]) {
    if (text.includes(word) && !profile.conditions.includes(word)) profile.conditions.push(word);
  }

  return profile;
}

function answerForIntent(intent, profile) {
  switch (intent) {
    case "product_intro":
      return "明白，我直接给您介绍这款产品。全民保尊享版是一款一年期、月缴的住院医疗险，主要用于补充住院医疗费用压力。新版方案最高合计 1000 万：社保内住院医疗 400 万、社保外住院医疗 300 万、特定药品医疗 200 万、质子重离子医疗 100 万，各项保额不共享。\n\n这款产品适合先给有基本医保且在保、担心住院自费或医保外费用的人了解。投保前要重点看年龄是否在出生满 30 天至 75 周岁、医保是否在保、疾病 30 天等待期、住院医疗 1 万免赔额、既往症及并发症限制，以及本产品是一年期、不保证续保。";
    case "correction":
      return "抱歉，刚才没有直接答到您要的产品内容，我重新给您说清楚。全民保尊享版是一款一年期、月缴的住院医疗险，主要用于补充住院医疗费用压力。新版方案最高合计 1000 万，其中社保内住院医疗 400 万、社保外住院医疗 300 万、特定药品医疗 200 万、质子重离子医疗 100 万。\n\n这款产品要求被保险人有基本医保且在保，年龄需在出生满 30 天至 75 周岁。也要注意疾病 30 天等待期、住院医疗 1 万免赔额、特定既往症及并发症不赔，以及一年期不保证续保。";
    case "identity_intro":
      return "您好，我是全民保顾问经理-张小民。您可以把我理解成投保前帮您把问题捋清楚的人：这款产品大概保什么、哪些地方容易误会、适不适合继续了解，我会尽量用白话给您说明。涉及具体保单、退保、投诉或理赔金额，我会帮您转人工顾问确认。";
    case "greeting":
      return "在的，您说。我先听您想问哪件事。";
    case "acknowledgement":
      return "好的，您接着说就行。我会尽量用短一点的话帮您讲清楚。";
    case "low_information":
      return "可以的。您可以先说最担心的点，比如费用、家人能不能看，或者医保外费用怎么理解，我会顺着您的问题说清楚。";
    case "clarify_plainly":
      return "可以，我换个说法，尽量用白话不绕。它主要看的是住院医疗费用补充；适不适合您，要先看给谁买、有没有医保、年龄多大、有没有明显既往病史。具体能不能赔，最后还是看条款和保险公司审核。";
    case "simplify":
      return "简单说：先看您有没有医保，再看年龄和健康情况。它主要是补充住院医疗费用这块，但有等待期、免赔额和既往症限制。";
    case "bot_identity":
      return "您可以把我当成全民保顾问经理-张小民。我会先把投保前容易误会的地方讲清楚；如果涉及保单、退保、投诉或具体理赔金额，我会帮您转人工顾问处理。";
    case "value_prop":
      return "我主要帮您少走弯路。比如您担心住院自费、医保外费用、1 万免赔、30 天等待期、既往症或者用药权益，我会先用白话讲清楚，再看您或家人的情况大概匹不匹配。该提醒限制的地方，我也会直接提醒您。";
    case "parent_purchase":
      return `可以先看，但建议先确认两个基础条件：父母年龄是否在出生满 30 天至 75 周岁之间，医保是否还在正常缴费并在保。保费按年龄段来：${PREMIUM_TEXT}如果父母在 61-75 周岁段，我建议您先确认医保状态，再看能不能接受一年期不保证续保、疾病 30 天等待期、住院医疗各 1 万免赔额，以及特定既往症和并发症不赔这些限制。`;
    case "medical_insurance_check":
      if (profile.hasMedicalInsurance === "no") {
        return "如果现在没有基本医保，或者医保不在保，这款就不建议您继续投保方向看。它要求被保险人有基本医保且在保，后续理赔也会涉及医保结算。这个点先确认清楚，比直接看价格更重要。";
      }
      return "有医保的话，可以把它理解成住院医疗费用的一项补充。医保能报一部分，但社保内自己承担的部分、符合条款的医保外住院费用、特定药品这些，还要看产品责任和审核结果。同时要注意疾病 30 天等待期、住院医疗 1 万免赔额、特定既往症及并发症不赔，以及不保证续保。";
    case "fit_assessment":
      return "要判断适不适合，我不会一上来就劝您买。先看四件事：给谁买、年龄在不在出生满 30 天至 75 周岁、有医保且在保没有、主要担心住院自费还是特药费用。它更像是住院医疗费用补充，不适合拿来确认某个疾病一定赔，也不能直接替代已有长期保障。";
    case "needs_discovery":
      return "如果您还没想清楚要问什么，可以先从最担心的事说起。担心住院自费，就看社保内 400 万和社保外 300 万住院医疗；担心特药，就看 200 万特药责任和用药审核；担心理赔麻烦，就先看等待期、免赔额、医保结算和责任免除。";
    case "trust_objection":
      return "您有这个顾虑很正常，保险产品就该问清楚。建议重点看三样东西：保险条款、投保页面展示的保险公司和保障责任、投保后的保单或订单页面。我这里不会说“免费”“一定赔”“什么都报”这种话；如果您遇到扣费争议、保单状态或投诉问题，我会直接帮您转人工顾问确认。";
    case "sales_objection":
      return "这个我得提醒您：不要因为看到这款产品，就直接把原来的保险退掉。不同产品的保障期间、续保规则、免赔额、既往症限制都可能不一样，我不能建议您退旧买新。更稳妥的是先把原保单和这款产品分别看清楚；如果您已经在考虑替换，建议让人工顾问一起帮您核对。";
    case "price":
      return `价格按年龄段来：${PREMIUM_TEXT}不过我不建议您只看价格，关键还得看被保险人有没有基本医保且在保，以及能不能接受疾病 30 天等待期、住院医疗 1 万免赔额、特定既往症除外这些限制。`;
    case "coverage":
      return "全民保尊享版主要看的是住院医疗费用补充。新版方案最高合计 1000 万：社保内住院医疗 400 万、社保外住院医疗 300 万、特定药品医疗 200 万、质子重离子医疗 100 万，各项保额不共享。社保内和社保外住院医疗各有 1 万免赔额；疾病有 30 天等待期，意外医疗无等待期。具体能否理赔以条款和保险公司审核为准。";
    case "purchase_guidance":
      return "可以先看三个基本条件：被保险人是否出生满 30 天至 75 周岁、是否有基本医保且在保、是否是本人/配偶/父母/子女。这个产品适合想补充医保之外住院医疗费用的人群，但也要注意疾病 30 天等待期、两个 1 万免赔额、特定既往症除外以及不保证续保。";
    case "pre_existing":
      return "这类情况要分开看：能不能投保，和后面相关疾病能不能赔，不是一回事。全民保尊享版无健康告知，但特定既往症及并发症导致的医疗费用不赔。像高血压、糖尿病这类情况，建议您不要只看“能买”，还要重点看既往症除外责任；如果病史比较复杂，我建议转人工顾问帮您进一步确认。";
    case "drug_benefit":
      return "用药权益这里容易混在一起，我帮您分开看：特定药品医疗是保险责任，限清单内药品，并需要通过保险责任和用药合理性审核；小雨竹领药权益是平台权益，不属于人保保险责任。0-60 周岁全年最高 600 元，61-75 周岁全年最高 1000 元，通常需缴费满 6 个月后按规则领取，具体以保单权益页面或服务号显示为准。";
    case "payment":
      return "这是一年期、按月缴费产品。您需要在保单载明的每个应缴日前或当天缴费；如未及时缴费，通常有 30 天补缴宽限期。超过宽限期未补缴，合同可能自应缴日 0 时起终止并影响保障。具体扣费日和状态以保单或订单页面为准。";
    case "claim":
      return "您这个问题不能简单理解成“全报”。医保报完后，剩下的费用还要看是不是符合条款责任、有没有过等待期、是否经过医保结算、是否超过免赔额，以及保险公司审核结果。简单说，剩余费用也要按条款和审核结果来看。";
    default:
      return "我在，您这句我先理解成想确认有人服务。您直接说就好，我先听您想问哪件事。";
  }
}

function followUpFor(intent, profile, action) {
  if (action !== "ask_one_question") return "";
  if (["identity_intro", "value_prop", "needs_discovery"].includes(intent)) {
    return "我先问您一个小问题：这次主要是您本人了解，还是给父母或家人了解？";
  }
  if (intent === "clarify_plainly" || intent === "simplify") {
    return "如果是给家人了解，我也可以先帮您看基础条件。";
  }
  if (intent === "parent_purchase" && profile.hasMedicalInsurance === "unknown") {
    return "如果现在只确认一个点，先看父母医保是不是还在保。";
  }
  if (intent === "fit_assessment") {
    return "为了判断得更贴近，您可以先告诉我：更担心住院自费，还是特药/用药费用？";
  }
  return "";
}

function quickRepliesFor(intent, stage, handoffRequired, profile) {
  if (handoffRequired || stage === "handoff") {
    return [
      { label: "准备哪些信息", message: "转人工前我需要准备什么信息？" },
      { label: "先了解哪些限制", message: "在等人工前，我还能先了解哪些关键限制？" },
    ];
  }
  if (intent === "product_intro" || intent === "correction") {
    return [
      { label: "父母能不能买", message: "给父母买这款产品，需要先确认什么？" },
      { label: "没有医保能买吗", message: "没有医保能买吗？" },
      { label: "一个月多少钱", message: "这款产品一个月多少钱？" },
      { label: "有高血压能买吗", message: "有高血压糖尿病能买吗？" },
    ];
  }
  if (["greeting", "acknowledgement", "low_information", "clarify_plainly", "simplify", "bot_identity", "identity_intro", "value_prop", "needs_discovery"].includes(intent)) {
    return [
      { label: "给父母看", message: "我想给父母看看，应该先确认什么？" },
      { label: "住院自费", message: "主要担心住院自费多，这个能解决什么？" },
      { label: "有医保", message: "已经有医保，还需要这类补充吗？" },
    ];
  }
  if (intent === "parent_purchase" || profile.target === "parents") {
    return [
      { label: "老人保费", message: "61-75 周岁保费和保障有什么不同？" },
      { label: "父母有病史", message: "父母有高血压糖尿病会影响理赔吗？" },
      { label: "医保外住院", message: "父母住院医保外费用怎么理解？" },
    ];
  }
  if (intent === "medical_insurance_check") {
    return [
      { label: "有医保还需要吗", message: "有医保还需要这个作为补充吗？" },
      { label: "医保外能报吗", message: "社保外住院医疗怎么理解？" },
      { label: "免赔额", message: "1 万免赔额是什么意思？" },
    ];
  }
  if (intent === "pre_existing") {
    return [
      { label: "能投和能赔", message: "无健康告知是不是代表都能赔？" },
      { label: "哪些不赔", message: "哪些既往症需要特别注意？" },
      { label: "人工确认", message: "这种病史需要人工帮我确认吗？" },
    ];
  }
  if (intent === "claim" || profile.concern === "claim") {
    return [
      { label: "理赔流程", message: "如果住院了理赔流程怎么走？" },
      { label: "免赔额", message: "住院医疗 1 万免赔额怎么影响报销？" },
      { label: "等待期", message: "买完多久生效？等待期怎么计算？" },
    ];
  }
  return [
    { label: "父母有医保还需要吗", message: "父母有医保，还需要买这个吗？" },
    { label: "住院自费多怎么办", message: "主要担心住院自费多，这个能解决什么？" },
    { label: "有高血压能买吗", message: "有高血压糖尿病能买吗？" },
    { label: "医保外能报吗", message: "医保外住院费用能报吗？" },
  ];
}

export function screenReply(reply) {
  let next = String(reply || "");
  for (const item of ILLEGAL_REPLACEMENTS) {
    next = next.replace(item.pattern, item.replacement);
  }
  if (/所有进口药|靶向药都.*100%/.test(next)) {
    next = next.replace(
      /所有进口药、?靶向药都.*?100%.*?(报销|赔付)?/g,
      "清单内且符合审核要求的特定药品可按条款申请理赔"
    );
  }
  const changed = next !== reply;
  if (changed && !/保险公司审核|条款|等待期|不保证续保|符合保险责任范围/.test(next)) {
    next += " 具体仍需以条款和保险公司审核为准。";
  }
  return { reply: next, changed };
}

export function buildAssistantResponse(request) {
  const message = request?.user_message || "";
  const analysis = analyzeMessage(message);
  const profile = profileFromRequest(request, message);
  const matchedKnowledge = retrieveKnowledge(analysis.intent, message);
  const replyBase = analysis.handoffRequired ? HANDOFF_REPLY : answerForIntent(analysis.intent, profile);
  const followUp = analysis.handoffRequired ? "" : followUpFor(analysis.intent, profile, analysis.suggestedNextAction);
  const screened = screenReply(followUp ? `${replyBase}\n\n${followUp}` : replyBase);

  return {
    customer_reply: screened.reply,
    intent: analysis.intent,
    risk_level: analysis.riskLevel,
    handoff_required: analysis.handoffRequired,
    handoff_reason: analysis.handoffReason,
    internal_notes: [
      `识别意图：${analysis.intent}`,
      `会话阶段：${analysis.conversationStage}`,
      `风险等级：${analysis.riskLevel}`,
      analysis.handoffReason ? `转人工原因：${analysis.handoffReason}` : "当前可自动回复",
      ...analysis.complianceNotes,
      screened.changed ? "回复已触发合规改写" : "回复通过合规后审",
    ].join("；"),
    suggested_next_action: analysis.suggestedNextAction,
    conversation_stage: analysis.conversationStage,
    quick_replies: quickRepliesFor(analysis.intent, analysis.conversationStage, analysis.handoffRequired, profile),
    matched_knowledge: matchedKnowledge.map((chunk) => ({
      chunk_id: chunk.chunk_id,
      title: chunk.title,
      topic: chunk.topic,
      priority: chunk.priority,
      risk_level: chunk.risk_level,
      content: chunk.content,
    })),
    compliance_notes: analysis.complianceNotes,
    profile,
  };
}
