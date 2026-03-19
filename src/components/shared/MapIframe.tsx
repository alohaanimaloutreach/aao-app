import { useState } from 'react';

interface MapIframeProps {
  src: string;
  height?: number;
  title?: string;
}

export default function MapIframe({ src, height = 160, title = 'Map' }: MapIframeProps) {
  const [active, setActive] = useState(false);

  return (
    <div
      className="relative"
      onMouseLeave={() => setActive(false)}
    >
      <iframe
        title={title}
        width="100%"
        height={height}
        style={{ border: 0, display: 'block' }}
        src={src}
        loading="lazy"
      />
      {/* Desktop overlay: blocks iframe scroll capture until clicked */}
      {!active && (
        <div
          className="absolute inset-0 hidden md:block cursor-pointer"
          onClick={() => setActive(true)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
