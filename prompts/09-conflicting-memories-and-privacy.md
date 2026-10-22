# 09 — Settle conflicting memories, and audit memory for privacy

> **Mandated prompts** — *Settle conflicting memories* (Harden) and *Audit memory for
> privacy* (Harden). Verbatim from `https://meterless.ai/engines.html`. Apache 2.0,
> `github.com/Meterless/Meterless`.

```text
Add conflict resolution to the H-MEM memory in this codebase. Read engines/hmem/docs/conflict-resolution.md at https://github.com/Meterless/Meterless and run examples/07-conflict-resolution.

Write tests for the cases that break memory: a newer fact contradicts an older one, two sources disagree, and a user correction overrides a mined fact. Each resolution records why it won. Run the tests and the conformance suite, and show both passing.
```

```text
Audit the memory in this codebase against engines/hmem/docs/privacy-and-local-first.md at https://github.com/Meterless/Meterless, and the repo's SECURITY.md.

Check for: any network call that carries memory, personal data stored without need, and records that cannot be exported or fully deleted. Give me a table of findings by severity, fix the top three, and add a test that fails if memory ever leaves the machine.
```

## Our binding

- **Role 1 — the Critic's evidence gate.** "Two sources disagree" is not a memory edge case
  here, it is **the product**: a listing's declared price is contradicted by the
  reconciled evidence. The resolution must **record why it won**, because the decision to
  *hold* the listing is only defensible if the reason is auditable.
- **Role 2 — local-first posture.** The same two ideas that Meterless calls "local-first
  and privacy design" are our posture: the exchange's memory stays on the machine, and
  **nothing about a listing leaves it** unless the owner pays to list it.
- **Files:** `src/engines/hmem/`, `src/agents/conflict-critic.ts`, `src/agents/evidence-reconciler.ts`.

## Stop rule

1. Tests cover all three breaking cases: a newer fact contradicts an older one; two
   sources disagree; a user correction overrides a mined fact.
2. **Each resolution records why it won** — and the reason reaches the escalation record.
3. The H-MEM conformance suite is green and shown passing.
4. A **severity table** of privacy findings is produced; the top three are fixed.
5. **A test exists that fails if memory ever leaves the machine.**
6. A listing's evidence and its owner's declared price never leave the machine through a
   network call that is not the owner's own listing action.
