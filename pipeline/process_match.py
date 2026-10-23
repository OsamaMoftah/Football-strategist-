import json
import math
from pipeline.metrics import compute_speed, compute_voronoi_dominance, compute_xt_gain
from pipeline.offside import check_offside

def generate_sample_match():
    """Generates realistic timestamped tracking frames and events for the web studio."""
    frames = []
    fps = 30
    duration_sec = 20
    total_frames = fps * duration_sec

    # Base formation points
    # City (attacking right, X: 40 -> 80)
    city_players = [
        {"id": 31, "name": "Ederson", "num": 31, "team": "city", "x": 12.0, "y": 34.0},
        {"id": 2, "name": "Walker", "num": 2, "team": "city", "x": 45.0, "y": 14.0},
        {"id": 3, "name": "Dias", "num": 3, "team": "city", "x": 42.0, "y": 28.0},
        {"id": 25, "name": "Akanji", "num": 25, "team": "city", "x": 42.0, "y": 40.0},
        {"id": 24, "name": "Gvardiol", "num": 24, "team": "city", "x": 48.0, "y": 56.0},
        {"id": 16, "name": "Rodri", "num": 16, "team": "city", "x": 52.0, "y": 34.0},
        {"id": 8, "name": "Kovačić", "num": 8, "team": "city", "x": 58.0, "y": 22.0},
        {"id": 17, "name": "De Bruyne", "num": 17, "team": "city", "x": 64.0, "y": 38.0},
        {"id": 20, "name": "B. Silva", "num": 20, "team": "city", "x": 70.0, "y": 16.0},
        {"id": 47, "name": "Foden", "num": 47, "team": "city", "x": 68.0, "y": 52.0},
        {"id": 9, "name": "Haaland", "num": 9, "team": "city", "x": 74.0, "y": 34.0},
    ]

    # Real Madrid (defending right, X: 65 -> 100)
    real_players = [
        {"id": 1, "name": "Courtois", "num": 1, "team": "real", "x": 102.0, "y": 34.0},
        {"id": 2, "name": "Carvajal", "num": 2, "team": "real", "x": 76.0, "y": 14.0},
        {"id": 3, "name": "Militão", "num": 3, "team": "real", "x": 78.5, "y": 28.0},
        {"id": 22, "name": "Rüdiger", "num": 22, "team": "real", "x": 79.2, "y": 40.0},
        {"id": 23, "name": "Mendy", "num": 23, "team": "real", "x": 77.0, "y": 56.0},
        {"id": 18, "name": "Tchouaméni", "num": 18, "team": "real", "x": 68.0, "y": 34.0},
        {"id": 15, "name": "Valverde", "num": 15, "team": "real", "x": 65.0, "y": 20.0},
        {"id": 8, "name": "Kroos", "num": 8, "team": "real", "x": 66.0, "y": 38.0},
        {"id": 5, "name": "Bellingham", "num": 5, "team": "real", "x": 60.0, "y": 48.0},
        {"id": 11, "name": "Rodrygo", "num": 11, "team": "real", "x": 55.0, "y": 20.0},
        {"id": 7, "name": "Vinícius", "num": 7, "team": "real", "x": 54.0, "y": 50.0},
    ]

    for f in range(total_frames):
        t = f / fps
        progress = (math.sin(t * 0.8) + 1) / 2
        
        # Ball moves between De Bruyne (64, 38) and Haaland (74 + run, 34)
        ball_x = 64.0 + progress * 16.0
        ball_y = 38.0 - math.sin(progress * math.pi) * 6.0
        ball_speed = 75.0 + math.sin(progress * math.pi) * 28.0

        # Haaland sprint
        haaland = next(p for p in city_players if p["num"] == 9)
        haaland["x"] = 74.0 + progress * 4.2
        haaland["speed_kmh"] = round(28.0 + progress * 6.8, 1)

        # Offside calculation against Real defenders
        offside_info = check_offside(real_players, haaland, attacking_direction="right")

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
            "city_players": [{**p, "x": round(p["x"], 2), "y": round(p["y"], 2)} for p in city_players],
            "real_players": [{**p, "x": round(p["x"], 2), "y": round(p["y"], 2)} for p in real_players]
        }
        frames.append(frame_data)

    output = {
        "match": "UEFA Champions League: Manchester City vs Real Madrid",
        "stadium": "Santiago Bernabéu",
        "pitch_size_m": [105, 68],
        "fps": fps,
        "duration_sec": duration_sec,
        "events": [
            {"time": 4.2, "type": "Turnover", "desc": "Rodri wins second ball in midfield", "xT": 0.08},
            {"time": 9.8, "type": "Key Pass", "desc": "De Bruyne through-ball between Militão and Rüdiger", "xT": 0.42},
            {"time": 14.5, "type": "Shot", "desc": "Haaland first-time strike inside 18-yard box", "xT": 0.38}
        ],
        "frames": frames
    }

    import os
    os.makedirs("public/data", exist_ok=True)
    with open("public/data/match_sample.json", "w") as fp:
        json.dump(output, fp, indent=2)
    print(f"Generated sample match with {len(frames)} frames into public/data/match_sample.json")

if __name__ == "__main__":
    generate_sample_match()
