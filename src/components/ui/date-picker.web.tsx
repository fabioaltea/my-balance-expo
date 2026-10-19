import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Modal } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Fonts, webPanelBackground } from '@/src/constants/theme';
import { useThemeColor } from '@/src/hooks/use-theme-color';
import {
  calendarDays,
  moveCalendarDay,
  moveCalendarMonth,
  sameCalendarDay,
} from '@/src/utils/datePickerCalendar';

interface DatePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  label?: string;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MARGIN = 8;
const PANEL_WIDTH = 320;
const PANEL_HEIGHT = 366;
const calendarCss = `
  .mybalance-date-button { border: 0; background: transparent; color: inherit; font: inherit; cursor: pointer; border-radius: 9px; outline: none; transition: background-color 140ms ease; }
  .mybalance-date-button:hover { background: var(--date-hover); }
  .mybalance-date-button:focus-visible { outline: 2px solid var(--date-accent); outline-offset: -2px; }
  .mybalance-date-day[aria-pressed="true"] { background: var(--date-accent); color: var(--date-on-accent); font-weight: 600; }
  .mybalance-date-panel { animation: mybalance-date-enter 160ms ease-out; }
  @keyframes mybalance-date-enter { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
  @media (prefers-reduced-motion: reduce) {
    .mybalance-date-panel { animation: none; }
    .mybalance-date-button { transition: none; }
  }
`;

export default function DatePicker({ value, onChange, label = 'Date' }: DatePickerProps) {
  const [position, setPosition] = useState<React.CSSProperties | null>(null);
  const [focusedDay, setFocusedDay] = useState(value);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const focusPending = useRef(false);
  const id = useId();
  const isOpen = position !== null;
  const text = useThemeColor({ light: '#34443C', dark: '#E7ECE9' }, 'text');
  const muted = useThemeColor({ light: '#66736C', dark: '#AEB8B2' }, 'icon');
  const background = useThemeColor(webPanelBackground, 'cardBackground');
  const border = useThemeColor(
    { light: 'rgba(23, 38, 31, 0.10)', dark: 'rgba(255, 255, 255, 0.10)' },
    'cardBorder',
  );
  const hover = useThemeColor({ light: '#EEF2EF', dark: '#2A302D' }, 'menuBackground');
  const accent = useThemeColor({ light: '#244437', dark: '#D6E8DE' }, 'tint');
  const onAccent = useThemeColor({ light: '#FFFFFF', dark: '#244437' }, 'background');
  const variables = {
    '--date-hover': hover,
    '--date-accent': accent,
    '--date-on-accent': onAccent,
  } as React.CSSProperties;
  const days = calendarDays(focusedDay);
  const today = new Date();
  const monthLabel = focusedDay.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const valueLabel = value.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const close = useCallback(() => {
    setPosition(null);
    triggerRef.current?.focus({ preventScroll: true });
  }, []);

  const focusDay = useCallback(() => {
    panelRef.current
      ?.querySelector<HTMLButtonElement>('[data-calendar-focus="true"]')
      ?.focus({ preventScroll: true });
  }, []);

  useLayoutEffect(() => {
    if (isOpen && focusPending.current) {
      focusPending.current = false;
      focusDay();
    }
  }, [focusedDay, isOpen, focusDay]);

  useEffect(() => {
    if (!isOpen) return;
    const onScroll = (event: Event) => {
      if (event.target instanceof Node && panelRef.current?.contains(event.target)) return;
      close();
    };
    window.addEventListener('resize', close);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [isOpen, close]);

  const open = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(PANEL_WIDTH, window.innerWidth - MARGIN * 2);
    const below = window.innerHeight - rect.bottom - MARGIN * 2;
    const above = rect.top - MARGIN * 2;
    const opensAbove = below < PANEL_HEIGHT && above > below;
    const maxHeight = Math.max(0, opensAbove ? above : below);
    setFocusedDay(value);
    setPosition({
      width,
      maxHeight,
      left: Math.max(MARGIN, Math.min(rect.right - width, window.innerWidth - width - MARGIN)),
      top: opensAbove
        ? Math.max(MARGIN, rect.top - Math.min(PANEL_HEIGHT, maxHeight) - MARGIN)
        : rect.bottom + MARGIN,
    });
  };

  const select = (date: Date) => {
    onChange(date);
    close();
  };

  const handleDayKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, day: Date) => {
    let next: Date;
    switch (event.key) {
      case 'ArrowLeft':
        next = moveCalendarDay(day, -1);
        break;
      case 'ArrowRight':
        next = moveCalendarDay(day, 1);
        break;
      case 'ArrowUp':
        next = moveCalendarDay(day, -7);
        break;
      case 'ArrowDown':
        next = moveCalendarDay(day, 7);
        break;
      case 'Home':
        next = moveCalendarDay(day, -((day.getDay() + 6) % 7));
        break;
      case 'End':
        next = moveCalendarDay(day, 6 - ((day.getDay() + 6) % 7));
        break;
      case 'PageUp':
        next = moveCalendarMonth(day, event.shiftKey ? -12 : -1);
        break;
      case 'PageDown':
        next = moveCalendarMonth(day, event.shiftKey ? 12 : 1);
        break;
      default:
        return;
    }
    event.preventDefault();
    event.stopPropagation();
    focusPending.current = true;
    setFocusedDay(next);
  };

  const navigationButton = (
    months: number,
    name: keyof typeof MaterialIcons.glyphMap,
    title: string,
  ) => (
    <button
      type="button"
      className="mybalance-date-button"
      aria-label={title}
      onClick={() => setFocusedDay(moveCalendarMonth(focusedDay, months))}
      style={{
        width: 28,
        height: 32,
        display: 'grid',
        placeItems: 'center',
        padding: 0,
        flexShrink: 0,
      }}
    >
      <MaterialIcons name={name} size={19} color={text} />
    </button>
  );

  return (
    <>
      <style>{calendarCss}</style>
      <button
        ref={triggerRef}
        type="button"
        className="mybalance-date-button"
        aria-label={`${label}: ${valueLabel}`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={isOpen ? id : undefined}
        onClick={isOpen ? close : open}
        style={{
          ...variables,
          flex: 1,
          minWidth: 0,
          minHeight: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 8,
          padding: '8px 10px',
          color: text,
          fontFamily: Fonts.sans,
          fontSize: 15,
          fontWeight: 500,
        }}
      >
        <span>{valueLabel}</span>
        <MaterialIcons
          name="calendar-today"
          size={12}
          color={text}
          style={{ width: 18, textAlign: 'center', flexShrink: 0 }}
        />
      </button>
      <Modal transparent visible={isOpen} onRequestClose={close} onShow={focusDay}>
        <div style={{ position: 'fixed', inset: 0, ...variables }} onClick={close}>
          <div
            ref={panelRef}
            id={id}
            role="dialog"
            aria-modal="true"
            aria-label={`Choose ${label.toLowerCase()}`}
            className="mybalance-date-panel"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                close();
              } else if (event.key === 'Tab') {
                const buttons = Array.from(
                  panelRef.current?.querySelectorAll<HTMLButtonElement>(
                    'button:not([tabindex="-1"])',
                  ) ?? [],
                );
                const first = buttons[0];
                const last = buttons[buttons.length - 1];
                if (event.shiftKey && document.activeElement === first) {
                  event.preventDefault();
                  last?.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                  event.preventDefault();
                  first?.focus();
                }
              }
            }}
            style={{
              ...position,
              position: 'fixed',
              boxSizing: 'border-box',
              overflowY: 'auto',
              padding: 12,
              borderRadius: 16,
              border: `1px solid ${border}`,
              background,
              color: text,
              fontFamily: Fonts.sans,
              fontSize: 13,
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: '0 2px 4px rgba(17, 31, 24, 0.04), 0 16px 40px rgba(17, 31, 24, 0.14)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginBottom: 8 }}>
              {navigationButton(-12, 'keyboard-double-arrow-left', 'Previous year')}
              {navigationButton(-1, 'chevron-left', 'Previous month')}
              <span
                id={`${id}-month`}
                aria-live="polite"
                style={{ flex: 1, textAlign: 'center', fontWeight: 600 }}
              >
                {monthLabel}
              </span>
              {navigationButton(1, 'chevron-right', 'Next month')}
              {navigationButton(12, 'keyboard-double-arrow-right', 'Next year')}
            </div>
            <div role="grid" aria-labelledby={`${id}-month`}>
              <div
                role="row"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: 4,
                  marginBottom: 4,
                }}
              >
                {WEEKDAYS.map((day) => (
                  <span
                    key={day}
                    role="columnheader"
                    style={{ textAlign: 'center', fontSize: 11, lineHeight: '24px', color: muted }}
                  >
                    {day}
                  </span>
                ))}
              </div>
              {Array.from({ length: 6 }, (_, week) => (
                <div
                  key={week}
                  role="row"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    gap: 4,
                    marginBottom: week < 5 ? 4 : 0,
                  }}
                >
                  {days.slice(week * 7, week * 7 + 7).map((day) => {
                    const selected = sameCalendarDay(day, value);
                    const focused = sameCalendarDay(day, focusedDay);
                    const isToday = sameCalendarDay(day, today);
                    return (
                      <div key={day.getTime()} role="gridcell" aria-selected={selected}>
                        <button
                          type="button"
                          className="mybalance-date-button mybalance-date-day"
                          aria-label={day.toLocaleDateString('en-GB', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                          aria-pressed={selected}
                          aria-current={isToday ? 'date' : undefined}
                          tabIndex={focused ? 0 : -1}
                          data-calendar-focus={focused}
                          onKeyDown={(event) => handleDayKeyDown(event, day)}
                          onClick={() => select(day)}
                          style={{
                            width: '100%',
                            height: 34,
                            padding: 0,
                            color: selected
                              ? onAccent
                              : day.getMonth() === focusedDay.getMonth()
                                ? text
                                : muted,
                            boxShadow:
                              isToday && !selected ? `inset 0 0 0 1px ${accent}` : undefined,
                          }}
                        >
                          {day.getDate()}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                borderTop: `1px solid ${border}`,
                paddingTop: 8,
                marginTop: 8,
              }}
            >
              <button
                type="button"
                className="mybalance-date-button"
                onClick={() => select(moveCalendarDay(today, 0))}
                style={{ padding: '7px 10px', fontWeight: 600 }}
              >
                Today
              </button>
              <button
                type="button"
                className="mybalance-date-button"
                onClick={close}
                style={{ padding: '7px 10px', color: muted }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
