"use client";

const stages = [
  {
    stage: "Local clip inference",
    state: "Available",
    detail: "RF-DETR Nano COCO detects people and sports-ball candidates in sampled video frames",
    gap: "Browser inference is sampled at 3 fps; not a benchmarked accuracy claim",
  },
  {
    stage: "Image-space tracks",
    state: "Available",
    detail: "Timestamped boxes with short-term IoU and position-proximity track IDs",
    gap: "IDs can switch at cuts or occlusions; no team or shirt identity",
  },
  {
    stage: "Pitch homography",
    state: "Geometry helper",
    detail: "Generic DLT accepts four or more point pairs",
    gap: "No clip-specific calibration or reprojection-error report",
  },
  {
    stage: "Offside geometry",
    state: "Unavailable",
    detail: "No metric player coordinates are produced for uploaded clips",
    gap: "Needs calibrated pitch, kick-time detection, body-part review, and uncertainty bounds",
  },
  {
    stage: "Territory and threat",
    state: "Sample only",
    detail: "Illustrative synthetic territory and threat values in the demo workspace",
    gap: "Not computed from the uploaded footage or validated as pitch-control / xT",
  },
];

export function BenchmarksTable() {
  return (
    <section className="panel view-panel" aria-labelledby="pipeline-title">
      <div className="view-panel__intro">
        <div className="pipeline-intro">
          <h1 id="pipeline-title" className="view-panel__title">
            Pipeline status
          </h1>
          <p className="view-panel__description">
            The browser runs the detector on uploaded video. Spatial metrics remain available only
            in the illustrative sample workspace.
          </p>
        </div>
        <span className="pipeline-tag">Research prototype</span>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Stage</th>
              <th scope="col">Status</th>
              <th scope="col">Available now</th>
              <th scope="col">Evidence needed</th>
            </tr>
          </thead>
          <tbody>
            {stages.map((row) => (
              <tr key={row.stage}>
                <td className="row-title">{row.stage}</td>
                <td>
                  <span className="state-text">{row.state}</span>
                </td>
                <td>{row.detail}</td>
                <td className="state-muted">{row.gap}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="data-quality">
        <span>Validation status</span>
        <span>
          No labeled-footage accuracy benchmark yet. See the analysis panel for measured clip
          coverage and limitations.
        </span>
      </div>
    </section>
  );
}
