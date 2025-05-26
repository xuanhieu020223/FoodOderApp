import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NavigatorScreenParams } from '@react-navigation/native';

// Import screens
import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';

// Import navigators
import UserNavigator from '../navigation/UserNavigator';
import AdminNavigator, { AdminTabParamList } from '../navigation/AdminNavigator';

// Define navigation types
export type RootStackParamList = {
  Welcome: undefined;
  Login: { isAdmin?: boolean };
  Register: undefined;
  ResetPassword: undefined;
  UserApp: undefined;
  AdminApp: NavigatorScreenParams<AdminTabParamList>;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="Welcome"
      screenOptions={{
        headerStyle: { backgroundColor: '#ee4d2d' },
        headerTintColor: '#fff',
      }}
    >
      {/* Auth screens */}
      <Stack.Screen
        name="Welcome"
        component={WelcomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ResetPassword"
        component={ResetPasswordScreen}
        options={{ title: 'Đặt lại mật khẩu' }}
      />

      {/* App navigators */}
      <Stack.Screen
        name="UserApp"
        component={UserNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AdminApp"
        component={AdminNavigator}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

export default AppNavigator;
