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
import { Ionicons, Feather, AntDesign } from '@expo/vector-icons';
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

type RoleTheme = {
  accent: string;
  backgroundGradient: [string, string];
  heroTitle: string;
  heroSubtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  statusBarColor: string;
  buttonGradient: [string, string];
};

const ROLE_THEMES: Record<LoginMode, RoleTheme> = {
  customer: {
    accent: '#ff6b4a',
    backgroundGradient: ['#fff5f1', '#ffe6dc'],
    heroTitle: 'Xin chào 👋',
    heroSubtitle: 'Khám phá món ngon và đặt hàng chỉ trong vài chạm.',
    icon: 'fast-food-outline',
    statusBarColor: '#ffe6dc',
    buttonGradient: ['#ff7a45', '#ff4b2b'],
  },
  restaurant: {
    accent: '#f8481b',
    backgroundGradient: ['#fff1ed', '#ffd9cd'],
    heroTitle: 'Đối tác Nhà hàng',
    heroSubtitle: 'Theo dõi và xử lý đơn hàng mọi lúc mọi nơi.',
    icon: 'restaurant',
    statusBarColor: '#ffd9cd',
    buttonGradient: ['#ff5f3d', '#ff2d2d'],
  },
  shipper: {
    accent: '#1c86ff',
    backgroundGradient: ['#f1f7ff', '#dbe9ff'],
    heroTitle: 'Xin chào Shipper 🚚',
    heroSubtitle: 'Nhận đơn nhanh chóng và giao hàng đúng giờ.',
    icon: 'bicycle-outline',
    statusBarColor: '#dbe9ff',
    buttonGradient: ['#3a8dff', '#1c6bff'],
  },
  admin: {
    accent: '#6366f1',
    backgroundGradient: ['#f3f4ff', '#e0e7ff'],
    heroTitle: 'Xin chào Quản trị viên',
    heroSubtitle: 'Quản lý hệ thống FoodOrder một cách toàn diện.',
    icon: 'shield-outline',
    statusBarColor: '#e0e7ff',
    buttonGradient: ['#818cf8', '#4f46e5'],
  },
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
  const currentTheme = ROLE_THEMES[mode] ?? ROLE_THEMES.customer;
  const roleToggleOptions: Array<{ label: string; value: LoginMode; icon: keyof typeof Ionicons.glyphMap }> = [
    { label: 'Khách hàng', value: 'customer', icon: 'person-outline' },
    { label: 'Nhà hàng', value: 'restaurant', icon: 'restaurant' },
    { label: 'Shipper', value: 'shipper', icon: 'bicycle-outline' },
  ];

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
      // Xử lý lỗi đăng nhập với thông báo thân thiện
      if (error.code === 'auth/invalid-credential') {
        Alert.alert('Đăng nhập thất bại', 'Email hoặc mật khẩu không đúng.');
      } else if (error.code === 'auth/user-not-found') {
        Alert.alert('Đăng nhập thất bại', 'Tài khoản không tồn tại.');
      } else if (error.code === 'auth/wrong-password') {
        Alert.alert('Đăng nhập thất bại', 'Mật khẩu không đúng.');
      } else if (error.code === 'auth/invalid-email') {
        Alert.alert('Đăng nhập thất bại', 'Email không hợp lệ.');
      } else if (error.code === 'auth/too-many-requests') {
        Alert.alert('Đăng nhập thất bại', 'Quá nhiều lần thử đăng nhập. Vui lòng thử lại sau.');
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
    } catch (error: any) {
      // Xử lý lỗi đăng nhập Google với thông báo thân thiện
      if (error.code === 'auth/account-exists-with-different-credential') {
        Alert.alert('Lỗi', 'Tài khoản này đã được đăng ký bằng phương thức khác.');
      } else if (error.code === 'auth/invalid-credential') {
        Alert.alert('Lỗi', 'Không thể xác thực tài khoản Google.');
      } else {
        Alert.alert('Lỗi', 'Không thể đăng nhập bằng Google. Vui lòng thử lại sau.');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <LinearGradient colors={currentTheme.backgroundGradient} style={styles.gradientBackground}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <StatusBar barStyle="dark-content" backgroundColor={currentTheme.statusBarColor} />
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View style={styles.heroCard} entering={FadeInDown.duration(600)}>
              <View style={[styles.heroIconWrapper, { backgroundColor: `${currentTheme.accent}1A` }]}>
                <Ionicons name={currentTheme.icon} size={28} color={currentTheme.accent} />
              </View>
              <Text style={styles.heroTitle}>{currentTheme.heroTitle}</Text>
              <Text style={styles.heroSubtitle}>{currentTheme.heroSubtitle}</Text>
              <View style={styles.heroBadge}>
                <Ionicons name="shield-checkmark-outline" size={16} color={currentTheme.accent} />
                <Text style={[styles.heroBadgeText, { color: currentTheme.accent }]}>Bảo mật & an toàn</Text>
              </View>
            </Animated.View>

            <Animated.View style={styles.formCard} entering={FadeInUp.duration(600)}>
              <View style={styles.logoRow}>
                <Image
                  source={require('../assets/images/logo.png')}
                  style={styles.logo}
                  resizeMode="contain"
                />
                <View>
                  <Text style={styles.cardTitle}>FoodOrder</Text>
                  <Text style={styles.cardSubtitle}>Đăng nhập để tiếp tục trải nghiệm</Text>
                </View>
              </View>

              <View style={styles.modeSwitcher}>
                {roleToggleOptions.map((option) => {
                  const isActive = mode === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.modeButton,
                        isActive && [
                          styles.modeButtonActive,
                          { borderColor: currentTheme.accent, backgroundColor: `${currentTheme.accent}12` },
                        ],
                      ]}
                      onPress={() => setMode(option.value)}
                    >
                      <Ionicons
                        name={option.icon}
                        size={18}
                        color={isActive ? currentTheme.accent : '#7b8499'}
                      />
                      <Text
                        style={[
                          styles.modeButtonLabel,
                          isActive && { color: currentTheme.accent },
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color={currentTheme.accent} />
                <TextInput
                  placeholder="Email"
                  placeholderTextColor="#9ca3af"
                  style={styles.textInput}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color={currentTheme.accent} />
                <TextInput
                  placeholder="Mật khẩu"
                  placeholderTextColor="#9ca3af"
                  style={styles.textInput}
                  secureTextEntry={secureText}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity onPress={() => setSecureText(!secureText)} style={styles.eyeIcon}>
                  <Feather name={secureText ? 'eye-off' : 'eye'} size={18} color="#7b8499" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.forgot}
                onPress={() => navigation.navigate('ResetPassword')}
              >
                <Text style={styles.forgotText}>Quên mật khẩu?</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.loginButtonOuter} onPress={handleLogin} activeOpacity={0.9}>
                <LinearGradient
                  colors={currentTheme.buttonGradient}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.loginButtonGradient}
                >
                  <Text style={styles.loginButtonText}>Đăng nhập</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>Hoặc</Text>
                <View style={styles.dividerLine} />
              </View>

              {GOOGLE_LOGIN_ENABLED && (
                <TouchableOpacity
                  style={[
                    styles.googleButton,
                    (!isGoogleConfigured || isGoogleLoading) && styles.googleButtonDisabled,
                  ]}
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

              <View style={styles.registerRow}>
                <Text style={styles.registerText}>
                  Chưa có tài khoản?{' '}
                  <Text
                    style={[styles.registerLink, { color: currentTheme.accent }]}
                    onPress={() => navigation.navigate('Register')}
                  >
                    Đăng ký ngay
                  </Text>
                </Text>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradientBackground: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    gap: 20,
  },
  heroCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.65)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    gap: 10,
  },
  heroIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#4b5563',
    lineHeight: 22,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  heroBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 32,
    padding: 24,
    gap: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    width: 56,
    height: 56,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  modeSwitcher: {
    flexDirection: 'row',
    gap: 10,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  modeButtonActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
  },
  modeButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    paddingHorizontal: 16,
    height: 56,
    gap: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  eyeIcon: {
    padding: 6,
  },
  forgot: {
    alignSelf: 'flex-end',
  },
  forgotText: {
    color: '#6b7280',
    fontWeight: '600',
  },
  loginButtonOuter: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
  },
  loginButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  dividerText: {
    fontSize: 13,
    color: '#9ca3af',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    gap: 8,
  },
  googleIcon: {
    marginRight: 4,
  },
  googleText: {
    fontSize: 15,
    color: '#1f2937',
    fontWeight: '600',
  },
  googleButtonDisabled: {
    opacity: 0.5,
  },
  registerRow: {
    justifyContent: 'center',
    marginTop: 4,
  },
  registerText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  registerLink: {
    fontWeight: '700',
  },
});

export default LogIn;

