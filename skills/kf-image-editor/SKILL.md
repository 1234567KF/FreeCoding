---
name: kf-image-editor
description: |
  AI 自然语言图片编辑。基于 Gemini API 直接调用，无需打开任何图片编辑器，
  直接用中文描述即可完成 P图、改图、生图、风格迁移、老照片修复等操作。
  可被 kf-multi-team-compete（/夯）Stage 2/5 自动调用处理 UI 原型截图和方案配图。
  触发词："P图"、"改图"、"修图"、"生成图片"、"图片编辑"、"抠图"、"去水印"。
triggers:
  - P图
  - 改图
  - 修图
  - 生成图片
  - 图片编辑
  - 抠图
  - 去水印
  - 换背景
  - 老照片修复
allowed-tools:
  - Bash
  - Read
  - WebFetch
metadata:
  pattern: tool-wrapper
  interaction: multi-turn
  called_by:
    - kf-multi-team-compete  # Stage 2 UI 原型配图 / Stage 5 方案配图
recommended_model: flash
graph:
  dependencies:
    - target: kf-alignment
      type: workflow  # 编辑后对齐

---

# AI 自然语言图片编辑

你是 AI 图片编辑专家。基于 Gemini API 直接 HTTP 调用完成图片操作，
无需打开任何图片编辑器或 UI 界面。

## 前置条件

需要 Gemini API Key（免费额度足够日常使用）：

```bash
# 1. 获取 Gemini API Key: https://aistudio.google.com/app/apikey
# 2. 设置环境变量
export GEMINI_API_KEY="your-api-key"
# Windows: $env:GEMINI_API_KEY="your-api-key"
```

验证 Key 可用：
```bash
curl "https://generativelanguage.googleapis.com/v1beta/models?key=$GEMINI_API_KEY"
```

---

## 核心能力

| 能力 | 说明 | 示例提示 | 模型 |
|------|------|---------|------|
| 🎨 **文生图** | 从文字描述生成图片 | "生成一张山间日落的风景图" | gemini-2.0-flash-exp-image-generation |
| ✏️ **图片编辑** | 用自然语言修改图片 | "把这张照片的背景换成海滩" | gemini-2.0-flash-exp-image-generation |
| 🔗 **多图合成** | 融合多张图片 | "把图1的产品放到图2的场景中" | gemini-2.0-flash-exp-image-generation |
| 🎭 **风格迁移** | 转换艺术风格 | "把这张照片转成吉卜力动画风格" | gemini-2.0-flash-exp-image-generation |
| 🔧 **修复增强** | 老照片修复/超分辨率 | "修复这张老照片的划痕并增强清晰度" | gemini-2.0-flash-exp-image-generation |
| 🏷️ **智能抠图** | 去除/替换背景 | "把背景去掉，换成纯白色" | gemini-2.0-flash-exp-image-generation |

---

## 工作流

### Step 1: 理解用户意图

解析用户自然语言指令，识别操作类型：
- 包含"生成"/"画"/"创建" → 文生图
- 包含"改"/"P"/"修"/"换"/"去掉" → 图片编辑
- 包含"风格"/"转成"/"变成" → 风格迁移
- 包含"修复"/"增强"/"清晰" → 修复增强

### Step 2: 确认输入图片

- 如果用户提到了图片路径，先验证文件存在
- 如果用户说的是"这张图"但没给路径，追问确认
- 支持格式：PNG、JPG、WEBP、GIF

### Step 3: 执行操作

使用 Gemini API 直接调用：

**文生图**：
```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=$GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{
    "contents": [{
      "parts": [{"text": "用自然语言描述想要的画面"}]
    }],
    "generationConfig": {"responseModalities": ["Text", "Image"]}
  }'
```

**图生图（编辑）**：
```bash
# 先将图片转为 base64
BASE64_IMG=$(base64 -i input.png | tr -d '\n')

curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=$GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{
    "contents": [{
      "parts": [
        {"text": "用自然语言描述修改要求"},
        {"inline_data": {"mime_type": "image/png", "data": "'$BASE64_IMG'"}}
      ]
    }],
    "generationConfig": {"responseModalities": ["Text", "Image"]}
  }'
```

**响应处理**：
- API 返回 JSON，图片数据在 `candidates[0].content.parts[].inlineData.data`（base64）
- 解码保存：`echo "<base64-data>" | base64 -d > output.png`

### Step 4: 展示结果

- 输出编辑后的图片路径
- 询问用户是否满意，是否需要进一步修改
- 支持迭代编辑：用户可以连续说"再调亮一点"、"把天空变橙红色"

---

## 迭代编辑模式

核心优势：可以像和人说话一样连续改图，无需重新描述全部需求。

```
用户: "把这张产品图的背景换成白色"  →  调用图生图 API，传入 product.png + "换白色背景"
用户: "再调亮一点"                   →  以上次输出为输入，传入 "调亮一点"
用户: "产品周围加阴影"               →  以上次输出为输入，传入 "产品周围加阴影"
用户: "完美，导出"                   →  保存最终结果
```

**迭代状态管理**：
- 每次编辑后保存中间产物到 `{IDE_ROOT}/tmp/image-edit-{timestamp}-{n}.png`
- 迭代时自动使用最新中间产物作为输入
- 用户可随时说 "回到第 N 步" 从历史产物恢复

---

## 自愈式错误处理

| 异常 | 自动处理 |
|------|---------|
| API Key 无效/缺失 | 引导用户到 https://aistudio.google.com/app/apikey 获取免费 Key，检查环境变量 `GEMINI_API_KEY` |
| API 限流 (429) | 等待 10s 后重试，最多 3 次 |
| 图片格式不支持 | 自动用 `npx sharp` 或 Python PIL 转换格式后重试 |
| 生成效果不佳 | 换更具体的描述词重试，最多 3 次 |
| 图片过大 (>4MB) | 先用 sharp 压缩到 4MB 以下再调用 API |

---

## 与 /夯 联动

当被 `kf-multi-team-compete`（/夯）调用时：

- **Stage 2（编码实现）**：前端设计师 agent 生成 UI 原型截图后，调用本技能为方案配图、优化截图
- **Stage 5（方案汇总）**：前端设计师 agent 调用本技能为最终方案生成示意图、架构图配图

---

## 输出规范

```markdown

## Harness 反馈闭环（铁律 3）

| Step | 验证动作 | 失败处理 |
|------|---------|---------|
| API Key 检查 | `node {IDE_ROOT}/helpers/harness-gate-check.cjs --skill kf-image-editor --stage connect --required-sections "## 前置条件" --forbidden-patterns "未配置"` | 引导用户配置 Key |
| 编辑结果验证 | `node {IDE_ROOT}/helpers/harness-gate-check.cjs --skill kf-image-editor --stage result --required-files "edited-*.png" --forbidden-patterns "error"` | 重新编辑 |

验证原则：**Plan → Build → Verify → Fix** 强制循环。

## 图片编辑报告

### 操作摘要
- 类型：{文生图/图片编辑/风格迁移/修复增强}
- 输入：{原图路径 或 "无（文生图）"}
- 操作：{自然语言描述}

### 结果
- 输出路径：{图片路径}
- 迭代次数：{N} 次

### 下一步
- 是否满意？如需修改请直接描述
```
