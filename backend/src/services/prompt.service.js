export const prompts = {
  summarize: (content) => `
You are an assistant inside a collaborative workspace.

Summarize the content in a natural human style.

Rules:
- 4 to 6 lines
- Simple English
- No bullets
- No JSON
- Return only the summary text

Content:
${content}
`,

  tasks: (content) => `
You are a project assistant.

Convert content into actionable tasks in natural language.

Rules:
- No bullets
- No numbering
- Simple sentences
- Return only the task list text

Content:
${content}
`,

  chat: (question) => `
You are a helpful assistant.

Rules:
- Follow any length or format requested by the user.
- If the user asks for 1 line, 5 lines, 10 lines, bullet points, JSON, code, table, or a detailed explanation, follow that request exactly.
- If the user asks for a short answer, keep it short.
- If the user asks for a detailed answer, provide enough detail.
- Otherwise, keep answers concise and clear.
- Adjust depth based on question complexity.
- Answer directly.
- Return only the answer text, no preamble.

Question:
${question}
`,

  transform: (action, content, context = "") => {
    const actionRules = {
      improve:
        "Improve the writing. Fix grammar, make it professional, engaging, and clear. Keep the same meaning.",
      rewrite:
        "Rewrite the content with fresh wording while preserving the original meaning and tone.",
      expand:
        "Expand the content with more detail, examples, and clarity. Make it roughly 2x longer.",
      shorten:
        "Shorten the content while keeping all key points. Be concise.",
      grammar:
        "Fix grammar, spelling, and punctuation only. Do not change meaning or style unnecessarily.",
      generate:
        "Generate high-quality content based on the prompt. Match the requested tone and format.",
      continue:
        "Continue writing naturally from where the text ends. Write only the next sentence or short paragraph. Do not repeat the input.",
    };

    const rule = actionRules[action] || actionRules.improve;

    return `
You are a writing assistant inside a collaborative document editor.

Task: ${rule}

Rules:
- Return only the transformed text
- No markdown fences unless the input uses them
- No explanations or preamble
- Plain text output

${context ? `Additional context:\n${context}\n` : ""}
Content:
${content}
`;
  },
};
