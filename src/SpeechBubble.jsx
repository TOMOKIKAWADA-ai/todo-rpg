// SpeechBubble.jsx
import React from "react";

export default function SpeechBubble({ text, size = 140, className = "" }) {
  const h = (size * 0.6) | 0;

  /* フォント自動縮小 (基準 size/11) */
  const lines  = String(text).split(/\r?\n/);
  const maxLen = Math.max(...lines.map(l => l.length));
  let fontSize = size / 11;
  const estW   = maxLen * fontSize * 0.6;
  if (estW > size * 0.8) fontSize *= (size * 0.8) / estW;

  const lineH  = fontSize * 1.3;
  const startY = h / 2 - ((lines.length - 1) * lineH) / 2;

  /* ▼ 吹き出しの「しっぽ」の形を調整 ▼ */
  const baseY     = h - 10;      // しっぽの付け根のY座標 (基本変えない)
  const baseLeft  = size * 0.60; // しっぽの付け根の左端 (0.0 ~ 1.0)
  const baseRight = size * 0.84; // しっぽの付け根の右端 (0.0 ~ 1.0)
  const tipX      = size * 0.95; // しっぽの先端のX座標 (0.0 ~ 1.0)
  const tipY      = h + 16;      // しっぽの先端のY座標 (h より大きい値)

  return (
    <svg viewBox={`0 0 ${size} ${h + 20}`} width={size} height={h + 20} className={className}>
      <ellipse cx={size / 2} cy={h / 2} rx={size / 2 - 4} ry={h / 2 - 4} fill="white" />
      <polygon points={`${baseLeft},${baseY}  ${tipX},${tipY}  ${baseRight},${baseY}`} fill="white" />
      <text
        xmlSpace="preserve"
        x={size / 2}
        y={startY}
        textAnchor="middle"
        fontFamily="sans-serif"
        fontSize={fontSize}
        fill="black"
      >
        {lines.map((l, i) => (
          <tspan key={i} x={size / 2} dy={i ? lineH : 0}>
            {l}
          </tspan>
        ))}
      </text>
    </svg>
  );
}
