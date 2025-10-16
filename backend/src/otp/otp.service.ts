import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class OtpService {
    private authKey = process.env.MSG91_AUTHKEY;
    private senderId = process.env.MSG91_SENDERID;
    private templateId = process.env.MSG91_TEMPLATEID;
    private whatsappTemplateId = process.env.MSG91_WHATSAPP_TEMPLATEID; // Add this for WhatsApp


    async sendOtp(countryCode: string, phone: string, otp: string): Promise<boolean> {

        const mobile = `${countryCode.replace('+', '')}${phone}`; // results in "917510720805"
        console.log('MSG91 Config:', {
            authKey: this.authKey ? 'set' : 'not set',
            senderId: this.senderId ? 'set' : 'not set',
            templateId: this.templateId ? 'set' : 'not set',
        });

        console.log(`Preparing to send OTP to ${mobile}`);

        console.log(`Sending OTP ${otp} to mobile ${mobile}`);

        if (!this.authKey || !this.senderId || !this.templateId) {
            console.error('MSG91 configuration is missing');
            return false;
        }

        // MSG91 API payload (using sendotp v2 API)
        const url = 'https://control.msg91.com/api/v5/flow/';

        const data = {
            flow_id: this.templateId,
            mobile: mobile,
            otp: otp,
            sender: this.senderId,
        };

        try {
            const response = await axios.post(url, data, {
                headers: {
                    authkey: this.authKey,
                    'Content-Type': 'application/json',
                },
            });
            console.log('MSG91 OTP send response:', response.data);
            return true;
        } catch (error) {
            console.error('MSG91 OTP send error:', error?.response?.data || error.message);
            return false;
        }
    }


    async sendWhatsappOtp(countryCode: string, phone: string, otp: string): Promise<boolean> {

        const mobile = `${countryCode.replace('+', '')}${phone}`;

        console.log(`Preparing to send WhatsApp OTP to ${mobile}`);

        console.log('MSG91 WhatsApp Config:', {
            authKey: this.authKey ? 'set' : 'not set',
            whatsappTemplateId: this.whatsappTemplateId ? 'set' : 'not set',
        });

        if (!this.authKey || !this.whatsappTemplateId) {
            console.error('MSG91 WhatsApp configuration is missing');
            return false;
        }

        // WhatsApp Flow API endpoint (same as SMS, but different flow_id/template)
        const url = 'https://control.msg91.com/api/v5/flow/';
        const data = {
            flow_id: this.whatsappTemplateId,
            mobiles: mobile,
            otp: otp,
        };

        try {
            const response = await axios.post(url, data, {
                headers: {
                    authkey: this.authKey,
                    'Content-Type': 'application/json',
                },
            });
            console.log('MSG91 WhatsApp OTP send response:', response.data);
            return true;
        } catch (error) {
            console.error('MSG91 WhatsApp OTP send error:', error?.response?.data || error.message);
            return false;
        }
    }

}
