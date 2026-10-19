import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColor } from '@/src/hooks/use-theme-color';
import { Fonts, webPanelBackground } from '@/src/constants/theme';

export interface IContextMenuOption {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  color?: string;
  destructive?: boolean;
  disabled?: boolean;
  separatorBefore?: boolean;
  external?: boolean;
}

export interface IContextMenuProps {
  activationMethod?: 'longPress' | 'singlePress';
  hostStyle?: { width: number; height: number };
  options: (string | IContextMenuOption)[];
  selectedOption?: string;
  onSelectOption: (option: string) => void;
  children: React.ReactNode;
  accessibilityLabel?: string;
  align?: 'start' | 'center';
}

const MENU_WIDTH = 240;
const VIEWPORT_MARGIN = 8;
const ITEM_HEIGHT = 40;
const MENU_PADDING = 8;
const SEPARATOR_HEIGHT = 13;

const menuCss = `
  .mybalance-menu-trigger { cursor: pointer; border-radius: 10px; transition: background-color 160ms ease; }
  .mybalance-menu-trigger:hover, .mybalance-menu-trigger[aria-expanded="true"] { background: var(--menu-hover); }
  .mybalance-menu-trigger:focus-visible { outline: 2px solid var(--menu-accent); outline-offset: 3px; }
  .mybalance-menu { box-sizing: border-box; animation: mybalance-menu-enter 160ms ease-out; scrollbar-width: thin; }
  .mybalance-menu-item { box-sizing: border-box; transition: background-color 140ms ease, transform 140ms ease; }
  .mybalance-menu-item:not(:disabled):hover, .mybalance-menu-item:focus-visible { background: var(--menu-hover) !important; }
  .mybalance-menu-item:focus-visible { outline: 2px solid var(--menu-accent); outline-offset: -2px; }
  .mybalance-menu-item[data-destructive="true"]:hover, .mybalance-menu-item[data-destructive="true"]:focus-visible { background: var(--menu-danger-hover) !important; }
  .mybalance-menu-item:not(:disabled):active { transform: translateY(1px); }
  @keyframes mybalance-menu-enter { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
  @media (prefers-reduced-motion: reduce) {
    .mybalance-menu { animation: none; }
    .mybalance-menu-trigger, .mybalance-menu-item { transition: none; }
  }
`;

const ContextMenu: React.FC<IContextMenuProps> = ({
  options,
  selectedOption = '',
  onSelectOption,
  children,
  accessibilityLabel,
  align = 'center',
}) => {
  const [position, setPosition] = useState<React.CSSProperties | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const initialFocus = useRef<'first' | 'last'>('first');
  const menuId = useId();
  const menuVisible = position !== null;
  const items = options.map((option) => (typeof option === 'string' ? { label: option } : option));

  const background = useThemeColor(webPanelBackground, 'cardBackground');
  const border = useThemeColor(
    { light: 'rgba(23, 38, 31, 0.10)', dark: 'rgba(255, 255, 255, 0.10)' },
    'cardBorder',
  );
  const text = useThemeColor({ light: '#34443C', dark: '#E7ECE9' }, 'text');
  const muted = useThemeColor({ light: '#66736C', dark: '#AEB8B2' }, 'icon');
  const accent = useThemeColor({ light: '#244437', dark: '#D6E8DE' }, 'tint');
  const hover = useThemeColor({ light: '#EEF2EF', dark: '#2A302D' }, 'menuBackground');
  const danger = useThemeColor({ light: '#B43838', dark: '#F29B9B' }, 'text');
  const dangerHover = useThemeColor({ light: '#F9ECEB', dark: '#402C2C' }, 'menuBackground');
  const variables = {
    '--menu-hover': hover,
    '--menu-accent': accent,
    '--menu-danger-hover': dangerHover,
  } as React.CSSProperties;

  const hasSeparator = (item: IContextMenuOption, index: number) =>
    index > 0 && (item.separatorBefore || (item.destructive && !items[index - 1].destructive));

  const closeMenu = useCallback(() => {
    setPosition(null);
    triggerRef.current?.focus({ preventScroll: true });
  }, []);

  const openMenu = (focus: 'first' | 'last' = 'first') => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(MENU_WIDTH, window.innerWidth - VIEWPORT_MARGIN * 2);
    const height =
      items.length * ITEM_HEIGHT +
      MENU_PADDING * 2 +
      2 +
      items.filter(hasSeparator).length * SEPARATOR_HEIGHT;
    const below = window.innerHeight - rect.bottom - VIEWPORT_MARGIN * 2;
    const above = rect.top - VIEWPORT_MARGIN * 2;
    const opensAbove = height > below && above > below;
    const maxHeight = Math.max(0, opensAbove ? above : below);
    const left = align === 'start' ? rect.left : rect.left + (rect.width - width) / 2;
    initialFocus.current = focus;
    setPosition({
      width,
      maxHeight,
      left: Math.max(VIEWPORT_MARGIN, Math.min(left, window.innerWidth - width - VIEWPORT_MARGIN)),
      top: opensAbove
        ? Math.max(VIEWPORT_MARGIN, rect.top - Math.min(height, maxHeight) - VIEWPORT_MARGIN)
        : rect.bottom + VIEWPORT_MARGIN,
    });
  };

  const focusInitialItem = useCallback(() => {
    const buttons = menuRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
    if (!buttons?.length) {
      menuRef.current?.focus();
      return;
    }
    const selected = Array.from(buttons).find((button) => button.dataset.selected === 'true');
    const target =
      initialFocus.current === 'last' ? buttons[buttons.length - 1] : selected || buttons[0];
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: 'nearest' });
  }, []);

  useEffect(() => {
    if (!menuVisible) return;
    window.addEventListener('resize', closeMenu);
    const onScroll = (event: Event) => {
      if (event.target instanceof Node && menuRef.current?.contains(event.target)) return;
      closeMenu();
    };
    window.addEventListener('scroll', onScroll, true);
    return () => {
      window.removeEventListener('resize', closeMenu);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [menuVisible, closeMenu]);

  const handleMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' || event.key === 'Tab') {
      event.preventDefault();
      event.stopPropagation();
      closeMenu();
      return;
    }
    const buttons = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [],
    );
    if (!buttons.length) return;
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    let next: number;
    switch (event.key) {
      case 'ArrowDown':
        next = (index + 1) % buttons.length;
        break;
      case 'ArrowUp':
        next = (index - 1 + buttons.length) % buttons.length;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = buttons.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    buttons[next].focus();
  };

  return (
    <>
      <style>{menuCss}</style>
      <div
        ref={triggerRef}
        className="mybalance-menu-trigger"
        role="button"
        tabIndex={0}
        aria-label={accessibilityLabel}
        aria-haspopup="menu"
        aria-expanded={menuVisible}
        aria-controls={menuVisible ? menuId : undefined}
        style={variables}
        onClick={() => (menuVisible ? closeMenu() : openMenu())}
        onKeyDown={(event) => {
          if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
            event.preventDefault();
            openMenu(event.key === 'ArrowUp' ? 'last' : 'first');
          }
        }}
      >
        {children}
      </div>
      <Modal transparent visible={menuVisible} onRequestClose={closeMenu} onShow={focusInitialItem}>
        <div style={{ position: 'fixed', inset: 0, ...variables }} onClick={closeMenu}>
          <div
            ref={menuRef}
            id={menuId}
            className="mybalance-menu"
            role="menu"
            aria-label={accessibilityLabel}
            tabIndex={-1}
            onKeyDown={handleMenuKeyDown}
            onClick={(event) => event.stopPropagation()}
            style={{
              ...position,
              position: 'fixed',
              overflowY: 'auto',
              padding: MENU_PADDING,
              borderRadius: 16,
              border: `1px solid ${border}`,
              background,
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: '0 2px 4px rgba(17, 31, 24, 0.04), 0 16px 40px rgba(17, 31, 24, 0.14)',
              fontFamily: Fonts.sans,
            }}
          >
            {items.map((item, index) => {
              const selected = selectedOption === item.label;
              const color = item.destructive ? danger : item.color || text;
              return (
                <React.Fragment key={`${item.label}-${index}`}>
                  {hasSeparator(item, index) && (
                    <div
                      role="separator"
                      style={{ height: 1, margin: '6px 8px', background: border }}
                    />
                  )}
                  <button
                    type="button"
                    role={selectedOption ? 'menuitemradio' : 'menuitem'}
                    aria-checked={selectedOption ? selected : undefined}
                    disabled={item.disabled}
                    tabIndex={-1}
                    className="mybalance-menu-item"
                    data-selected={selected}
                    data-destructive={!!item.destructive}
                    onClick={() => {
                      closeMenu();
                      onSelectOption(item.label);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      width: '100%',
                      height: ITEM_HEIGHT,
                      padding: '0 10px',
                      border: 0,
                      borderRadius: 9,
                      background: selected ? hover : 'transparent',
                      color,
                      fontFamily: 'inherit',
                      fontSize: 13,
                      fontWeight: selected ? 600 : 500,
                      lineHeight: '18px',
                      textAlign: 'left',
                      cursor: item.disabled ? 'default' : 'pointer',
                      opacity: item.disabled ? 0.4 : 1,
                    }}
                  >
                    {item.icon && (
                      <Ionicons
                        name={item.icon}
                        size={17}
                        color={item.destructive ? danger : muted}
                      />
                    )}
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {selected && <Ionicons name="checkmark" size={16} color={accent} />}
                    {item.external && <Ionicons name="arrow-up-right" size={14} color={muted} />}
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </Modal>
    </>
  );
};

export default ContextMenu;
