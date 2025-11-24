<#
.SYNOPSIS
Builds and packages the Stash Downloader plugin for manual installation on Windows.
#>

param (
    [string]$OutputRoot = "build/export"
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

$packageName = "stash-downloader"
$distPath = Join-Path $repoRoot "dist"
$outputDir = Join-Path $repoRoot $OutputRoot
$packageDir = Join-Path $outputDir $packageName
$zipPath = Join-Path $outputDir "$packageName.zip"

Write-Host "[export] Cleaning previous artifacts..."
Remove-Item $distPath -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item $packageDir -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item $zipPath -Force -ErrorAction SilentlyContinue
New-Item $outputDir -ItemType Directory -Force | Out-Null

if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    throw "[export] pnpm is required but was not found in PATH."
}

Write-Host "[export] Installing dependencies..."
pnpm install

Write-Host "[export] Building plugin..."
pnpm build

Write-Host "[export] Preparing export directory..."
New-Item $packageDir -ItemType Directory -Force | Out-Null
Copy-Item "stash-downloader.yml" $packageDir -Force
Copy-Item "README.md","LICENSE" $packageDir -Force
Copy-Item "dist" $packageDir -Recurse -Force

Write-Host "[export] Creating archive..."
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}
Compress-Archive -Path $packageDir -DestinationPath $zipPath -Force

Write-Host "[export] Done. Folder: $packageDir"
Write-Host "[export] Archive: $zipPath"

