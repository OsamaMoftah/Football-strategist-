import numpy as np

class PitchHomography:
    """
    Computes and applies 2D planar homography between image pixel coordinates
    and FIFA pitch metric coordinates (105m x 68m).
    Uses Direct Linear Transformation (DLT) with SVD.
    """
    def __init__(self, src_pts: np.ndarray, dst_pts: np.ndarray):
        assert len(src_pts) >= 4 and len(dst_pts) >= 4, "At least 4 correspondence points required"
        self.H = self._compute_homography(src_pts, dst_pts)
        self.H_inv = np.linalg.pinv(self.H)

    @staticmethod
    def _compute_homography(src: np.ndarray, dst: np.ndarray) -> np.ndarray:
        # Build 2N x 9 matrix A
        A = []
        for i in range(len(src)):
            x, y = src[i][0], src[i][1]
            u, v = dst[i][0], dst[i][1]
            A.append([-x, -y, -1, 0, 0, 0, u*x, u*y, u])
            A.append([0, 0, 0, -x, -y, -1, v*x, v*y, v])
        A = np.array(A, dtype=np.float64)
        
        # SVD decomposition
        _, _, Vh = np.linalg.svd(A)
        H = Vh[-1].reshape(3, 3)
        return H / H[2, 2]

    def project_point(self, x: float, y: float) -> tuple[float, float]:
        """Maps an image point (x, y) to real-world pitch metric coordinates (X, Y)."""
        pt = np.array([x, y, 1.0], dtype=np.float64)
        projected = self.H @ pt
        w = projected[2]
        if abs(w) < 1e-7:
            w = 1e-7
        return float(projected[0] / w), float(projected[1] / w)

    def inverse_project(self, X: float, Y: float) -> tuple[float, float]:
        """Maps pitch metric coordinates (X, Y) back to image pixel space (x, y)."""
        pt = np.array([X, Y, 1.0], dtype=np.float64)
        projected = self.H_inv @ pt
        w = projected[2]
        if abs(w) < 1e-7:
            w = 1e-7
        return float(projected[0] / w), float(projected[1] / w)
