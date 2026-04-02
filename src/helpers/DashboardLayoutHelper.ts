/**
 * Dashboard Layout Helper
 *
 * Gestisce l'esportazione e importazione del layout della dashboard in formato JSON semplificato.
 * Il JSON può essere salvato in cookie, AsyncStorage, o condiviso con altri utenti.
 *
 * Formato JSON:
 * {
 *   "rows": [
 *     {
 *       "flex": 1,
 *       "columns": [
 *         { "width": 1, "cards": ["home", "notifications"] },
 *         { "width": 2, "cards": ["charts"] }
 *       ]
 *     },
 *     {
 *       "flex": 1.5,
 *       "columns": [
 *         { "width": 1, "cards": ["settings"] }
 *       ]
 *     }
 *   ]
 * }
 */

export interface SimpleLayoutColumn {
  width: number; // flex value per la colonna
  cards: string[]; // array di card IDs
}

export interface SimpleLayoutRow {
  flex: number; // flex value per la riga
  columns: SimpleLayoutColumn[];
}

export interface SimpleLayout {
  rows: SimpleLayoutRow[];
}

/**
 * Converte il layout interno della dashboard in formato JSON semplificato
 */
export function exportLayoutToJSON(layout: any): SimpleLayout {
  return {
    rows: layout.rows.map((row: any) => ({
      flex: row.flex,
      columns: row.columns.map((col: any) => ({
        width: col.flex,
        cards: col.cards,
      })),
    })),
  };
}

/**
 * Converte il JSON semplificato nel formato interno della dashboard
 */
export function importLayoutFromJSON(simpleLayout: SimpleLayout): any {
  return {
    rows: simpleLayout.rows.map((row, rowIndex) => ({
      id: `row${rowIndex + 1}`,
      flex: row.flex,
      columns: row.columns.map((col, colIndex) => ({
        id: `r${rowIndex + 1}c${colIndex + 1}`,
        flex: col.width,
        minWidth: 200,
        cards: col.cards,
      })),
    })),
  };
}

/**
 * Converte il layout in stringa JSON per cookie o storage
 */
export function stringifyLayout(layout: any): string {
  const simpleLayout = exportLayoutToJSON(layout);
  return JSON.stringify(simpleLayout, null, 2);
}

/**
 * Parse del layout da stringa JSON
 */
export function parseLayout(jsonString: string): any {
  try {
    const simpleLayout = JSON.parse(jsonString) as SimpleLayout;
    return importLayoutFromJSON(simpleLayout);
  } catch (error) {
    console.error('Failed to parse layout JSON:', error);
    return null;
  }
}

/**
 * Valida che il layout JSON sia corretto
 */
export function validateLayout(layout: SimpleLayout): boolean {
  if (!layout || !Array.isArray(layout.rows)) {
    return false;
  }

  for (const row of layout.rows) {
    if (typeof row.flex !== 'number' || row.flex <= 0) {
      return false;
    }

    if (!Array.isArray(row.columns) || row.columns.length === 0) {
      return false;
    }

    for (const col of row.columns) {
      if (typeof col.width !== 'number' || col.width <= 0) {
        return false;
      }

      if (!Array.isArray(col.cards)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Esempio di layout di default
 */
export const DEFAULT_SIMPLE_LAYOUT: SimpleLayout = {
  rows: [
    {
      flex: 1,
      columns: [
        { width: 1, cards: ['home'] },
        { width: 1, cards: ['charts'] },
      ],
    },
    {
      flex: 1,
      columns: [
        { width: 2, cards: [] },
        { width: 1, cards: ['settings'] },
      ],
    },
  ],
};

/**
 * Salva il layout in cookie (per web)
 */
export function saveLayoutToCookie(layout: any, cookieName: string = 'dashboard_layout'): void {
  if (typeof document === 'undefined') return;

  const jsonString = stringifyLayout(layout);
  const encodedLayout = encodeURIComponent(jsonString);

  // Cookie valido per 365 giorni
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1);

  document.cookie = `${cookieName}=${encodedLayout}; expires=${expires.toUTCString()}; path=/; SameSite=Strict`;
}

/**
 * Carica il layout da cookie (per web)
 */
export function loadLayoutFromCookie(cookieName: string = 'dashboard_layout'): any | null {
  if (typeof document === 'undefined') return null;

  const cookies = document.cookie.split('; ');
  const layoutCookie = cookies.find((c) => c.startsWith(`${cookieName}=`));

  if (!layoutCookie) return null;

  try {
    const encodedLayout = layoutCookie.split('=')[1];
    const jsonString = decodeURIComponent(encodedLayout);
    return parseLayout(jsonString);
  } catch (error) {
    console.error('Failed to load layout from cookie:', error);
    return null;
  }
}
