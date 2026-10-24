"use client";

const stages = [
  {
    stage: "Native Python case",
    state: "Available",
    detail:
      "20.02s licensed source; source-rate ball inference, 9.99 Hz player observations, camera compensation, annotated MP4",
    gap: "479 retained points after explicit review; one false advert segment removed. This is continuity, not accuracy.",
  },
  {
    stage: "Event explanations",
    state: "Reviewed notes",
    detail: "Three implementation-agent visual-review notes linked to source timestamps",
    gap: "Qwen3-VL returned no supported events in two runs. Automated strategy recognition remains unproven.",
  },
  {
    stage: "Local clip inference",
    state: "Available",
    detail: "RF-DETR Nano COCO detects people; a separate football model supplies ball anchors",
    gap: "Browser player sampling: 2 Hz; ball motion: 12 Hz. Model scores are not accuracy.",
  },
  {
    stage: "Image-space tracks",
    state: "Available",
    detail: "Timestamped boxes, temporal ball segments and short-term player associations",
    gap: "IDs can switch at cuts or occlusions; kit colors are approximate groups, not confirmed identities",
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
            The included case uses offline native CV. Uploads use browser inference. Spatial metrics
            remain available only in the illustrative sample workspace.
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
