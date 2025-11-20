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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons, Feather, AntDesign } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useNavigation, useRoute, CommonActions } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { auth, db } from '../config/Firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
import { RootStackParamList } from '../app';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type LoginRouteProp = RouteProp<RootStackParamList, 'Login'>;
type LoginMode = 'customer' | 'restaurant' | 'shipper' | 'admin';

const LogIn = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<LoginRouteProp>();
  const initialMode = route.params?.mode ?? 'customer';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secureText, setSecureText] = useState(true);
  const [mode, setMode] = useState<LoginMode>(initialMode);

  useEffect(() => {
    if (route.params?.mode) {
      setMode(route.params.mode);
    }
  }, [route.params?.mode]);

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

      if (mode === 'restaurant' && userRole !== 'restaurant') {
        Alert.alert('Thông báo', 'Tài khoản này không thuộc loại Nhà hàng. Vui lòng đăng nhập với tư cách khách hàng.');
        return;
      }

      if (mode === 'customer' && userRole === 'restaurant') {
        Alert.alert('Thông báo', 'Tài khoản này thuộc nhà hàng. Vui lòng chọn đăng nhập Nhà hàng.');
        return;
      }

      if (mode === 'shipper' && userRole !== 'shipper') {
        Alert.alert('Thông báo', 'Tài khoản này không phải shipper.');
        return;
      }

      // Kiểm tra role và điều hướng
      if (userRole === 'admin') {
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'AdminApp' }],
          })
        );
      } else if (userRole === 'restaurant') {
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'RestaurantApp' }],
          })
        );
      } else if (userRole === 'shipper') {
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'ShipperApp' }],
          })
        );
      } else {
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'UserApp' }],
          })
        );
      }

      Alert.alert('Thành công', 'Đăng nhập thành công!');
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

  const handleGoogleLogin = () => {
    Alert.alert('Thông báo', 'Tính năng đăng nhập bằng Google sẽ sớm có!');
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <Animated.View style={styles.content} entering={FadeInUp.duration(600)}>
        <View style={styles.logoContainer}>
          <Image 
            source={require('../assets/images/logo.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        
        <Text style={styles.titleText}>
          {mode === 'restaurant'
            ? 'Đăng nhập Nhà hàng'
            : mode === 'shipper'
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

          <TouchableOpacity style={styles.googleButton} onPress={handleGoogleLogin}>
            <AntDesign name="google" size={20} color="#EA4335" style={styles.googleIcon} />
            <Text style={styles.googleText}>Đăng nhập bằng Google</Text>
          </TouchableOpacity>

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
});

export default LogIn;

