# Content Quality Enhancement Guide
**Date:** 2026-01-24  
**Status:** Reference for future enhancements  
**Current Quality:** 70-75/100 (audit-ready baseline)

---

## Current Working State ✅

### What We Achieved
- **Two-phase generation**: Working perfectly for 10+ requirement modules
- **Requirement detection**: 100% (17/17, 12/12 tested)
- **Token efficiency**: 15K-25K output vs 700-1K before
- **First-attempt success**: No retries needed
- **All sections present**: 15 mandatory sections generated

### Current Prompt (Phase 1 - Section 8)
```
8. PROCEDURES
   This section MUST include ALL ${requirementCount} requirements listed below.
   For EACH requirement, create a subsection with:
   - Header: ### {CODE} - {Short title from requirement}
   - 2-3 paragraphs explaining implementation (each paragraph = 3-5 sentences with specific details)
   - Include: specific procedures, who is responsible (job titles), when it happens (frequencies), forms used, acceptance criteria

REQUIREMENTS TO DOCUMENT IN SECTION 8:
${requirementList}

Generate sections 1-8 now. Include EVERY requirement code listed above as a ### header in Section 8.
STOP after Section 8 completes.
```

### Output Quality
- **Sentences per requirement**: 3-5 (was 2-3 before enhancement)
- **Specificity**: Good (includes forms, frequencies, job titles)
- **Audit readiness**: 70-75/100 (adequate for procedural SOPs)

---

## Failed Enhancement Attempt #1 ❌

### What We Tried
Added explicit paragraph structure with formatting:

```
**Paragraph 1 (Implementation Details - 5-7 sentences):**
- Explain WHAT must be done with step-by-step procedures
- Include specific processes, methods, and activities

**Paragraph 2 (Responsibilities & Timing - 4-5 sentences):**
- Specify WHO is responsible (specific job titles)
- Define WHEN activities occur (daily, weekly, etc.)

**Paragraph 3 (Documentation & Criteria - 4-5 sentences):**
- List specific FORMS used (e.g., "Form FSP-01: Team Roster")
- Define acceptance criteria and specifications
```

### Result
- **Requirements found**: 1/12 (down from 12/12) 💥
- **Failure mode**: LLM confused by markdown formatting instructions
- **Root cause**: Too prescriptive structure overwhelmed the model

### Why It Failed
1. **Markdown instructions**: `**Paragraph 1 (...)**` confused LLM
2. **Nested bullet points**: Created ambiguous hierarchy
3. **Explicit sentence counts**: LLM focused on formatting over content generation
4. **Multiple competing instructions**: Structure vs content vs formatting

---

## Failed Enhancement Attempt #2 ❌

### What We Tried
Simplified but still detailed:

```
For EACH requirement, write a detailed subsection:
- Header: ### {CODE} - {Title}
- Content: 3 substantial paragraphs (12-15 sentences total)

Include in your paragraphs:
- Specific step-by-step procedures and implementation details
- Who is responsible (job titles), when it happens (frequency/schedule)
- Forms used (give form numbers like "Form FSP-01"), acceptance criteria
```

### Result
- **Requirements found**: 2/12 (down from 12/12) 💥
- **Failure mode**: LLM stopped generating after 2 requirements
- **Root cause**: "12-15 sentences total" created cognitive load

### Why It Failed
1. **Total sentence count**: LLM tried to count across paragraphs, got confused
2. **Too many details**: Multiple parenthetical clarifications created noise
3. **Still too prescriptive**: Even simplified, it was overwhelming

---

## What We Learned 🎓

### LLM Behavior Patterns

1. **Simple > Complex**: LLMs respond better to natural language than structured instructions
2. **Examples > Rules**: "like 'Form FSP-01'" works, but "give form numbers like..." creates confusion
3. **Avoid counting**: "3 paragraphs" works, "12-15 sentences total" doesn't
4. **No formatting instructions**: Don't use markdown in prompts (no `**bold**`, no nested bullets)
5. **Focus on one thing**: Structure OR depth OR specificity - not all three

### Success Pattern

**What worked:**
```
- 2-3 paragraphs explaining implementation (each paragraph = 3-5 sentences with specific details)
- Include: specific procedures, who is responsible (job titles), when it happens (frequencies), forms used
```

**Why it worked:**
- Simple parenthetical clarification: `(each paragraph = 3-5 sentences)`
- Natural list format with `:` separator
- No counting across elements
- No formatting instructions
- Clear examples embedded naturally

---

## Future Enhancement Strategies 💡

### Strategy 1: Increase Token Budget (Low Risk)
**Approach:** Give Phase 1 more tokens to naturally expand

```typescript
// Current
const phase1Tokens = Math.min(150000, 40000 + (requirementCount * 5000));

// Enhanced
const phase1Tokens = Math.min(180000, 50000 + (requirementCount * 8000));
```

**Pros:**
- No prompt changes
- LLM has room to elaborate
- Zero risk of breaking requirement detection

**Cons:**
- May not guarantee depth increase
- Higher token costs

**Risk:** ⭐ Very Low

---

### Strategy 2: Add Natural Examples (Medium Risk)
**Approach:** Show example content inline

```
- 2-3 paragraphs explaining implementation (each paragraph = 3-5 sentences with specific details)
- Example: "The Food Safety Manager establishes a team meeting first Monday monthly at 9 AM. Team members include QA Manager, Production Supervisor, and Maintenance Lead. Minutes are recorded on Form FSP-04."
```

**Pros:**
- LLM learns from example
- Natural language, not instructions
- Shows desired depth

**Cons:**
- May copy example too literally
- Adds prompt length

**Risk:** ⭐⭐ Low-Medium

---

### Strategy 3: Two-Pass Generation (Medium-High Risk)
**Approach:** Generate basic content, then enhance

**Pass 1:** Current working prompt (generates all requirements)
**Pass 2:** "Enhance each requirement section with additional detail..."

**Pros:**
- Preserves requirement detection
- Can add depth after structure is solid
- Fallback if enhancement fails

**Cons:**
- 2x API calls (cost)
- More complex logic
- May duplicate content

**Risk:** ⭐⭐⭐ Medium

---

### Strategy 4: Post-Processing Expansion (Low Risk)
**Approach:** Use second LLM call to expand specific sections

```typescript
// After Phase 1+2 succeeds
for (requirement of requirements) {
  enhancedContent = await expandRequirement(requirement, context);
  document = replaceRequirement(document, requirement.code, enhancedContent);
}
```

**Pros:**
- Never breaks working generation
- Targeted enhancement
- Can retry individual requirements

**Cons:**
- Many API calls (12 requirements = 12 calls)
- Complex merge logic
- Higher latency

**Risk:** ⭐⭐ Low (but complex)

---

### Strategy 5: Temperature Variation (Low Risk)
**Approach:** Use higher temperature for Phase 1 to encourage verbosity

```typescript
// Current
const phase1Doc = await invokeClaude(phase1Prompt, phase1Tokens, 0);

// Enhanced
const phase1Doc = await invokeClaude(phase1Prompt, phase1Tokens, 0.3);
```

**Pros:**
- Simple change
- More creative/verbose output
- Still deterministic enough

**Cons:**
- Less predictable
- May generate unexpected format

**Risk:** ⭐⭐ Low-Medium

---

## Recommended Approach 🎯

### Phase 1: Validate Stability (Week 1)
1. Test current working state on 10+ different modules
2. Measure quality scores across modules
3. Identify which modules need most depth improvement
4. Establish baseline metrics

### Phase 2: Token Budget Increase (Week 2)
1. Implement Strategy 1 (increase tokens to 180K)
2. Test on same 10 modules
3. Measure quality improvement
4. **If improvement < 5 points:** proceed to Phase 3
5. **If improvement ≥ 5 points:** done! ✅

### Phase 3: Natural Examples (Week 3)
1. Implement Strategy 2 (add inline examples)
2. Start with 1-2 examples only
3. Test on modules that scored lowest
4. Iterate examples based on results
5. **If improvement < 5 points:** proceed to Phase 4

### Phase 4: Post-Processing (Week 4)
1. Implement Strategy 4 (selective expansion)
2. Only expand requirements that scored < 70
3. Use working generation as base (never risk breaking it)
4. Monitor token costs vs quality gains

---

## Critical Rules ⚠️

### Never Break These
1. ✅ **Always keep**: `### {CODE} - {Title}` header format
2. ✅ **Always keep**: "Generate sections 1-8 now" stop instruction
3. ✅ **Always keep**: Simple bullet list format
4. ✅ **Always test**: Run on Module 5.04 (17 reqs) and 7.02 (12 reqs) before deploying
5. ✅ **Always measure**: Track requirements found (must be 100%)

### Never Do These
1. ❌ **Never use**: Markdown formatting in prompts (`**bold**`, `_italic_`)
2. ❌ **Never use**: Nested complex bullet structures
3. ❌ **Never count**: Cross-element totals ("12-15 sentences total")
4. ❌ **Never prescribe**: Explicit paragraph structure ("Paragraph 1:", "Paragraph 2:")
5. ❌ **Never assume**: Always test after changes, even "small" ones

---

## Metrics to Track 📊

### Before Any Enhancement
- Requirements found: X/Y (must be 100%)
- Phase 1 output tokens: ~1000-1300
- Phase 2 output tokens: ~700-900
- Total generation time: ~15-20 seconds
- Quality score estimate: 70-75/100

### After Enhancement (Target)
- Requirements found: X/Y (must stay 100%) ⚠️
- Phase 1 output tokens: 2000-3000 (target)
- Phase 2 output tokens: 700-900 (same)
- Total generation time: <30 seconds
- Quality score estimate: 80-90/100 (target)

### Red Flags 🚩
- Requirements found drops below 100% → **ROLLBACK IMMEDIATELY**
- Generation fails on retry → **REVERT CHANGE**
- Two-phase falls back to single-phase → **INVESTIGATE**
- Output tokens decrease → **PROMPT NOT WORKING**

---

## Code References

### Current Working Implementation
- **File**: `server/llm.ts`
- **Function**: `generateTwoPhase()` (lines ~1420-1585)
- **Phase 1 prompt**: Lines 1460-1520
- **Phase 2 prompt**: Lines 1537-1570

### Key Validation
- **Function**: `validateAnswersPresent()` (lines ~435-520)
- **Requirement header regex**: Multiple patterns for flexibility
- **Success criteria**: All requirement codes found as headers

### Token Budget
- **Formula**: `Math.min(150000, 40000 + (requirementCount * 5000))`
- **Phase 1**: 100K-150K tokens allocated
- **Phase 2**: 80K tokens fixed

---

## Testing Checklist ✅

Before deploying any enhancement:

```bash
# Test Module 5.04 (17 requirements - large)
□ All 17 requirements found
□ Section 7 titled "Hazard / Risk Analysis"
□ Section 8 present with all headers
□ Phase 2 text stripped cleanly
□ No validation errors
□ Quality score ≥ 70

# Test Module 7.02 (12 requirements - medium)
□ All 12 requirements found
□ Two-phase triggered (10+ threshold)
□ First attempt success
□ No forbidden patterns
□ Forms referenced (FSP-XX)
□ Quality score ≥ 70

# Test Module with <10 requirements (single-phase)
□ Single-phase used
□ All requirements found
□ Standard validation passes
```

---

## Contact / Questions

If attempting enhancement and hitting issues:

1. **Check metrics first**: Is requirement detection at 100%?
2. **Review this doc**: Did you violate a "Never Do" rule?
3. **Test with Module 5.04**: Does it still get 17/17?
4. **Compare prompts**: Use git diff to see exact changes
5. **Rollback if needed**: Working state is more valuable than depth

**Remember:** 70-75/100 quality with 100% requirements is better than 90/100 quality with 50% requirements. Stability > Perfection.

---

**Last Updated:** 2026-01-24  
**Working Version Commit:** [Save this with current llm.ts]  
**Status:** Baseline established, enhancement strategies documented
