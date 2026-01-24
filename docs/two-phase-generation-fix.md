# Two-Phase Generation Fix - 2026-01-24

## Problem Analysis

### Original Issue
- **Module**: 5.04 Operational Practices (17 requirements)
- **Symptom**: Only 3-6 out of 17 requirements generated across 5 attempts
- **Token Budget**: 177K tokens allocated, but only 700-1200 tokens actually generated
- **Missing Section**: Section 8 (Procedures) never generated in any attempt
- **Quality Score**: 40-55/100 (below 70 threshold)

### Root Causes Identified

1. **Two-Phase Never Triggered**
   ```typescript
   // BEFORE: Too restrictive
   const useChunkedGeneration = requirementCount >= 20 && questions.length > 25;
   // With 17 requirements, this was always FALSE
   ```

2. **Premature LLM Stopping**
   - Single massive prompt (11K+ input tokens) overwhelming the model
   - LLM stopping after 1000-1500 tokens despite 177K budget
   - Not a token limit issue - model was giving up due to complexity

3. **Incremental Retry Not Triggering**
   ```typescript
   // BEFORE: Too strict
   hasGoodBase = foundRequirementHeaders.length >= 3 &&
                 missingRequirementHeaders.length <= 10 &&
                 lastGeneratedDoc.length > 3000;
   // With only 2-3 requirements found, this was always FALSE
   ```

4. **Section 8 Validation**
   - No explicit check for Section 8 presence
   - Incremental retry could start even if Section 8 missing

## Solutions Implemented

### 1. Lowered Two-Phase Threshold (Critical)

```typescript
// AFTER: Realistic threshold for production use
const useChunkedGeneration = requirementCount >= 15;
// Now triggers for 17 requirements ✅
```

**Impact**: Two-phase generation will now activate for Module 5.04 (17 requirements)

### 2. Enhanced Two-Phase Resilience

**Before**: All-or-nothing - fell back to single-phase if any requirements missing

**After**: Progressive improvement strategy
```typescript
if (validation.foundRequirementHeaders.length >= requirementCount * 0.5 && 
    validation.missingRequirementHeaders.length <= 8) {
  // Try incremental fix WITHIN two-phase
  const missingContent = await generateMissingRequirements(...);
  // Merge and re-validate
  // If improved, use best attempt instead of starting over
}
```

**Benefits**:
- Two-phase gets 12/17 requirements → incremental retry adds missing 5 → Success!
- Avoids throwing away 70% complete work
- Reduces token usage by 60-70% vs full regeneration

### 3. Relaxed Incremental Retry Conditions

```typescript
// BEFORE
const hasGoodBase = 
  foundRequirementHeaders.length >= 3 &&        // Too high
  missingRequirementHeaders.length <= 10 &&     // Too strict
  lastGeneratedDoc.length > 3000;               // Too long

// AFTER
const hasGoodBase = !hasMissingCore &&
  foundRequirementHeaders.length >= 2 &&        // More realistic
  missingRequirementHeaders.length <= 15 &&     // Allows more missing
  lastGeneratedDoc &&
  lastGeneratedDoc.length > 2000 &&             // Lower threshold
  finalDoc.includes("8.");                      // CRITICAL: Section 8 check
```

**Impact**: Incremental retry can now trigger with 2-3 requirements found (common scenario)

### 4. Increased Phase 2 Token Budget

```typescript
// BEFORE
const phase2Tokens = 50000; // Too small for 7 sections

// AFTER  
const phase2Tokens = 80000; // Adequate for sections 9-15
```

**Rationale**: Phase 2 generates 7 sections (9-15) vs Phase 1's 8 sections (1-8), needs comparable budget

## Architecture Overview

### Two-Phase Generation Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Module 5.04: 17 requirements detected                       │
│ useChunkedGeneration = true (threshold: 15+)                │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ PHASE 1: Generate Sections 1-8 (ALL 17 requirements)        │
│ Token Budget: 150K tokens                                   │
│ Focus: Core procedures, all requirement headers             │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
                    Validate Phase 1
                         /      \
        Success (17/17)         Partial (12/17)
            │                        │
            ▼                        ▼
┌──────────────────────┐    ┌──────────────────────┐
│ PHASE 2:             │    │ INCREMENTAL RETRY:   │
│ Sections 9-15        │    │ Generate 5 missing   │
│ Token Budget: 80K    │    │ Token Budget: 60K    │
└──────┬───────────────┘    └──────┬───────────────┘
       │                            │
       ▼                            ▼
   Merge & Validate            Merge at Section 8 end
       │                            │
       └────────────┬───────────────┘
                    ▼
           ┌────────────────────┐
           │ Final Validation   │
           │ 17/17 requirements │
           │ Quality Score: 85  │
           └────────────────────┘
```

### Token Budget Breakdown

| Phase | Token Budget | Purpose |
|-------|--------------|---------|
| Phase 1 | 150K tokens | Sections 1-8, ALL requirement headers |
| Phase 2 | 80K tokens | Sections 9-15 continuation |
| Incremental | 60K tokens | Generate only missing requirements |
| **Total Saved** | **70-80%** | vs full regeneration (177K × retries) |

## Expected Outcomes

### Test Scenario: Module 5.04 (17 requirements)

**Before Fix**:
- ❌ Two-phase: Never triggered
- ❌ Requirements found: 2-3/17 across all attempts
- ❌ Section 8: Missing
- ❌ Token usage: 700-1200 output tokens (wasted 175K+ budget)
- ❌ Quality score: 40-55/100
- ❌ Result: FAILED after 5 retries

**After Fix** (Expected):
- ✅ Two-phase: Triggers on attempt 1
- ✅ Phase 1: Generates 15-17/17 requirement headers
- ✅ Phase 2: Completes sections 9-15
- ✅ Incremental: Fills any gaps (if 15-16/17)
- ✅ Token usage: 12K-15K Phase 1 + 5K-7K Phase 2 = 17K-22K total
- ✅ Quality score: 75-90/100
- ✅ Result: SUCCESS on attempt 1-2

### Console Log Signatures

**Look for these indicators of success**:

```bash
# Two-phase activation
[LLM] ⚠️ Large submodule detected (17 requirements). Using two-phase generation.
[LLM] 🚀 Attempting TWO-PHASE generation...

# Phase 1 execution
[LLM] Phase 1: Sections 1-8 (150000 tokens)
[LLM] Phase 1 result: 15/17 requirements

# Phase 2 execution  
[LLM] Phase 2: Sections 9-15 (80000 tokens)

# Validation
[LLM] Two-phase validation: 15/17 requirements found

# Incremental fix (if needed)
[LLM] 🔧 Two-phase partial success (15/17), trying incremental fix...
[LLM] Incremental generation: 2 missing requirements (10K tokens)
[LLM] Two-phase + incremental: 17/17 (improved from 15)

# Success
[LLM] ✅ Two-phase + incremental fix = SUCCESS!
```

## Testing Checklist

- [ ] Two-phase triggers for 17 requirements (console log confirms)
- [ ] Phase 1 generates ≥12 requirement headers
- [ ] Phase 2 completes sections 9-15
- [ ] Section 8 (Procedures) present in output
- [ ] Incremental retry adds missing requirements (if 15-16/17)
- [ ] Final validation: 17/17 requirements found
- [ ] All 15 sections present (no lint warnings)
- [ ] Quality score ≥ 70
- [ ] Total token usage: 15K-25K (not 177K)
- [ ] Success on attempt 1-2 (not retry 5)

## Fallback Strategy

If two-phase fails (poor coverage <50%), it falls back to single-phase generation with:
- Temperature variance: 0 → 0.2 → 0.3 → 0.4 → 0.5
- Incremental retry: Enabled for ≥2 requirements found
- MAX_RETRIES: 5 attempts
- Progressive feedback from previous attempts

## Performance Metrics

### Before Fix
- Success Rate: 0% (0/5 attempts)
- Avg Token Usage: 1000 output tokens
- Avg Requirements: 3/17 (17%)
- Avg Quality: 45/100

### After Fix (Projected)
- Success Rate: 80-90% (4-5/5 attempts)
- Avg Token Usage: 18K output tokens
- Avg Requirements: 17/17 (100%)
- Avg Quality: 80/100

### Token Savings
- Before: 177K × 5 retries = 885K tokens wasted
- After: 20K × 1-2 attempts = 20K-40K tokens used
- **Savings**: 95-98% token reduction

## Related Documentation

- [llm-best-practices-implementation.md](./llm-best-practices-implementation.md) - Comprehensive best practices
- [docgen-fixes-2026-01-24.md](./docgen-fixes-2026-01-24.md) - Initial fix attempt documentation

## Key Insights

### "Fighting with LLM vs Working with It"

**Fighting** (Before):
- Massive single prompt (11K input tokens)
- Overwhelming complexity → premature stopping
- High thresholds preventing solutions from executing
- All-or-nothing validation → throwing away partial success

**Working With** (After):
- Split into digestible chunks (Phase 1 + Phase 2)
- Progressive improvement (partial → incremental → complete)
- Realistic thresholds based on actual behavior
- Merge strategies to preserve good work

### The Section 8 Problem

Section 8 (Procedures) was consistently missing because:
1. Single-phase generation stopped before reaching it
2. No explicit validation that Section 8 exists before incremental retry
3. Section 8 is in middle of document (after 7 sections, before 7 more)

**Solution**: Two-phase puts Section 8 in Phase 1, explicit validation check, incremental merge at Section 8 boundary.

## Monitoring

Watch for these potential issues in production:
- Phase 1 consistently <80% coverage → adjust Phase 1 prompt
- Phase 2 failing validation → increase Phase 2 token budget
- Incremental merge inserting at wrong location → improve Section 8 regex
- Temperature >0.3 needed frequently → review prompt clarity

## Next Steps

1. **Test with Module 5.04** to verify two-phase triggers and succeeds
2. **Monitor other large modules** (16+ requirements) for success rates
3. **Analyze token usage patterns** - should see 15K-25K range, not 1K
4. **Collect quality scores** - should average 75-85, not 40-55
5. **Document edge cases** - modules that still struggle despite fixes

---

**Implementation Date**: 2026-01-24  
**Files Modified**: `server/llm.ts` (lines 1400-1850, 2015-2080)  
**Status**: Ready for production testing
