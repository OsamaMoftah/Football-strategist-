"""VLM proposals and explicit reviews are separate, validated evidence layers."""

from copy import deepcopy
import math
import json

EVENT_TYPES = {
    "pass",
    "reception",
    "carry",
    "shot",
    "save",
    "goal",
    "interception",
    "clearance",
    "restart",
    "pressure",
}


def validate_events(payload, duration, sampled_times):
    result = []
    for raw in payload.get("events", []):
        try:
            start, end = float(raw["time"]), float(raw["end"])
            confidence = float(raw.get("confidence", 0))
            evidence = [float(t) for t in raw.get("evidenceTimes", [])]
            if not all(math.isfinite(v) for v in [start, end, confidence, *evidence]):
                continue
            if not (0 <= start < end <= duration and 0 <= confidence <= 1):
                continue
            if raw.get("type") not in EVENT_TYPES or len(set(evidence)) < 2:
                continue
            if any(not any(abs(t - s) < 0.02 for s in sampled_times) for t in evidence):
                continue
            if any(t < start - 0.5 or t > end + 0.5 for t in evidence):
                continue
            title, explanation = (
                str(raw.get("title", "")).strip(),
                str(raw.get("explanation", "")).strip(),
            )
            if not title or not explanation:
                continue
            result.append(
                dict(
                    id=f"vlm-{len(result) + 1}",
                    time=start,
                    end=end,
                    type=raw["type"],
                    title=title[:120],
                    explanation=explanation[:1200],
                    evidenceTimes=evidence,
                    confidence=confidence,
                    source="vlm",
                    reviewStatus="proposed",
                )
            )
        except (KeyError, ValueError, TypeError):
            continue
    return sorted(result, key=lambda e: e["time"])


def apply_reviews(events, reviews):
    result = deepcopy(events)
    by_id = {e["id"]: e for e in result}
    for review in reviews:
        if review["id"] not in by_id:
            raise ValueError("Review references an unknown event")
        if review.get("status") not in {"accepted", "rejected", "corrected"}:
            raise ValueError("Invalid review status")
        if not str(review.get("note", "")).strip():
            raise ValueError("A review must include its visual evidence note")
        event = by_id[review["id"]]
        event["reviewStatus"] = review["status"]
        event["reviewNote"] = review["note"]
        if review["status"] == "corrected":
            event["originalProposal"] = {
                k: event[k] for k in ["time", "end", "type", "title", "explanation"]
            }
            for key in ["time", "end", "type", "title", "explanation"]:
                if key in review:
                    event[key] = review[key]
        if event["type"] not in EVENT_TYPES:
            raise ValueError("Invalid reviewed event type")
        if not all(math.isfinite(float(event[k])) for k in ["time", "end"]):
            raise ValueError("Invalid reviewed event interval")
        if not (0 <= event["time"] < event["end"]):
            raise ValueError("Invalid reviewed event interval")
    return result


def parse_response(response):
    content = response.get("message", {}).get("content", "").strip()
    if response.get("done_reason") == "length" or not content:
        raise ValueError(
            "VLM response is empty or truncated; use an instruction checkpoint and sufficient output budget"
        )
    try:
        payload = json.loads(content)
    except json.JSONDecodeError as error:
        raise ValueError("VLM returned invalid structured JSON") from error
    if not isinstance(payload, dict) or not isinstance(payload.get("events"), list):
        raise ValueError("VLM response does not contain an events list")
    return payload
