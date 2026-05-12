# ChronoCoding Smoke Test (PowerShell)
# Verify directory structure and key files

$ErrorActionPreference = "Stop"
$PASS = 0
$FAIL = 0

function Test-ItemExists {
    param($Path, $Desc)
    if (Test-Path $Path) {
        Write-Host "  [PASS] $Desc" -ForegroundColor Green
        $script:PASS++
    } else {
        Write-Host "  [FAIL] $Desc (missing: $Path)" -ForegroundColor Red
        $script:FAIL++
    }
}

function Test-NoClaudeRefs {
    param($Path, $Desc)
    $files = Get-ChildItem -Path $Path -Recurse -File | Where-Object { $_.Extension -in @('.md','.cjs','.js','.mjs','.json') }
    $hasRefs = $false
    foreach ($f in $files) {
        $content = Get-Content -Path $f.FullName -Raw -ErrorAction SilentlyContinue
        # Skip ~/.claude/ (user home examples) and {IDE_ROOT}/.claude/ (intentional)
        $cleanContent = $content -replace '~/.claude/', '' -replace '\{IDE_ROOT\}/.claude/', ''
        if ($cleanContent -match '(?<!\{IDE_)\.claude/') {
            Write-Host "  [FAIL] $Desc - found .claude/ ref: $($f.FullName)" -ForegroundColor Red
            $hasRefs = $true
            $script:FAIL++
            break
        }
    }
    if (-not $hasRefs) {
        Write-Host "  [PASS] $Desc - no .claude/ refs" -ForegroundColor Green
        $script:PASS++
    }
}

Write-Host "`n=== ChronoCoding Smoke Test ===" -ForegroundColor Cyan

# 1. Directory structure
Write-Host "`n[1/6] Directory structure" -ForegroundColor Yellow
Test-ItemExists -Path "./skills" -Desc "skills/"
Test-ItemExists -Path "./helpers" -Desc "helpers/"
Test-ItemExists -Path "./rules" -Desc "rules/"
Test-ItemExists -Path "./templates" -Desc "templates/"
Test-ItemExists -Path "./memory" -Desc "memory/"
Test-ItemExists -Path "./docs" -Desc "docs/"

# 2. Config files
Write-Host "`n[2/6] Config files" -ForegroundColor Yellow
Test-ItemExists -Path "./model-config.json" -Desc "model-config.json"
Test-ItemExists -Path "./install.ps1" -Desc "install.ps1"
Test-ItemExists -Path "./install.sh" -Desc "install.sh"

# 3. Core skills
Write-Host "`n[3/6] Core skills" -ForegroundColor Yellow
Test-ItemExists -Path "./skills/kf-multi-team-compete" -Desc "kf-multi-team-compete"
Test-ItemExists -Path "./skills/kf-alignment" -Desc "kf-alignment"
Test-ItemExists -Path "./skills/kf-spec" -Desc "kf-spec"
Test-ItemExists -Path "./skills/kf-code-review-graph" -Desc "kf-code-review-graph"

# 4. Core helpers
Write-Host "`n[4/6] Core helpers" -ForegroundColor Yellow
Test-ItemExists -Path "./helpers/hammer-bridge.cjs" -Desc "hammer-bridge.cjs"
Test-ItemExists -Path "./helpers/hang-state-manager.cjs" -Desc "hang-state-manager.cjs"
Test-ItemExists -Path "./helpers/gate-executor.cjs" -Desc "gate-executor.cjs"

# 5. Path variable check
Write-Host "`n[5/6] Path variable check" -ForegroundColor Yellow
Test-NoClaudeRefs -Path "./skills" -Desc "skills/"
Test-NoClaudeRefs -Path "./helpers" -Desc "helpers/"
Test-NoClaudeRefs -Path "./rules" -Desc "rules/"

# 6. Deleted items
Write-Host "`n[6/6] Deleted items" -ForegroundColor Yellow
if (Test-Path "./skills/kf-go") {
    Write-Host "  [FAIL] kf-go should be deleted" -ForegroundColor Red
    $FAIL++
} else {
    Write-Host "  [PASS] kf-go deleted" -ForegroundColor Green
    $PASS++
}

# Summary
Write-Host "`n=== Results ===" -ForegroundColor Cyan
Write-Host "PASS: $PASS" -ForegroundColor Green
Write-Host "FAIL: $FAIL" -ForegroundColor Red
Write-Host "Total: $($PASS + $FAIL)"

if ($FAIL -eq 0) {
    Write-Host "`nAll tests passed!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "`nSome tests failed." -ForegroundColor Red
    exit 1
}
