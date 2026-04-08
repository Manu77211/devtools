import platform
import subprocess
import psutil
from pathlib import Path
from typing import Optional, Dict, List, Tuple
from packaging import version as pkg_version
from app.schemas.environment import (
    SystemInfo,
    DependencyIssue,
    DependencyStatus,
    HealthReport,
)


def get_system_info() -> SystemInfo:
    """Get current system information."""
    # OS info
    os_name = platform.system()
    os_version = platform.release()
    
    # Python version
    python_version = f"{platform.python_version()}"
    
    # Node version
    node_version = _get_version("node", "--version")
    
    # Git version
    git_version = _get_version("git", "--version")
    
    # RAM in GB
    ram_gb = psutil.virtual_memory().total / (1024 ** 3)
    
    # Disk space in GB
    disk = psutil.disk_usage("/")
    disk_gb_total = disk.total / (1024 ** 3)
    disk_gb_free = disk.free / (1024 ** 3)
    
    return SystemInfo(
        osName=os_name,
        osVersion=os_version,
        pythonVersion=python_version,
        nodeVersion=node_version,
        gitVersion=git_version,
        ramGb=round(ram_gb, 2),
        diskGbTotal=round(disk_gb_total, 2),
        diskGbFree=round(disk_gb_free, 2),
    )


def _get_version(command: str, flag: str) -> Optional[str]:
    """Get version of a command."""
    try:
        result = subprocess.run(
            [command, flag],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if result.returncode == 0:
            return result.stdout.strip()
    except Exception:
        pass
    return None


def get_installed_packages(manager: str = "pip") -> Dict[str, str]:
    """Get installed packages and versions."""
    try:
        if manager == "pip":
            result = subprocess.run(
                ["pip", "list", "--format=json"],
                capture_output=True,
                text=True,
                timeout=10,
            )
            if result.returncode == 0:
                import json
                packages = json.loads(result.stdout)
                return {pkg["name"].lower(): pkg["version"] for pkg in packages}
        elif manager == "npm":
            result = subprocess.run(
                ["npm", "list", "--json"],
                capture_output=True,
                text=True,
                timeout=10,
                cwd="../frontend",
            )
            if result.returncode == 0 or result.returncode == 1:  # npm returns 1 if some packages are missing
                import json
                try:
                    data = json.loads(result.stdout)
                    packages = {}
                    if "dependencies" in data:
                        for name, info in data["dependencies"].items():
                            if isinstance(info, dict) and "version" in info:
                                packages[name.lower()] = info["version"]
                    return packages
                except json.JSONDecodeError:
                    pass
    except Exception:
        pass
    return {}


def parse_requirements(file_path: str) -> Dict[str, Optional[str]]:
    """Parse requirements.txt file."""
    requirements = {}
    try:
        with open(file_path, "r") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                # Handle various formats: package==1.0, package>=1.0, etc.
                for op in ["==", ">=", "<=", "~=", ">", "<", "!="]:
                    if op in line:
                        parts = line.split(op)
                        pkg_name = parts[0].strip().lower()
                        version = parts[1].strip() if len(parts) > 1 else None
                        requirements[pkg_name] = version
                        break
                else:
                    # No version specified
                    requirements[line.lower()] = None
    except FileNotFoundError:
        pass
    return requirements


def parse_package_json(file_path: str) -> Dict[str, Optional[str]]:
    """Parse package.json file."""
    packages = {}
    try:
        import json
        with open(file_path, "r") as f:
            data = json.load(f)
            # Check dependencies
            for pkg_name, version_spec in data.get("dependencies", {}).items():
                packages[pkg_name.lower()] = version_spec
            # Check devDependencies (lower priority)
            for pkg_name, version_spec in data.get("devDependencies", {}).items():
                if pkg_name.lower() not in packages:
                    packages[pkg_name.lower()] = version_spec
    except Exception:
        pass
    return packages


def check_dependency_status(
    manager: str,
    required: Dict[str, Optional[str]],
    installed: Dict[str, str],
) -> List[DependencyIssue]:
    """Check for missing or mismatched dependencies."""
    issues = []
    
    for pkg_name, required_version in required.items():
        pkg_name_lower = pkg_name.lower()
        
        if pkg_name_lower not in installed:
            # Package is missing
            issues.append(
                DependencyIssue(
                    package=pkg_name,
                    requiredVersion=required_version,
                    installedVersion=None,
                    issueType="missing",
                    severity="high",
                )
            )
        else:
            installed_version = installed[pkg_name_lower]
            # Check version mismatch if required version is specified
            if required_version and installed_version:
                if not _version_matches(installed_version, required_version):
                    issues.append(
                        DependencyIssue(
                            package=pkg_name,
                            requiredVersion=required_version,
                            installedVersion=installed_version,
                            issueType="mismatched",
                            severity="medium",
                        )
                    )
    
    return issues


def _version_matches(installed: str, required: str) -> bool:
    """Check if installed version matches required spec."""
    try:
        installed_v = pkg_version.parse(installed)
        
        # Handle simple cases
        if required.startswith("=="):
            required_v = pkg_version.parse(required[2:])
            return installed_v == required_v
        elif required.startswith(">="):
            required_v = pkg_version.parse(required[2:])
            return installed_v >= required_v
        elif required.startswith(">"):
            required_v = pkg_version.parse(required[1:])
            return installed_v > required_v
        elif required.startswith("<="):
            required_v = pkg_version.parse(required[2:])
            return installed_v <= required_v
        elif required.startswith("<"):
            required_v = pkg_version.parse(required[1:])
            return installed_v < required_v
        elif required.startswith("~="):
            # Compatible release
            required_v = pkg_version.parse(required[2:])
            return installed_v >= required_v
    except Exception:
        pass
    
    return True  # If we can't parse, assume it's ok


def scan_environment() -> HealthReport:
    """Scan environment and generate health report."""
    # Get system info
    system_info = get_system_info()
    
    # Backend dependencies
    backend_required = parse_requirements("requirements.txt")
    backend_installed = get_installed_packages("pip")
    backend_issues = check_dependency_status("pip", backend_required, backend_installed)
    
    # Frontend dependencies
    frontend_required = parse_package_json("../frontend/package.json")
    frontend_installed = get_installed_packages("npm")
    frontend_issues = check_dependency_status("npm", frontend_required, frontend_installed)
    
    # Combine issues
    total_issues = len(backend_issues) + len(frontend_issues)
    
    # Calculate health score: 100 - (issues × 10)
    health_score = max(0, 100 - (total_issues * 10))
    
    # Determine status
    if health_score >= 90:
        status = "healthy"
    elif health_score >= 70:
        status = "warning"
    else:
        status = "critical"
    
    # Generate summary
    if total_issues == 0:
        summary = "Environment is healthy. All dependencies are installed and correctly versioned."
    else:
        summary = f"Found {total_issues} dependency issues. {len(backend_issues)} backend, {len(frontend_issues)} frontend."
    
    dependencies = DependencyStatus(
        backendIssues=backend_issues,
        frontendIssues=frontend_issues,
        totalIssues=total_issues,
    )
    
    return HealthReport(
        healthScore=health_score,
        status=status,
        systemInfo=system_info,
        dependencies=dependencies,
        summary=summary,
    )
