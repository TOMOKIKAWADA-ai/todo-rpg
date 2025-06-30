// SpeechBubble.jsx
import React from "react";

export default function SpeechBubble({ text, size = 180, className = "" }) {
  const h = (size * 0.6) | 0;        // バブル高さ

  /* ----- テキスト処理 ----- */
  const lines = String(text).split(/\r?\n/);
  const maxLen = Math.max(...lines.map((l) => l.length));

  /* 基本フォント */
  let fontSize = size / 11;           // 例: size=180 → 22.5px

  /* 幅に合わせて自動縮小 (概算)  */
  const estWidth = maxLen * fontSize * 0.6; // 文字幅を 0.6×サイズで概算
  const maxWidth = size * 0.8;              // 楕円の余白込み 80%
  if (estWidth > maxWidth) {
    fontSize = (maxWidth / estWidth) * fontSize;
  }

  /* 行高 & 上下中央オフセット */
  const lineH = fontSize * 1.3;                          // 行間
  const startY = h / 2 - ((lines.length - 1) * lineH) / 2;

  /* ----- しっぽ座標（確定版） ----- */
  const baseY     = h - 10;
  const baseLeft  = size * 0.36;
  const baseRight = size * 0.60;
  const tipX      = size * 0.74;
  const tipY      = h + 16;

  return (
    <svg
      viewBox={`0 0 ${size} ${h + 20}`}
      width={size}
      height={h + 20}
      className={className}
    >
      {/* バブル本体 */}
      <ellipse
        cx={size / 2}
        cy={h / 2}
        rx={size / 2 - 4}
        ry={h / 2 - 4}
        fill="white"
      />

      {/* しっぽ */}
      <polygon
        points={`${baseLeft},${baseY} ${tipX},${tipY} ${baseRight},${baseY}`}
        fill="white"
      />

      {/* テキスト */}
      <text
        x={size / 2}
        y={startY}
        textAnchor="middle"
        fontFamily="sans-serif"
        fontSize={fontSize}
        fill="black"
      >
        {lines.map((line, i) => (
          <tspan key={i} x={size / 2} dy={i === 0 ? 0 : lineH}>
            {line}
          </tspan>
        ))}
      </text>
    </svg>
  );
}
