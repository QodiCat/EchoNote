# EchoNote Product

## Product statement

EchoNote is a desktop application that records audio played by the user's
computer, transcribes that audio into text, and helps the user organize and review
the resulting material.

## User problem

People who listen to meetings, lessons, interviews, calls, or other material on a
computer need a reliable way to retain the spoken content as searchable text for
later organization and reflection.

## Current target outcome

A user can intentionally start and stop a system-audio recording, see whether
recording and transcription succeeded, access the transcript together with its
source recording, and use the text for later review.

## Status

- Phase: discovery / pre-implementation.
- Current implementation: none.
- Approved feature package: none.
- UI baseline: none.
- Acceptance baseline: none.
- Commercial scope and delivery date: not defined.

## Candidate first-release boundary (not yet approved)

- One supported desktop operating system.
- Manual start/stop of system-audio recording.
- Post-recording transcription with timestamps.
- Local recording/transcript library and basic text export.
- Clear recording, processing, success, and failure states.

This is a proposal for product discovery, not authorization to implement.

## Decisions required before implementation

- Initial operating system and minimum version.
- Whether microphone audio is excluded, optional, or mixed into recordings.
- Local transcription, cloud transcription, or a selectable hybrid.
- Languages, accuracy expectations, maximum recording length, and latency target.
- Required organization features: title, tags, search, summaries, notes, or folders.
- Export formats and whether audio must remain playable in the application.
- Privacy, consent notice, storage, cloud transfer, retention, and deletion policy.
- Offline expectations, account requirement, monetization, and release channel.

## Product principles

- Recording must always be deliberate and visibly indicated.
- Failures and partial transcripts must be explicit and recoverable.
- Sensitive audio and transcripts should stay local unless the user knowingly
  enables a documented cloud workflow.
- Product targets must not be presented as implemented behavior until verified in
  code and tests.
