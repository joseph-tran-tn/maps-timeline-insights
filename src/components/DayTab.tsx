import { UploadPanel } from "@/components/UploadPanel";
import { DatasetList } from "@/components/DatasetList";
import { ShowLinesToggle } from "@/components/ShowLinesToggle";
import { PointList } from "@/components/PointList";

export function DayTab() {
  return (
    <>
      <UploadPanel />
      <DatasetList />
      <ShowLinesToggle />
      <PointList />
      <div className="sidebar-placeholder">
        <p>Upload timeline.json to see timeline.</p>
      </div>
    </>
  );
}
