import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Ionicons, Feather, AntDesign, MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, CommonActions } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { auth, db } from '../config/Firebase';
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import { getDoc, doc, setDoc } from 'firebase/firestore';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { RootStackParamList } from '../app';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type LoginRouteProp = RouteProp<RootStackParamList, 'Login'>;
type LoginMode = 'customer' | 'restaurant' | 'shipper' | 'admin';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_LOGIN_ENABLED = false;

const GOOGLE_CLIENT_IDS = {
  expoClientId: process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID ?? 'disabled-expo-client-id',
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? 'disabled-ios-client-id',
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? 'disabled-android-client-id',
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? 'disabled-web-client-id',
};

const LogIn = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<LoginRouteProp>();
  const initialMode = route.params?.mode ?? 'customer';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secureText, setSecureText] = useState(true);
  const [mode, setMode] = useState<LoginMode>(initialMode);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleRequest, , promptGoogleLogin] = Google.useAuthRequest(GOOGLE_CLIENT_IDS);
  const isGoogleConfigured = GOOGLE_LOGIN_ENABLED && Object.values(GOOGLE_CLIENT_IDS).some((value) => !!value);

  useEffect(() => {
    if (route.params?.mode) {
      setMode(route.params.mode);
    }
  }, [route.params?.mode]);

  const navigateByRole = (userRole: string) => {
    const normalizedRole = userRole.toLowerCase();
    if (normalizedRole === 'admin') {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'AdminApp' }],
        })
      );
      return;
    }

    if (normalizedRole === 'restaurant') {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'RestaurantApp' }],
        })
      );
      return;
    }

    if (normalizedRole === 'shipper') {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'ShipperApp' }],
        })
      );
      return;
    }

    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'UserApp' }],
      })
    );
  };

  const validateModeWithRole = (userRole: string) => {
    const normalizedRole = userRole.toLowerCase();

    if (mode === 'restaurant' && normalizedRole !== 'restaurant') {
      Alert.alert(
        'Thông báo',
        'Tài khoản này không thuộc loại Nhà hàng. Vui lòng đăng nhập với tư cách khách hàng.'
      );
      return false;
    }

    if (mode === 'customer' && normalizedRole === 'restaurant') {
      Alert.alert(
        'Thông báo',
        'Tài khoản này thuộc nhà hàng. Vui lòng chọn đăng nhập Nhà hàng.'
      );
      return false;
    }

    if (mode === 'shipper' && normalizedRole !== 'shipper') {
      Alert.alert('Thông báo', 'Tài khoản này không phải shipper.');
      return false;
    }

    return true;
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập email và mật khẩu.');
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      
      if (!userDoc.exists()) {
        Alert.alert('Lỗi', 'Không tìm thấy thông tin người dùng');
        return;
      }

      const userData = userDoc.data();
      const userRole = (userData.role || 'customer').toLowerCase();

      if (!validateModeWithRole(userRole)) {
        return;
      }

      navigateByRole(userRole);
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.code === 'auth/invalid-credential') {
        Alert.alert('Đăng nhập thất bại', 'Email hoặc mật khẩu không đúng.');
      } else if (error.code === 'auth/user-not-found') {
        Alert.alert('Đăng nhập thất bại', 'Tài khoản không tồn tại.');
      } else {
        Alert.alert('Đăng nhập thất bại', 'Đã có lỗi xảy ra. Vui lòng thử lại sau.');
      }
    }
  };

  const ensureUserProfile = async (userId: string, payload: { email?: string | null; name?: string | null; photoURL?: string | null; }) => {
    const userRef = doc(db, 'users', userId);
    const existingUser = await getDoc(userRef);

    if (existingUser.exists()) {
      return existingUser.data();
    }

    const usernameFromEmail = payload.email
      ? payload.email.split('@')[0]
      : `user_${userId.slice(0, 6)}`;

    await setDoc(userRef, {
      uid: userId,
      email: payload.email?.toLowerCase() ?? '',
      username: usernameFromEmail,
      name: payload.name ?? usernameFromEmail,
      avatar: payload.photoURL ?? null,
      role: 'customer',
      provider: 'google',
      createdAt: new Date(),
    });

    return (await getDoc(userRef)).data();
  };

  const signInWithGoogleToken = async (idToken: string) => {
    const credential = GoogleAuthProvider.credential(idToken);
    const userCredential = await signInWithCredential(auth, credential);
    const { user } = userCredential;
    const userData =
      (await ensureUserProfile(user.uid, {
        email: user.email,
        name: user.displayName,
        photoURL: user.photoURL,
      })) || {};

    const userRole = (userData.role || 'customer').toLowerCase();
    if (!validateModeWithRole(userRole)) {
      return;
    }

    navigateByRole(userRole);
  };

  const handleGoogleLogin = async () => {
    if (!GOOGLE_LOGIN_ENABLED) {
      Alert.alert('Thông báo', 'Đăng nhập Google đang được tạm khóa.');
      return;
    }

    if (!isGoogleConfigured) {
      Alert.alert(
        'Thiếu cấu hình',
        'Vui lòng cấu hình Google Client ID trong biến môi trường EXPO_PUBLIC_GOOGLE_* trước khi sử dụng tính năng này.'
      );
      return;
    }

    if (!googleRequest) {
      Alert.alert('Thông báo', 'Google chưa sẵn sàng, vui lòng thử lại sau.');
      return;
    }

    try {
      setIsGoogleLoading(true);
      const result = await promptGoogleLogin();

      if (result?.type !== 'success' || !result.authentication?.idToken) {
        setIsGoogleLoading(false);
        return;
      }

      await signInWithGoogleToken(result.authentication.idToken);
    } catch (error) {
      console.error('Google login error:', error);
      Alert.alert('Lỗi', 'Không thể đăng nhập bằng Google. Vui lòng thử lại sau.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const isRestaurantMode = mode === 'restaurant';

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle={isRestaurantMode ? "light-content" : "dark-content"} backgroundColor={isRestaurantMode ? "#ee4d2d" : "#fff"} />
      {isRestaurantMode ? (
        <LinearGradient
          colors={['#ee4d2d', '#ff6b4a', '#ff8c6b']}
          style={styles.gradientContainer}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <SafeAreaView style={styles.safeArea}>
            <ScrollView 
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Animated.View 
                style={styles.restaurantContent} 
                entering={FadeInDown.duration(600).delay(100)}
              >
                {/* Logo Section */}
                <Animated.View 
                  style={styles.restaurantLogoContainer}
                  entering={FadeInUp.duration(600).delay(200)}
                >
                  <View style={styles.restaurantIconContainer}>
                    <MaterialIcons name="restaurant" size={48} color="#fff" />
                  </View>
                  <Text style={styles.restaurantWelcomeText}>Chào mừng trở lại!</Text>
                  <Text style={styles.restaurantSubText}>Đăng nhập để quản lý nhà hàng của bạn</Text>
                </Animated.View>

                {/* Form Card */}
                <Animated.View 
                  style={styles.restaurantCard}
                  entering={FadeInUp.duration(600).delay(300)}
                >
                  <View style={styles.restaurantFormContainer}>
                    {/* Email Input */}
                    <Animated.View 
                      style={styles.restaurantInputContainer}
                      entering={FadeInUp.duration(400).delay(400)}
                    >
                      <View style={styles.restaurantInputWrapper}>
                        <Ionicons name="mail-outline" size={22} color="#ee4d2d" style={styles.inputIcon} />
                        <TextInput
                          placeholder="Email nhà hàng"
                          placeholderTextColor="#999"
                          style={styles.restaurantTextInput}
                          value={email}
                          onChangeText={setEmail}
                          autoCapitalize="none"
                          keyboardType="email-address"
                        />
                      </View>
                    </Animated.View>

                    {/* Password Input */}
                    <Animated.View 
                      style={styles.restaurantInputContainer}
                      entering={FadeInUp.duration(400).delay(500)}
                    >
                      <View style={styles.restaurantInputWrapper}>
                        <Ionicons name="lock-closed-outline" size={22} color="#ee4d2d" style={styles.inputIcon} />
                        <TextInput
                          placeholder="Mật khẩu"
                          placeholderTextColor="#999"
                          style={styles.restaurantTextInput}
                          secureTextEntry={secureText}
                          value={password}
                          onChangeText={setPassword}
                        />
                        <TouchableOpacity 
                          onPress={() => setSecureText(!secureText)} 
                          style={styles.restaurantEyeIcon}
                        >
                          <Feather 
                            name={secureText ? 'eye-off' : 'eye'} 
                            size={20} 
                            color="#666" 
                          />
                        </TouchableOpacity>
                      </View>
                    </Animated.View>

                    {/* Forgot Password */}
                    <TouchableOpacity 
                      style={styles.restaurantForgot}
                      onPress={() => navigation.navigate('ResetPassword')}
                    >
                      <Text style={styles.restaurantForgotText}>Quên mật khẩu?</Text>
                    </TouchableOpacity>

                    {/* Login Button */}
                    <Animated.View entering={FadeInUp.duration(400).delay(600)}>
                      <TouchableOpacity 
                        style={styles.restaurantLoginButton} 
                        onPress={handleLogin}
                        activeOpacity={0.9}
                      >
                        <LinearGradient
                          colors={['#ee4d2d', '#ff6b4a']}
                          style={styles.restaurantLoginGradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                        >
                          <Text style={styles.restaurantLoginButtonText}>Đăng nhập</Text>
                          <MaterialIcons name="arrow-forward" size={20} color="#fff" />
                        </LinearGradient>
                      </TouchableOpacity>
                    </Animated.View>

                    {/* Mode Switcher */}
                    <View style={styles.restaurantModeSwitcher}>
                      <Text style={styles.restaurantModeText}>Bạn là?</Text>
                      <View style={styles.restaurantModeButtons}>
                        {[
                          { label: 'Khách hàng', value: 'customer', icon: 'person-outline' },
                          { label: 'Nhà hàng', value: 'restaurant', icon: 'restaurant' },
                          { label: 'Shipper', value: 'shipper', icon: 'local-shipping' },
                        ].map((option) => (
                          <TouchableOpacity
                            key={option.value}
                            style={[
                              styles.restaurantModeButton,
                              mode === option.value && styles.restaurantModeButtonActive,
                            ]}
                            onPress={() => setMode(option.value as LoginMode)}
                          >
                            <Ionicons 
                              name={option.icon as any} 
                              size={18} 
                              color={mode === option.value ? '#ee4d2d' : '#666'} 
                            />
                            <Text
                              style={[
                                styles.restaurantModeButtonText,
                                mode === option.value && styles.restaurantModeButtonTextActive,
                              ]}
                            >
                              {option.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </View>
                </Animated.View>
              </Animated.View>
            </ScrollView>
          </SafeAreaView>
        </LinearGradient>
      ) : (
        <Animated.View style={styles.content} entering={FadeInUp.duration(600)}>
          <View style={styles.logoContainer}>
            <Image 
              source={require('../assets/images/logo.png')} 
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          
          <Text style={styles.titleText}>
            {mode === 'shipper'
              ? 'Đăng nhập Shipper'
              : 'Đăng Nhập'}
          </Text>
          <View style={styles.modeSwitcher}>
            {[
              { label: 'Khách hàng', value: 'customer' },
              { label: 'Nhà hàng', value: 'restaurant' },
              { label: 'Shipper', value: 'shipper' },
            ].map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.modeButton,
                  mode === option.value && styles.modeButtonActive,
                ]}
                onPress={() => setMode(option.value as LoginMode)}
              >
                <Text
                  style={[
                    styles.modeButtonText,
                    mode === option.value && styles.modeButtonTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <TextInput
                placeholder="Email"
                style={styles.textInput}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                placeholder="Mật khẩu"
                style={styles.textInput}
                secureTextEntry={secureText}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setSecureText(!secureText)} style={styles.eyeIcon}>
                <Feather name={secureText ? 'eye-off' : 'eye'} size={20} color="#666" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.forgot}
              onPress={() => navigation.navigate('ResetPassword')}
            >
              <Text style={styles.forgotText}>Quên mật khẩu?</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
              <Text style={styles.loginButtonText}>Đăng nhập</Text>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Hoặc</Text>
              <View style={styles.dividerLine} />
            </View>

            {GOOGLE_LOGIN_ENABLED && (
              <TouchableOpacity
                style={[styles.googleButton, (!isGoogleConfigured || isGoogleLoading) && styles.googleButtonDisabled]}
                onPress={handleGoogleLogin}
                disabled={!isGoogleConfigured || isGoogleLoading}
              >
                {isGoogleLoading ? (
                  <ActivityIndicator color="#EA4335" style={styles.googleIcon} />
                ) : (
                  <AntDesign name="google" size={20} color="#EA4335" style={styles.googleIcon} />
                )}
                <Text style={styles.googleText}>
                  {isGoogleConfigured ? 'Đăng nhập bằng Google' : 'Chưa cấu hình Google'}
                </Text>
              </TouchableOpacity>
            )}

            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>
                Chưa có tài khoản?{' '}
                <Text
                  style={styles.registerLink}
                  onPress={() => navigation.navigate('Register')}
                >
                  Đăng ký
                </Text>
              </Text>
            </View>
          </View>
        </Animated.View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  logo: {
    width: 120,
    height: 120,
  },
  formContainer: {
    flex: 1,
  },
  titleText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 32,
    textAlign: 'center',
  },
  modeSwitcher: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f3f4f6',
    borderRadius: 999,
    padding: 4,
    marginBottom: 24,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  modeButtonText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
  },
  modeButtonTextActive: {
    color: '#ee4d2d',
  },
  
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
  },
  inputContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#f8f8f8',
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  eyeIcon: {
    padding: 4,
  },
  forgot: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotText: {
    color: '#ee4d2d',
    fontSize: 14,
  },
  loginButton: {
    backgroundColor: '#ee4d2d',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 24,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#666',
    fontSize: 14,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#ddd',
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  googleIcon: {
    marginRight: 8,
  },
  googleText: {
    fontSize: 16,
    color: '#333',
  },
  googleButtonDisabled: {
    opacity: 0.6,
  },
  registerContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  registerText: {
    fontSize: 14,
    color: '#666',
  },
  registerLink: {
    color: '#ee4d2d',
    fontWeight: '600',
  },
  // Restaurant/Admin Login Styles
  gradientContainer: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  restaurantContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  restaurantLogoContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 32,
  },
  restaurantIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  restaurantWelcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  restaurantSubText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  restaurantCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  restaurantFormContainer: {
    gap: 20,
  },
  restaurantInputContainer: {
    marginBottom: 4,
  },
  restaurantInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
  },
  inputIcon: {
    marginRight: 12,
  },
  restaurantTextInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    padding: 0,
  },
  restaurantEyeIcon: {
    padding: 4,
    marginLeft: 8,
  },
  restaurantForgot: {
    alignSelf: 'flex-end',
    marginTop: -8,
    marginBottom: 8,
  },
  restaurantForgotText: {
    color: '#ee4d2d',
    fontSize: 14,
    fontWeight: '500',
  },
  restaurantLoginButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 24,
    shadowColor: '#ee4d2d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  restaurantLoginGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  restaurantLoginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  restaurantModeSwitcher: {
    marginTop: 8,
  },
  restaurantModeText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    fontWeight: '500',
  },
  restaurantModeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  restaurantModeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#F5F7FA',
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    gap: 6,
  },
  restaurantModeButtonActive: {
    backgroundColor: '#FFF3F0',
    borderColor: '#ee4d2d',
  },
  restaurantModeButtonText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  restaurantModeButtonTextActive: {
    color: '#ee4d2d',
  },
});

export default LogIn;

