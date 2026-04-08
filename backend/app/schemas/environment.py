from pydantic import BaseModel, Field
from typing import Optional


class SystemInfo(BaseModel):
    """System information."""
    os_name: str = Field(alias="osName")
    os_version: str = Field(alias="osVersion")
    python_version: str = Field(alias="pythonVersion")
    node_version: Optional[str] = Field(alias="nodeVersion")
    git_version: Optional[str] = Field(alias="gitVersion")
    ram_gb: float = Field(alias="ramGb")
    disk_gb_total: float = Field(alias="diskGbTotal")
    disk_gb_free: float = Field(alias="diskGbFree")

    model_config = {"populate_by_name": True}


class DependencyIssue(BaseModel):
    """A single dependency issue."""
    package: str
    required_version: Optional[str] = Field(alias="requiredVersion")
    installed_version: Optional[str] = Field(alias="installedVersion")
    issue_type: str = Field(alias="issueType")  # "missing" or "mismatched"
    severity: str  # "high", "medium", "low"

    model_config = {"populate_by_name": True}


class DependencyStatus(BaseModel):
    """Dependency status report."""
    backend_issues: list[DependencyIssue] = Field(alias="backendIssues")
    frontend_issues: list[DependencyIssue] = Field(alias="frontendIssues")
    total_issues: int = Field(alias="totalIssues")

    model_config = {"populate_by_name": True}


class HealthReport(BaseModel):
    """Overall environment health report."""
    health_score: int = Field(alias="healthScore")  # 0-100
    status: str  # "healthy", "warning", "critical"
    system_info: SystemInfo = Field(alias="systemInfo")
    dependencies: DependencyStatus
    summary: str

    model_config = {"populate_by_name": True}
