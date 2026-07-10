import { useEffect, useState, type CSSProperties } from 'react';

const bakeryTimeZone = 'Asia/Jerusalem';

const weekdayFormatter = new Intl.DateTimeFormat('he-IL', {
  weekday: 'long',
  timeZone: bakeryTimeZone,
});

const dateFormatter = new Intl.DateTimeFormat('he-IL', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: bakeryTimeZone,
});

const hoursMinutesFormatter = new Intl.DateTimeFormat('he-IL', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: bakeryTimeZone,
});

const secondsFormatter = new Intl.DateTimeFormat('he-IL', {
  second: '2-digit',
  timeZone: bakeryTimeZone,
});

function getJerusalemSeconds(date: Date) {
  const secondsPart = secondsFormatter.formatToParts(date).find((part) => part.type === 'second');
  return Number(secondsPart?.value ?? 0);
}

export function BakeryLiveClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let intervalId: number | undefined;
    const delayUntilNextSecond = 1000 - (Date.now() % 1000);

    const alignmentTimeoutId = window.setTimeout(() => {
      setNow(new Date());
      intervalId = window.setInterval(() => setNow(new Date()), 1000);
    }, delayUntilNextSecond);

    return () => {
      window.clearTimeout(alignmentTimeoutId);
      if (intervalId !== undefined) window.clearInterval(intervalId);
    };
  }, []);

  const seconds = getJerusalemSeconds(now);
  const hoursMinutesText = hoursMinutesFormatter.format(now);
  const secondsText = String(seconds).padStart(2, '0');
  const fullTimeText = `${hoursMinutesText}:${secondsText}`;
  const dateText = `${weekdayFormatter.format(now)} · ${dateFormatter.format(now)}`;
  const progressStyle = { '--seconds-progress': `${(seconds / 60) * 100}%` } as CSSProperties;

  return (
    <section className="bakery-clock" aria-label="שעון המאפייה">
      <time className="bakery-clock__readout" dateTime={now.toISOString()} aria-label={`${dateText}, השעה ${fullTimeText}`} dir="ltr">
        <span className="bakery-clock__main-time">{hoursMinutesText}</span>
        <span className="bakery-clock__seconds">{secondsText}</span>
      </time>
      <span className="bakery-clock__date">{dateText}</span>
      <span className="bakery-clock__progress" style={progressStyle} aria-hidden="true">
        <span className="bakery-clock__progress-fill" />
      </span>
    </section>
  );
}
