# Puts the nvm-managed Node at the front of PATH *for the current shell only*.
#
# Why this exists: on this machine a system-wide Node sits in the machine-level
# PATH, which Windows always searches before the user-level PATH. `nvm use`
# updates the nvm symlink correctly, but the shadowing entry still wins, so
# `node -v` keeps reporting the old version. Fixing that permanently means
# editing the machine PATH, which needs an administrator.
#
# This script sidesteps it without admin rights: dot-source it and the correct
# Node wins for as long as the shell lives.
#
#   . .\scripts\use-node.ps1
#
# The leading dot matters — running it normally would set PATH in a child
# process that exits immediately.

$ErrorActionPreference = 'Stop'

$pinned = (Get-Content (Join-Path $PSScriptRoot '..\.nvmrc')).Trim()

# Prefer nvm's own symlink: it follows `nvm use`, so this keeps working after a
# version bump. Fall back to the concrete version directory if it is missing.
$nvmRoot = if ($env:NVM_HOME) { $env:NVM_HOME } else { 'G:\nvm' }

$candidates = @(
    'G:\nodejs-current',
    (Join-Path $nvmRoot "v$pinned")
)

$nodeDir = $candidates | Where-Object { Test-Path (Join-Path $_ 'node.exe') } | Select-Object -First 1

if (-not $nodeDir) {
    Write-Error "Node $pinned not found. Install it with: nvm install $pinned"
    return
}

$resolved = & (Join-Path $nodeDir 'node.exe') -v

if ($resolved.TrimStart('v') -notlike "$pinned*") {
    Write-Warning "$nodeDir reports $resolved, but .nvmrc pins $pinned."
    Write-Warning "Run: nvm use $pinned"
}

# Drop any other Node directory so the shadowing entry cannot win.
$cleaned = ($env:Path -split ';' | Where-Object {
    $_ -and -not (Test-Path (Join-Path $_ 'node.exe') -ErrorAction SilentlyContinue)
}) -join ';'

$env:Path = "$nodeDir;$cleaned"

Write-Host "node $(node -v)  npm $(npm -v)   [$nodeDir]" -ForegroundColor Green
