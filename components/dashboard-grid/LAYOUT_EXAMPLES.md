# Esempi di Layout JSON per Dashboard

Questa guida mostra vari esempi di configurazioni JSON del layout che possono essere salvate in cookie, AsyncStorage o condivise tra utenti.

## Formato Base

```json
{
  "rows": [
    {
      "flex": <numero>,
      "columns": [
        {
          "width": <numero>,
          "cards": ["<card-id-1>", "<card-id-2>", ...]
        }
      ]
    }
  ]
}
```

## Esempi Pratici

### 1. Layout 2 Colonne Bilanciate

Perfetto per dashboard semplici con due aree equivalenti.

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

### 2. Layout 3 Colonne (Sidebar + Contenuto + Tools)

Classico layout con sidebar laterali e contenuto centrale più largo.

```json
{
  "rows": [
    {
      "flex": 1,
      "columns": [
        { "width": 1, "cards": ["navigation", "quick-actions"] },
        { "width": 2.5, "cards": ["main-content"] },
        { "width": 1, "cards": ["tools", "settings"] }
      ]
    }
  ]
}
```

### 3. Layout Tipo IDE

Layout multi-riga stile IDE con barra superiore, contenuto principale e console.

```json
{
  "rows": [
    {
      "flex": 0.5,
      "columns": [{ "width": 1, "cards": ["toolbar"] }]
    },
    {
      "flex": 3,
      "columns": [
        { "width": 1, "cards": ["file-explorer"] },
        { "width": 3, "cards": ["editor"] },
        { "width": 1, "cards": ["properties"] }
      ]
    },
    {
      "flex": 1,
      "columns": [{ "width": 1, "cards": ["console", "terminal"] }]
    }
  ]
}
```

### 4. Layout Blog/CMS

Layout per gestione contenuti con preview e strumenti.

```json
{
  "rows": [
    {
      "flex": 2,
      "columns": [
        { "width": 1, "cards": ["categories"] },
        { "width": 2, "cards": ["post-list"] },
        { "width": 2, "cards": ["preview"] }
      ]
    },
    {
      "flex": 1,
      "columns": [
        { "width": 2, "cards": ["editor"] },
        { "width": 1, "cards": ["metadata", "publish"] }
      ]
    }
  ]
}
```

### 5. Layout E-commerce Dashboard

Dashboard per e-commerce con metriche, ordini e analisi.

```json
{
  "rows": [
    {
      "flex": 1,
      "columns": [
        { "width": 1, "cards": ["revenue-today"] },
        { "width": 1, "cards": ["orders-count"] },
        { "width": 1, "cards": ["customers-online"] },
        { "width": 1, "cards": ["conversion-rate"] }
      ]
    },
    {
      "flex": 2,
      "columns": [
        { "width": 2, "cards": ["sales-chart"] },
        { "width": 1, "cards": ["top-products", "recent-orders"] }
      ]
    },
    {
      "flex": 1.5,
      "columns": [
        { "width": 1, "cards": ["inventory-alerts"] },
        { "width": 1, "cards": ["customer-reviews"] },
        { "width": 1, "cards": ["shipping-status"] }
      ]
    }
  ]
}
```

### 6. Layout MyBalance (Finanza Personale)

Il layout attuale di MyBalance.

```json
{
  "rows": [
    {
      "flex": 1,
      "columns": [
        { "width": 1, "cards": ["home"] },
        { "width": 1, "cards": ["charts"] }
      ]
    },
    {
      "flex": 1,
      "columns": [
        { "width": 2, "cards": [] },
        { "width": 1, "cards": ["settings"] }
      ]
    }
  ]
}
```

### 7. Layout Project Management

Dashboard per gestione progetti con timeline e task.

```json
{
  "rows": [
    {
      "flex": 1,
      "columns": [
        { "width": 1, "cards": ["project-overview"] },
        { "width": 2, "cards": ["gantt-chart"] }
      ]
    },
    {
      "flex": 1.5,
      "columns": [
        { "width": 1, "cards": ["team-members", "milestones"] },
        { "width": 1, "cards": ["tasks-board"] },
        { "width": 1, "cards": ["activity-feed"] }
      ]
    }
  ]
}
```

### 8. Layout Minimalista

Layout semplice con focus sul contenuto principale.

```json
{
  "rows": [
    {
      "flex": 1,
      "columns": [
        { "width": 3, "cards": ["main-content"] },
        { "width": 1, "cards": ["sidebar"] }
      ]
    }
  ]
}
```

### 9. Layout Grid Uniforme

Grid 3x2 con celle tutte uguali.

```json
{
  "rows": [
    {
      "flex": 1,
      "columns": [
        { "width": 1, "cards": ["card1"] },
        { "width": 1, "cards": ["card2"] },
        { "width": 1, "cards": ["card3"] }
      ]
    },
    {
      "flex": 1,
      "columns": [
        { "width": 1, "cards": ["card4"] },
        { "width": 1, "cards": ["card5"] },
        { "width": 1, "cards": ["card6"] }
      ]
    }
  ]
}
```

### 10. Layout Mobile-First

Layout ottimizzato per mobile con colonna singola e righe multiple.

```json
{
  "rows": [
    {
      "flex": 0.5,
      "columns": [{ "width": 1, "cards": ["header"] }]
    },
    {
      "flex": 1,
      "columns": [{ "width": 1, "cards": ["featured"] }]
    },
    {
      "flex": 1,
      "columns": [{ "width": 1, "cards": ["content"] }]
    },
    {
      "flex": 1,
      "columns": [{ "width": 1, "cards": ["actions"] }]
    },
    {
      "flex": 0.5,
      "columns": [{ "width": 1, "cards": ["footer"] }]
    }
  ]
}
```

## Come Usare questi Layout

### 1. Importa tramite UI

1. Apri il LayoutManager (icona settings nella CommandBar)
2. Vai alla tab "Importa"
3. Incolla il JSON
4. Clicca "Importa Layout"

### 2. Importa Programmaticamente

```typescript
import { useDashboardLayout } from "@/components/dashboard-grid";

function MyComponent() {
  const { importLayoutJSON } = useDashboardLayout();

  const loadCustomLayout = () => {
    const layout = `{
      "rows": [...]
    }`;

    importLayoutJSON(layout);
  };
}
```

### 3. Salva in Cookie (Web)

```typescript
import { saveLayoutToCookie } from "@/helpers/DashboardLayoutHelper";

// Dopo aver configurato il layout
saveLayoutToCookie(layout, "my_custom_layout");
```

### 4. Condividi con Altri Utenti

1. Esporta il tuo layout usando il LayoutManager
2. Copia il JSON
3. Condividi via email/messaggio
4. Altri utenti possono importarlo

## Proprietà Flex

### Width (Colonne)

- `1` = Occupazione normale
- `2` = Doppia larghezza
- `0.5` = Metà larghezza
- Puoi usare decimali per precisione (es: `1.5`, `2.3`)

### Flex (Righe)

- `1` = Altezza standard
- `2` = Doppia altezza
- `0.5` = Metà altezza (es: per toolbar)
- `3` = Tripla altezza (es: per contenuto principale)

## Best Practices

1. **Somma Flex**: Non è necessario che i valori flex sommino a un numero specifico
2. **Minimo**: Usa almeno `0.2` per width e flex
3. **Massimo**: Non superare `5` per evitare layout estremi
4. **Card Vuote**: Una colonna può avere `cards: []` per lasciare spazio disponibile per drag & drop
5. **Card Multiple**: Puoi inserire più card nella stessa colonna: `["card1", "card2", "card3"]`

## Troubleshooting

### Layout non viene importato

- Verifica che il JSON sia valido (usa un JSON validator)
- Controlla che tutti i card ID esistano nei tuoi `cardRenderers`
- Assicurati che flex e width siano numeri positivi

### Le colonne sono troppo strette

- Aumenta il valore `minWidth` nelle definizioni delle colonne (nel codice)
- Oppure aumenta il valore `width` nel JSON

### Le righe non sono proporzionate

- Regola i valori `flex` delle righe
- Usa valori più piccoli (`0.5`, `0.3`) per toolbar/header
- Usa valori più grandi (`2`, `3`) per contenuto principale
