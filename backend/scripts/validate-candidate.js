"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const create_candidate_dto_1 = require("../src/candidates/dto/create-candidate.dto");
const payload = {
    firstName: 'Emery',
    lastName: 'Wooten',
    countryCode: '+91',
    mobileNumber: '9878788778',
    dateOfBirth: '2012-05-04',
    email: 'damonukame@mailinator.com',
    source: 'manual',
    qualifications: [
        { qualificationId: 'cmje8as2t003qq4eobwjxwf0a', university: 'Enim ad facere est i' }
    ],
    workExperiences: [
        {
            companyName: 'Sun',
            roleCatalogId: 'cmje8as29002fq4eo15icmx6g',
            jobTitle: 'Cardiologist',
            startDate: '2021-02-20',
            endDate: '2025-12-20',
            isCurrent: false
        }
    ]
};
async function main() {
    const dto = (0, class_transformer_1.plainToInstance)(create_candidate_dto_1.CreateCandidateDto, payload);
    const errors = await (0, class_validator_1.validate)(dto, { whitelist: true, forbidNonWhitelisted: true });
    if (errors.length) {
        console.log('Validation errors:');
        console.dir(errors, { depth: 5 });
        process.exit(1);
    }
    console.log('No validation errors. DTO validated successfully');
}
main();
//# sourceMappingURL=validate-candidate.js.map