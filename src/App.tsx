import { useState, useCallback } from "react";
import { TimelineProvider, useTimeline } from "@/context/TimelineContext";
import { MapView } from "@/components/MapView";
import { DayTab } from "@/components/DayTab";
import { TimelineSlider } from "@/components/TimelineSlider";
import { WorldTab } from "@/components/WorldTab";
import { TripsTab } from "@/components/TripsTab";
import { CitiesTab } from "@/components/CitiesTab";
import "./App.css";

type TabId = "Day" | "Trips" | "Places" | "Cities" | "World";
type MobilePanel = "tabs" | "sidebar" | "timeline" | null;

const TABS: TabId[] = ["Day", "Trips", "Places", "Cities", "World"];

function SidebarContent({ tab }: { tab: TabId }) {
  switch (tab) {
    case "Day":
      return <DayTab />;
    case "Trips":
      return <TripsTab />;
    case "Places":
      return (
        <div className="tab-placeholder">
          <h3>Places</h3>
          <p>Places visited by category (Food, Shopping, …).</p>
        </div>
      );
    case "Cities":
      return <CitiesTab />;
    case "World":
      return <WorldTab />;
    default:
      return null;
  }
}

function AppContent() {
  const [activeTab, setActiveTab] = useState<TabId>("Day");
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>(null);
  const { setShowLines, timeRangeBounds, timeRange } = useTimeline();

  const handleTabChange = useCallback(
    (tab: TabId) => {
      setActiveTab(tab);
      if (tab === "World" || tab === "Cities") {
        setShowLines(false);
      }
    },
    [setShowLines],
  );

  const toggleMobilePanel = useCallback((panel: MobilePanel) => {
    setMobilePanel((prev) => (prev === panel ? null : panel));
  }, []);

  return (
    <div className="app">
      <header className="header">
        <div className="header-top">
          <h1 className="title">Timeline</h1>
          <div className="header-actions">
            <button type="button" className="icon-btn" aria-label="Upload">
              ☁
            </button>
            <button type="button" className="icon-btn" aria-label="Menu">
              ⋮
            </button>
          </div>
        </div>
      </header>
      <nav className="tabs tabs-desktop">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`tab ${activeTab === tab ? "active" : ""}`}
            onClick={() => handleTabChange(tab)}
          >
            {tab}
          </button>
        ))}
      </nav>
      <div className="layout">
        <aside className="sidebar sidebar-desktop">
          <SidebarContent tab={activeTab} />
        </aside>
        <main className="map-container">
          <MapView activeTab={activeTab} />
          {timeRangeBounds && timeRange && (
            <div className="timeline-box" title="Timeline - hover to increase visibility">
              <TimelineSlider />
            </div>
          )}
        </main>
      </div>

      {/* Mobile bottom menu + drawers */}
      <div className="mobile-menu-bar">
        <button
          type="button"
          className={`mobile-menu-btn ${mobilePanel === "tabs" ? "active" : ""}`}
          onClick={() => toggleMobilePanel("tabs")}
          aria-pressed={mobilePanel === "tabs"}
        >
          <span className="mobile-menu-icon">📑</span>
          <span>Tabs</span>
        </button>
        <button
          type="button"
          className={`mobile-menu-btn ${mobilePanel === "sidebar" ? "active" : ""}`}
          onClick={() => toggleMobilePanel("sidebar")}
          aria-pressed={mobilePanel === "sidebar"}
        >
          <span className="mobile-menu-icon">☰</span>
          <span>Sidebar</span>
        </button>
        <button
          type="button"
          className={`mobile-menu-btn ${mobilePanel === "timeline" ? "active" : ""}`}
          onClick={() => toggleMobilePanel("timeline")}
          aria-pressed={mobilePanel === "timeline"}
        >
          <span className="mobile-menu-icon">⏱</span>
          <span>Timeline</span>
        </button>
      </div>

      {mobilePanel && (
        <div
          className="mobile-overlay"
          role="presentation"
          onClick={() => setMobilePanel(null)}
        />
      )}
      <div className={`mobile-drawer mobile-drawer--${mobilePanel}`}>
        {mobilePanel === "tabs" && (
          <nav className="tabs tabs-mobile">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                className={`tab ${activeTab === tab ? "active" : ""}`}
                onClick={() => {
                  handleTabChange(tab);
                  setMobilePanel(null);
                }}
              >
                {tab}
              </button>
            ))}
          </nav>
        )}
        {mobilePanel === "sidebar" && (
          <aside className="sidebar sidebar-mobile">
            <SidebarContent tab={activeTab} />
          </aside>
        )}
        {mobilePanel === "timeline" && timeRangeBounds && timeRange && (
          <div className="mobile-drawer-timeline">
            <TimelineSlider />
          </div>
        )}
      </div>
    </div>
  );
}

function App() {
  return (
    <TimelineProvider>
      <AppContent />
    </TimelineProvider>
  );
}

export default App;
