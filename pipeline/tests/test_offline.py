import pytest
from pipeline.offline.tracking import BallTracker, PlayerTracker
from pipeline.offline.events import validate_events, apply_reviews, parse_response


def ball(x=0.2, confidence=0.8):
    return {
        "label": "ball",
        "x": x,
        "y": 0.4,
        "width": 0.01,
        "height": 0.015,
        "confidence": confidence,
    }


def person(x=0.2):
    return {
        "label": "person",
        "x": x,
        "y": 0.2,
        "width": 0.04,
        "height": 0.15,
        "confidence": 0.9,
    }


def test_ball_rejects_remote_false_positive_with_higher_score():
    tracker = BallTracker(1280, 720)
    a = tracker.update([ball()], 0)
    b = tracker.update([ball(0.8, 0.99), ball(0.205, 0.7)], 1 / 30)
    assert a and b and b["x"] < 0.3 and a["segment"] == b["segment"]


def test_camera_translation_does_not_look_like_a_ball_jump():
    tracker = BallTracker(1280, 720)
    a = tracker.update([ball()], 0)
    b = tracker.update([ball(0.3)], 1 / 30, camera=(0.1, 0))
    assert a and b and b["segment"] == a["segment"]


def test_cut_and_lost_gap_split_tracks_and_manual_anchor_keeps_provenance():
    tracker = BallTracker(1280, 720)
    a = tracker.update([ball()], 0)
    b = tracker.update([ball()], 0.1, cut=True)
    c = tracker.update([], 1, manual=(0.4, 0.5))
    assert a["segment"] != b["segment"] != c["segment"]
    assert c["source"] == "manual" and c["x"] == 0.4
    assert tracker.update([], 2) is None


def test_player_assignment_is_one_to_one_and_camera_compensated():
    tracker = PlayerTracker()
    a = tracker.update([person(0.2), person(0.4)], 0)
    b = tracker.update([person(0.41), person(0.21)], 0.1)
    assert [d["trackId"] for d in b] == [a[1]["trackId"], a[0]["trackId"]]
    c = tracker.update([person(0.51), person(0.31)], 0.2, shift=(0.1, 0))
    assert [d["trackId"] for d in c] == [b[0]["trackId"], b[1]["trackId"]]


def test_event_validation_requires_visible_evidence_and_bounds():
    events = validate_events(
        {
            "events": [
                {
                    "time": 2,
                    "end": 3,
                    "type": "pass",
                    "title": "Pass",
                    "explanation": "Ball travels to another player.",
                    "evidenceTimes": [2, 3],
                    "confidence": 0.8,
                }
            ]
        },
        duration=10,
        sampled_times=[0, 2, 3, 5],
    )
    assert len(events) == 1 and events[0]["reviewStatus"] == "proposed"
    assert not validate_events(
        {"events": [{"time": 20, "end": 21, "type": "goal", "evidenceTimes": [20]}]},
        10,
        [0, 2, 3, 5],
    )
    assert not validate_events(
        {
            "events": [
                {
                    "time": 2,
                    "end": 3,
                    "type": "pass",
                    "evidenceTimes": [2.77],
                    "title": "Pass",
                    "explanation": "Unknown.",
                    "confidence": 0.9,
                }
            ]
        },
        10,
        [0, 2, 3, 5],
    )


def test_reviewer_cannot_silently_turn_proposals_into_model_observations():
    event = {
        "id": "e1",
        "time": 2,
        "end": 3,
        "type": "pass",
        "title": "Pass",
        "explanation": "Proposed pass.",
        "reviewStatus": "proposed",
        "source": "vlm",
        "evidenceTimes": [2, 3],
    }
    reviewed = apply_reviews(
        [event],
        [
            {
                "id": "e1",
                "status": "accepted",
                "note": "Touch and receiver visible at 2–3 seconds.",
            }
        ],
    )
    assert reviewed[0]["source"] == "vlm" and reviewed[0]["reviewStatus"] == "accepted"
    assert event["reviewStatus"] == "proposed"
    with pytest.raises(ValueError):
        apply_reviews([event], [{"id": "e1", "status": "accepted", "note": ""}])


def test_empty_or_truncated_vlm_response_is_not_published_as_analysis():
    with pytest.raises(ValueError, match="empty or truncated"):
        parse_response({"message": {"content": ""}, "done_reason": "length"})
    with pytest.raises(ValueError, match="invalid structured"):
        parse_response({"message": {"content": "not JSON"}, "done_reason": "stop"})
    assert parse_response(
        {"message": {"content": '{"events":[]}'}, "done_reason": "stop"}
    ) == {"events": []}


def test_events_need_two_distinct_frames_and_review_cannot_create_invalid_type():
    raw = {
        "time": 2,
        "end": 3,
        "type": "pass",
        "title": "Pass",
        "explanation": "Visible movement",
        "confidence": 0.8,
        "evidenceTimes": [2, 2],
    }
    assert validate_events({"events": [raw]}, 10, [2, 3]) == []
    event = {**raw, "id": "e1", "reviewStatus": "proposed", "source": "vlm"}
    with pytest.raises(ValueError):
        apply_reviews(
            [event],
            [
                {
                    "id": "e1",
                    "status": "corrected",
                    "note": "Checked frames",
                    "type": "magic",
                }
            ],
        )


def test_segment_review_preserves_raw_measurements_and_requires_reason():
    from pipeline.review_analysis import review_analysis

    raw = {
        "processing": {"sourceSha256": "abc"},
        "source": {"duration": 10},
        "ballTrack": [{"segment": 1}, {"segment": 2}],
    }
    review = {
        "sourceSha256": "abc",
        "rejectedSegments": [
            {"segment": 2, "note": "Pitch-side advert, not the ball."}
        ],
        "events": [],
    }
    result = review_analysis(raw, review)
    assert len(raw["ballTrack"]) == 2 and len(result["ballTrack"]) == 1
    assert result["trackReview"]["removedPoints"] == 1
    with pytest.raises(ValueError):
        review_analysis(raw, {**review, "sourceSha256": "wrong"})
    with pytest.raises(ValueError):
        review_analysis(
            raw, {**review, "rejectedSegments": [{"segment": 2, "note": ""}]}
        )


def test_detector_uses_each_models_own_preprocessing_and_maps_crop_boxes():
    import numpy as np
    from types import SimpleNamespace
    from pipeline.offline.detector import Detector

    class Session:
        def __init__(self, ball):
            self.ball = ball
            self.tensor = None

        def get_outputs(self):
            return [
                SimpleNamespace(name=n)
                for n in (["dets", "labels"] if self.ball else ["pred_boxes", "logits"])
            ]

        def get_inputs(self):
            return [SimpleNamespace(name="images")]

        def run(self, _, inputs):
            self.tensor = inputs["images"]
            logits = np.full((1, 1, 3 if self.ball else 91), -10, dtype=np.float32)
            logits[0, 0, 0 if self.ball else 1] = 10
            return [np.array([[[0.5, 0.5, 0.2, 0.2]]], np.float32), logits]

    detector = Detector.__new__(Detector)
    detector.ball = Session(True)
    detector.people = Session(False)
    image = np.full((720, 1280, 3), 255, np.uint8)
    people = detector.detect(image, [(0.25, 0.25, 0.5, 0.5)], "people")
    balls = detector.detect(image, [(0.25, 0.25, 0.5, 0.5)], "ball")
    assert np.allclose(detector.people.tensor, 1)
    assert np.allclose(
        detector.ball.tensor[0, :, 0, 0],
        (np.ones(3) - [0.485, 0.456, 0.406]) / [0.229, 0.224, 0.225],
    )
    assert people[0]["x"] == pytest.approx(0.45) and balls[0]["width"] == pytest.approx(
        0.1
    )
