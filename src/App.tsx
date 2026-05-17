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
import galleryOne from './assets/bakery-2/gallery-1.webp';
import galleryTwo from './assets/bakery-2/gallery-2.webp';
import galleryThree from './assets/bakery-2/gallery-3.webp';
import galleryFour from './assets/bakery-2/gallery-4.webp';
import galleryFive from './assets/bakery-2/gallery-5.webp';
import gallerySix from './assets/bakery-2/gallery-6.webp';

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
};

const mobileIntroAsset = {
  video: introMobileVideo,
  poster: introMobilePoster,
};

const scrollHeroPills = ['מאפים', 'לחמים', 'עוגות', 'קפה', 'אירוח'];

const navItems = [
  { label: 'דף הבית', href: '#home' },
  { label: 'מה תמצאו אצלנו', href: '#categories' },
  { label: 'קצת מהתנור', href: '#fresh' },
  { label: 'רגעים', href: '#gallery' },
  { label: 'ביקור', href: '#visit' },
];

const navHrefs = navItems.map((item) => item.href);

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
  { src: freshOne, label: 'אפייה במקום' },
  { src: freshTwo, label: 'טעם, איכות וטריות' },
  { src: freshThree, label: 'מאפייה וקונדיטוריה' },
  { src: freshFour, label: 'מוזמנים לטעום את ההבדל' },
];

const galleryImages = [
  { src: galleryOne, className: 'gallery-tall' },
  { src: galleryTwo, className: 'gallery-wide' },
  { src: galleryThree, className: 'gallery-tall' },
  { src: galleryFour, className: 'gallery-wide' },
  { src: galleryFive, className: 'gallery-tall' },
  { src: gallerySix, className: 'gallery-wide' },
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

function fadeWindow(progress: number, start: number, peakStart: number, peakEnd: number, end: number) {
  if (progress <= start || progress >= end) {
    return 0;
  }

  if (progress >= peakStart && progress <= peakEnd) {
    return 1;
  }

  if (progress < peakStart) {
    return easeOutCubic((progress - start) / (peakStart - start));
  }

  return 1 - easeOutCubic((progress - peakEnd) / (end - peakEnd));
}

function setIntroProgressVars(section: HTMLElement, progress: number) {
  const pills = fadeWindow(progress, 0.62, 0.69, 0.82, 0.92);
  const bridge = easeOutCubic((progress - 0.86) / 0.14);
  const reveal = easeOutCubic((progress - 0.92) / 0.08);
  const mediaScale = 1 + easeOutCubic((progress - 0.82) / 0.18) * 0.032;

  section.style.setProperty('--intro-progress', progress.toFixed(4));
  section.style.setProperty('--intro-brand', '0');
  section.style.setProperty('--intro-brand-y', '18px');
  section.style.setProperty('--intro-line', '0');
  section.style.setProperty('--intro-line-y', '20px');
  section.style.setProperty('--intro-pills', pills.toFixed(4));
  section.style.setProperty('--intro-pills-y', `${((1 - pills) * 22).toFixed(2)}px`);
  section.style.setProperty('--intro-bridge', bridge.toFixed(4));
  section.style.setProperty('--intro-reveal', reveal.toFixed(4));
  section.style.setProperty('--intro-bridge-y', `${((1 - bridge) * 40).toFixed(2)}svh`);
  section.style.setProperty('--intro-bridge-clip', `${(18 * (1 - reveal)).toFixed(2)}%`);
  section.style.setProperty('--intro-media-scale', mediaScale.toFixed(4));
}

function CinematicIntro({ reducedMotion, onIntroPassedChange }: CinematicIntroProps) {
  const introAsset = useIntroAsset();
  const sectionRef = useRef<HTMLElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const passedRef = useRef(false);
  const [videoFrameSource, setVideoFrameSource] = useState<string | null>(null);
  const videoHasFrame = videoFrameSource === introAsset.video;

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
    const video = videoRef.current;

    if (!section || !video) {
      markPassed(true);
      return;
    }

    const media = window.matchMedia('(max-width: 820px)');
    let rafId = 0;
    let metadataReady = false;
    let duration = 0;
    let targetTime = 0;
    let smoothedTime = 0;
    let lastWrittenTime = -1;

    const syncMetadata = () => {
      metadataReady = Number.isFinite(video.duration) && video.duration > 0;
      duration = metadataReady ? video.duration : 0;
      targetTime = 0;
      smoothedTime = 0;
      lastWrittenTime = -1;
      video.pause();
      video.autoplay = false;
      video.loop = false;
      video.muted = true;
      video.playsInline = true;

      if (metadataReady) {
        try {
          video.currentTime = 0;
        } catch {
          // Some mobile browsers reject early seeks until the first frame is available.
        }
      }
    };

    const getProgress = () => {
      const rect = section.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 1;
      const scrollableDistance = Math.max(1, section.offsetHeight - viewportHeight);

      return clamp(-rect.top / scrollableDistance);
    };

    const tick = () => {
      const progress = getProgress();
      const isMobile = media.matches;
      const videoProgress = isMobile ? clamp((progress - 0.025) / 0.835) : clamp(progress / 0.88);
      const finalTime = Math.max(0, duration - 0.04);
      const passed = section.getBoundingClientRect().bottom <= window.innerHeight * 0.78;

      targetTime = metadataReady ? videoProgress * finalTime : 0;
      smoothedTime += (targetTime - smoothedTime) * (isMobile ? 0.105 : 0.078);
      setIntroProgressVars(section, progress);
      markPassed(passed);

      if (metadataReady && Math.abs(lastWrittenTime - smoothedTime) > (isMobile ? 0.012 : 0.018)) {
        const nextTime = clamp(smoothedTime, 0, finalTime);

        try {
          video.currentTime = nextTime;
          lastWrittenTime = nextTime;
        } catch {
          // Keep the RAF alive; the next metadata/seekable moment will recover.
        }
      }

      rafId = window.requestAnimationFrame(tick);
    };

    video.pause();
    video.removeAttribute('autoplay');
    video.loop = false;
    setIntroProgressVars(section, getProgress());

    if (video.readyState >= 1) {
      syncMetadata();
    } else {
      video.addEventListener('loadedmetadata', syncMetadata, { once: true });
      video.load();
    }

    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(rafId);
      video.removeEventListener('loadedmetadata', syncMetadata);
      video.pause();
    };
  }, [introAsset.video, onIntroPassedChange, reducedMotion]);

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
      <div className={`cinematic-intro__sticky ${videoHasFrame ? 'has-video-frame' : ''}`}>
        <div className="cinematic-intro__media" aria-hidden="true">
          <video
            key={introAsset.video}
            ref={videoRef}
            className="cinematic-intro__video"
            muted
            playsInline
            preload="auto"
            poster={introAsset.poster}
            src={introAsset.video}
            aria-hidden="true"
            onLoadedData={() => setVideoFrameSource(introAsset.video)}
          />
          <picture className="cinematic-intro__poster" aria-hidden="true">
            <source srcSet={introMobilePoster} media="(max-width: 820px)" />
            <img src={introDesktopPoster} alt="" />
          </picture>
        </div>
        <div className="cinematic-intro__shade" aria-hidden="true" />
        <div className="cinematic-intro__texture" aria-hidden="true" />
        <div className="cinematic-intro__warmth" aria-hidden="true" />

        <a className="cinematic-intro__skip" href="#home" onClick={handleSkip}>
          דלגו לאתר
        </a>

        <div className="cinematic-intro__pills" aria-hidden="true">
          {scrollHeroPills.map((pill) => (
            <span key={pill}>{pill}</span>
          ))}
        </div>

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
            <img src={logoImage} alt="" />
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
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X size={22} /> : <List size={22} />}
            </button>
          </div>
        </motion.header>

        <AnimatePresence>
          {menuOpen && (
            <motion.nav
              className="mobile-menu"
              initial="hidden"
              animate="show"
              exit="exit"
              variants={mobileMenuVariants}
            >
              {navItems.map((item) => (
                <motion.a
                  key={item.href}
                  href={item.href}
                  variants={mobileMenuItemVariants}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </motion.a>
              ))}
            </motion.nav>
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
              מאפיית יחד
            </motion.h1>
            <motion.h2 variants={heroTextReveal} transition={slowTransition}>
              מאפים, לחמים, עוגות וקפה — נאפים במקום בכפר סבא
            </motion.h2>
            <motion.p className="hero-copy" variants={heroTextReveal} transition={slowTransition}>
              מאפייה וקונדיטוריה בהיוצרים 3, כפר סבא, עם מאפים טריים, לחמים, עוגות, עוגיות,
              טוסטים, סלטים וקפה — באווירה מקומית, חמה ואיכותית.
            </motion.p>
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
                התקשרו עכשיו
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
                שלחו וואטסאפ
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
            <span className="section-mark">אפייה במקום</span>
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

        <section id="gallery" className="section gallery-section">
          <motion.div
            className="section-heading gallery-heading"
            initial={initial}
            whileInView="show"
            viewport={{ once: true, amount: 0.35 }}
            variants={reveal}
            transition={transition}
          >
            <span className="section-mark">מוזמנים לטעום את ההבדל</span>
            <h2>רגעים מהמאפייה</h2>
            <p>המאפים, הלחמים, הקפה והמתוקים שמרכיבים את החוויה של מאפיית יחד.</p>
          </motion.div>

          <motion.div
            className="gallery-masonry"
            initial={initial}
            whileInView="show"
            viewport={{ once: true, amount: 0.16 }}
            variants={stagger}
          >
            {galleryImages.map((item, index) => (
              <motion.figure
                key={item.src}
                className={`gallery-card ${item.className}`}
                variants={imageReveal}
                transition={{ ...slowTransition, delay: index * 0.02 }}
              >
                <img src={item.src} alt="רגע מהמאפייה" loading="lazy" />
              </motion.figure>
            ))}
          </motion.div>
        </section>

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
            <img src={freshTwo} alt="לחמים ומאפים במאפיית יחד" loading="lazy" />
          </motion.div>
        </section>

        <section id="visit" className="visit-section">
          <motion.div
            className="visit-visual"
            initial={initial}
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            variants={imageReveal}
            transition={slowTransition}
          >
            <img src={freshOne} alt="מאפים טריים במאפייה" loading="lazy" />
          </motion.div>

          <motion.div
            className="visit-card"
            initial={initial}
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            variants={stagger}
          >
            <motion.span className="visit-icon" variants={reveal} transition={transition}>
              <Grains size={30} weight="duotone" />
            </motion.span>
            <motion.h2 variants={reveal} transition={transition}>
              בואו לבקר במאפייה
            </motion.h2>
            <motion.p variants={reveal} transition={transition}>
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
