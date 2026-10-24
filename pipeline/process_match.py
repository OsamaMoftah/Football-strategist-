import json
import math
from pipeline.offside import check_offside

def generate_sample_match():
    """Generate an illustrative, synthetic metric-space sequence for the web studio."""
    frames = []
    fps = 30
    duration_sec = 20
    total_frames = fps * duration_sec

    # Base formation points
    # Home team attacking right (X: 40 -> 80)
    home_players = [
        {"id": 31, "name": "Home 31", "num": 31, "team": "home", "x": 12.0, "y": 34.0},
        {"id": 2, "name": "Home 02", "num": 2, "team": "home", "x": 45.0, "y": 14.0},
        {"id": 3, "name": "Home 03", "num": 3, "team": "home", "x": 42.0, "y": 28.0},
        {"id": 25, "name": "Home 25", "num": 25, "team": "home", "x": 42.0, "y": 40.0},
        {"id": 24, "name": "Home 24", "num": 24, "team": "home", "x": 48.0, "y": 56.0},
        {"id": 16, "name": "Home 16", "num": 16, "team": "home", "x": 52.0, "y": 34.0},
        {"id": 8, "name": "Home 08", "num": 8, "team": "home", "x": 58.0, "y": 22.0},
        {"id": 17, "name": "Home 17", "num": 17, "team": "home", "x": 64.0, "y": 38.0},
        {"id": 20, "name": "Home 20", "num": 20, "team": "home", "x": 70.0, "y": 16.0},
        {"id": 47, "name": "Home 47", "num": 47, "team": "home", "x": 68.0, "y": 52.0},
        {"id": 9, "name": "Home 09", "num": 9, "team": "home", "x": 74.0, "y": 34.0},
    ]

    away_players = [
        {"id": 1, "name": "Away 01", "num": 1, "team": "away", "x": 102.0, "y": 34.0},
        {"id": 2, "name": "Away 02", "num": 2, "team": "away", "x": 76.0, "y": 14.0},
        {"id": 3, "name": "Away 03", "num": 3, "team": "away", "x": 78.5, "y": 28.0},
        {"id": 22, "name": "Away 22", "num": 22, "team": "away", "x": 79.2, "y": 40.0},
        {"id": 23, "name": "Away 23", "num": 23, "team": "away", "x": 77.0, "y": 56.0},
        {"id": 18, "name": "Away 18", "num": 18, "team": "away", "x": 68.0, "y": 34.0},
        {"id": 15, "name": "Away 15", "num": 15, "team": "away", "x": 65.0, "y": 20.0},
        {"id": 8, "name": "Away 08", "num": 8, "team": "away", "x": 66.0, "y": 38.0},
        {"id": 5, "name": "Away 05", "num": 5, "team": "away", "x": 60.0, "y": 48.0},
        {"id": 11, "name": "Away 11", "num": 11, "team": "away", "x": 55.0, "y": 20.0},
        {"id": 7, "name": "Away 07", "num": 7, "team": "away", "x": 54.0, "y": 50.0},
    ]

    for f in range(total_frames):
        t = f / fps
        progress = (math.sin(t * 0.8) + 1) / 2
        
        # Ball moves between the sample passer and runner.
        ball_x = 64.0 + progress * 16.0
        ball_y = 38.0 - math.sin(progress * math.pi) * 6.0
        ball_speed = 75.0 + math.sin(progress * math.pi) * 28.0

        # Sample forward run.
        runner = next(p for p in home_players if p["num"] == 9)
        runner["x"] = 74.0 + progress * 4.2
        runner["speed_kmh"] = round(28.0 + progress * 6.8, 1)

        # Simple geometric comparison against the second-last away defender.
        offside_info = check_offside(away_players, runner, attacking_direction="right")

        frame_data = {
            "frame_idx": f,
            "timestamp": round(t, 2),
            "ball": {
                "x": round(ball_x, 2),
                "y": round(ball_y, 2),
                "speed_kmh": round(ball_speed, 1),
                "height_m": round(math.sin(progress * math.pi) * 1.8, 2)
            },
            "offside": offside_info,
            "home_players": [{**p, "x": round(p["x"], 2), "y": round(p["y"], 2)} for p in home_players],
            "away_players": [{**p, "x": round(p["x"], 2), "y": round(p["y"], 2)} for p in away_players]
        }
        frames.append(frame_data)

    output = {
        "match": "Synthetic tracking sample",
        "stadium": "Illustrative data; no match footage attached",
        "pitch_size_m": [105, 68],
        "fps": fps,
        "duration_sec": duration_sec,
        "data_status": "synthetic",
        "video_alignment": None,
        "events": [
            {"time": 4.2, "type": "Possession change", "desc": "Home recovers the ball in midfield", "xT": 0.08},
            {"time": 9.8, "type": "Progressive pass", "desc": "Home advances between the defensive lines", "xT": 0.42},
            {"time": 14.5, "type": "Final-third entry", "desc": "Home carries into the attacking area", "xT": 0.38}
        ],
        "frames": frames
    }

    import os
    os.makedirs("public/data", exist_ok=True)
    with open("public/data/match_sample.json", "w") as fp:
        json.dump(output, fp, indent=2)
    print(f"Generated synthetic sample with {len(frames)} frames into public/data/match_sample.json")

if __name__ == "__main__":
    generate_sample_match()
