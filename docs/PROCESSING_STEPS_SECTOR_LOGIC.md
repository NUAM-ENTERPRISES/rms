# Processing steps: healthcare vs non-healthcare

This document describes how **project sector** drives which **processing step templates** apply to a processing candidate, how steps are created or cancelled in the database, and how lists and progress are filtered for APIs and UI.

**Primary implementation**

- Allowlists and filters: `backend/src/processing/processing-sector-steps.ts`
- Step materialisation (create / cancel / restore): `ProcessingService.createStepsForProcessingCandidate` in `backend/src/processing/processing.service.ts`
- Sector constants: `backend/src/projects/constants.ts` (`PROJECT_SECTOR`)

---

## Project sector values

| Value             | Constant                         | Meaning                                      |
| ----------------- | -------------------------------- | -------------------------------------------- |
| `healthcare`      | `PROJECT_SECTOR.HEALTHCARE`      | Full clinical / licensing-style flow       |
| `non-healthcare`  | `PROJECT_SECTOR.NON_HEALTHCARE`  | Shorter flow without clinical-only steps     |

If `Project.sector` is **null**, **undefined**, or any value other than `non-healthcare`, the code treats the project as **healthcare** (same allowlist as healthcare).

---

## Template key allowlists

Steps are keyed by `ProcessingStepTemplate.key` (for example `medical`, `data_flow`, `visa`).

### Healthcare (`HEALTHCARE_STEP_KEYS`)

Includes offer through deployment-style steps used for regulated healthcare mobility, for example:

`offer_letter`, `document_received`, `hrd`, `data_flow`, `eligibility`, `prometric`, `council_registration`, `document_attestation`, `medical`, `mofa_number`, `medical_fitness`, `biometrics`, `visa`, `emigration`, `ticket`.

`document_received` supports Gulf country plans (see processing country step seeds).

### Non-healthcare (`NON_HEALTHCARE_STEP_KEYS`)

A reduced path:

`offer_letter`, `hrd`, `document_attestation`, `biometrics`, `visa`, `emigration`, `ticket`.

Steps such as `data_flow`, `medical`, `prometric`, and similar **clinical / licensing** keys are **not** in this set.

---

## How the effective step plan is built

`createStepsForProcessingCandidate` runs when processing is set up and when consumers ensure steps exist (for example before returning steps from `getProcessingSteps`).

1. **Resolve sector** from `processingCandidate.project.sector` and compute `allowedKeys` via `allowedTemplateKeysForSector(sector)`.

2. **Resolve country** from `project.countryCode`, falling back to `candidate.countryCode`.

3. **Load plan rows**
   - If the country has rows in `ProcessingCountryStep`, use that ordered list (each row references a `ProcessingStepTemplate`).
   - If there is **no** country plan, fall back to **all** global templates ordered by `ProcessingStepTemplate.order`.

4. **Intersect plan with sector allowlist**  
   Keep only plan entries whose template `key` is in `allowedKeys`.  
   So the candidate never gets materialised steps for templates that are wrong for the sector, even if they appear in the global template table.

5. **Cancel steps that no longer apply**  
   For each existing `ProcessingStep` on this candidate: if its template key is **not** in `allowedKeys` and status is `pending` or `in_progress`, update it to `cancelled` and set `rejectionReason` to the sector mismatch reason (see below).

6. **Restore previously sector-cancelled steps**  
   If a step is `cancelled`, its `rejectionReason` equals the sector mismatch constant, and its template key is **again** in `allowedKeys`, update it back to `pending` and clear `rejectionReason`.  
   This fixes cases where an allowlist temporarily removed a key (for example `medical`) and was later restored in code.

7. **Create missing steps**  
   For each entry in the filtered plan, if no `ProcessingStep` row exists for that `templateId`, create one as `pending`.

8. **Optional auto-start** of the first step only when the processing candidate’s own status is already `in_progress` (see comments in the service).

---

## Sector mismatch cancellation constant

Steps cancelled automatically because they fell outside the sector allowlist store:

`PROCESSING_STEP_SECTOR_MISMATCH_REASON`  
(`'Not applicable for this project sector'`)

Defined in `processing-sector-steps.ts` and used when cancelling (and when deciding whether to restore) in `createStepsForProcessingCandidate`.

Only cancellations **with this exact reason** are auto-restored when the key becomes allowed again. Other cancellation reasons are left unchanged.

---

## API and UI visibility (`filterProcessingStepsForSector`)

Several endpoints use `filterProcessingStepsForSector(steps, project.sector)` which:

- Keeps steps whose template `key` is in the sector allowlist.
- **Drops** steps with `status === 'cancelled'` (they do not appear in the filtered list).

So cancelled steps never show until they are restored (manually or by the restore logic above) or recreated.

---

## Progress percentage (`computeApplicableStepProgress`)

Progress is computed only over steps that pass `filterProcessingStepsForSector`: allowed template keys and not cancelled. Completed count is among those rows with `status === 'completed'`.

---

## Practical guidance for engineers

- **Adding a step to healthcare only**: add its template `key` to `HEALTHCARE_STEP_KEYS` in `processing-sector-steps.ts`. Ensure country plans or global templates include it where needed.
- **Adding a step to non-healthcare**: add the key to `NON_HEALTHCARE_STEP_KEYS` if non-healthcare projects should run it.
- **Temporarily removing a key from an allowlist**: pending/in-progress rows for that key will be **persisted as cancelled** on the next sync. Restoring the key in code triggers **restore** only for rows cancelled with `PROCESSING_STEP_SECTOR_MISMATCH_REASON`.
- **Changing only seeds / country plans**: sector allowlist still applies first; a template must appear in the filtered plan **and** be allowed for the sector for a new row to be created.

---

## Related tests

- `backend/src/processing/__tests__/processing-sector-steps.spec.ts` — allowlist and filter behaviour
- `backend/src/processing/__tests__/create-steps-sector.spec.ts` — cancel and restore behaviour in `createStepsForProcessingCandidate`
