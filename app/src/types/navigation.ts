export type RootStackParamList = {
    Splash: undefined;
    Login: undefined;
    ForgotPassword: { phone?: string; countryCode?: string } | undefined;
    ResetPassword: { phone: string; countryCode: string };
    Home: undefined;
    Details: undefined;
};

// Extend the type for navigation prop
declare global {
    namespace ReactNavigation {
        interface RootParamList extends RootStackParamList { }
    }
}