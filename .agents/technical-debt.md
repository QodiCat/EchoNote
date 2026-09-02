# Technical Debt and Risks

## Foundation gaps

- No source control metadata is present in this directory.
- No technology stack or desktop framework has been selected.
- No dependency, build, test, lint, formatting, or CI configuration exists.
- No supported operating system or minimum version is approved.
- No system-audio capture feasibility spike has been completed.

## Product and operational risks

- System-audio capture differs materially across Windows, macOS, and Linux.
- Cloud transcription could expose sensitive audio and text; consent, provider,
  region, encryption, retention, and deletion behavior are unresolved.
- Local transcription affects download size, hardware requirements, latency, and
  packaging; no performance target or representative hardware is defined.
- Recording other people may trigger legal/consent requirements depending on the
  user's jurisdiction and context; the product behavior is not yet specified.
- Long recordings require explicit limits, crash recovery, disk-space handling,
  and resumable transcription behavior.

## Recommended retirement order

1. Approve initial platform, privacy boundary, and first-release workflow.
2. Run a minimal system-audio capture spike on the target platform.
3. Select the stack based on spike evidence and packaging constraints.
4. Establish tests and CI with the first executable slice.
