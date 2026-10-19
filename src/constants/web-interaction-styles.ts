/** One hover treatment for web controls, including content rendered in modal portals. */
export const webInteractionStyles = `
  :root {
    --web-hover-tint: rgba(36, 68, 55, 0.075);
    --web-hover-surface: #EEF2EF;
    --web-focus-color: #2F4F3F;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --web-hover-tint: rgba(214, 232, 222, 0.09);
      --web-hover-surface: #2A302D;
      --web-focus-color: #D6E8DE;
    }
  }
  [data-web-hover="true"] {
    cursor: pointer;
  }
  [data-web-hover="true"]:focus-visible {
    outline: 2px solid var(--web-focus-color);
    outline-offset: 2px;
  }
  @media (hover: hover) and (pointer: fine) {
    [data-movement-row]:not([data-movement-selected="true"]):hover {
      background-color: var(--web-hover-tint);
    }
    [data-movement-row][data-movement-selected="true"]:hover {
      box-shadow: inset 0 0 0 1px var(--web-hover-tint);
    }
    [data-web-hover="true"]::after {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background: var(--web-hover-tint);
      opacity: 0;
      pointer-events: none;
      z-index: 1;
      transition: opacity 140ms ease;
    }
    [data-web-hover="true"]:not([aria-disabled="true"]):hover:not(:has([data-web-hover="true"]:hover))::after {
      opacity: 1;
    }
    select:not(:disabled):not([aria-disabled="true"]):hover {
      background-color: var(--web-hover-surface) !important;
      border-radius: 8px;
      cursor: pointer;
    }
    a[href]:not([aria-disabled="true"]):not([data-web-hover]):hover {
      text-decoration: underline;
      text-underline-offset: 3px;
    }
    [role="switch"]:not([data-web-hover="true"]):not([aria-disabled="true"]):hover,
    input[type="checkbox"]:not(:disabled):hover,
    input[type="radio"]:not(:disabled):hover {
      filter: brightness(0.9);
      cursor: pointer;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    [data-web-hover="true"]::after { transition: none; }
  }
`;
