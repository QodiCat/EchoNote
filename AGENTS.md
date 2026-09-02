# EchoNote Engineering Guide

## Project

EchoNote is a planned desktop application for recording computer system audio,
transcribing it into text, and organizing the transcript for later review.
The repository currently contains context documents only; no application code,
toolchain, dependency manifest, CI, or deployment configuration exists yet.

## Sources of truth

- Code, configuration, tests, and CI describe the current implementation.
- Approved documents under `.product/` describe the product target.
- `Documents/` is historical/supporting material and is not authoritative alone.
- When implementation and product intent differ, record both; do not silently
  change one to match the other.

## Commands

- Install: none.
- Development: none.
- Test: none.
- Lint: none.
- Build: none.

Do not invent commands. Add them here only after introducing and verifying the
corresponding configuration or CI workflow.

## Global constraints

- Keep hand-written source files near or below 500 lines; split by responsibility.
- Keep each directory focused on one domain; avoid generic dumping grounds.
- Extend an existing capability instead of creating parallel implementations.
- Remove dead code and obsolete configuration when changing related behavior.
- Store runtime configuration in `.env`; never hard-code URLs, ports, tokens,
  secrets, or other environment-specific values.
- Do not use long-lived mocks, fake production data, silent fallbacks, swallowed
  errors, or default-success behavior.
- Update tests and relevant context documents with functional changes.
- Do not delete tests, weaken validation, or bypass CI to make changes pass.
- Never persist raw recordings or transcripts beyond the documented retention
  policy once that policy is approved.

## Context index

- `.agents/architecture.md`: current architecture facts and decision boundaries.
- `.agents/testing.md`: present verification state and future quality gates.
- `.agents/technical-debt.md`: known gaps, risks, and unresolved engineering work.
- `.product/README.md`: product documentation entry and current phase.
- `.product/product.md`: concise approved target and open product decisions.
- `.product/start-prompt.md`: workflow for future product and acceptance work.

## Definition of done

A change is complete when its behavior is implemented, relevant checks pass,
errors remain observable, configuration is documented, and affected engineering
and product context is synchronized. Report checks that cannot run and why.
