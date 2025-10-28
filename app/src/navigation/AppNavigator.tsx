import { NavigationContainer } from "@react-navigation/native";
import RoleBasedNavigator from "./RoleBasedNavigator";


const AppNavigator = () => {
  return (
    <NavigationContainer>
      <RoleBasedNavigator />
    </NavigationContainer>
  );
};

export default AppNavigator;