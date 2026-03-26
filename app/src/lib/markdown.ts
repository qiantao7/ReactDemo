function escapeHtml(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatInline(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
}

export function renderMarkdown(markdown: string) {
  const lines = escapeHtml(markdown).split("\n");
  const html: string[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let inUnorderedList = false;
  let inOrderedList = false;

  const closeLists = () => {
    if (inUnorderedList) {
      html.push("</ul>");
      inUnorderedList = false;
    }
    if (inOrderedList) {
      html.push("</ol>");
      inOrderedList = false;
    }
  };

  const flushCodeBlock = () => {
    if (!inCodeBlock) return;
    html.push(`<pre><code>${codeBuffer.join("\n")}</code></pre>`);
    inCodeBlock = false;
    codeBuffer = [];
  };

  for (const line of lines) {
    if (/^```/.test(line)) {
      if (inCodeBlock) {
        flushCodeBlock();
      } else {
        closeLists();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    if (/^\s*([-*_])\s*\1\s*\1\s*$/.test(line)) {
      closeLists();
      html.push("<hr/>");
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      if (inUnorderedList) {
        html.push("</ul>");
        inUnorderedList = false;
      }
      if (!inOrderedList) {
        html.push("<ol>");
        inOrderedList = true;
      }
      html.push(`<li>${formatInline(line.replace(/^\d+\.\s+/, ""))}</li>`);
      continue;
    }

    if (/^\-\s+/.test(line)) {
      if (inOrderedList) {
        html.push("</ol>");
        inOrderedList = false;
      }
      if (!inUnorderedList) {
        html.push("<ul>");
        inUnorderedList = true;
      }
      html.push(`<li>${formatInline(line.replace(/^\-\s+/, ""))}</li>`);
      continue;
    }

    closeLists();

    if (/^###\s+/.test(line)) {
      html.push(`<h3>${formatInline(line.replace(/^###\s+/, ""))}</h3>`);
      continue;
    }
    if (/^##\s+/.test(line)) {
      html.push(`<h2>${formatInline(line.replace(/^##\s+/, ""))}</h2>`);
      continue;
    }
    if (/^#\s+/.test(line)) {
      html.push(`<h1>${formatInline(line.replace(/^#\s+/, ""))}</h1>`);
      continue;
    }
    if (/^>\s+/.test(line)) {
      html.push(`<blockquote>${formatInline(line.replace(/^>\s+/, ""))}</blockquote>`);
      continue;
    }
    if (!line.trim()) {
      html.push("<p><br/></p>");
      continue;
    }
    html.push(`<p>${formatInline(line)}</p>`);
  }

  flushCodeBlock();
  closeLists();

  return html.join("");
}
