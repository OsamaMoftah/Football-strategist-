import math
from typing import List, Tuple
import numpy as np

def compute_speed(p1: Tuple[float, float], p2: Tuple[float, float], dt_seconds: float) -> float:
    """
    Computes speed in km/h from two metric pitch positions (x, y) separated by dt seconds.
    """
    if dt_seconds <= 0:
        return 0.0
    dx = p2[0] - p1[0]
    dy = p2[1] - p1[1]
    dist_m = math.sqrt(dx * dx + dy * dy)
    speed_mps = dist_m / dt_seconds
    return round(speed_mps * 3.6, 2)

def compute_voronoi_dominance(
    team_a: List[Tuple[float, float]],
    team_b: List[Tuple[float, float]],
    pitch_dim: Tuple[float, float] = (105.0, 68.0),
    num_samples: int = 100
) -> Tuple[float, float]:
    """
    Approximates pitch control / Voronoi territorial dominance (%)
    using 2D sample grid sampling.
    """
    if not team_a or not team_b:
        return 50.0, 50.0

    pts_a = np.array(team_a)
    pts_b = np.array(team_b)

    # Grid of sampling points across pitch
    xs = np.linspace(0, pitch_dim[0], num_samples)
    ys = np.linspace(0, pitch_dim[1], num_samples // 2)
    grid_x, grid_y = np.meshgrid(xs, ys)
    grid_pts = np.vstack([grid_x.ravel(), grid_y.ravel()]).T

    # Compute minimum distance from each grid point to team A vs team B
    # dist_a shape: (N_grid, N_team_a)
    dists_a = np.min(np.linalg.norm(grid_pts[:, None, :] - pts_a[None, :, :], axis=2), axis=1)
    dists_b = np.min(np.linalg.norm(grid_pts[:, None, :] - pts_b[None, :, :], axis=2), axis=1)

    a_wins = np.sum(dists_a < dists_b)
    total = len(grid_pts)
    pct_a = (a_wins / total) * 100.0
    pct_b = 100.0 - pct_a

    return round(pct_a, 1), round(pct_b, 1)

def compute_xt_gain(start_pos: Tuple[float, float], end_pos: Tuple[float, float]) -> float:
    """
    Calculates Expected Threat (xT) gain from moving the ball between pitch zones.
    Approximated by spatial proximity to goal (105, 34) and central half-spaces.
    """
    goal = (105.0, 34.0)
    
    def get_xt(x: float, y: float) -> float:
        # Distance to goal center normalized
        dist = math.sqrt((goal[0] - x)**2 + (goal[1] - y)**2)
        base = max(0.0, 1.0 - (dist / 105.0))
        # Penalty for extreme wide angles
        center_bonus = 1.0 - (abs(y - 34.0) / 34.0) * 0.3
        return (base ** 2.2) * center_bonus * 0.75

    xt_start = get_xt(start_pos[0], start_pos[1])
    xt_end = get_xt(end_pos[0], end_pos[1])
    return round(max(0.0, xt_end - xt_start), 3)
