# Annotation Spec — 7-Layer Business Annotation System (暗门注释)

Every generated HTML prototype embeds a 7-layer annotation drawer. This spec defines each layer's purpose and content expectations.

## Layer Definitions

| Layer | Code | Name | Purpose | Content Type |
|-------|------|------|---------|--------------|
| L0 | `anno-tab-l0` | Page Overview | Page identity, module, business context | Summary paragraph |
| L1 | `anno-tab-l1` | Field Details | Per-field: source, validation rules, cascade logic, constraints | Structured list |
| L2 | `anno-tab-l2` | Business Rules | Calculation formulas, conditional logic, permission requirements | Rule table |
| L3 | `anno-tab-l3` | State Machine | Entity state transitions, trigger conditions, allowed actions | State diagram / table |
| L4 | `anno-tab-l4` | API Contracts | Endpoint, method, request/response shape, error codes | API spec table |
| L5 | `anno-tab-l5` | Performance Notes | Expected data volume, lazy-load points, cache strategy | Bullet list |
| L6 | `anno-tab-l6` | Open Questions | Unresolved decisions, TBD items, assumption flags | Question list |

## Per-Page-Type Layer Mapping

| Page Type | L0 | L1 | L2 | L3 | L4 | L5 | L6 |
|-----------|----|----|----|----|----|----|----|
| **List** | ✅ | ✅ (search+table) | ✅ | ○ (slim) | ✅ | ○ | ✅ |
| **Form** | ✅ | ✅ (all fields) | ✅ | — | ✅ | — | ✅ |
| **Detail** | ✅ | ✅ | ✅ | ✅ (full) | ✅ | ○ | ✅ |
| **Dashboard** | ✅ | ✅ (metrics) | ✅ | — | ✅ | ○ | ✅ |
| **Composite** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

Legend: ✅ = required, ○ = optional (include if PRD provides info), — = not applicable

## Missing Layer Handling

Missing layers MUST still have empty `anno-tab-content` containers to prevent JS errors:
```html
<div class="anno-tab-content" id="anno-tab-l3">
  <p class="anno-placeholder">本页面无状态机相关注释（列表页不涉及实体状态流转）</p>
</div>
```

## Content Rules

1. All example data MUST be fictional and marked `(示例)`
2. No PII, credentials, or internal IPs in annotation content
3. Field names use the same naming as in the HTML (camelCase or snake_case as appropriate)
4. API endpoints use placeholder paths: `/api/v1/{resource}`
5. Business rules reference PRD sections: `[PRD 4.2.1]`
6. Open questions use checkbox format: `- [ ] Is the discount applied before or after tax?`

## Badge Wiring

Each annotated element gets a badge:
```html
<span class="annotation-badge" data-anno-ref="1">1</span>
```

Badge numbering: sequential per-layer (L1 badges: 1, 2, 3...; L2 badges: 1, 2...). Badge click scrolls the drawer to the corresponding content.
