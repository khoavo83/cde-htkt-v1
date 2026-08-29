'use client';

import React from 'react';

/**
 * Lightweight, zero-dependency GitHub-flavored Markdown Preview component
 */
export default function MarkdownPreview({ content, className = '' }) {
  if (!content || !content.trim()) {
    return (
      <div className="text-slate-500 italic text-sm py-4 text-center">
        Chưa có nội dung văn bản.
      </div>
    );
  }

  const lines = content.split('\n');
  const elements = [];
  let tableRows = [];
  let inTable = false;
  let keyIndex = 0;

  const renderInlineFormatted = (text) => {
    if (!text) return '';
    // Format bold **text**
    const parts = [];
    let remaining = text;
    let match;

    // Pattern for code, bold, italic, links
    // Split by tags
    const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`)/g;
    const splitArr = remaining.split(regex);

    return splitArr.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={idx} className="font-bold text-slate-100">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
        return <em key={idx} className="italic text-slate-300">{part.slice(1, -1)}</em>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={idx} className="bg-slate-800 text-cyan-300 font-mono text-xs px-1.5 py-0.5 rounded border border-slate-700">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  const flushTable = () => {
    if (tableRows.length > 0) {
      const header = tableRows[0];
      const body = tableRows.slice(1);
      
      elements.push(
        <div key={`table-${keyIndex++}`} className="my-4 overflow-x-auto rounded-xl border border-slate-700/80 bg-slate-950/60 shadow-md">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-800/90 text-slate-200 border-b border-slate-700 font-semibold">
                {header.map((col, cIdx) => (
                  <th key={cIdx} className="px-3 py-2.5 whitespace-nowrap border-r last:border-r-0 border-slate-700">
                    {renderInlineFormatted(col)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {body.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-800/30 transition-colors">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-3 py-2 border-r last:border-r-0 border-slate-800 text-slate-300 leading-relaxed">
                      {cell.includes('<br/>') ? (
                        cell.split('<br/>').map((sub, sIdx) => (
                          <div key={sIdx}>{renderInlineFormatted(sub.trim())}</div>
                        ))
                      ) : (
                        renderInlineFormatted(cell)
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
      inTable = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Table detection
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      // Check if it is delimiter row (e.g. |---|---|)
      if (/^\|[\s\-:|]+\|$/.test(trimmed)) {
        continue;
      }
      inTable = true;
      const cols = trimmed.slice(1, -1).split('|').map(c => c.trim());
      tableRows.push(cols);
      continue;
    } else if (inTable) {
      flushTable();
    }

    if (!trimmed) {
      elements.push(<div key={`space-${keyIndex++}`} className="h-2" />);
      continue;
    }

    // Headers
    if (trimmed.startsWith('# ')) {
      elements.push(
        <h1 key={`h1-${keyIndex++}`} className="text-xl sm:text-2xl font-black text-emerald-400 mt-4 mb-2 pb-2 border-b border-emerald-500/20 leading-tight">
          {renderInlineFormatted(trimmed.slice(2))}
        </h1>
      );
    } else if (trimmed.startsWith('## ')) {
      elements.push(
        <h2 key={`h2-${keyIndex++}`} className="text-base sm:text-lg font-bold text-cyan-300 mt-5 mb-2 pb-1 border-b border-slate-800 flex items-center gap-2">
          {renderInlineFormatted(trimmed.slice(3))}
        </h2>
      );
    } else if (trimmed.startsWith('### ')) {
      elements.push(
        <h3 key={`h3-${keyIndex++}`} className="text-sm sm:text-base font-semibold text-amber-300 mt-3 mb-1.5">
          {renderInlineFormatted(trimmed.slice(4))}
        </h3>
      );
    } else if (trimmed.startsWith('#### ')) {
      elements.push(
        <h4 key={`h4-${keyIndex++}`} className="text-xs sm:text-sm font-semibold text-slate-200 mt-2 mb-1">
          {renderInlineFormatted(trimmed.slice(5))}
        </h4>
      );
    } 
    // Blockquote
    else if (trimmed.startsWith('> ')) {
      elements.push(
        <blockquote key={`quote-${keyIndex++}`} className="p-3 my-2 bg-slate-800/60 border-l-4 border-emerald-500 rounded-r-xl text-xs sm:text-sm text-slate-300 italic leading-relaxed">
          {renderInlineFormatted(trimmed.slice(2))}
        </blockquote>
      );
    } 
    // Horizontal rule
    else if (trimmed === '---' || trimmed === '***') {
      elements.push(
        <hr key={`hr-${keyIndex++}`} className="my-4 border-slate-800" />
      );
    } 
    // List item
    else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      elements.push(
        <div key={`li-${keyIndex++}`} className="flex items-start gap-2 my-1 text-xs sm:text-sm text-slate-300 ml-2">
          <span className="text-emerald-400 mt-1">•</span>
          <span className="leading-relaxed flex-1">{renderInlineFormatted(trimmed.slice(2))}</span>
        </div>
      );
    } 
    // Standard paragraph
    else {
      elements.push(
        <p key={`p-${keyIndex++}`} className="text-xs sm:text-sm text-slate-300 leading-relaxed my-1">
          {renderInlineFormatted(trimmed)}
        </p>
      );
    }
  }

  if (inTable) {
    flushTable();
  }

  return (
    <div className={`markdown-content space-y-1 ${className}`}>
      {elements}
    </div>
  );
}
