# Dashboard Grid con Drag & Drop

Sistema di dashboard flessibile con supporto per drag & drop, ridimensionamento colonne e salvataggio del layout.

## Caratteristiche

- ✅ **Layout a Griglia Flessibile**: Sistema basato su flexbox con righe e colonne configurabili
- ✅ **Drag & Drop**: Sposta le card tra colonne e righe
- ✅ **Ridimensionamento Colonne**: Ridimensiona le colonne trascinando i divisori
- ✅ **Salvataggio Automatico**: Il layout viene salvato automaticamente in AsyncStorage
- ✅ **Import/Export JSON**: Esporta e importa configurazioni del layout
- ✅ **Card Pieghevoli**: Ogni card può essere espansa/compressa
- ✅ **Cross-platform**: Funziona su web, iOS e Android

## Struttura JSON del Layout

Il layout può essere salvato e condiviso come JSON semplificato:

```json
{
  "rows": [
    {
      "flex": 1,
      "columns": [
        { "width": 1, "cards": ["home", "notifications"] },
        { "width": 2, "cards": ["charts"] }
      ]
    },
    {
      "flex": 1.5,
      "columns": [
        { "width": 1, "cards": ["settings", "profile"] },
        { "width": 1, "cards": ["activity"] }
      ]
    }
  ]
}
```

### Proprietà JSON

- **`rows`**: Array di righe della dashboard
  - **`flex`**: Valore flex per l'altezza della riga (default: 1)
  - **`columns`**: Array di colonne nella riga
    - **`width`**: Valore flex per la larghezza della colonna
    - **`cards`**: Array di ID delle card da visualizzare in questa colonna

## Utilizzo

### 1. Setup di Base

```tsx
import {
  DashboardLayoutProvider,
  DashboardGrid,
  CommandBar,
  DashboardLayoutConfig,
} from "@/components/dashboard-grid";

// Definisci il layout di default
const DEFAULT_LAYOUT: DashboardLayoutConfig = {
  rows: [
    {
      id: "row1",
      flex: 1,
      columns: [
        { id: "r1c1", flex: 1, minWidth: 350, cards: ["home"] },
        { id: "r1c2", flex: 1, minWidth: 350, cards: ["charts"] },
      ],
    },
  ],
};

function MyDashboard() {
  return (
    <DashboardLayoutProvider defaultLayout={DEFAULT_LAYOUT}>
      <CommandBar centerContent={<MyControls />} />
      <DashboardGrid cardRenderers={cardRenderers} />
    </DashboardLayoutProvider>
  );
}
```

### 2. Definizione delle Card

```tsx
const cardRenderers = [
  {
    id: "home",
    title: "Home",
    minHeight: 400,
    render: () => <HomeView />,
  },
  {
    id: "charts",
    title: "Charts",
    minHeight: 300,
    render: () => <ChartsView />,
  },
  {
    id: "settings",
    title: "Settings",
    minHeight: 200,
    render: () => <SettingsView />,
  },
];
```

### 3. Gestione del Layout

```tsx
import { useDashboardLayout } from "@/components/dashboard-grid";

function MyComponent() {
  const {
    layout,
    exportLayoutJSON,
    importLayoutJSON,
    saveLayout,
    resetLayout,
  } = useDashboardLayout();

  // Esporta il layout corrente
  const handleExport = () => {
    const json = exportLayoutJSON();
    console.log(json);
  };

  // Importa un layout da JSON
  const handleImport = (jsonString: string) => {
    const success = importLayoutJSON(jsonString);
    if (success) {
      console.log("Layout importato!");
    }
  };

  return <View>{/* ... */}</View>;
}
```

### 4. Salvataggio in Cookie (Web)

```typescript
import {
  saveLayoutToCookie,
  loadLayoutFromCookie,
} from "@/helpers/DashboardLayoutHelper";

// Salva in cookie
saveLayoutToCookie(layout, "my_dashboard_layout");

// Carica da cookie
const savedLayout = loadLayoutFromCookie("my_dashboard_layout");
if (savedLayout) {
  importLayoutJSON(JSON.stringify(savedLayout));
}
```

## Componenti

### DashboardLayoutProvider

Provider del contesto che gestisce lo stato del layout.

**Props:**

- `defaultLayout`: Layout iniziale da utilizzare
- `children`: Componenti figli

### DashboardGrid

Griglia principale che renderizza le card.

**Props:**

- `cardRenderers`: Array di definizioni delle card

### CommandBar

Barra dei comandi con controlli del layout.

**Props:**

- `title`: Titolo da mostrare (default: "MyBalance")
- `leftContent`: Contenuto personalizzato a sinistra
- `centerContent`: Contenuto personalizzato al centro
- `rightContent`: Contenuto personalizzato a destra
- `showLayoutControls`: Mostra i controlli del layout (default: true)

### DraggableCard

Card trascinabile con supporto per collapse.

**Props:**

- `id`: ID univoco della card
- `title`: Titolo della card
- `columnId`: ID della colonna contenitore
- `rowId`: ID della riga contenitore
- `children`: Contenuto della card
- `minHeight`: Altezza minima in pixel (default: 100)
- `collapsible`: Abilita il collapse (default: true)

### LayoutManager

Modal per gestire import/export e reset del layout.

**Props:**

- `visible`: Visibilità del modal
- `onClose`: Callback di chiusura

## Hook

### useDashboardLayout()

Hook per accedere al contesto del layout.

**Ritorna:**

```typescript
{
  layout: DashboardLayoutConfig;
  cards: Map<CardId, DashboardCard>;
  dragState: DragState;
  registerCard: (card: DashboardCard) => void;
  unregisterCard: (cardId: CardId) => void;
  startDrag: (cardId, columnId, rowId) => void;
  updateDragPosition: (x, y) => void;
  endDrag: (target) => void;
  moveCard: (cardId, fromColumn, fromRow, toColumn, toRow, toIndex) => void;
  resizeColumn: (rowId, columnId, newFlex) => void;
  saveLayout: () => void;
  resetLayout: () => void;
  exportLayoutJSON: () => string;
  importLayoutJSON: (jsonString) => boolean;
}
```

## Helper Functions

### DashboardLayoutHelper

Funzioni di utilità per la gestione del layout.

```typescript
// Esporta in formato JSON semplificato
exportLayoutToJSON(layout): SimpleLayout

// Importa da JSON semplificato
importLayoutFromJSON(simpleLayout): DashboardLayoutConfig

// Converte in stringa JSON
stringifyLayout(layout): string

// Parse da stringa JSON
parseLayout(jsonString): DashboardLayoutConfig | null

// Valida il layout
validateLayout(layout): boolean

// Salva in cookie (web only)
saveLayoutToCookie(layout, cookieName?)

// Carica da cookie (web only)
loadLayoutFromCookie(cookieName?): DashboardLayoutConfig | null
```

## Esempi di Layout

### Layout a 2 Colonne

```json
{
  "rows": [
    {
      "flex": 1,
      "columns": [
        { "width": 1, "cards": ["home"] },
        { "width": 1, "cards": ["charts"] }
      ]
    }
  ]
}
```

### Layout a 3 Colonne

```json
{
  "rows": [
    {
      "flex": 1,
      "columns": [
        { "width": 1, "cards": ["home"] },
        { "width": 2, "cards": ["charts"] },
        { "width": 1, "cards": ["settings"] }
      ]
    }
  ]
}
```

### Layout Multi-Riga

```json
{
  "rows": [
    {
      "flex": 1,
      "columns": [{ "width": 1, "cards": ["header"] }]
    },
    {
      "flex": 3,
      "columns": [
        { "width": 1, "cards": ["sidebar"] },
        { "width": 2, "cards": ["main", "footer"] }
      ]
    }
  ]
}
```

## Storage

Il layout viene automaticamente salvato in:

- **Mobile/Native**: AsyncStorage (`@mybalance/dashboard-layout`)
- **Web**: AsyncStorage (localStorage) o Cookie

### Salvataggio Automatico

Il layout viene salvato automaticamente 500ms dopo ogni modifica (debounced).

### Salvataggio Manuale

```typescript
const { saveLayout } = useDashboardLayout();
saveLayout(); // Forza il salvataggio immediato
```

## Personalizzazione

### Tema

I componenti utilizzano il sistema di temi tramite `useThemeColor`. Puoi personalizzare:

- `background`: Sfondo principale
- `cardBackground`: Sfondo delle card
- `menuBackground`: Sfondo dei menu
- `text`: Colore del testo

### Stili Custom

Ogni componente può essere stilizzato tramite i suoi style props o estendendo gli StyleSheet esistenti.

## Performance

- **Debounced Save**: Il salvataggio è debounced di 500ms per evitare troppi write
- **Memoization**: I renderer delle card sono memoizzati per evitare re-render non necessari
- **Lazy Loading**: Le card possono essere caricate on-demand

## Compatibilità

- ✅ React Native (iOS/Android)
- ✅ React Native Web
- ✅ Expo
- ✅ TypeScript

## Troubleshooting

### Il layout non viene salvato

Verifica che AsyncStorage sia configurato correttamente:

```bash
npx expo install @react-native-async-storage/async-storage
```

### Drag & drop non funziona su web

Assicurati che la prop `draggable` sia supportata. Il componente gestisce automaticamente sia i gesture native che gli eventi web.

### Le card non si spostano

Verifica che:

1. Ogni card abbia un `id` univoco
2. Il `DashboardLayoutProvider` avvolga tutti i componenti
3. Non ci siano errori nella console

## Licenza

MIT
