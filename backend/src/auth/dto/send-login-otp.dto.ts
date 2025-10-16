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
    @IsString({ message: 'Phone must be a string' })
    @IsNotEmpty({ message: 'Phone number is required' })
    phone: string;
}