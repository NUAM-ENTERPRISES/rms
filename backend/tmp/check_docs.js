const { PrismaClient } = require('@prisma/client');
(async () => {
  const p = new PrismaClient();
  const h = await p.processingStepTemplate.findUnique({ where: { key: 'hrd' } });
  const d = await p.processingStepTemplate.findUnique({ where: { key: 'data_flow' } });
  console.log('hrd id', h?.id);
  console.log('data_flow id', d?.id);
  const hRow = await p.countryDocumentRequirement.findFirst({ where: { countryCode: 'ALL', docType: 'degree_certificate', processingStepTemplateId: h?.id } });
  const dRow = await p.countryDocumentRequirement.findFirst({ where: { countryCode: 'ALL', docType: 'degree_certificate', processingStepTemplateId: d?.id } });
  console.log('ALL+degree+hrd =>', !!hRow);
  console.log('ALL+degree+dataflow =>', !!dRow);
  await p.$disconnect();
})();