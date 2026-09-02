# Architecture Context

## Current implementation

There is no application implementation yet. As of 2026-09-02, the repository has
no source tree, package/dependency manifest, build configuration, CI workflow,
test framework, deployment setup, or Git metadata.

## Intended system boundary

The product target requires three high-level capabilities:

1. Capture audio being played by the user's computer.
2. Convert captured audio into a time-aligned text transcript.
3. Let the user organize and revisit recordings and transcripts.

These are product-level boundaries, not selected modules or technologies. The
desktop framework, supported operating systems, audio capture APIs, transcription
provider/model, persistence layer, and packaging strategy remain undecided.

## Decision constraints

- Audio capture is operating-system-specific and must be validated on each
  supported platform before a framework is selected.
- Recording, transcription, storage, and review should have explicit boundaries
  so that provider or platform changes do not spread through the whole app.
- Microphone capture must not be assumed to be equivalent to system-audio capture.
- Transcription failures must be visible and retryable; never report an empty or
  partial transcript as a successful completion.
- Raw audio and transcript data are sensitive local user data. Architecture must
  specify consent, storage location, retention, deletion, and any cloud transfer.

## Pending architecture decisions

- Initial operating system and minimum supported version.
- Local-only versus cloud-assisted transcription.
- Live streaming versus post-recording transcription for the first release.
- Desktop framework and language.
- Local data format/database, search needs, and export formats.
- Installer, code signing, auto-update, telemetry, and crash-reporting policy.

Record accepted decisions as ADRs under `.agents/decisions/` when implementation
begins; do not create placeholder ADRs.
