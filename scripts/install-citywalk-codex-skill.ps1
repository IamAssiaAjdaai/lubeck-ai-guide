param(
  [switch]$Force
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$source = Join-Path $repoRoot "tools\codex\skills\citywalk-engineering"
$skillsRoot = Join-Path $HOME ".agents\skills"
$destination = Join-Path $skillsRoot "citywalk-engineering"

if (-not (Test-Path $source)) {
  throw "CITYWALK skill source was not found at $source"
}

if ((Test-Path $destination) -and -not $Force) {
  throw "A CITYWALK skill is already installed at $destination. Re-run with -Force to replace it."
}

New-Item -ItemType Directory -Path $skillsRoot -Force | Out-Null

if (Test-Path $destination) {
  Remove-Item -Path $destination -Recurse -Force
}

New-Item -ItemType Directory -Path $destination -Force | Out-Null
Copy-Item -Path (Join-Path $source "*") -Destination $destination -Recurse -Force

$skillFile = Join-Path $destination "SKILL.md"
if (-not (Test-Path $skillFile)) {
  throw "Skill installation failed: $skillFile is missing."
}

Write-Host "Installed CITYWALK Codex skill:" $skillFile
Write-Host "Restart Codex or start a new Codex thread so skill discovery can refresh."
Write-Host "Repository AGENTS.md remains authoritative even if the skill is not discovered."
