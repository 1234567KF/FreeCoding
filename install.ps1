#!/usr/bin/env pwsh
<#
.SYNOPSIS
    AI编程智驾 — 通用适配版安装脚本 (Windows)
.DESCRIPTION
    将通用适配产物安装到目标 IDE 目录（Qoder / Trae / Cursor），
    生成 IDE 专属配置文件，引导填写 API 密钥。
    安全：生成的 settings.local.json 已加入 .gitignore，不会提交密钥。
.PARAMETER IDE
    目标 IDE：qoder / trae / cursor / windsurf
.PARAMETER TargetDir
    目标项目目录（默认：当前目录）
.PARAMETER SourceDir
    通用适配产物目录（默认：脚本所在目录）
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("qoder", "trae", "cursor", "windsurf")]
    [string]$IDE,

    [string]$TargetDir = (Get-Location),
    [string]$SourceDir = $PSScriptRoot
)

$ErrorActionPreference = "Stop"

# ─── IDE 配置映射 ──────────────────────────────────────────────────────
# AgentsDir  : /夯 子智能体定义分发目录（相对 Root）
# AgentsExt  : 扩展名（Cursor 用 .mdc，其余 .md）
# IsSubagent : true=IDE 原生支持 Agent() 真并发；false=仅作为角色规则，串行模拟
$IDE_MAP = @{
    qoder    = @{ Root = ".qoder"; Config = "qoder.md"; HasRulesDir = $true;
                  AgentsDir = "agents"; AgentsExt = ".md";  IsSubagent = $true }
    trae     = @{ Root = ".trae";  Config = "rules/project_rules.md"; HasRulesDir = $true;
                  AgentsDir = "rules";  AgentsExt = ".md";  IsSubagent = $false }
    cursor   = @{ Root = ".cursor"; Config = ".cursorrules"; HasRulesDir = $false;
                  AgentsDir = "rules";  AgentsExt = ".mdc"; IsSubagent = $false }
    windsurf = @{ Root = ".windsurf"; Config = ".windsurfrules"; HasRulesDir = $false;
                  AgentsDir = "rules";  AgentsExt = ".md";  IsSubagent = $false }
}

$IDE_CFG = $IDE_MAP[$IDE]
$IDERoot = Join-Path $TargetDir $IDE_CFG.Root
$IDEConfigFile = Join-Path $IDERoot $IDE_CFG.Config

Write-Host "=== AI编程智驾 通用适配版安装 ===" -ForegroundColor Cyan
Write-Host "目标 IDE : $IDE" -ForegroundColor White
Write-Host "目标目录 : $IDERoot" -ForegroundColor White
Write-Host ""

# ─── Step 1: 环境检测 ──────────────────────────────────────────────────
Write-Host "=== 环境检测 ===" -ForegroundColor Cyan

$nodeOk = $null -ne (Get-Command "node" -ErrorAction SilentlyContinue)
$gitOk  = $null -ne (Get-Command "git"  -ErrorAction SilentlyContinue)

if ($nodeOk) {
    $nodeVer = node --version
    Write-Host "  [✓] Node.js $nodeVer" -ForegroundColor Green
    if ($nodeVer -notmatch "^v(1[8-9]|2[0-9])") {
        Write-Host "  [!] 建议 Node.js >= 18" -ForegroundColor Yellow
    }
} else {
    Write-Host "  [✗] Node.js 未安装 — 请先安装 Node.js 18+" -ForegroundColor Red
}

if ($gitOk) {
    Write-Host "  [✓] Git $(git --version)" -ForegroundColor Green
} else {
    Write-Host "  [✗] Git 未安装 — 请先安装 Git" -ForegroundColor Red
}

if (!$nodeOk -or !$gitOk) {
    Write-Host "`n环境检测未通过，请先安装缺失依赖。" -ForegroundColor Red
    exit 1
}

# ─── Step 2: 创建 IDE 目录结构 ─────────────────────────────────────────
Write-Host "`n=== 创建 IDE 目录结构 ===" -ForegroundColor Cyan

$subdirs = @("helpers", "hooks", "monitor", "memory", "templates", "skills")
if ($IDE_CFG.HasRulesDir) {
    $subdirs += "rules"
}

foreach ($d in $subdirs) {
    $p = Join-Path $IDERoot $d
    New-Item -ItemType Directory -Force -Path $p | Out-Null
}

Write-Host "  [✓] 目录结构已创建" -ForegroundColor Green

# ─── Step 3: 复制通用文件 ──────────────────────────────────────────────
Write-Host "`n=== 复制通用文件 ===" -ForegroundColor Cyan

# 复制规则文件
if ($IDE_CFG.HasRulesDir) {
    Copy-Item (Join-Path $SourceDir "rules\*") (Join-Path $IDERoot "rules\") -Recurse -Force
    Write-Host "  [✓] rules/ 已复制" -ForegroundColor Green
}

# 复制 model-config.json
Copy-Item (Join-Path $SourceDir "model-config.json") $IDERoot -Force
Write-Host "  [✓] model-config.json 已复制" -ForegroundColor Green

# 复制 settings.json.template → settings.json
$settingsTemplate = Get-Content (Join-Path $SourceDir "settings.json.template") -Raw
$settingsContent = $settingsTemplate -replace "\{IDE_ROOT\}", $IDE_CFG.Root
Set-Content -Path (Join-Path $IDERoot "settings.json") -Value $settingsContent -Encoding UTF8
Write-Host "  [✓] settings.json 已生成" -ForegroundColor Green

# ─── Step 3.5: 分发 /夯 子智能体定义到 IDE 专属目录 ──────────────────────
Write-Host "`n=== 分发 /夯 子智能体定义 ===" -ForegroundColor Cyan

$HammerAgentsSource = Join-Path $SourceDir "skills\kf-multi-team-compete\kf-multi-team-compete\agents"
if (Test-Path $HammerAgentsSource) {
    $AgentsTarget = Join-Path $IDERoot $IDE_CFG.AgentsDir
    New-Item -ItemType Directory -Force -Path $AgentsTarget | Out-Null

    $agentFiles = Get-ChildItem -Path $HammerAgentsSource -Filter "kf-hammer-*.md"
    foreach ($f in $agentFiles) {
        $baseName = [System.IO.Path]::GetFileNameWithoutExtension($f.Name)
        $targetFile = Join-Path $AgentsTarget "$baseName$($IDE_CFG.AgentsExt)"
        Copy-Item -Path $f.FullName -Destination $targetFile -Force
    }

    if ($IDE_CFG.IsSubagent) {
        Write-Host "  [✓] 已分发 $($agentFiles.Count) 个子智能体定义 → $($IDE_CFG.AgentsDir)/" -ForegroundColor Green
        Write-Host "  [i] $IDE 原生支持 Agent 并发调用（真并发模式）" -ForegroundColor Gray
    } else {
        Write-Host "  [✓] 已分发 $($agentFiles.Count) 个角色规则 → $($IDE_CFG.AgentsDir)/" -ForegroundColor Green
        Write-Host "  [i] $IDE 无原生 subagent，/夯 走串行角色切换模式" -ForegroundColor Yellow
    }
} else {
    Write-Host "  [!] 未找到 shared agents 源目录，跳过" -ForegroundColor Yellow
}

# ─── Step 4: 生成 IDE 主配置 ───────────────────────────────────────────
Write-Host "`n=== 生成 IDE 主配置 ===" -ForegroundColor Cyan

$configTemplate = Get-Content (Join-Path $SourceDir "{IDE_CONFIG}.template") -Raw
$configContent = $configTemplate -replace "\{IDE_ROOT\}", $IDE_CFG.Root -replace "\{IDE_CONFIG\}", $IDE_CFG.Config

# 确保配置文件的父目录存在
$IDEConfigParent = Split-Path $IDEConfigFile -Parent
if (!(Test-Path $IDEConfigParent)) {
    New-Item -ItemType Directory -Force -Path $IDEConfigParent | Out-Null
}

Set-Content -Path $IDEConfigFile -Value $configContent -Encoding UTF8
Write-Host "  [✓] $($IDE_CFG.Config) 已生成" -ForegroundColor Green

# ─── Step 5: 生成 settings.local.json（API 密钥）────────────────────────
Write-Host "`n=== 配置 API 密钥 ===" -ForegroundColor Cyan

$LocalConfig = Join-Path $IDERoot "settings.local.json"
$Gitignore = Join-Path $TargetDir ".gitignore"

if (Test-Path $LocalConfig) {
    Write-Host "  [i] settings.local.json 已存在，跳过生成。" -ForegroundColor Yellow
} else {
    Write-Host "以下密钥仅保存在本地 settings.local.json，不会提交到 Git。`n" -ForegroundColor Gray

    $deepseekKey = Read-Host "请输入 DEEPSEEK_API_KEY (必填)"
    $minimaxKey = Read-Host "请输入 MINIMAX_API_KEY (留空则跳过 MiniMax)"
    $kimiKey = Read-Host "请输入 KIMI_API_KEY (留空则跳过 Kimi)"

    $config = @{
        env = @{
            DEEPSEEK_API_KEY = $deepseekKey
            MINIMAX_API_KEY  = $minimaxKey
            KIMI_API_KEY     = $kimiKey
            AI_CODING_VERBOSE = "1"
        }
        model       = "deepseek-v4-flash"
        outputStyle = "stream"
        verbose     = $true
    }

    $json = $config | ConvertTo-Json -Depth 3
    Set-Content -Path $LocalConfig -Value $json -Encoding UTF8
    Write-Host "  [✓] settings.local.json 已生成" -ForegroundColor Green
}

# ─── Step 6: 确保 .gitignore 包含 settings.local.json ──────────────────
if (Test-Path $Gitignore) {
    $content = Get-Content $Gitignore -Raw -ErrorAction SilentlyContinue
    if ($content -notmatch "settings\.local\.json") {
        "`n# AI编程智驾本地配置（含 API 密钥，不提交）`nsettings.local.json" | Add-Content $Gitignore
        Write-Host "  [✓] .gitignore 已追加 settings.local.json" -ForegroundColor Green
    }
} else {
    "# AI编程智驾本地配置（含 API 密钥，不提交）`nsettings.local.json" | Set-Content $Gitignore
    Write-Host "  [✓] 已创建 .gitignore" -ForegroundColor Green
}

# ─── Step 7: 密钥检查 ──────────────────────────────────────────────────
Write-Host "`n=== 密钥检查 ===" -ForegroundColor Cyan
$keys = @{
    DEEPSEEK_API_KEY = "DeepSeek 模型路由 — 必填"
    MINIMAX_API_KEY  = "MiniMax 模型路由 — 可选"
    KIMI_API_KEY     = "Kimi K2 模型路由 — 可选"
}

foreach ($k in $keys.Keys) {
    $val = [System.Environment]::GetEnvironmentVariable($k)
    if ([string]::IsNullOrWhiteSpace($val)) {
        if (Test-Path $LocalConfig) {
            $cfg = Get-Content $LocalConfig -Raw | ConvertFrom-Json
            if ($cfg.env.$k -and ![string]::IsNullOrWhiteSpace($cfg.env.$k)) {
                Write-Host "  [✓] $k — 已在 settings.local.json 中设置" -ForegroundColor Green
            } else {
                Write-Host "  [ ] $k — $($keys[$k]) — 未设置" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "  [✓] $k — 已设置（环境变量）" -ForegroundColor Green
    }
}

# ─── Step 8: 可选全局依赖提示 ──────────────────────────────────────────
Write-Host "`n=== 可选全局依赖 ===" -ForegroundColor Cyan
$deps = @(
    @{ Name = "lean-ctx";   Check = "lean-ctx";      Install = "npm install -g lean-ctx" }
    @{ Name = "opencli";    Check = "opencli";       Install = "npm install -g @jackwener/opencli" }
    @{ Name = "3pio";       Check = "3pio";          Install = "npm install -g @heyzk/3pio" }
)

foreach ($dep in $deps) {
    $ok = $null -ne (Get-Command $dep.Check -ErrorAction SilentlyContinue)
    if ($ok) {
        Write-Host "  [✓] $($dep.Name) — 已安装" -ForegroundColor Green
    } else {
        Write-Host "  [ ] $($dep.Name) — 未安装，如需使用请运行: $($dep.Install)" -ForegroundColor Yellow
    }
}

# ─── 完成 ──────────────────────────────────────────────────────────────
Write-Host "`n=== 安装完成 ===" -ForegroundColor Cyan
Write-Host "产物目录 : $IDERoot" -ForegroundColor White
Write-Host "配置文件 : $IDEConfigFile" -ForegroundColor White
Write-Host ""
Write-Host "下一步：" -ForegroundColor Cyan
Write-Host "  1. 在 $IDE 中打开项目目录" -ForegroundColor White
Write-Host "  2. 确保 settings.local.json 中的密钥已填写完整" -ForegroundColor White
Write-Host "  3. 输入 '/go' 查看工作流导航" -ForegroundColor White
Write-Host "  4. 输入 'spec coding' 开始 Spec 驱动开发" -ForegroundColor White
Write-Host "  5. 输入 '/夯 [任务]' 启动三视角竞争评审（串行模式）" -ForegroundColor White
Write-Host ""
