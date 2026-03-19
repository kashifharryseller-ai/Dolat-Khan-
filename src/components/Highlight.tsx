import React from 'react';

interface HighlightProps {
  text: string;
  matches?: readonly { indices: readonly [number, number][] }[];
}

export const Highlight: React.FC<HighlightProps> = ({ text, matches }) => {
  if (!matches || matches.length === 0) {
    return <>{text}</>;
  }

  // Flatten and merge overlapping indices
  let allIndices: [number, number][] = [];
  matches.forEach(match => {
    match.indices.forEach(([start, end]) => {
      allIndices.push([start, end]);
    });
  });

  if (allIndices.length === 0) {
    return <>{text}</>;
  }

  // Sort indices
  allIndices.sort((a, b) => a[0] - b[0]);

  // Merge overlapping indices
  const mergedIndices: [number, number][] = [allIndices[0]];
  for (let i = 1; i < allIndices.length; i++) {
    const current = allIndices[i];
    const last = mergedIndices[mergedIndices.length - 1];
    
    if (current[0] <= last[1] + 1) {
      last[1] = Math.max(last[1], current[1]);
    } else {
      mergedIndices.push(current);
    }
  }

  const result: React.ReactNode[] = [];
  let currentIndex = 0;

  mergedIndices.forEach(([start, end], index) => {
    // Add unhighlighted text before the match
    if (start > currentIndex) {
      result.push(<span key={`text-${index}`}>{text.substring(currentIndex, start)}</span>);
    }
    
    // Add highlighted text
    result.push(
      <mark key={`highlight-${index}`} className="bg-gold/30 text-gold-bright rounded px-0.5 font-bold">
        {text.substring(start, end + 1)}
      </mark>
    );
    
    currentIndex = end + 1;
  });

  // Add remaining text
  if (currentIndex < text.length) {
    result.push(<span key={`text-end`}>{text.substring(currentIndex)}</span>);
  }

  return <>{result}</>;
};
