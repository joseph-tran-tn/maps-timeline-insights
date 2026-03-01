import { useTimeline } from "@/context/TimelineContext";
import { ShowLinesToggle } from "@/components/ShowLinesToggle";
import { lineLengthKm } from "@/lib/geojson";

export function TripsTab() {
  const { visiblePoints } = useTimeline();

  const pointCount = visiblePoints.length;
  const totalKm = lineLengthKm(visiblePoints);
  const fromDate =
    pointCount > 0
      ? new Date(visiblePoints[0].timestamp).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : null;
  const toDate =
    pointCount > 1
      ? new Date(visiblePoints[pointCount - 1].timestamp).toLocaleDateString(
          undefined,
          { year: "numeric", month: "short", day: "numeric" },
        )
      : fromDate;

  if (visiblePoints.length === 0) {
    return (
      <div className="trips-tab">
        <p className="trips-tab-empty">
          Upload data or select a dataset to view trip stats.
        </p>
      </div>
    );
  }

  return (
    <>
      <ShowLinesToggle />
      <div className="trips-tab">
        {fromDate && toDate && (
          <div className="trips-tab-daterange">
            <span className="trips-tab-daterange-label">Date range</span>
            <span className="trips-tab-daterange-value">
              {fromDate} – {toDate}
            </span>
          </div>
        )}
        <div className="trips-tab-stats">
          <div className="trips-stat">
            <span
              className="trips-stat-icon trips-stat-icon--point"
              aria-hidden
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </span>
            <div className="trips-stat-body">
              <span className="trips-stat-value">
                {pointCount.toLocaleString()}
              </span>
              <span className="trips-stat-label">points</span>
            </div>
          </div>
          <div className="trips-stat">
            <span className="trips-stat-icon trips-stat-icon--km" aria-hidden>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 12h4l2-5 2 10 2-5 4 5h4" />
              </svg>
            </span>
            <div className="trips-stat-body">
              <span className="trips-stat-value">
                {totalKm.toLocaleString(undefined, {
                  maximumFractionDigits: 1,
                })}
              </span>
              <span className="trips-stat-label">km</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
