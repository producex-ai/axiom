# Primus GFS v4.0 Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PRIMUS GFS v4.0 DOCUMENT GENERATOR                  │
│                          Template-Independent Architecture                   │
└─────────────────────────────────────────────────────────────────────────────┘

┌───────────────┐         ┌──────────────────┐         ┌──────────────────────┐
│  USER INPUT   │────────▶│  SPECIFICATION   │────────▶│   DOCUMENT           │
│               │         │     LOADER       │         │   GENERATOR          │
│ - Module #    │         │                  │         │                      │
│ - Submodule   │         │ ┌──────────────┐ │         │ ┌──────────────────┐ │
│ - Answers     │         │ │ loadModuleSpec│ │         │ │ buildRequirements│ │
│ - Doc Name    │         │ └──────────────┘ │         │ └──────────────────┘ │
└───────────────┘         │ ┌──────────────┐ │         │ ┌──────────────────┐ │
                          │ │loadSubmodule │ │         │ │buildFillTemplate │ │
                          │ │Spec          │ │         │ │Prompt            │ │
                          │ └──────────────┘ │         │ └──────────────────┘ │
                          │ ┌──────────────┐ │         │                      │
                          │ │findSubmodule │ │         │ Injects:             │
                          │ │SpecByName    │ │         │ - Requirements       │
                          │ └──────────────┘ │         │ - Mandatory Stmts    │
                          └──────────────────┘         │ - Micro-Rules        │
                                   │                   │ - 15-Section Template│
                                   │                   └──────────────────────┘
                                   ▼                              │
                       ┌────────────────────────┐                │
                       │  SPECIFICATION FILES   │                ▼
                       │                        │    ┌─────────────────────────┐
                       │ /spec/modules/         │    │   LLM (Claude)          │
                       │   module_1.json  ✅    │    │   AWS Bedrock           │
                       │   module_5.json  ✅    │    │                         │
                       │   module_6.json  🔴    │    │ Temperature: 0          │
                       │                        │    │ Deterministic Mode      │
                       │ /spec/submodules/      │    │                         │
                       │   module_1/            │    │ Generates:              │
                       │     1.02.json    ✅    │    │ - 15 sections           │
                       │   module_5/            │    │ - All requirements      │
                       │     5.11.json    ✅    │    │ - Mandatory statements  │
                       │     5.12.json    ✅    │    │ - 2500+ words           │
                       └────────────────────────┘    └─────────────────────────┘
                                   │                              │
                                   │                              ▼
                                   │                  ┌────────────────────────┐
                                   └─────────────────▶│  OUTPUT VALIDATOR      │
                                                      │                        │
                                                      │ - validateLLMOutput()  │
                                                      │ - sanitizeOutput()     │
                                                      │ - cutoffAfterSignatures│
                                                      └────────────────────────┘
                                                                 │
                                                                 ▼
                                                     ┌────────────────────────┐
                                                     │  COMPLIANCE LINTER     │
                                                     │                        │
                                                     │ - lintCompliance()     │
                                                     │ - Auto-correction      │
                                                     │ - Micro-rule injection │
                                                     └────────────────────────┘
                                                                 │
                                                                 ▼
                                                     ┌────────────────────────┐
                                                     │  CROSSWALK GENERATOR   │
                                                     │                        │
                                                     │ - generateCrosswalk()  │
                                                     │ - Keyword matching     │
                                                     │ - GAP detection        │
                                                     └────────────────────────┘
                                                                 │
                                                                 ▼
                                                     ┌────────────────────────┐
                                                     │  FINAL DOCUMENT        │
                                                     │                        │
                                                     │ ✅ Audit-ready         │
                                                     │ ✅ 95%+ compliance     │
                                                     │ ✅ Zero templates      │
                                                     │ ✅ Deterministic       │
                                                     └────────────────────────┘
```

## Data Flow

### 1. Specification Loading
```
User Request
     │
     ▼
findSubmoduleSpecByName()
     │
     ├─▶ Exact code match (e.g., "5.12" in name)
     ├─▶ Alias match (e.g., "5.11" alias for "5.06")
     └─▶ Keyword match (e.g., "pest" → 5.12)
     │
     ▼
loadSubmoduleSpec("5", "5.12")
     │
     ▼
Parse JSON from /spec/submodules/module_5/5.12.json
     │
     ▼
Cache in memory (submoduleSpecCache)
     │
     ▼
Return SubmoduleSpec object with:
  - 5 requirements
  - Mandatory statements
  - Keywords
  - Monitoring/verification
  - Micro-injection categories
```

### 2. Document Generation
```
SubmoduleSpec
     │
     ▼
buildRequirementsList()
     │
     ├─▶ Format requirement text
     ├─▶ Add mandatory statements
     ├─▶ Add monitoring expectations
     └─▶ Add verification expectations
     │
     ▼
buildFillTemplatePrompt()
     │
     ├─▶ Inject requirements list
     ├─▶ Add structure guidance (15 sections)
     ├─▶ Load micro-rules (pest, chemical, etc.)
     ├─▶ Add document type detection
     └─▶ Add compliance keywords
     │
     ▼
invokeClaude(prompt)
     │
     ▼
Raw LLM Output (7500 tokens max)
```

### 3. Validation & Enhancement
```
Raw Output
     │
     ▼
checkForbiddenPatternsOnly()
     │
     ├─▶ Detect meta-commentary
     ├─▶ Detect bracketed placeholders
     └─▶ Detect LLM announcements
     │
     ├─ If FOUND ─▶ RETRY (max 3 attempts)
     │
     ▼
sanitizeOutput()
     │
     ├─▶ Remove markdown artifacts
     ├─▶ Clean up spacing
     └─▶ Remove XML-like tags
     │
     ▼
cutoffAfterSignatures()
     │
     ├─▶ Find "Approved By:" line
     ├─▶ Check for forbidden post-signature content
     └─▶ Cut if compliance summaries found
     │
     ▼
lintCompliance(document, ["pest"], autoCorrect=true)
     │
     ├─▶ Load pest micro-rules
     ├─▶ Check each rule in document
     ├─▶ If missing → inject into Section 8
     └─▶ Return corrected document
     │
     ▼
stripComplianceAnnotations()
     │
     └─▶ Remove any "XYZ COMPLIANCE:" headers
     │
     ▼
Final Document (audit-ready)
```

## Component Relationships

```
┌─────────────────────────────────────────────────────────────────────┐
│                            PRIMUS SYSTEM                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌────────────────┐     ┌────────────────┐     ┌────────────────┐ │
│  │    loader.ts   │────▶│ structure_     │────▶│    llm.ts      │ │
│  │                │     │ builder.ts     │     │                │ │
│  │ - loadModuleSpec│     │                │     │ - buildFill    │ │
│  │ - loadSubmodule│     │ - buildDetermin│     │   Template     │ │
│  │   Spec         │     │   istic        │     │   Prompt       │ │
│  │ - findSubmodule│     │   Structure    │     │ - invokeClaude │ │
│  │   SpecByName   │     │ - buildRequire │     │                │ │
│  │ - getRelevant  │     │   mentsList    │     │                │ │
│  │   MicroRules   │     │                │     │                │ │
│  └────────────────┘     └────────────────┘     └────────────────┘ │
│         │                       │                       │          │
│         │                       │                       │          │
│         ▼                       ▼                       ▼          │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                    SPECIFICATION FILES                      │  │
│  │  /spec/modules/      /spec/submodules/                     │  │
│  │    module_X.json       module_X/X.YY.json                  │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌────────────────┐     ┌────────────────┐     ┌────────────────┐ │
│  │  compliance_   │     │  output_       │     │  microRule     │ │
│  │  engine.ts     │     │  validator.ts  │     │  Selector.ts   │ │
│  │                │     │                │     │                │ │
│  │ - lintCompliance│     │ - validate     │     │ - detectRelevant│
│  │ - generateCross│     │   LLMOutput    │     │   MicroRule    │ │
│  │   walk         │     │ - sanitize     │     │   Groups       │ │
│  │ - formatCross  │     │   Output       │     │                │ │
│  │   walkTable    │     │ - cutoffAfter  │     │                │ │
│  │                │     │   Signatures   │     │                │ │
│  └────────────────┘     └────────────────┘     └────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Specification Hierarchy

```
Module Spec (module_5.json)
│
├─ Module Metadata
│  ├─ module: "5"
│  ├─ moduleName: "Facility & Operations"
│  ├─ description: "..."
│  └─ scope: "..."
│
├─ Submodule Registry
│  ├─ 5.01 → 5.01.json
│  ├─ 5.02 → 5.02.json
│  ├─ 5.11 → 5.11.json (Chemical Control) ✅
│  ├─ 5.12 → 5.12.json (Pest Control) ✅
│  └─ ...
│
├─ Document Structure Template
│  ├─ Section 1: Title & Document Control
│  ├─ Section 2: Purpose / Objective
│  ├─ ...
│  └─ Section 15: Revision History
│
└─ Compliance Keywords
   ├─ pest: ["pest", "rodent", "IPM", ...]
   ├─ chemical: ["chemical", "sanitizer", ...]
   └─ ...

Submodule Spec (5.12.json)
│
├─ Submodule Metadata
│  ├─ code: "5.12"
│  ├─ title: "Pest Control Program"
│  ├─ moduleName: "Module 5: Facility & Operations"
│  ├─ appliesTo: ["facility", "production", ...]
│  └─ description: "..."
│
├─ Requirements (5 total)
│  │
│  ├─ Requirement 5.12.01
│  │  ├─ id: "5.12.01"
│  │  ├─ required: true
│  │  ├─ text: "Pest control program must be managed by licensed operator"
│  │  ├─ keywords: ["licensed pest control", "pest contractor", ...]
│  │  ├─ mandatoryStatements:
│  │  │  ├─ "Pest control services provided by licensed operator"
│  │  │  └─ "Contract is current and documented"
│  │  ├─ verificationExpectations: "Annual contract review, quarterly reports"
│  │  └─ monitoringExpectations: "Monthly device inspections"
│  │
│  ├─ Requirement 5.12.02 (Rodenticides prohibited)
│  ├─ Requirement 5.12.03 (Device mapping)
│  ├─ Requirement 5.12.04 (Trending)
│  └─ Requirement 5.12.05 (Station security)
│
├─ Micro-Injection
│  └─ ["pest"]
│
├─ CAPA Injection
│  ├─ "If pest sightings exceed threshold: root cause within 24 hours"
│  ├─ "If structural entry: facility assessment within 7 days"
│  └─ "If repeated activity: enhanced measures within 30 days"
│
└─ Traceability Injection
   ├─ "Service reports linked to production dates"
   ├─ "Trace affected lots within 4 hours"
   └─ "Activity records available for audits"
```

## File System Layout

```
/server/primus/
│
├── spec/
│   ├── modules/
│   │   ├── module_1.json         # FSMS
│   │   ├── module_2.json         # Field Production (TODO)
│   │   ├── module_3.json         # Greenhouse (TODO)
│   │   ├── module_4.json         # Harvest (TODO)
│   │   ├── module_5.json         # Facility & Operations
│   │   └── module_6.json         # HACCP (TODO)
│   │
│   └── submodules/
│       ├── module_1/
│       │   ├── 1.01.json         # Food Safety Policy (TODO)
│       │   ├── 1.02.json         # Document Control ✅
│       │   ├── 1.03.json         # Internal Audit (TODO)
│       │   ├── 1.04.json         # CAPA (TODO)
│       │   ├── 1.05.json         # Training (TODO)
│       │   └── 1.06.json         # Traceability (TODO)
│       │
│       ├── module_5/
│       │   ├── 5.01.json         # Facility Design (TODO)
│       │   ├── 5.02.json         # SSOPs (TODO)
│       │   ├── 5.04.json         # Glass Control (TODO)
│       │   ├── 5.05.json         # Water & Ice (TODO)
│       │   ├── 5.07.json         # Maintenance (TODO)
│       │   ├── 5.08.json         # Personnel (TODO)
│       │   ├── 5.09.json         # Receiving (TODO)
│       │   ├── 5.10.json         # Storage (TODO)
│       │   ├── 5.11.json         # Chemical Control ✅
│       │   └── 5.12.json         # Pest Control ✅
│       │
│       └── module_6/             # (TODO - all submodules)
│
├── checklists/                   # Legacy (still used for crosswalk)
│   ├── module_1.json
│   ├── module_2.json
│   ├── module_3.json
│   ├── module_4.json
│   ├── module_5.json
│   └── module_6.json
│
├── micro_rules/                  # Micro-requirement injections
│   ├── pest.json                 # ✅
│   ├── chemical.json             # ✅
│   ├── glass_brittle_plastic.json# ✅
│   ├── document_control.json     # ✅
│   ├── haccp.json                # ✅
│   ├── traceability.json         # ✅
│   └── allergen.json             # ✅
│
├── templates/                    # Legacy (being phased out)
│   ├── module_1_document_control.txt
│   ├── module_5_chemical.txt
│   └── module_5_pest.txt
│
├── utils/
│   └── microRuleSelector.ts      # Micro-rule detection logic
│
├── loader.ts                     # ✅ Spec loading functions
├── structure_builder.ts          # ✅ Deterministic structure generator
├── compliance_engine.ts          # Crosswalk & linting
├── output_validator.ts           # Output validation & sanitization
├── index.ts                      # Main exports
│
└── DOCUMENTATION/
    ├── REFACTORING_SUMMARY.md    # Architecture guide
    ├── QUICK_START_SPECS.md      # Developer guide
    ├── IMPLEMENTATION_CHECKLIST.md # Progress tracker
    ├── REFACTORING_COMPLETE.md   # Complete summary
    └── ARCHITECTURE_DIAGRAM.md   # This file
```

## Generation Pipeline

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DOCUMENT GENERATION PIPELINE                     │
└─────────────────────────────────────────────────────────────────────┘

Step 1: SPECIFICATION LOADING
┌──────────────────────────────────────┐
│ Input: Module #, Submodule name      │
│ Output: SubmoduleSpec object         │
│ Time: ~5ms (cached)                  │
│ Functions: loadModuleSpec(),         │
│            findSubmoduleSpecByName() │
└──────────────────────────────────────┘
              │
              ▼
Step 2: REQUIREMENT EXTRACTION
┌──────────────────────────────────────┐
│ Input: SubmoduleSpec                 │
│ Output: Formatted requirements text  │
│ Time: ~10ms                          │
│ Function: buildRequirementsList()    │
└──────────────────────────────────────┘
              │
              ▼
Step 3: PROMPT CONSTRUCTION
┌──────────────────────────────────────┐
│ Input: Requirements, Answers         │
│ Output: LLM prompt (5000+ tokens)    │
│ Time: ~20ms                          │
│ Function: buildFillTemplatePrompt()  │
└──────────────────────────────────────┘
              │
              ▼
Step 4: LLM GENERATION
┌──────────────────────────────────────┐
│ Input: Prompt                        │
│ Output: Document (7500 tokens)       │
│ Time: ~6-8 seconds                   │
│ Function: invokeClaude()             │
└──────────────────────────────────────┘
              │
              ▼
Step 5: OUTPUT VALIDATION
┌──────────────────────────────────────┐
│ Input: Raw document                  │
│ Output: Validation result            │
│ Time: ~50ms                          │
│ Function: validateLLMOutput()        │
│ Checks: Forbidden patterns,          │
│         Structure, Completeness      │
└──────────────────────────────────────┘
              │
              ├─ INVALID ─▶ RETRY (max 3x)
              │
              ▼
Step 6: SANITIZATION
┌──────────────────────────────────────┐
│ Input: Validated document            │
│ Output: Cleaned document             │
│ Time: ~20ms                          │
│ Functions: sanitizeOutput(),         │
│            cutoffAfterSignatures()   │
└──────────────────────────────────────┘
              │
              ▼
Step 7: COMPLIANCE LINTING
┌──────────────────────────────────────┐
│ Input: Cleaned document              │
│ Output: Compliance-enhanced doc      │
│ Time: ~100ms                         │
│ Function: lintCompliance()           │
│ Actions: Check micro-rules,          │
│          Auto-inject missing         │
└──────────────────────────────────────┘
              │
              ▼
Step 8: FINAL CLEANUP
┌──────────────────────────────────────┐
│ Input: Enhanced document             │
│ Output: Final audit-ready document   │
│ Time: ~30ms                          │
│ Functions: stripCompliance           │
│            Annotations(),            │
│            cutoffAfterSignatures()   │
└──────────────────────────────────────┘
              │
              ▼
Step 9: CROSSWALK GENERATION (Optional)
┌──────────────────────────────────────┐
│ Input: Final document, Module #      │
│ Output: Crosswalk table              │
│ Time: ~200ms                         │
│ Function: generateCrosswalk()        │
└──────────────────────────────────────┘
              │
              ▼
┌──────────────────────────────────────┐
│     FINAL DOCUMENT READY             │
│  Total Time: ~7-9 seconds            │
│  Compliance: 95%+ (target)           │
│  Template Dependency: 0%             │
│  Deterministic: Yes                  │
└──────────────────────────────────────┘
```

---

*This diagram illustrates the complete architecture of the template-independent Primus GFS v4.0 document generation system.*

*Version: 1.0*  
*Date: November 29, 2025*  
*Status: Infrastructure Complete*
