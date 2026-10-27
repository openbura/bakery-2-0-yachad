import { useEffect, useId, useRef, useState } from 'react';
import { ImageSquare } from '@phosphor-icons/react';
import imagePresentations from '../data/product-image-presentation.json';

type ImagePresentation = { width: number; height: number; viewBox: number[]; paths: string[]; badgeRect: number[] | null; clipRule?: 'evenodd' | 'nonzero' };

export default function ProductImage({ src, name, eager = false }: { src: string; name: string; eager?: boolean }) {
  const clipId = useId();
  const mediaRef = useRef<HTMLDivElement>(null);
  const [nearViewport, setNearViewport] = useState(eager);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = failedSrc === src;
  const presentation = (imagePresentations as Record<string, ImagePresentation>)[src];
  const shouldLoad = eager || nearViewport || typeof IntersectionObserver === 'undefined';
  useEffect(() => {
    if (!shouldLoad || !src || !presentation) return;
    let active = true;
    const image = new Image();
    image.onload = () => { if (active) setLoadedSrc(src); };
    image.onerror = () => { if (active) setFailedSrc(src); };
    image.src = src;
    return () => { active = false; image.onload = null; image.onerror = null; };
  }, [src, shouldLoad, presentation]);
  useEffect(() => {
    if (eager || nearViewport || typeof IntersectionObserver === 'undefined' || !mediaRef.current) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setNearViewport(true); observer.disconnect(); }
    }, { rootMargin: '600px' });
    observer.observe(mediaRef.current);
    return () => observer.disconnect();
  }, [eager, nearViewport]);
  // Retain the approved photo inset while provenance stays in the source data.
  const preserveFraming = Boolean(presentation && src && !failed);
  return <div ref={mediaRef} data-photo-src={src} data-photo-loaded={String(loadedSrc === src)} className={['shop-product-media', src && !failed ? 'has-product-image' : 'is-missing-image', preserveFraming && 'has-image-disclosure'].filter(Boolean).join(' ')}>
    {src && !failed ? presentation ? (
      <svg className="shop-product-image-framed" viewBox={presentation.viewBox.join(' ')} preserveAspectRatio="xMidYMid meet" role="img" aria-label={name} focusable="false">
        <defs>
          <clipPath id={clipId}><rect x={presentation.viewBox[0]} y={presentation.viewBox[1]} width={presentation.viewBox[2]} height={presentation.viewBox[3]} /></clipPath>
          {presentation.paths.length > 0 && <>
            <filter id={`${clipId}-edge`}><feGaussianBlur stdDeviation={Math.max(presentation.width, presentation.height) / 1100} /></filter>
            <mask id={`${clipId}-subject`} maskUnits="userSpaceOnUse" x={0} y={0} width={presentation.width} height={presentation.height}>
              <path d={presentation.paths.join(' ')} fill="#fff" fillRule={presentation.clipRule ?? 'evenodd'} filter={`url(#${clipId}-edge)`} />
            </mask>
          </>}
        </defs>
        <g clipPath={`url(#${clipId})`}>
          <image href={loadedSrc === src ? src : undefined} width={presentation.width} height={presentation.height} mask={presentation.paths.length ? `url(#${clipId}-subject)` : undefined} onError={() => setFailedSrc(src)} />
          {presentation.badgeRect && <rect x={presentation.badgeRect[0]} y={presentation.badgeRect[1]} width={presentation.badgeRect[2]} height={presentation.badgeRect[3]} fill="#fff" />}
        </g>
      </svg>
    ) : <img src={src} alt={name} loading={eager ? 'eager' : 'lazy'} decoding="async" onLoad={() => setLoadedSrc(src)} onError={() => setFailedSrc(src)} /> :
      <div className="shop-product-placeholder" role="img" aria-label={`צילום המוצר אינו זמין: ${name}`}>
        <ImageSquare size={32} weight="light" aria-hidden="true" />
        <span>צילום המוצר אינו זמין</span>
      </div>}
  </div>;
}
