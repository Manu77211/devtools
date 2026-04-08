from fastapi import APIRouter, Depends
from pathlib import Path
import os

from app.core.auth import get_org_id
from app.schemas.review import GraphPayload
from app.services.code_parser import analyze_file
from app.services.graph_builder import build_graph_from_analysis

router = APIRouter(prefix="/api/v1/graph", tags=["graph"])


@router.get("/build", response_model=GraphPayload)
async def build_graph(path: str = "app", org_id: str = Depends(get_org_id)) -> GraphPayload:
    """Build a code graph from a directory path."""
    _ = org_id
    
    # Convert relative path to absolute
    if not os.path.isabs(path):
        base_path = Path(__file__).parent.parent.parent  # Go up to backend/
        full_path = base_path / path
    else:
        full_path = Path(path)
    
    if not full_path.exists() or not full_path.is_dir():
        # Return empty graph for invalid paths
        return GraphPayload(nodes=[], edges=[])
    
    # Analyze all Python files in the directory
    analysis_data = {}
    for py_file in full_path.rglob("*.py"):
        if ".venv" not in str(py_file) and "venv" not in str(py_file):
            try:
                data = analyze_file(str(py_file))
                analysis_data[str(py_file.relative_to(full_path))] = data
            except Exception:
                pass  # Skip problematic files
    
    # Build graph from analysis
    graph = build_graph_from_analysis(analysis_data)
    return graph
