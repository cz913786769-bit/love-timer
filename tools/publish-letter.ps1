param(
  [string]$Message = "chore: update icp safe letter"
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$allowed = "assets/data/icp-safe-data.json"

Push-Location $repoRoot
try {
  $branch = git branch --show-current
  if ($branch -ne "main") {
    throw "Current branch is '$branch'. Switch to main before publishing."
  }

  $porcelain = @(git status --porcelain)
  if ($porcelain.Count -eq 0) {
    throw "No changes to publish."
  }

  $changed = @()
  foreach ($line in $porcelain) {
    $path = $line.Substring(3).Trim()
    if ($path.StartsWith('"') -and $path.EndsWith('"')) {
      $path = $path.Trim('"')
    }
    $changed += $path
  }

  $notAllowed = @($changed | Where-Object { $_ -ne $allowed })
  if ($notAllowed.Count -gt 0) {
    Write-Host "Stopped: files other than $allowed are modified:" -ForegroundColor Yellow
    $notAllowed | ForEach-Object { Write-Host "  $_" }
    throw "Commit aborted."
  }

  Write-Host "Git status:" -ForegroundColor Cyan
  git status --short

  Write-Host "`nDiff:" -ForegroundColor Cyan
  git diff -- $allowed

  $answer = Read-Host "`nCommit and push this letter update? Type YES to continue"
  if ($answer -ne "YES") {
    throw "Publish cancelled."
  }

  git add -- $allowed
  git commit -m $Message
  git push origin main
}
finally {
  Pop-Location
}
