import pytest
import numpy as np
from pipeline.homography import PitchHomography
from pipeline.offside import check_offside
from pipeline.metrics import compute_speed, compute_voronoi_dominance, compute_xt_gain

def test_homography_projection():
    # 4 corners of penalty box in image space
    img_pts = np.array([
        [100, 200],
        [500, 200],
        [600, 400],
        [50, 400]
    ], dtype=np.float32)

    # Corresponding real-world metric coordinates (meters on a 105x68m pitch)
    pitch_pts = np.array([
        [16.5, 13.84],
        [16.5, 54.16],
        [0.0, 54.16],
        [0.0, 13.84]
    ], dtype=np.float32)

    ph = PitchHomography(img_pts, pitch_pts)
    
    # Project image point [100, 200] and verify it matches [16.5, 13.84]
    proj = ph.project_point(100, 200)
    assert pytest.approx(proj[0], 0.1) == 16.5
    assert pytest.approx(proj[1], 0.1) == 13.84

def test_offside_calculation():
    # Defenders at X coordinates (closer to their goal at X=105)
    defenders = [
        {"id": 1, "x": 104.0, "y": 34.0, "role": "GK"},
        {"id": 3, "x": 72.6, "y": 20.0, "role": "CB"}, # last outfield defender
        {"id": 4, "x": 68.0, "y": 30.0, "role": "CB"},
        {"id": 2, "x": 65.0, "y": 10.0, "role": "RB"},
    ]
    
    # Case 1: Attacker onside (Haaland at 72.358m, defender at 72.6m -> onside by 24.2cm)
    attacker_onside = {"id": 9, "x": 72.358, "y": 25.0}
    res_onside = check_offside(defenders, attacker_onside, attacking_direction="right")
    assert res_onside["is_offside"] is False
    assert pytest.approx(res_onside["margin_cm"], 0.5) == 24.2

    # Case 2: Attacker offside (Attacker at 73.0m -> offside by 40cm)
    attacker_offside = {"id": 9, "x": 73.0, "y": 25.0}
    res_offside = check_offside(defenders, attacker_offside, attacking_direction="right")
    assert res_offside["is_offside"] is True
    assert pytest.approx(res_offside["margin_cm"], 0.5) == -40.0

def test_speed_calculation():
    # Player moves 2.5 meters in 0.25 seconds (10 m/s = 36.0 km/h)
    p1 = (10.0, 20.0)
    p2 = (12.5, 20.0)
    dt = 0.25
    speed_kmh = compute_speed(p1, p2, dt)
    assert pytest.approx(speed_kmh, 0.1) == 36.0

def test_voronoi_dominance():
    # Team A (City) and Team B (Real) positions
    team_a = [(50.0, 30.0), (60.0, 40.0), (70.0, 20.0)]
    team_b = [(30.0, 30.0), (40.0, 40.0)]
    dom_a, dom_b = compute_voronoi_dominance(team_a, team_b, pitch_dim=(105, 68), num_samples=100)
    assert dom_a + dom_b == pytest.approx(100.0, 1.0)
    assert dom_a > dom_b  # Team A has more forward presence

def test_xt_gain():
    # Pass from center circle (x=52.5, y=34.0) into dangerous Zone 14 (x=80.0, y=34.0)
    gain = compute_xt_gain((52.5, 34.0), (80.0, 34.0))
    assert gain > 0.05
