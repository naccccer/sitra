# Component Contribution Template

Use this template for any shared UI component or variant change.

## Summary
- Component/contract:
- Change type: Added / Changed / Deprecated / Removed
- Owner module(s):

## Problem Statement
- Which workflow pain is addressed?
- Why current primitives/variants are insufficient?

## Contract Definition
- Props added/changed:
- States covered (loading/empty/error/success/archived/etc):
- Accessibility notes (focus, keyboard, aria):

## Token Compliance
- Tokens used (color/type/spacing/radius/shadow/motion/z-index/state):
- Any hardcoded exceptions and justification:

## Adoption Plan
- Adopted now (files/modules):
- Deferred adoption backlog:
- Deprecation/removal path for old pattern:

## Visual Regression
- Baseline screens affected:
- Snapshot diff intent summary:
- Breakage risk level (S1/S2/S3):

## Drift Guard Check
- Does this introduce new local table/form/modal primitives? (yes/no)
- Does this add browser-native confirm usage? (must be no)
- Does this require follow-up cleanup before next release? (yes/no + owner)

## Release Notes Entry
- Added:
- Changed:
- Deprecated:
- Removed:
- Migration notes:
