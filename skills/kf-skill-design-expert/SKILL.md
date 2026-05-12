---
name: kf-skill-design-expert
description: >-
  Expert in 5 Skill design patterns (Tool Wrapper / Generator / Reviewer /
  Inversion / Pipeline). Use when creating new Skills, reviewing existing Skill
  quality, choosing design patterns for complex tasks, or encapsulating team
  experience into reusable Skills. Triggers: "设计Skill", "创建Skill", "优化Skill",
  "审查Skill", "Skill设计", "固化经验", "skill design".
metadata:
  pattern: inversion + tool-wrapper
  domain: skill-design
recommended_model: pro
graph:
  dependencies:
    - target: kf-add-skill
      type: dependency  # 安装技能需设计评审
    - target: kf-code-review-graph
      type: semantic  # 都是质量审查

---

Expert in 5 Skill design patterns. Core belief: **Skill is not a config file — it encapsulates team experience, rules, and processes into a structure an Agent can reliably execute.**

**Division of labor with create-skill**: This Skill focuses on **content architecture design** (which pattern, how to organize execution logic). File engineering conventions (frontmatter, directory structure, description writing, line limits) follow create-skill standards. Layered collaboration, no content duplication.

---

# Five Design Patterns

> Core insight: Specifications solve how a Skill is packaged, but what makes it useful is **content design** — does it have clear execution logic, is it injecting knowledge or constraining process, is it helping generate or review, does it let the Agent act immediately or ask questions first.

> Key mechanism: Skills follow three-level Progressive Disclosure — L1 Agent loads all Skill name+description at startup (~100 tokens) → L2 Agent loads full SKILL.md body after activation (<5000 tokens) → L3 Load references/assets/scripts as needed during execution.

> Directory convention: references/, assets/, scripts/ are **optional**. Simple Skills can keep everything in SKILL.md; only split when content exceeds 500 lines / 5000 tokens, or when step-by-step loading is needed.

Load `references/five-patterns-detail.md` for the complete pattern descriptions, examples, and implementation guides. Summary:

---

## Pattern 1: Tool Wrapper (Knowledge On-Demand)

**Core idea**: Load the right knowledge at the right time, not all knowledge into the system prompt.

- **Use when**: Team coding conventions, SDK/framework constraints, API parameters, tech stack best practices
- **Design**: Rules in references/ (or inline if brief), SKILL.md monitors keywords, loads dynamically, applies as "absolute truth"
- **Essence**: "On-demand knowledge distribution"

## Pattern 2: Generator (Template-Driven Delivery)

**Core idea**: Not making the Agent able to write, but making it consistently write the same structure. Suppress meaningless creativity.

- **Use when**: Reports, API docs, PRD drafts, standardized analysis, commit messages, project scaffolding
- **Design**: assets/ for output templates, references/ for style guides, instructions coordinate: read style → read template → ask for missing vars → fill template strictly
- **Essence**: "Template-driven delivery system"

## Pattern 3: Reviewer (Pluggable Rule Checker)

**Core idea**: Separate "what to check" from "how to check". Modular scoring criteria in external files.

- **Use when**: Code review, security audit, compliance checking, document quality, output scoring
- **Design**: instructions stay static, review criteria in references/review-checklist.md (replaceable), severity levels: error/warning/info, explain WHY not just WHAT
- **Essence**: "Pluggable rule-checking framework"

## Pattern 4: Inversion (Structured Interviewer)

**Core idea**: Agents tend to guess and generate immediately. Inversion flips this — Agent plays interviewer, forced to collect context first via non-negotiable gate instructions.

- **Use when**: System design, project planning, requirements analysis, architecture decisions — any task where incomplete information leads to wrong output
- **Design**: Ask structured questions one at a time, set Phase Gates (DO NOT proceed until all phases complete), refuse to synthesize output before requirements are fully gathered
- **Essence**: "Structured interviewer"
- **Note**: Phase gates depend on prompt constraints; set explicit confirmation points at critical stages

## Pattern 5: Pipeline (Constrained Process Engine)

**Core idea**: Complex tasks need process gates, not self-discipline. Diamond gate conditions force strict sequential workflow.

- **Use when**: Document generation pipeline, multi-stage code processing, approval workflows, complex analysis, any workflow that can't be done in one step
- **Design**: instructions ARE the workflow definition, split into non-skippable stages, explicit gate conditions at critical nodes, load references/assets only at specific steps, optional Reviewer step at end
- **Essence**: "Constrained process execution engine"

---

# Pattern Selection Decision Tree

1. **Does the Agent need specific library/framework expertise?** → **Tool Wrapper**
2. **Does output need the same structure every time?** → **Generator**
3. **Is the task checking/reviewing rather than generating?** → **Reviewer**
4. **Does the Agent need to collect extensive information before starting?** → **Inversion**
5. **Does the task have multiple sequential stages that can't be skipped?** → **Pipeline**

---

# Pattern Combination Guide

| Combination | Scenario | Description |
|------------|----------|-------------|
| Pipeline + Reviewer | Pipeline with final review step | Pipeline includes Reviewer step for self-check |
| Inversion + Generator | Interview first, then template generation | Generator depends on Inversion to collect template variables |
| Tool Wrapper + Generator | Load specs then generate from template | Inject expertise first, then drive template output |
| Inversion + Pipeline | Collect requirements then execute step by step | Structured interview first, then constrained workflow |
| Pipeline + Generator + Reviewer | Full pipeline | Collect → Generate → Review end-to-end |

---

# Workflow

When a user requests creating or optimizing a Skill, follow this workflow:

## Step 1: Requirements Diagnosis

1. Identify the core problem the user wants to solve
2. Determine task essence: inject knowledge? Constrain process? Stabilize output? Review quality? Or orchestrate multi-step?
3. Recommend the most suitable design pattern (or pattern combination)

## Step 2: Pattern Selection & Explanation

Clearly explain to the user:
- Recommended design pattern and why
- Core value of the pattern
- Possible pattern combinations

## Step 3: Skill File Design

1. Load `references/file-engineering-spec.md` for file engineering conventions
2. Write frontmatter (name, description) following format requirements
3. Design instructions (core execution logic)
4. Plan references/assets structure (if needed)
5. Set constraints and output format

## Step 4: Quality Self-Check

Review against this checklist:
- [ ] Clear execution logic, not just "help me do XX"?
- [ ] Correct pattern application?
- [ ] Instructions in natural language, not explicit tool references?
- [ ] Output format explicit and stable?
- [ ] Constraints specific and executable (MUST / MUST NOT)?
- [ ] No "one Skill doing too many things"?
- [ ] Phase gates strict enough for Inversion/Pipeline patterns?
- [ ] SKILL.md named correctly?
- [ ] Frontmatter only contains standard fields (name, description, license, compatibility, metadata, allowed-tools)?
- [ ] Custom extension fields (pattern, required-rules) inside metadata?
- [ ] Description uses imperative style ("Use when..." not "This skill does...")?
- [ ] Description focuses on user intent, lists trigger scenarios explicitly?
- [ ] Description within 1-1024 characters?
- [ ] Each instruction answers "Would the Agent get this wrong without it?" (remove common knowledge)
- [ ] Gotchas section for project/environment-specific traps? (if applicable)

## Step 5: Delivery & Iteration

Write the completed Skill file to the specified directory with usage recommendations.

**Iteration**: Suggest user execute on a real task, then read the Agent's execution trace (not just final output), identify misjudgments, omissions, and redundant instructions, and iterate.

---

# Harness Feedback Loop

| Step | Verification Action | Failure Handling |
|------|-------------------|------------------|
| Step 1 | `node {IDE_ROOT}/helpers/harness-gate-check.cjs --skill kf-skill-design-expert --stage step1 --required-sections "## 核心问题" "## 推荐模式"` | Supplement diagnosis |
| Step 3 | `node {IDE_ROOT}/helpers/harness-gate-check.cjs --skill kf-skill-design-expert --stage step3 --required-sections "## frontmatter" "## instructions" --forbidden-patterns TODO 待定` | Go back and supplement |
| Step 4 | `node {IDE_ROOT}/helpers/harness-gate-check.cjs --skill kf-skill-design-expert --stage step4 --required-files "SKILL.md" --forbidden-patterns "❌"` | Fix defects |

Verification principle: **Plan → Build → Verify → Fix** forced loop. No subjective "I think it's fine."

---

# Constraints

**MUST DO:**
- Always perform pattern selection analysis before creating a Skill
- Explain pattern choice reasons to the user
- Quality self-check on generated Skills
- Consider pattern combinations for complex Skills
- Write Skill content in user's preferred language
- Name Skill files `SKILL.md`
- Frontmatter must follow official spec

**MUST NOT DO:**
- Skip requirements diagnosis and generate Skill directly
- Put too many unrelated responsibilities in one Skill
- Explicitly reference tool names in system prompt (e.g., "use Read tool")
- Ignore phase gate design for Inversion/Pipeline patterns
- Generate Reviewer Skills without constraints
- Use non-standard fields in frontmatter top level (e.g., `tools`, `required_rules`) — custom fields go in `metadata`

---

## Harness Engineering Review System

| Resource | Path | Purpose |
|---------|------|---------|
| **Review system doc** | `references/harness-engineering-audit.md` | Five Iron Rules scoring criteria, review process, report template |
| **Auto audit script** | `../../helpers/harness-audit.cjs` | Full-path scan of kf- skills, auto-generate score matrix + systemic defect analysis |
| **Gate verification script** | `../../helpers/harness-gate-check.cjs` | Mechanized gate verification (required-files / required-sections / forbidden-patterns) |

### Trigger Methods

```bash
# Full audit
node {IDE_ROOT}/helpers/harness-audit.cjs --all

# Single skill audit
node {IDE_ROOT}/helpers/harness-audit.cjs --skill kf-multi-team-compete

# Detailed diagnosis
node {IDE_ROOT}/helpers/harness-audit.cjs --all --verbose

# JSON output (for CI consumption)
node {IDE_ROOT}/helpers/harness-audit.cjs --all --format json
```

### Review Process

1. User says "Harness review" / "Five Iron Rules audit" / "audit"
2. Run `node {IDE_ROOT}/helpers/harness-audit.cjs --all --verbose`
3. Fix issues by priority from the systemic defects analysis
4. Re-audit to verify fixes

### History Tracking

Audit results auto-archived to `memory/harness-audit-history.md`, each audit outputs trend comparison.
