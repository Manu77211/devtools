import networkx as nx
from typing import List, Dict, Any, Tuple
from app.schemas.review import GraphNode, GraphEdge, GraphPayload


def create_code_graph(
    files: List[Dict],
    functions: List[Dict],
    classes: List[Dict],
    imports: List[Dict],
    calls: List[Dict]
) -> nx.DiGraph:
    """Create a NetworkX DiGraph from code analysis data."""
    
    G = nx.DiGraph()
    
    # Add file nodes
    for file_info in files:
        G.add_node(file_info['path'], node_type='file')
    
    # Add function nodes
    for func in functions:
        node_id = f"{func['file']}::{func['name']}"
        G.add_node(node_id, node_type='function', file=func['file'])
    
    # Add class nodes
    for cls in classes:
        node_id = f"{cls['file']}::{cls['name']}"
        G.add_node(node_id, node_type='class', file=cls['file'])
    
    # Add edges for imports (file -> module)
    for imp in imports:
        module_id = f"module::{imp['module']}"
        if module_id not in G:
            G.add_node(module_id, node_type='module')
        G.add_edge(imp['file'], module_id, relation='imports')
    
    # Add edges for function calls (func -> func)
    for call in calls:
        caller_id = f"{call['file']}::{call['caller']}"
        callee_id = f"{call['file']}::{call['callee']}"
        if caller_id in G and callee_id in G:
            G.add_edge(caller_id, callee_id, relation='calls')
    
    return G


def layout_graph_simple(G: nx.DiGraph, scale: int = 1000) -> Dict[str, Tuple[float, float]]:
    """
    Apply a simple layout algorithm.
    Options: 'spring', 'circular', 'shell'
    """
    if len(G.nodes()) == 0:
        return {}
    
    # Spring layout works well for most graphs
    pos = nx.spring_layout(G, k=2, iterations=50, seed=42)
    
    # Scale to desired coordinate space
    scaled_pos = {}
    for node, (x, y) in pos.items():
        scaled_pos[node] = (x * scale, y * scale)
    
    return scaled_pos


def convert_to_payload(G: nx.DiGraph, positions: Dict) -> GraphPayload:
    """Convert NetworkX graph to GraphPayload format."""
    
    payload = GraphPayload(nodes=[], edges=[])
    
    # Convert nodes
    for node in G.nodes():
        attrs = G.nodes[node]
        node_type = attrs.get('node_type', 'unknown')
        
        x, y = positions.get(node, (0, 0))
        
        payload.nodes.append(GraphNode(
            id=str(node),
            label=node.split('::')[-1],  # Use basename for label
            type=node_type,
            x=int(x),
            y=int(y)
        ))
    
    # Convert edges
    edge_id = 0
    for source, target, attrs in G.edges(data=True):
        payload.edges.append(GraphEdge(
            id=f"edge_{edge_id}",
            source=str(source),
            target=str(target),
            relation=attrs.get('relation', 'unknown')
        ))
        edge_id += 1
    
    return payload


def build_graph_from_analysis(analysis_data: Dict[str, List[Dict]]) -> GraphPayload:
    """Build graph from the analysis data structure."""
    
    files = []
    functions = []
    classes = []
    imports = []
    calls = []
    
    # Process each file's analysis
    for file_path, data in analysis_data.items():
        files.append({'path': file_path})
        
        for func in data.get('functions', []):
            functions.append({**func, 'file': file_path})
        
        for cls in data.get('classes', []):
            classes.append({**cls, 'file': file_path})
        
        for imp in data.get('imports', []):
            imports.append({**imp, 'file': file_path})
        
        for call in data.get('calls', []):
            calls.append({**call, 'file': file_path})
    
    # Create graph
    G = create_code_graph(files, functions, classes, imports, calls)
    
    # Apply layout
    positions = layout_graph_simple(G)
    
    # Convert to payload
    payload = convert_to_payload(G, positions)
    
    return payload
