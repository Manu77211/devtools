import ast
from typing import Dict, List, Any


class CodeAnalyzer(ast.NodeVisitor):
    """Extracts functions, classes, imports, and function calls from Python code."""
    
    def __init__(self):
        self.functions = []
        self.classes = []
        self.imports = []
        self.calls = []
        self._current_scope = None  # Track which function/class we're in
    
    # ===== Functions =====
    def visit_FunctionDef(self, node: ast.FunctionDef):
        func_info = {
            'name': node.name,
            'lineno': node.lineno,
            'args': [arg.arg for arg in node.args.args],
            'decorators': [d.id if isinstance(d, ast.Name) else ast.unparse(d) 
                          for d in node.decorator_list],
        }
        self.functions.append(func_info)
        
        # Visit function body to collect calls within it
        old_scope = self._current_scope
        self._current_scope = node.name
        self.generic_visit(node)
        self._current_scope = old_scope
    
    # ===== Classes =====
    def visit_ClassDef(self, node: ast.ClassDef):
        class_info = {
            'name': node.name,
            'lineno': node.lineno,
            'bases': [ast.unparse(base) for base in node.bases],
            'methods': [n.name for n in node.body if isinstance(n, ast.FunctionDef)],
        }
        self.classes.append(class_info)
        
        # Continue visiting class body
        self.generic_visit(node)
    
    # ===== Imports =====
    def visit_Import(self, node: ast.Import):
        for alias in node.names:
            self.imports.append({
                'type': 'import',
                'module': alias.name,
                'alias': alias.asname,
                'lineno': node.lineno,
            })
    
    def visit_ImportFrom(self, node: ast.ImportFrom):
        for alias in node.names:
            self.imports.append({
                'type': 'from',
                'module': node.module or '',
                'name': alias.name,
                'alias': alias.asname,
                'level': node.level,  # For relative imports (from . import x)
                'lineno': node.lineno,
            })
    
    # ===== Function Calls =====
    def visit_Call(self, node: ast.Call):
        # Extract the name of the called function
        called_name = self._get_call_name(node.func)
        
        self.calls.append({
            'name': called_name,
            'lineno': node.lineno,
            'scope': self._current_scope,  # Which function contains this call
            'num_args': len(node.args),
        })
        
        # Continue visiting child nodes
        self.generic_visit(node)
    
    def _get_call_name(self, node: ast.expr) -> str:
        """Extract function name from Call node."""
        if isinstance(node, ast.Name):
            return node.id
        elif isinstance(node, ast.Attribute):
            # e.g., obj.method() -> "obj.method"
            value = self._get_call_name(node.value)
            return f"{value}.{node.attr}"
        elif isinstance(node, ast.Subscript):
            # e.g., func[0]() -> "func[0]"
            return ast.unparse(node)
        else:
            return ast.unparse(node)


def analyze_file(file_path: str) -> Dict[str, List[Dict[str, Any]]]:
    """Analyze a single Python file and return extracted data."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            source = f.read()
        
        tree = ast.parse(source, filename=file_path)
        analyzer = CodeAnalyzer()
        analyzer.visit(tree)
        
        return {
            'functions': analyzer.functions,
            'classes': analyzer.classes,
            'imports': analyzer.imports,
            'calls': analyzer.calls,
        }
    except Exception as e:
        print(f"Error analyzing {file_path}: {e}")
        return {
            'functions': [],
            'classes': [],
            'imports': [],
            'calls': [],
        }
