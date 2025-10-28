import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';



export class SendLoginOtpDto {
    @ApiProperty({
        description: 'Country dialing code for the phone number',
        example: '+1',
    })
    @IsString({ message: 'Country code must be a string' })
    @IsNotEmpty({ message: 'Country code is required' })
    countryCode: string;

    @ApiProperty({
        description: 'Recipient phone number without the country code',
        example: '4155550123',
    })
    @IsString({ message: 'mobileNumber must be a string' })
    @IsNotEmpty({ message: 'mobileNumber is required' })
    mobileNumber: string;
}