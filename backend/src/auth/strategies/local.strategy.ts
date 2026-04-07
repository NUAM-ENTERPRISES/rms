import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    // Note: passport-local only supports usernameField, so we pass countryCode+phone as one field
    // and parse it in the validate method
    super({ usernameField: 'mobileNumber', passReqToCallback: true });
  }

  async validate(
    req: any,
    mobileNumber: string,
    password: string,
  ): Promise<any> {
    try {
      const countryCode = req.body.countryCode;

      if (!countryCode) {
        throw new UnauthorizedException('Country code is required');
      }

      const user = await this.authService.validateUser(
        countryCode,
        mobileNumber,
        password,
      );

      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      return user;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid credentials');
    }
  }
}
