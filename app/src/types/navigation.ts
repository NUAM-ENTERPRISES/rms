export type RootStackParamList = {
    Splash: undefined;
    Login: undefined;
    Home: undefined;
    Details: undefined;
};

// Extend the type for navigation prop
declare global {
    namespace ReactNavigation {
        interface RootParamList extends RootStackParamList { }
    }
}