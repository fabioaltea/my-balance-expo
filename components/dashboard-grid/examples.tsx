/**
 * Esempio di utilizzo del Dashboard Grid System
 *
 * Questo file mostra come configurare e utilizzare il sistema di dashboard
 * con drag & drop, salvataggio del layout e gestione delle card.
 */

import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import {
  DashboardLayoutProvider,
  DashboardGrid,
  CommandBar,
  DashboardLayoutConfig,
  useDashboardLayout,
} from "@/components/dashboard-grid";

// =============================================================================
// ESEMPIO 1: Layout Base con 2 Colonne
// =============================================================================

const SIMPLE_LAYOUT: DashboardLayoutConfig = {
  rows: [
    {
      id: "row1",
      flex: 1,
      columns: [
        { id: "r1c1", flex: 1, minWidth: 300, cards: ["card1"] },
        { id: "r1c2", flex: 1, minWidth: 300, cards: ["card2"] },
      ],
    },
  ],
};

export function SimpleExample() {
  const cardRenderers = [
    {
      id: "card1",
      title: "Card 1",
      render: () => (
        <View style={styles.cardContent}>
          <Text>Contenuto Card 1</Text>
        </View>
      ),
    },
    {
      id: "card2",
      title: "Card 2",
      render: () => (
        <View style={styles.cardContent}>
          <Text>Contenuto Card 2</Text>
        </View>
      ),
    },
  ];

  return (
    <DashboardLayoutProvider defaultLayout={SIMPLE_LAYOUT}>
      <View style={styles.container}>
        <CommandBar />
        <DashboardGrid cardRenderers={cardRenderers} />
      </View>
    </DashboardLayoutProvider>
  );
}

// =============================================================================
// ESEMPIO 2: Layout Complesso Multi-Riga
// =============================================================================

const COMPLEX_LAYOUT: DashboardLayoutConfig = {
  rows: [
    {
      id: "row1",
      flex: 1,
      columns: [
        { id: "r1c1", flex: 1, minWidth: 350, cards: ["home"] },
        { id: "r1c2", flex: 2, minWidth: 500, cards: ["charts"] },
      ],
    },
    {
      id: "row2",
      flex: 1.5,
      columns: [
        { id: "r2c1", flex: 1, minWidth: 300, cards: ["analytics"] },
        { id: "r2c2", flex: 1, minWidth: 300, cards: ["activity"] },
        { id: "r2c3", flex: 1, minWidth: 300, cards: ["settings"] },
      ],
    },
  ],
};

export function ComplexExample() {
  const cardRenderers = [
    {
      id: "home",
      title: "Home Dashboard",
      minHeight: 400,
      render: () => (
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>Home Dashboard</Text>
          <Text>Vista principale con statistiche</Text>
        </View>
      ),
    },
    {
      id: "charts",
      title: "Grafici",
      minHeight: 400,
      render: () => (
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>Grafici e Visualizzazioni</Text>
          <Text>Grafici interattivi dei dati</Text>
        </View>
      ),
    },
    {
      id: "analytics",
      title: "Analytics",
      minHeight: 300,
      render: () => (
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>Analytics</Text>
          <Text>Metriche e analisi dettagliate</Text>
        </View>
      ),
    },
    {
      id: "activity",
      title: "Activity Feed",
      minHeight: 300,
      render: () => (
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>Activity Feed</Text>
          <Text>Ultime attività e notifiche</Text>
        </View>
      ),
    },
    {
      id: "settings",
      title: "Impostazioni",
      minHeight: 300,
      render: () => (
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>Impostazioni</Text>
          <Text>Configurazione e preferenze</Text>
        </View>
      ),
    },
  ];

  return (
    <DashboardLayoutProvider defaultLayout={COMPLEX_LAYOUT}>
      <View style={styles.container}>
        <CommandBar title="Dashboard Complessa" />
        <DashboardGrid cardRenderers={cardRenderers} />
      </View>
    </DashboardLayoutProvider>
  );
}

// =============================================================================
// ESEMPIO 3: Gestione Programmatica del Layout
// =============================================================================

function LayoutControls() {
  const { exportLayoutJSON, importLayoutJSON, resetLayout, saveLayout } =
    useDashboardLayout();

  const [exportedJSON, setExportedJSON] = useState("");

  const handleExport = () => {
    const json = exportLayoutJSON();
    setExportedJSON(json);
    console.log("Layout esportato:", json);
  };

  const handleImport = () => {
    // Esempio di JSON da importare
    const exampleJSON = `{
      "rows": [
        {
          "flex": 1,
          "columns": [
            { "width": 1, "cards": ["home"] },
            { "width": 1, "cards": ["charts"] }
          ]
        }
      ]
    }`;

    const success = importLayoutJSON(exampleJSON);
    console.log("Import", success ? "riuscito" : "fallito");
  };

  return (
    <View style={styles.controls}>
      <Text>Controlli Layout:</Text>
      <View style={styles.buttons}>
        <Text onPress={handleExport}>Esporta</Text>
        <Text onPress={handleImport}>Importa</Text>
        <Text onPress={saveLayout}>Salva</Text>
        <Text onPress={resetLayout}>Reset</Text>
      </View>
      {exportedJSON && (
        <View style={styles.jsonDisplay}>
          <Text style={styles.jsonText}>{exportedJSON}</Text>
        </View>
      )}
    </View>
  );
}

export function ProgrammaticExample() {
  const cardRenderers = [
    {
      id: "home",
      title: "Home",
      render: () => <Text>Home Content</Text>,
    },
    {
      id: "charts",
      title: "Charts",
      render: () => <Text>Charts Content</Text>,
    },
  ];

  return (
    <DashboardLayoutProvider defaultLayout={SIMPLE_LAYOUT}>
      <View style={styles.container}>
        <CommandBar />
        <LayoutControls />
        <DashboardGrid cardRenderers={cardRenderers} />
      </View>
    </DashboardLayoutProvider>
  );
}

// =============================================================================
// ESEMPIO 4: JSON Semplificato per Cookie/Storage
// =============================================================================

/**
 * Esempio di struttura JSON semplificata che può essere salvata in cookie
 */
export const EXAMPLE_JSON_LAYOUTS = {
  // Layout a 2 colonne bilanciate
  twoColumns: {
    rows: [
      {
        flex: 1,
        columns: [
          { width: 1, cards: ["home"] },
          { width: 1, cards: ["charts"] },
        ],
      },
    ],
  },

  // Layout a 3 colonne con quella centrale più larga
  threeColumns: {
    rows: [
      {
        flex: 1,
        columns: [
          { width: 1, cards: ["sidebar"] },
          { width: 2, cards: ["main", "details"] },
          { width: 1, cards: ["tools"] },
        ],
      },
    ],
  },

  // Layout multi-riga
  multiRow: {
    rows: [
      {
        flex: 0.5,
        columns: [{ width: 1, cards: ["header"] }],
      },
      {
        flex: 2,
        columns: [
          { width: 1, cards: ["nav"] },
          { width: 3, cards: ["content"] },
        ],
      },
      {
        flex: 0.5,
        columns: [{ width: 1, cards: ["footer"] }],
      },
    ],
  },

  // Layout asimmetrico
  asymmetric: {
    rows: [
      {
        flex: 1,
        columns: [
          { width: 2, cards: ["featured"] },
          { width: 1, cards: ["sidebar1", "sidebar2"] },
        ],
      },
      {
        flex: 1,
        columns: [
          { width: 1, cards: ["card1"] },
          { width: 1, cards: ["card2"] },
          { width: 1, cards: ["card3"] },
        ],
      },
    ],
  },
};

// =============================================================================
// ESEMPIO 5: Utilizzo con Cookie (Web)
// =============================================================================

import {
  saveLayoutToCookie,
  loadLayoutFromCookie,
} from "@/helpers/DashboardLayoutHelper";

export function CookieExample() {
  const [layout, setLayout] = useState(SIMPLE_LAYOUT);

  // Carica il layout salvato all'avvio
  React.useEffect(() => {
    const savedLayout = loadLayoutFromCookie("my_dashboard");
    if (savedLayout) {
      setLayout(savedLayout);
    }
  }, []);

  // Componente interno che usa il layout
  function DashboardWithCookie() {
    const { layout: currentLayout } = useDashboardLayout();

    // Salva in cookie quando il layout cambia
    React.useEffect(() => {
      saveLayoutToCookie(currentLayout, "my_dashboard");
    }, [currentLayout]);

    return null;
  }

  const cardRenderers = [
    { id: "home", title: "Home", render: () => <Text>Home</Text> },
    { id: "charts", title: "Charts", render: () => <Text>Charts</Text> },
  ];

  return (
    <DashboardLayoutProvider defaultLayout={layout}>
      <DashboardWithCookie />
      <View style={styles.container}>
        <CommandBar />
        <DashboardGrid cardRenderers={cardRenderers} />
      </View>
    </DashboardLayoutProvider>
  );
}

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  cardContent: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  controls: {
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  buttons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  jsonDisplay: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
  },
  jsonText: {
    fontFamily: "monospace",
    fontSize: 12,
  },
});
