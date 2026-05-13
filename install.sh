#!/usr/bin/env bash
set -euo pipefail

# AI编程智驾 — 通用适配版安装脚本 (Linux/macOS)
# 将通用适配产物安装到目标 IDE 目录（Qoder / Trae / Cursor）

IDE=""
TARGET_DIR="$(pwd)"
SOURCE_DIR="$(cd "$(dirname "$0")" && pwd)"

usage() {
    echo "用法: $0 -i <qoder|trae|cursor|windsurf> [-t <目标目录>]"
    exit 1
}

while getopts "i:t:h" opt; do
    case $opt in
        i) IDE="$OPTARG" ;;
        t) TARGET_DIR="$OPTARG" ;;
        h) usage ;;
        *) usage ;;
    esac
done

if [[ -z "$IDE" ]]; then
    usage
fi

case "$IDE" in
    qoder)
        IDE_ROOT=".qoder"
        IDE_CONFIG="qoder.md"
        HAS_RULES=1
        AGENTS_DIR="agents"
        AGENTS_EXT=".md"
        IS_SUBAGENT=1
        ;;
    trae)
        IDE_ROOT=".trae"
        IDE_CONFIG="rules/project_rules.md"
        HAS_RULES=1
        AGENTS_DIR="rules"
        AGENTS_EXT=".md"
        IS_SUBAGENT=0
        ;;
    cursor)
        IDE_ROOT=".cursor"
        IDE_CONFIG=".cursorrules"
        HAS_RULES=0
        AGENTS_DIR="rules"
        AGENTS_EXT=".mdc"
        IS_SUBAGENT=0
        ;;
    windsurf)
        IDE_ROOT=".windsurf"
        IDE_CONFIG=".windsurfrules"
        HAS_RULES=0
        AGENTS_DIR="rules"
        AGENTS_EXT=".md"
        IS_SUBAGENT=0
        ;;
    *)
        echo "错误: 不支持的 IDE: $IDE"
        usage
        ;;
esac

IDE_ROOT_PATH="$TARGET_DIR/$IDE_ROOT"
IDE_CONFIG_PATH="$IDE_ROOT_PATH/$IDE_CONFIG"

echo "=== AI编程智驾 通用适配版安装 ==="
echo "目标 IDE : $IDE"
echo "目标目录 : $IDE_ROOT_PATH"
echo ""

# ─── Step 1: 环境检测 ──────────────────────────────────────────────────
echo "=== 环境检测 ==="

if command -v node &>/dev/null; then
    NODE_VER=$(node --version)
    echo "  [✓] Node.js $NODE_VER"
    if [[ ! "$NODE_VER" =~ ^v(1[8-9]|2[0-9]) ]]; then
        echo "  [!] 建议 Node.js >= 18"
    fi
else
    echo "  [✗] Node.js 未安装 — 请先安装 Node.js 18+"
    exit 1
fi

if command -v git &>/dev/null; then
    echo "  [✓] Git $(git --version)"
else
    echo "  [✗] Git 未安装 — 请先安装 Git"
    exit 1
fi

# ─── Step 2: 创建 IDE 目录结构 ─────────────────────────────────────────
echo ""
echo "=== 创建 IDE 目录结构 ==="

mkdir -p "$IDE_ROOT_PATH"/{helpers,hooks,monitor,memory,templates,skills}
if [[ "$HAS_RULES" -eq 1 ]]; then
    mkdir -p "$IDE_ROOT_PATH/rules"
fi

echo "  [✓] 目录结构已创建"

# ─── Step 3: 复制通用文件 ──────────────────────────────────────────────
echo ""
echo "=== 复制通用文件 ==="

if [[ "$HAS_RULES" -eq 1 ]]; then
    cp -r "$SOURCE_DIR/rules/"* "$IDE_ROOT_PATH/rules/"
    echo "  [✓] rules/ 已复制"
fi

cp "$SOURCE_DIR/model-config.json" "$IDE_ROOT_PATH/"
echo "  [✓] model-config.json 已复制"

sed "s|{IDE_ROOT}|$IDE_ROOT|g" "$SOURCE_DIR/settings.json.template" > "$IDE_ROOT_PATH/settings.json"
echo "  [✓] settings.json 已生成"

# ─── Step 3.5: 分发 /夯 子智能体定义到 IDE 专属目录 ──────────────────────
echo ""
echo "=== 分发 /夯 子智能体定义 ==="

HAMMER_AGENTS_SOURCE="$SOURCE_DIR/skills/kf-multi-team-compete/kf-multi-team-compete/agents"
if [[ -d "$HAMMER_AGENTS_SOURCE" ]]; then
    AGENTS_TARGET="$IDE_ROOT_PATH/$AGENTS_DIR"
    mkdir -p "$AGENTS_TARGET"

    AGENT_COUNT=0
    for f in "$HAMMER_AGENTS_SOURCE"/kf-hammer-*.md; do
        [[ -f "$f" ]] || continue
        base=$(basename "$f" .md)
        cp "$f" "$AGENTS_TARGET/${base}${AGENTS_EXT}"
        AGENT_COUNT=$((AGENT_COUNT+1))
    done

    if [[ "$IS_SUBAGENT" -eq 1 ]]; then
        echo "  [✓] 已分发 $AGENT_COUNT 个子智能体定义 → $AGENTS_DIR/"
        echo "  [i] $IDE 原生支持 Agent 并发调用（真并发模式）"
    else
        echo "  [✓] 已分发 $AGENT_COUNT 个角色规则 → $AGENTS_DIR/"
        echo "  [i] $IDE 无原生 subagent，/夯 走串行角色切换模式"
    fi
else
    echo "  [!] 未找到 shared agents 源目录，跳过"
fi

# ─── Step 4: 生成 IDE 主配置 ───────────────────────────────────────────
echo ""
echo "=== 生成 IDE 主配置 ==="

mkdir -p "$(dirname "$IDE_CONFIG_PATH")"
sed "s|{IDE_ROOT}|$IDE_ROOT|g; s|{IDE_CONFIG}|$IDE_CONFIG|g" "$SOURCE_DIR/{IDE_CONFIG}.template" > "$IDE_CONFIG_PATH"
echo "  [✓] $IDE_CONFIG 已生成"

# ─── Step 5: 生成 settings.local.json（API 密钥）────────────────────────
echo ""
echo "=== 配置 API 密钥 ==="

LOCAL_CONFIG="$IDE_ROOT_PATH/settings.local.json"
GITIGNORE="$TARGET_DIR/.gitignore"

if [[ -f "$LOCAL_CONFIG" ]]; then
    echo "  [i] settings.local.json 已存在，跳过生成。"
else
    echo "以下密钥仅保存在本地 settings.local.json，不会提交到 Git。"
    echo ""

    read -rp "请输入 DEEPSEEK_API_KEY (必填): " DEEPSEEK_KEY
    read -rp "请输入 MINIMAX_API_KEY (留空则跳过 MiniMax): " MINIMAX_KEY
    read -rp "请输入 KIMI_API_KEY (留空则跳过 Kimi): " KIMI_KEY

    cat > "$LOCAL_CONFIG" <<EOF
{
  "env": {
    "DEEPSEEK_API_KEY": "$DEEPSEEK_KEY",
    "MINIMAX_API_KEY": "$MINIMAX_KEY",
    "KIMI_API_KEY": "$KIMI_KEY",
    "AI_CODING_VERBOSE": "1"
  },
  "model": "deepseek-v4-flash",
  "outputStyle": "stream",
  "verbose": true
}
EOF
    echo "  [✓] settings.local.json 已生成"
fi

# ─── Step 6: 确保 .gitignore 包含 settings.local.json ──────────────────
if [[ -f "$GITIGNORE" ]]; then
    if ! grep -q "settings.local.json" "$GITIGNORE"; then
        echo -e "\n# AI编程智驾本地配置（含 API 密钥，不提交）\nsettings.local.json" >> "$GITIGNORE"
        echo "  [✓] .gitignore 已追加 settings.local.json"
    fi
else
    echo -e "# AI编程智驾本地配置（含 API 密钥，不提交）\nsettings.local.json" > "$GITIGNORE"
    echo "  [✓] 已创建 .gitignore"
fi

# ─── Step 7: 密钥检查 ──────────────────────────────────────────────────
echo ""
echo "=== 密钥检查 ==="

declare -A KEYS=(
    ["DEEPSEEK_API_KEY"]="DeepSeek 模型路由 — 必填"
    ["MINIMAX_API_KEY"]="MiniMax 模型路由 — 可选"
    ["KIMI_API_KEY"]="Kimi K2 模型路由 — 可选"
)

for KEY in "${!KEYS[@]}"; do
    VAL="${!KEY:-}"
    if [[ -z "$VAL" ]]; then
        if [[ -f "$LOCAL_CONFIG" ]]; then
            CFG_VAL=$(python3 -c "import json; print(json.load(open('$LOCAL_CONFIG')).get('env',{}).get('$KEY',''))" 2>/dev/null || echo "")
            if [[ -n "$CFG_VAL" ]]; then
                echo "  [✓] $KEY — 已在 settings.local.json 中设置"
            else
                echo "  [ ] $KEY — ${KEYS[$KEY]} — 未设置"
            fi
        fi
    else
        echo "  [✓] $KEY — 已设置（环境变量）"
    fi
done

# ─── Step 8: 可选全局依赖提示 ──────────────────────────────────────────
echo ""
echo "=== 可选全局依赖 ==="

for dep in "lean-ctx:lean-ctx:npm install -g lean-ctx" "opencli:opencli:npm install -g @jackwener/opencli" "3pio:3pio:npm install -g @heyzk/3pio"; do
    IFS=':' read -r NAME CMD INSTALL <<< "$dep"
    if command -v "$CMD" &>/dev/null; then
        echo "  [✓] $NAME — 已安装"
    else
        echo "  [ ] $NAME — 未安装，如需使用请运行: $INSTALL"
    fi
done

# ─── 完成 ──────────────────────────────────────────────────────────────
echo ""
echo "=== 安装完成 ==="
echo "产物目录 : $IDE_ROOT_PATH"
echo "配置文件 : $IDE_CONFIG_PATH"
echo ""
echo "下一步："
echo "  1. 在 $IDE 中打开项目目录"
echo "  2. 确保 settings.local.json 中的密钥已填写完整"
echo "  3. 输入 '/go' 查看工作流导航"
echo "  4. 输入 'spec coding' 开始 Spec 驱动开发"
echo "  5. 输入 '/夯 [任务]' 启动三视角竞争评审（串行模式）"
echo ""
