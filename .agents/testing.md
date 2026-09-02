# Testing and Verification

## Current state

No test framework, test files, lint configuration, build pipeline, or CI exists.
Consequently, there are currently no runnable install, development, test, lint,
or build commands.

## Required quality gates before implementation grows

- Unit tests for recording state, transcription job state, and persistence logic.
- Integration tests around the chosen OS audio-capture boundary.
- Contract tests for any remote transcription provider, without real credentials
  in source control.
- Failure-path coverage for permission denial, missing audio devices, interrupted
  recordings, provider errors, retries, and low disk space.
- Packaging smoke tests on every officially supported operating system.
- Manual audio fixtures must contain no private or copyrighted meeting content.

When a toolchain is selected, document exact commands in both this file and the
root `AGENTS.md`, using configuration and CI as the source of truth.
