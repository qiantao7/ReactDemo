"use client";

import { Box } from "@mui/material";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type MarkdownContentProps = {
  content: string;
};

export function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <Box
      className="markdown-body"
      sx={{
        "& h1": { mt: 1.2, mb: 0.8, fontSize: "1.75rem", fontWeight: 700 },
        "& h2": { mt: 1.1, mb: 0.7, fontSize: "1.45rem", fontWeight: 700 },
        "& h3": { mt: 1, mb: 0.6, fontSize: "1.25rem", fontWeight: 700 },
        "& p": { my: 0.8, lineHeight: 1.8 },
        "& ul": { my: 0.8, pl: 3.4, listStyleType: "disc", listStylePosition: "outside" },
        "& ol": { my: 0.8, pl: 3.4, listStyleType: "decimal", listStylePosition: "outside" },
        "& blockquote ul, & blockquote ol": { my: 0.6, pl: 3 },
        "& li": { my: 0.35 },
        "& li::marker": { color: "text.secondary" },
        "& blockquote": {
          my: 1.1,
          pl: 1.5,
          py: 0.6,
          borderLeft: "3px solid",
          borderColor: "primary.main",
          bgcolor: "action.hover",
          borderRadius: 1,
        },
        "& hr": { my: 1.5, border: "none", borderTop: "1px solid", borderColor: "divider" },
        "& code": {
          px: 0.6,
          py: 0.2,
          borderRadius: 0.8,
          bgcolor: "action.hover",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          fontSize: "0.875em",
        },
        "& pre": {
          my: 1.1,
          p: 1.2,
          borderRadius: 1,
          bgcolor: "action.hover",
          overflowX: "auto",
          border: "1px solid",
          borderColor: "divider",
        },
        "& pre code": { p: 0, bgcolor: "transparent" },
        "& table": { width: "100%", borderCollapse: "collapse", my: 1 },
        "& th, & td": { border: "1px solid", borderColor: "divider", px: 1, py: 0.8, textAlign: "left" },
        "& a": { color: "primary.main", textDecoration: "underline" },
      }}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </Box>
  );
}
