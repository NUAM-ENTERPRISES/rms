-- Any-sector profession focus: optional profession type + sector flag
ALTER TABLE "candidates" ADD COLUMN "focuses_all_professions" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "candidates" ADD COLUMN "profession_sector" "ProfessionSector";

ALTER TABLE "candidates" ALTER COLUMN "professionTypeId" DROP NOT NULL;

CREATE INDEX "candidates_focusesAllProfessions_idx" ON "candidates"("focuses_all_professions");
CREATE INDEX "candidates_professionSector_idx" ON "candidates"("profession_sector");
