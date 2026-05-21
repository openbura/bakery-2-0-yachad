import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { AnimatePresence, motion, type Variants, useReducedMotion } from 'framer-motion';
import {
  CaretDown,
  Clock,
  Grains,
  Heart,
  InstagramLogo,
  List,
  MapPin,
  NavigationArrow,
  PhoneCall,
  SealCheck,
  Storefront,
  WhatsappLogo,
  X,
} from '@phosphor-icons/react';
import './styles.css';

import heroImage from './assets/bakery-2/hero-cinematic.webp';
import logoImage from './assets/bakery-2/logo.webp';
import categoryPastries from './assets/bakery-2/cat-pastries.webp';
import categoryBreads from './assets/bakery-2/cat-breads.webp';
import categoryCakes from './assets/bakery-2/cat-cakes.webp';
import categorySavory from './assets/bakery-2/cat-savory.webp';
import categoryCoffee from './assets/bakery-2/cat-coffee.webp';
import categoryHosting from './assets/bakery-2/cat-hosting.webp';
import freshOne from './assets/bakery-2/fresh-1.webp';
import freshTwo from './assets/bakery-2/fresh-2.webp';
import freshThree from './assets/bakery-2/fresh-3.webp';
import freshFour from './assets/bakery-2/fresh-4.webp';
import aboutImage from './assets/bakery-2/gallery-3.webp';

const phoneHref = 'tel:0502696267';
const whatsappHref =
  'https://wa.me/972502696267?text=%D7%A9%D7%9C%D7%95%D7%9D%20%D7%9E%D7%90%D7%A4%D7%99%D7%99%D7%AA%20%D7%99%D7%97%D7%93%2C%20%D7%90%D7%A9%D7%9E%D7%97%20%D7%9C%D7%91%D7%A8%D7%A8%20%D7%9C%D7%92%D7%91%D7%99%20%D7%94%D7%96%D7%9E%D7%A0%D7%94';
const mapsHref =
  'https://www.google.com/maps/search/?api=1&query=%D7%94%D7%99%D7%95%D7%A6%D7%A8%D7%99%D7%9D%203%2C%20%D7%9B%D7%A4%D7%A8%20%D7%A1%D7%91%D7%90%20%D7%9E%D7%90%D7%A4%D7%99%D7%99%D7%AA%20%D7%99%D7%97%D7%93';
const instagramHref = 'https://www.instagram.com/yachad_bakery/';
const introDesktopVideo = '/videos/yachad-intro-desktop.mp4';
const introMobileVideo = '/videos/yachad-intro-mobile.mp4';
const introDesktopPoster = '/videos/yachad-intro-desktop-poster.webp';
const introMobilePoster = '/videos/yachad-intro-mobile-poster.webp';

const desktopIntroAsset = {
  video: introDesktopVideo,
  poster: introDesktopPoster,
  frameSet: 'desktop',
};

const mobileIntroAsset = {
  video: introMobileVideo,
  poster: introMobilePoster,
  frameSet: 'mobile',
};

const scrollFrameCount = 150;

const navItems = [
  { label: 'דף הבית', href: '#home' },
  { label: 'מה תמצאו אצלנו', href: '#categories' },
  { label: 'קצת מהתנור', href: '#fresh' },
  { label: 'צור קשר', href: '#visit' },
];

const navHrefs = navItems.map((item) => item.href);
type FramePriority = 'critical' | 'high' | 'low' | 'idle';

const categories = [
  {
    title: 'מאפים ובורקסים',
    text: 'מאפים טריים, בורקסים ומאפים מלוחים שנאפים במקום לאורך היום.',
    image: categoryPastries,
  },
  {
    title: 'לחמים ולחמי מחמצת',
    text: 'לחמים, לחמניות ולחמי מחמצת לארוחה בבית או לדרך.',
    image: categoryBreads,
  },
  {
    title: 'עוגות ועוגיות',
    text: 'עוגות, עוגיות ומתוקים לקפה, לאירוח או לקחת הביתה.',
    image: categoryCakes,
  },
  {
    title: 'טוסטים, כריכים וסלטים',
    text: 'אפשרויות קלות וטריות לעצירה מהירה במהלך היום.',
    image: categorySavory,
  },
  {
    title: 'קפה ושתייה',
    text: 'קפה ומשקאות לצד מאפה טרי או משהו מתוק.',
    image: categoryCoffee,
  },
  {
    title: 'מגשי אירוח ואירועים',
    text: 'מבחר מאפים ומתוקים לאירוח, פגישות ואירועים קטנים.',
    image: categoryHosting,
  },
];

const freshImages = [
  { src: freshOne, label: 'קרואסוני חמאה ושוקולד' },
  { src: freshTwo, label: 'לחמי דגנים ולחמי מחמצת' },
  { src: freshThree, label: 'מאפים מלוחים ושומשום' },
  { src: freshFour, label: 'עוגות פס וקינוחים' },
];

const benefits = [
  { label: 'אפייה במקום', Icon: Grains },
  { label: 'טעם, איכות וטריות', Icon: Heart },
  { label: 'מאפייה וקונדיטוריה בכפר סבא', Icon: Storefront },
  { label: 'מוזמנים לטעום את ההבדל', Icon: SealCheck },
];

const hours = ['א׳-ה׳: 05:00-22:00', 'ו׳: 05:00-16:00', 'שבת: סגור'];

const headerReveal = {
  hidden: { opacity: 0, y: -18, scale: 0.985 },
  show: { opacity: 1, y: 0, scale: 1 },
};

const reveal = {
  hidden: { opacity: 0, y: 30, filter: 'blur(7px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)' },
};

const heroLogoReveal = {
  hidden: { opacity: 0, y: 18, scale: 0.9, filter: 'blur(8px)' },
  show: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' },
};

const heroTextReveal = {
  hidden: { opacity: 0, y: 34, filter: 'blur(10px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)' },
};

const buttonReveal = {
  hidden: { opacity: 0, y: 18, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1 },
};

const cardReveal = {
  hidden: { opacity: 0, y: 34, scale: 0.965 },
  show: { opacity: 1, y: 0, scale: 1 },
};

const imageReveal = {
  hidden: { opacity: 0, y: 28, scale: 0.985, clipPath: 'inset(16% 0% 16% 0% round 24px)' },
  show: { opacity: 1, y: 0, scale: 1, clipPath: 'inset(0% 0% 0% 0% round 24px)' },
};

const contactItemReveal = {
  hidden: { opacity: 0, x: 18 },
  show: { opacity: 1, x: 0 },
};

const stagger = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.08,
    },
  },
};

const heroStagger = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.13,
      delayChildren: 0.18,
    },
  },
};

const buttonStagger = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.08,
    },
  },
};

const mobileMenuVariants: Variants = {
  hidden: { opacity: 0, y: -16, scale: 0.98, filter: 'blur(8px)' },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: { duration: 0.38, ease: 'easeOut', staggerChildren: 0.06 },
  },
  exit: { opacity: 0, y: -10, scale: 0.98, filter: 'blur(8px)', transition: { duration: 0.2 } },
};

const mobileMenuItemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

function useActiveSection(hrefs: string[]) {
  const [activeHref, setActiveHref] = useState(hrefs[0]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visibleEntry?.target.id) {
          setActiveHref(`#${visibleEntry.target.id}`);
        }
      },
      { rootMargin: '-28% 0px -58% 0px', threshold: [0.16, 0.3, 0.5] },
    );

    hrefs.forEach((href) => {
      const target = document.querySelector(href);
      if (target) {
        observer.observe(target);
      }
    });

    return () => observer.disconnect();
  }, [hrefs]);

  return activeHref;
}

function getIntroAsset() {
  if (typeof window !== 'undefined' && window.matchMedia('(max-width: 820px)').matches) {
    return mobileIntroAsset;
  }

  return desktopIntroAsset;
}

function useIntroAsset() {
  const [asset, setAsset] = useState(getIntroAsset);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 820px)');
    const updateAsset = () => setAsset(media.matches ? mobileIntroAsset : desktopIntroAsset);

    updateAsset();
    media.addEventListener('change', updateAsset);

    return () => media.removeEventListener('change', updateAsset);
  }, []);

  return asset;
}

type CinematicIntroProps = {
  reducedMotion: boolean;
  onIntroPassedChange: (passed: boolean) => void;
};

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - clamp(value), 3);
}

function setIntroProgressVars(section: HTMLElement, progress: number) {
  const mark = 1 - easeOutCubic((progress - 0.02) / 0.14);
  const bridge = easeOutCubic((progress - 0.86) / 0.14);
  const reveal = easeOutCubic((progress - 0.92) / 0.08);
  const mediaScale = 1 + easeOutCubic((progress - 0.82) / 0.18) * 0.032;

  section.style.setProperty('--intro-progress', progress.toFixed(4));
  section.style.setProperty('--intro-mark', clamp(mark).toFixed(4));
  section.style.setProperty('--intro-brand', '0');
  section.style.setProperty('--intro-brand-y', '18px');
  section.style.setProperty('--intro-line', '0');
  section.style.setProperty('--intro-line-y', '20px');
  section.style.setProperty('--intro-bridge', bridge.toFixed(4));
  section.style.setProperty('--intro-reveal', reveal.toFixed(4));
  section.style.setProperty('--intro-bridge-y', `${((1 - bridge) * 40).toFixed(2)}svh`);
  section.style.setProperty('--intro-bridge-clip', `${(18 * (1 - reveal)).toFixed(2)}%`);
  section.style.setProperty('--intro-media-scale', mediaScale.toFixed(4));
}

function getScrollFrameSrc(frameSet: string, index: number) {
  return `/hero-frames/${frameSet}/frame-${String(index).padStart(3, '0')}.webp`;
}

const framePriorityRank: Record<FramePriority, number> = {
  critical: 0,
  high: 1,
  low: 2,
  idle: 3,
};

function drawCoverImage(ctx: CanvasRenderingContext2D, image: HTMLImageElement) {
  const { width, height } = ctx.canvas;
  const imageRatio = image.naturalWidth / image.naturalHeight;
  const canvasRatio = width / height;
  let sourceWidth = image.naturalWidth;
  let sourceHeight = image.naturalHeight;
  let sourceX = 0;
  let sourceY = 0;

  if (imageRatio > canvasRatio) {
    sourceWidth = image.naturalHeight * canvasRatio;
    sourceX = (image.naturalWidth - sourceWidth) / 2;
  } else {
    sourceHeight = image.naturalWidth / canvasRatio;
    sourceY = (image.naturalHeight - sourceHeight) / 2;
  }

  ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height);
}

function CinematicIntro({ reducedMotion, onIntroPassedChange }: CinematicIntroProps) {
  const introAsset = useIntroAsset();
  const sectionRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const passedRef = useRef(false);
  const [canvasFrameSource, setCanvasFrameSource] = useState<string | null>(null);
  const canvasHasFrame = canvasFrameSource === introAsset.frameSet;

  useEffect(() => {
    const markPassed = (passed: boolean) => {
      if (passedRef.current !== passed) {
        passedRef.current = passed;
        onIntroPassedChange(passed);
      }
    };

    if (reducedMotion) {
      const section = sectionRef.current;
      if (section) {
        setIntroProgressVars(section, 1);
      }
      markPassed(true);
      return;
    }

    const section = sectionRef.current;
    const canvas = canvasRef.current;

    if (!section || !canvas) {
      markPassed(true);
      return;
    }

    const media = window.matchMedia('(max-width: 820px)');
    const ctx = canvas.getContext('2d', { alpha: false });
    const frameSet = introAsset.frameSet;
    let rafId = 0;
    let cancelled = false;
    let targetFrame = 0;
    let smoothedFrame = 0;
    let lastDrawnFrame = -1;
    let lastProgressVars = -1;
    let sectionTop = 0;
    let scrollableDistance = 1;
    let targetProgress = 0;
    let isMobile = media.matches;
    const images: Array<HTMLImageElement | undefined> = [];
    const loadingFrames = new Set<number>();
    const queuedFrames = new Map<number, { priority: FramePriority; order: number }>();
    const mobileAnchorFrames = new Set([0, scrollFrameCount - 1]);
    let queueOrder = 0;
    let activeLoads = 0;
    let pumpScheduled = false;
    let urgentPumpScheduled = false;

    if (!ctx) {
      markPassed(true);
      return;
    }

    const readScrollProgress = () => clamp((window.scrollY - sectionTop) / scrollableDistance);

    const updateTargetProgress = () => {
      targetProgress = readScrollProgress();
    };

    const updateIntroProgressVars = (progress: number) => {
      if (Math.abs(progress - lastProgressVars) > 0.001 || progress === 0 || progress === 1) {
        setIntroProgressVars(section, progress);
        lastProgressVars = progress;
      }
    };

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const sourceWidth = frameSet === 'mobile' ? 720 : 1280;
      const sourceHeight = frameSet === 'mobile' ? 1280 : 720;
      const nativeScaleCap = Math.min(sourceWidth / Math.max(1, rect.width), sourceHeight / Math.max(1, rect.height));
      const dprCap = Math.min(1, nativeScaleCap);
      const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
      const width = Math.max(1, Math.round(rect.width * dpr));
      const height = Math.max(1, Math.round(rect.height * dpr));

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        lastDrawnFrame = -1;
      }
    };

    const recalculateLayout = () => {
      const rect = section.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 1;
      sectionTop = rect.top + window.scrollY;
      scrollableDistance = Math.max(1, section.offsetHeight - viewportHeight);
      isMobile = media.matches;
      resizeCanvas();
      updateTargetProgress();
    };

    const getNearestLoadedFrame = (target: number) => {
      let nearest: HTMLImageElement | undefined;
      let nearestDistance = Number.POSITIVE_INFINITY;

      images.forEach((image, index) => {
        if (!image) {
          return;
        }

        const distance = Math.abs(index - target);
        if (distance < nearestDistance) {
          nearest = image;
          nearestDistance = distance;
        }
      });

      return nearest;
    };

    const normalizeFrameIndex = (index: number) => {
      const roundedIndex = Math.round(clamp(index, 0, scrollFrameCount - 1));

      if (!isMobile || roundedIndex === 0 || roundedIndex === scrollFrameCount - 1) {
        return roundedIndex;
      }

      return Math.min(scrollFrameCount - 2, Math.max(0, Math.round(roundedIndex / 2) * 2));
    };

    const pruneMobileFrameCache = (centerFrame: number) => {
      if (!isMobile) {
        return;
      }

      const keepRadius = 12;
      const center = Math.round(clamp(centerFrame, 0, scrollFrameCount - 1));

      images.forEach((image, index) => {
        if (!image || mobileAnchorFrames.has(index)) {
          return;
        }

        if (Math.abs(index - center) > keepRadius) {
          images[index] = undefined;
        }
      });

      queuedFrames.forEach((item, index) => {
        if (mobileAnchorFrames.has(index)) {
          return;
        }

        const queueRadius = item.priority === 'critical' ? keepRadius + 2 : item.priority === 'high' ? keepRadius + 4 : keepRadius + 6;

        if (Math.abs(index - center) > queueRadius) {
          queuedFrames.delete(index);
        }
      });
    };

    const storeDecodedFrame = (index: number, image: HTMLImageElement, onReady?: () => void) => {
      const finalize = () => {
        if (cancelled) {
          return;
        }

        images[index] = image;
        onReady?.();
      };

      if (image.decode) {
        void image.decode().catch(() => undefined).then(finalize);
        return;
      }

      finalize();
    };

    const finishLoad = (index: number, image?: HTMLImageElement, onReady?: () => void) => {
      const completeLoad = () => {
        loadingFrames.delete(index);
        activeLoads = Math.max(0, activeLoads - 1);
        schedulePump();
      };

      if (!image) {
        completeLoad();
        return;
      }

      storeDecodedFrame(index, image, () => {
        onReady?.();
        completeLoad();
      });
    };

    const startFrameLoad = (index: number, priority: FramePriority) => {
      loadingFrames.add(index);
      activeLoads += 1;

      const image = new Image();
      image.decoding = 'async';
      image.fetchPriority = priority === 'critical' ? 'high' : priority === 'high' ? 'high' : 'low';
      image.loading = 'eager';
      image.onload = () => {
        finishLoad(index, image, () => {
          if (index === 0) {
            resizeCanvas();
            drawFrame(0, false);
            setCanvasFrameSource(frameSet);
          }

          if (Math.abs(index - targetFrame) <= 3) {
            lastDrawnFrame = -1;
          }
        });
      };
      image.onerror = () => finishLoad(index);
      image.src = getScrollFrameSrc(frameSet, index);
    };

    function pump() {
      pumpScheduled = false;

      if (cancelled) {
        return;
      }

      const maxConcurrentLoads = isMobile ? 2 : 8;

      while (activeLoads < maxConcurrentLoads && queuedFrames.size > 0) {
        const next = [...queuedFrames.entries()].sort((a, b) => {
          const [frameA, itemA] = a;
          const [frameB, itemB] = b;
          const priorityDelta = framePriorityRank[itemA.priority] - framePriorityRank[itemB.priority];

          if (priorityDelta !== 0) {
            return priorityDelta;
          }

          const distanceDelta = Math.abs(frameA - targetFrame) - Math.abs(frameB - targetFrame);

          if (distanceDelta !== 0) {
            return distanceDelta;
          }

          return itemA.order - itemB.order;
        })[0];

        if (!next) {
          return;
        }

        const [frameIndex, item] = next;
        queuedFrames.delete(frameIndex);

        if (images[frameIndex] || loadingFrames.has(frameIndex)) {
          continue;
        }

        startFrameLoad(frameIndex, item.priority);
      }
    }

    function schedulePump(urgent = false) {
      if (cancelled) {
        return;
      }

      if (urgent) {
        if (urgentPumpScheduled) {
          return;
        }

        urgentPumpScheduled = true;
        globalThis.setTimeout(() => {
          urgentPumpScheduled = false;
          pump();
        }, 0);
        return;
      }

      if (pumpScheduled) {
        return;
      }

      pumpScheduled = true;
      const run = () => pump();

      if (!isMobile) {
        globalThis.setTimeout(run, 0);
        return;
      }

      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(run, { timeout: 220 });
        return;
      }

      globalThis.setTimeout(run, 48);
    }

    const requestFrame = (index: number, priority: FramePriority = 'high') => {
      const normalizedIndex = normalizeFrameIndex(index);

      if (images[normalizedIndex] || loadingFrames.has(normalizedIndex)) {
        return;
      }

      const existing = queuedFrames.get(normalizedIndex);
      if (existing) {
        if (framePriorityRank[priority] < framePriorityRank[existing.priority]) {
          queuedFrames.set(normalizedIndex, { priority, order: existing.order });
        }
      } else {
        queuedFrames.set(normalizedIndex, { priority, order: queueOrder });
        queueOrder += 1;
      }

      schedulePump(priority === 'critical' || priority === 'high');
    };

    const preloadCriticalMobileFrames = () => {
      if (!media.matches) {
        return;
      }

      requestFrame(0, 'critical');
      [2, 4, 6, 8, 10, 12, 14].forEach((frameIndex, index) => {
        requestFrame(frameIndex, index < 3 ? 'high' : 'low');
      });
    };

    const drawFrame = (frame: number, blendFrames: boolean) => {
      if (!blendFrames) {
        const selected = normalizeFrameIndex(frame);
        const selectedImage = images[selected];

        requestFrame(selected, 'critical');
        requestFrame(selected + 1, 'high');
        requestFrame(selected - 1, 'high');
        requestFrame(selected + 2, 'low');
        requestFrame(selected - 2, 'low');
        requestFrame(selected + 3, 'idle');
        pruneMobileFrameCache(selected);

        if (selectedImage) {
          ctx.globalAlpha = 1;
          drawCoverImage(ctx, selectedImage);
          return true;
        }

        const fallback = getNearestLoadedFrame(selected);

        if (fallback && lastDrawnFrame < 0) {
          ctx.globalAlpha = 1;
          drawCoverImage(ctx, fallback);
        }

        return false;
      }

      const lower = Math.floor(clamp(frame, 0, scrollFrameCount - 1));
      const upper = Math.min(scrollFrameCount - 1, lower + 1);
      const blend = clamp(frame - lower);
      const lowerImage = images[lower];
      const upperImage = images[upper];

      requestFrame(lower, 'critical');
      requestFrame(upper, 'high');

      if (lowerImage && upperImage) {
        ctx.globalAlpha = 1;
        drawCoverImage(ctx, lowerImage);
        ctx.globalAlpha = blend;
        drawCoverImage(ctx, upperImage);
        ctx.globalAlpha = 1;
        return true;
      }

      const fallback = lowerImage || upperImage || images.find(Boolean);

      if (fallback) {
        ctx.globalAlpha = 1;
        drawCoverImage(ctx, fallback);
        return true;
      }

      return false;
    };

    const preloadFrames = () => {
      requestFrame(0, 'critical');

      if (media.matches) {
        preloadCriticalMobileFrames();
        return;
      }

      for (let index = 1; index < scrollFrameCount; index += 1) {
        requestFrame(index, 'low');
      }
    };

    const tick = () => {
      const progress = targetProgress;
      const frameProgress = isMobile ? clamp(progress / 0.825) : clamp(progress / 0.88);
      const passed = progress >= 0.98;
      const baseLerp = isMobile ? 0.18 : 0.07;

      targetFrame = frameProgress * (scrollFrameCount - 1);
      const edgeBoost = targetFrame < 8 || targetFrame > scrollFrameCount - 4 ? 0.24 : baseLerp;
      smoothedFrame += (targetFrame - smoothedFrame) * edgeBoost;
      if (isMobile) {
        requestFrame(targetFrame, 'critical');
        requestFrame(targetFrame + 2, 'high');
        requestFrame(targetFrame - 2, 'high');
      }
      updateIntroProgressVars(progress);
      markPassed(passed);

      const mobileFrameGap = Math.abs(targetFrame - smoothedFrame);
      const renderFrame = isMobile && (targetFrame < 14 || mobileFrameGap > 10) ? targetFrame : smoothedFrame;
      const drawKey = Math.round(renderFrame);
      const shouldDraw = Math.abs(lastDrawnFrame - drawKey) >= 1;

      if (shouldDraw && drawFrame(renderFrame, false)) {
        lastDrawnFrame = drawKey;
      }

      rafId = window.requestAnimationFrame(tick);
    };

    recalculateLayout();
    updateIntroProgressVars(targetProgress);
    preloadFrames();
    window.addEventListener('scroll', updateTargetProgress, { passive: true });
    window.addEventListener('resize', recalculateLayout);
    window.addEventListener('orientationchange', recalculateLayout);
    rafId = window.requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', updateTargetProgress);
      window.removeEventListener('resize', recalculateLayout);
      window.removeEventListener('orientationchange', recalculateLayout);
    };
  }, [introAsset.frameSet, onIntroPassedChange, reducedMotion]);

  const handleSkip = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();

    const section = sectionRef.current;
    if (section) {
      setIntroProgressVars(section, 1);
    }

    passedRef.current = true;
    onIntroPassedChange(true);
    document.querySelector('#home')?.scrollIntoView({ block: 'start' });
  };

  return (
    <section ref={sectionRef} className="cinematic-intro" aria-label="פתיח קולנועי מאפיית יחד">
      <div className={`cinematic-intro__sticky ${canvasHasFrame ? 'has-video-frame' : ''}`}>
        <div className="cinematic-intro__media" aria-hidden="true">
          <canvas ref={canvasRef} className="cinematic-intro__canvas" />
          <picture className="cinematic-intro__poster" aria-hidden="true">
            <source srcSet={introMobilePoster} media="(max-width: 820px)" />
            <img src={introDesktopPoster} alt="" />
          </picture>
        </div>
        <div className="cinematic-intro__shade" aria-hidden="true" />
        <div className="cinematic-intro__texture" aria-hidden="true" />
        <div className="cinematic-intro__warmth" aria-hidden="true" />

        <a className="cinematic-intro__skip" href="#home" onClick={handleSkip}>
          כניסה לאתר
        </a>

        <img className="cinematic-intro__mark" src={logoImage} alt="" aria-hidden="true" />

        <div className="cinematic-intro__bridge" aria-hidden="true" />
      </div>
    </section>
  );
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [introPassed, setIntroPassed] = useState(false);
  const reducedMotion = useReducedMotion();
  const prefersReducedMotion = Boolean(reducedMotion);
  const activeSection = useActiveSection(navHrefs);
  const initial = prefersReducedMotion ? false : 'hidden';
  const transition = { duration: prefersReducedMotion ? 0 : 0.78, ease: 'easeOut' as const };
  const slowTransition = { duration: prefersReducedMotion ? 0 : 1.12, ease: 'easeOut' as const };
  const quickTransition = { duration: prefersReducedMotion ? 0 : 0.42, ease: 'easeOut' as const };
  const stickyCtaVisible = prefersReducedMotion || introPassed;

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleEscape);

    return () => window.removeEventListener('keydown', handleEscape);
  }, [menuOpen]);

  return (
    <main className="site-shell" dir="rtl">
      <div className="flour-grain" aria-hidden="true" />
      <CinematicIntro reducedMotion={prefersReducedMotion} onIntroPassedChange={setIntroPassed} />
      <div className="page-frame">
        <motion.header
          className="topbar"
          aria-label="ניווט ראשי"
          initial={initial}
          animate="show"
          variants={headerReveal}
          transition={quickTransition}
        >
          <a className="topbar-brand" href="#home" aria-label="מאפיית יחד">
            <span>מאפיית יחד</span>
          </a>

          <nav className="desktop-nav">
            {navItems.map((item) => (
              <a key={item.href} className={activeSection === item.href ? 'is-active' : undefined} href={item.href}>
                {item.label}
              </a>
            ))}
          </nav>

          <div className="topbar-actions">
            <a href={mapsHref} aria-label="נווטו למאפייה">
              <MapPin size={20} weight="regular" />
            </a>
            <a href={instagramHref} aria-label="אינסטגרם מאפיית יחד" target="_blank" rel="noreferrer">
              <InstagramLogo size={20} weight="regular" />
            </a>
            <button
              className="menu-toggle"
              type="button"
              aria-label={menuOpen ? 'סגור תפריט' : 'פתח תפריט'}
              aria-expanded={menuOpen}
              aria-controls="main-mobile-menu"
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X size={22} /> : <List size={22} />}
              <span className="menu-toggle__label">{menuOpen ? 'סגור' : 'תפריט'}</span>
            </button>
          </div>
        </motion.header>

        <AnimatePresence>
          {menuOpen && (
            <>
              <motion.button
                className="mobile-menu-backdrop"
                type="button"
                aria-label="סגור תפריט"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                onClick={() => setMenuOpen(false)}
              />
              <motion.nav
                id="main-mobile-menu"
                className="mobile-menu"
                aria-label="תפריט ניווט"
                initial="hidden"
                animate="show"
                exit="exit"
                variants={mobileMenuVariants}
              >
                <div className="mobile-menu__head">
                  <span>תפריט</span>
                  <button type="button" aria-label="סגור תפריט" onClick={() => setMenuOpen(false)}>
                    <X size={20} weight="bold" />
                  </button>
                </div>
                {navItems.map((item) => (
                  <motion.a
                    key={item.href}
                    href={item.href}
                    variants={mobileMenuItemVariants}
                    onClick={() => setMenuOpen(false)}
                    className={activeSection === item.href ? 'is-active' : undefined}
                  >
                    {item.label}
                  </motion.a>
                ))}
              </motion.nav>
            </>
          )}
        </AnimatePresence>

        <section id="home" className="hero-panel">
          <div className="hero-media" aria-hidden="true">
            <img src={heroImage} alt="" />
          </div>
          <motion.div
            className="hero-scrim"
            aria-hidden="true"
            initial={reducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: reducedMotion ? 0 : 1.15, ease: 'easeOut' }}
          />

          <motion.div className="hero-content" initial={initial} animate="show" variants={heroStagger}>
            <motion.img
              className="hero-logo"
              src={logoImage}
              alt="מאפיית יחד - האחים אופים באהבה"
              variants={heroLogoReveal}
              transition={slowTransition}
            />
            <motion.p className="brand-kicker" variants={heroTextReveal} transition={transition}>
              האחים אופים באהבה
            </motion.p>
            <motion.h1 variants={heroTextReveal} transition={transition}>
              המאפייה של כפר סבא
            </motion.h1>
            <motion.h2 variants={heroTextReveal} transition={slowTransition}>
              מאפים טריים, לחמים, עוגות וקפה טוב. כל בוקר מהתנור.
            </motion.h2>
            <motion.div className="hero-actions" variants={buttonStagger}>
              <motion.a
                className="btn btn-primary"
                href={phoneHref}
                variants={buttonReveal}
                transition={quickTransition}
                whileHover={reducedMotion ? undefined : { y: -3, scale: 1.018 }}
                whileTap={{ scale: 0.985 }}
              >
                <PhoneCall size={20} weight="bold" />
                התקשרו להזמנה
              </motion.a>
              <motion.a
                className="btn btn-soft"
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
                variants={buttonReveal}
                transition={quickTransition}
                whileHover={reducedMotion ? undefined : { y: -3, scale: 1.018 }}
                whileTap={{ scale: 0.985 }}
              >
                <WhatsappLogo className="whatsapp-icon" size={20} weight="bold" />
                הזמנה בוואטסאפ
              </motion.a>
              <motion.a
                className="btn btn-ghost"
                href={mapsHref}
                target="_blank"
                rel="noreferrer"
                variants={buttonReveal}
                transition={quickTransition}
                whileHover={reducedMotion ? undefined : { y: -3, scale: 1.018 }}
                whileTap={{ scale: 0.985 }}
              >
                <NavigationArrow size={20} weight="bold" />
                נווטו למאפייה
              </motion.a>
            </motion.div>
          </motion.div>

          <motion.a
            className="hero-down"
            href="#categories"
            aria-label="מעבר למה תמצאו אצלנו"
            initial={reducedMotion ? false : { opacity: 0, y: -4 }}
            animate={reducedMotion ? { opacity: 1, y: 0 } : { opacity: 1, y: [0, 6, 0] }}
            transition={
              reducedMotion
                ? { duration: 0 }
                : { opacity: { duration: 0.45, delay: 1.05 }, y: { duration: 2.6, repeat: Infinity, ease: 'easeInOut' } }
            }
          >
            <CaretDown size={28} />
          </motion.a>
        </section>

        <section id="categories" className="section categories-section">
          <motion.div
            className="section-heading"
            initial={initial}
            whileInView="show"
            viewport={{ once: true, amount: 0.35 }}
            variants={reveal}
            transition={transition}
          >
            <span className="section-mark">מאפייה וקונדיטוריה בכפר סבא</span>
            <h2>מה תמצאו אצלנו</h2>
            <p>
              מאפייה וקונדיטוריה עם אפייה במקום, מוצרים טריים ומבחר שמתאים לבוקר, לצהריים,
              לקפה או לאירוח.
            </p>
          </motion.div>

          <motion.div
            className="category-grid"
            initial={initial}
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            variants={stagger}
          >
            {categories.map(({ title, text, image }) => (
              <motion.article
                className="category-card"
                key={title}
                variants={cardReveal}
                transition={transition}
                whileHover={reducedMotion ? undefined : { y: -7 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="category-image">
                  <img src={image} alt={title} loading="lazy" />
                </div>
                <div className="category-body">
                  <div>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </div>
                </div>
              </motion.article>
            ))}
          </motion.div>
        </section>

        <section id="fresh" className="section fresh-section">
          <motion.div
            className="fresh-title"
            initial={initial}
            whileInView="show"
            viewport={{ once: true, amount: 0.35 }}
            variants={reveal}
            transition={transition}
          >
            <span className="section-mark">קרואסונים, מאפים ולחמים</span>
            <h2>קצת מהתנור שלנו</h2>
          </motion.div>

          <motion.div
            className="fresh-strip"
            initial={initial}
            whileInView="show"
            viewport={{ once: true, amount: 0.22 }}
            variants={stagger}
          >
            {freshImages.map((item) => (
              <motion.figure key={item.src} className="fresh-card" variants={imageReveal} transition={slowTransition}>
                <img src={item.src} alt={item.label} loading="lazy" />
                <figcaption>{item.label}</figcaption>
              </motion.figure>
            ))}
          </motion.div>
        </section>

        <motion.section
          className="benefits-row"
          initial={initial}
          whileInView="show"
          viewport={{ once: true, amount: 0.45 }}
          variants={stagger}
        >
          {benefits.map(({ label, Icon }) => (
            <motion.div className="benefit-item" key={label} variants={reveal} transition={transition}>
              <Icon size={31} weight="duotone" />
              <span>{label}</span>
            </motion.div>
          ))}
        </motion.section>

        <section className="section about-section">
          <motion.div
            className="about-copy"
            initial={initial}
            whileInView="show"
            viewport={{ once: true, amount: 0.35 }}
            variants={reveal}
            transition={transition}
          >
            <span className="section-mark">לא מתפשרים על טעם, איכות וטריות</span>
            <h2>מאפייה מקומית עם טעם של בית</h2>
            <p>
              מאפיית יחד היא מאפייה וקונדיטוריה מקומית ברחוב היוצרים 3 בכפר סבא. במקום תמצאו
              אפייה במקום, מאפים, לחמים, עוגות, עוגיות, קפה ומבחר אפשרויות לאירוח. הקו פשוט:
              טעם, איכות וטריות — עם אווירה חמה ושירות בגובה העיניים.
            </p>
          </motion.div>
          <motion.div
            className="about-visual"
            initial={initial}
            whileInView="show"
            viewport={{ once: true, amount: 0.35 }}
            variants={imageReveal}
            transition={slowTransition}
          >
            <img src={aboutImage} alt="עוגות וקינוחים במאפיית יחד" loading="lazy" />
          </motion.div>
        </section>

        <section id="visit" className="visit-section">
          <motion.div
            className="visit-card"
            initial={initial}
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            variants={stagger}
          >
            <motion.span className="visit-icon" variants={buttonReveal} transition={transition}>
              <Grains size={30} weight="duotone" />
            </motion.span>
            <motion.h2 variants={buttonReveal} transition={transition}>
              בואו לבקר במאפייה
            </motion.h2>
            <motion.p variants={buttonReveal} transition={transition}>
              מחכים לכם במאפיית יחד, היוצרים 3, כפר סבא.
            </motion.p>

            <motion.div className="contact-list" variants={stagger}>
              <motion.a href={mapsHref} target="_blank" rel="noreferrer" variants={contactItemReveal} transition={transition}>
                <MapPin size={24} weight="regular" />
                <span>היוצרים 3, כפר סבא</span>
              </motion.a>
              <motion.a href={phoneHref} variants={contactItemReveal} transition={transition}>
                <PhoneCall size={24} weight="regular" />
                <span>050-2696267</span>
              </motion.a>
              <motion.a
                href={instagramHref}
                target="_blank"
                rel="noreferrer"
                variants={contactItemReveal}
                transition={transition}
              >
                <InstagramLogo size={24} weight="regular" />
                <span>Instagram: @yachad_bakery</span>
              </motion.a>
              <motion.div variants={contactItemReveal} transition={transition}>
                <Clock size={24} weight="regular" />
                <span>
                  שעות פתיחה
                  {hours.map((row) => (
                    <strong key={row}>{row}</strong>
                  ))}
                </span>
              </motion.div>
            </motion.div>

            <motion.div className="visit-actions" variants={buttonStagger}>
              <motion.a
                className="btn btn-primary"
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
                variants={buttonReveal}
                transition={quickTransition}
                whileHover={reducedMotion ? undefined : { y: -3, scale: 1.018 }}
                whileTap={{ scale: 0.985 }}
              >
                <WhatsappLogo className="whatsapp-icon on-gold" size={20} weight="bold" />
                שלחו וואטסאפ
              </motion.a>
              <motion.a
                className="btn btn-soft"
                href={mapsHref}
                target="_blank"
                rel="noreferrer"
                variants={buttonReveal}
                transition={quickTransition}
                whileHover={reducedMotion ? undefined : { y: -3, scale: 1.018 }}
                whileTap={{ scale: 0.985 }}
              >
                <NavigationArrow size={20} weight="bold" />
                נווטו למאפייה
              </motion.a>
            </motion.div>
          </motion.div>

        </section>
      </div>

      <motion.nav
        className={`mobile-sticky-cta ${stickyCtaVisible ? 'is-visible' : 'is-hidden'}`}
        initial={prefersReducedMotion ? false : { opacity: 0, y: 74 }}
        animate={{ opacity: stickyCtaVisible ? 1 : 0, y: stickyCtaVisible ? 0 : 74 }}
        style={{ pointerEvents: stickyCtaVisible ? 'auto' : 'none' }}
        transition={{ duration: prefersReducedMotion ? 0 : 0.58, ease: 'easeOut', delay: prefersReducedMotion ? 0 : 0.1 }}
      >
        <motion.a whileTap={{ scale: 0.96 }} href={phoneHref}>
          <PhoneCall size={22} weight="bold" />
          התקשרו
        </motion.a>
        <motion.a whileTap={{ scale: 0.96 }} href={whatsappHref} target="_blank" rel="noreferrer">
          <WhatsappLogo className="whatsapp-icon on-gold" size={22} weight="bold" />
          וואטסאפ
        </motion.a>
        <motion.a whileTap={{ scale: 0.96 }} href={mapsHref} target="_blank" rel="noreferrer">
          <MapPin size={22} weight="bold" />
          ניווט
        </motion.a>
      </motion.nav>
    </main>
  );
}

export default App;
