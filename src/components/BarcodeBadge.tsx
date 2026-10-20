import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeBadgeProps {
  value: string;
  width?: number;
  height?: number;
  fontSize?: number;
  displayValue?: boolean;
  className?: string;
}

export const BarcodeBadge: React.FC<BarcodeBadgeProps> = ({
  value,
  width = 1.6,
  height = 48,
  fontSize = 12,
  displayValue = true,
  className = ''
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: 'CODE128',
          width,
          height,
          displayValue,
          font: 'monospace',
          fontSize,
          textMargin: 2,
          margin: 4,
          background: '#ffffff',
          lineColor: '#0f172a'
        });
      } catch (err) {
        console.error('Failed to generate barcode for', value, err);
      }
    }
  }, [value, width, height, fontSize, displayValue]);

  return (
    <div className={`inline-flex flex-col items-center bg-white p-2 rounded border border-slate-200 shadow-xs ${className}`}>
      <svg ref={svgRef} className="max-w-full overflow-visible" />
      <span className="sr-only">Barcode for {value}</span>
    </div>
  );
};
