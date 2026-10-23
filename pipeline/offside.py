from typing import List, Dict, Any

def check_offside(
    defenders: List[Dict[str, Any]],
    attacker: Dict[str, Any],
    attacking_direction: str = "right"
) -> Dict[str, Any]:
    """
    Computes offside line based on the second-last defending player
    (including the goalkeeper).
    
    attacking_direction:
      - 'right': attacking towards X=105m. Last defender has the HIGHEST X.
      - 'left': attacking towards X=0m. Last defender has the LOWEST X.
    """
    if len(defenders) < 2:
        return {
            "is_offside": False,
            "margin_cm": 0.0,
            "offside_line_x": attacker.get("x", 0.0),
            "second_last_defender": None
        }

    # Sort defenders by position relative to their goal line
    if attacking_direction == "right":
        # Defenders closest to X=105 have highest X
        sorted_defs = sorted(defenders, key=lambda d: d["x"], reverse=True)
    else:
        # Defenders closest to X=0 have lowest X
        sorted_defs = sorted(defenders, key=lambda d: d["x"])

    # Second-last defender establishes the offside line
    second_last_def = sorted_defs[1]
    offside_line_x = float(second_last_def["x"])
    attacker_x = float(attacker["x"])

    # Margin in cm (positive means onside, negative means offside)
    if attacking_direction == "right":
        delta_m = offside_line_x - attacker_x
    else:
        delta_m = attacker_x - offside_line_x

    margin_cm = delta_m * 100.0
    is_offside = margin_cm < -0.1  # tolerance for floating precision

    return {
        "is_offside": is_offside,
        "margin_cm": round(margin_cm, 1),
        "offside_line_x": round(offside_line_x, 2),
        "second_last_defender_id": second_last_def.get("id"),
        "attacker_id": attacker.get("id")
    }
