import React, { useState } from 'react';
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
  ScrollView,
} from 'react-native';
import { Feather, AntDesign } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';

import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../config/Firebase';
import { collection, setDoc, doc, query, where, getDocs } from 'firebase/firestore';

type AccountRole = 'customer' | 'restaurant';

const Register = () => {
  const navigation = useNavigation<any>();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [role, setRole] = useState<AccountRole>('customer');
  const [restaurantName, setRestaurantName] = useState('');
  const [restaurantAddress, setRestaurantAddress] = useState('');
  const [restaurantPhone, setRestaurantPhone] = useState('');
  const [restaurantOpeningHours, setRestaurantOpeningHours] = useState('08:00 - 22:00');

  const handleRegister = async () => {
    if (!username || !email || !password || !confirmPassword) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    if (
      role === 'restaurant' &&
      (!restaurantName.trim() || !restaurantAddress.trim() || !restaurantOpeningHours.trim())
    ) {
      Alert.alert('Lỗi', 'Vui lòng nhập thông tin nhà hàng.');
      return;
    }

    try {
      // Kiểm tra username trùng
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', username.trim()));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        Alert.alert('Lỗi', 'Tên đăng nhập đã tồn tại.');
        return;
      }

      // Đăng ký Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      // Lưu thông tin user vào Firestore
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: email.toLowerCase(),
        username: username.trim(),
        name: username.trim(),
        role,
        createdAt: new Date(),
      });

      // Nếu là chủ nhà hàng
      if (role === 'restaurant') {
        await setDoc(doc(db, 'restaurants', user.uid), {
          ownerId: user.uid,
          name: restaurantName.trim(),
          address: restaurantAddress.trim(),
          phone: restaurantPhone.trim(),
          openingHours: restaurantOpeningHours.trim(),
          image: 'https://cdn-icons-png.flaticon.com/512/3595/3595455.png',
          rating: 4.8,
          createdAt: new Date(),
        });
      }

      Alert.alert('Thành công', 'Tài khoản đã được tạo!', [
        { text: 'OK', onPress: () => navigation.navigate('Login') }
      ]);

    } catch (error: any) {
      // Xử lý lỗi đăng ký với thông báo thân thiện
      if (error.code === 'auth/email-already-in-use') {
        Alert.alert('Lỗi', 'Email đã được sử dụng. Vui lòng sử dụng email khác.');
      } else if (error.code === 'auth/invalid-email') {
        Alert.alert('Lỗi', 'Email không hợp lệ. Vui lòng kiểm tra lại.');
      } else if (error.code === 'auth/weak-password') {
        Alert.alert('Lỗi', 'Mật khẩu quá yếu. Vui lòng sử dụng mật khẩu mạnh hơn (ít nhất 6 ký tự).');
      } else if (error.code === 'auth/operation-not-allowed') {
        Alert.alert('Lỗi', 'Phương thức đăng ký này không được phép.');
      } else if (error.code === 'auth/network-request-failed') {
        Alert.alert('Lỗi', 'Lỗi kết nối mạng. Vui lòng kiểm tra kết nối và thử lại.');
      } else {
        Alert.alert('Lỗi', 'Có lỗi xảy ra khi đăng ký. Vui lòng thử lại sau.');
      }
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Animated.View style={styles.content} entering={FadeInUp.duration(600)}>
          
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image 
              source={require('../assets/images/logo.png')}
              style={styles.logo}
            />
          </View>

          <Text style={styles.titleText}>Đăng Ký</Text>

          {/* Chọn vai trò */}
          <View style={styles.roleSwitcher}>
            {[
              { label: 'Khách hàng', value: 'customer' },
              { label: 'Nhà hàng', value: 'restaurant' },
            ].map(option => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.roleButton,
                  role === option.value && styles.roleButtonActive,
                ]}
                onPress={() => setRole(option.value as AccountRole)}
              >
                <Text
                  style={[
                    styles.roleButtonText,
                    role === option.value && styles.roleButtonTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Form */}
          <View style={styles.formContainer}>

            {/* Username */}
            <View style={styles.inputContainer}>
              <TextInput
                placeholder="Tên đăng nhập"
                style={styles.textInput}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            </View>

            {/* Email */}
            <View style={styles.inputContainer}>
              <TextInput
                placeholder="Email"
                keyboardType="email-address"
                style={styles.textInput}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
              />
            </View>

            {/* Password */}
            <View style={styles.inputContainer}>
              <TextInput
                placeholder="Mật khẩu"
                secureTextEntry={!showPassword}
                style={styles.textInput}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Feather name={showPassword ? 'eye-off' : 'eye'} size={20} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Confirm Password */}
            <View style={styles.inputContainer}>
              <TextInput
                placeholder="Xác nhận mật khẩu"
                secureTextEntry={!showConfirmPassword}
                style={styles.textInput}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                <Feather name={showConfirmPassword ? 'eye-off' : 'eye'} size={20} color="#666" />
              </TouchableOpacity>
            </View>

            {/* --- Nếu là chủ nhà hàng thì mới hiện form nhà hàng --- */}
            {role === 'restaurant' && (
              <>
                <View style={styles.inputContainer}>
                  <TextInput
                    placeholder="Tên nhà hàng"
                    style={styles.textInput}
                    value={restaurantName}
                    onChangeText={setRestaurantName}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <TextInput
                    placeholder="Địa chỉ nhà hàng"
                    style={styles.textInput}
                    value={restaurantAddress}
                    onChangeText={setRestaurantAddress}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <TextInput
                    placeholder="Số điện thoại liên hệ"
                    style={styles.textInput}
                    keyboardType="phone-pad"
                    value={restaurantPhone}
                    onChangeText={setRestaurantPhone}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <TextInput
                    placeholder="Giờ mở cửa (ví dụ: 08:00 - 22:00)"
                    style={styles.textInput}
                    value={restaurantOpeningHours}
                    onChangeText={setRestaurantOpeningHours}
                  />
                </View>
              </>
            )}

            {/* Button đăng ký */}
            <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
              <Text style={styles.registerButtonText}>Đăng ký</Text>
            </TouchableOpacity>

            <View style={styles.loginRedirect}>
              <Text style={styles.loginText}>
                Đã có tài khoản?{' '}
                <Text
                  style={styles.loginLink}
                  onPress={() => navigation.navigate('Login')}
                >
                  Đăng nhập
                </Text>
              </Text>
            </View>
          </View>

        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

/* ======================= STYLES ======================= */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { flexGrow: 1 },
  content: { padding: 24 },
  logoContainer: { alignItems: 'center', marginTop: 40, marginBottom: 20 },
  logo: { width: 120, height: 120 },
  titleText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 24,
  },

  /* Role buttons */
  roleSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    padding: 4,
    borderRadius: 999,
    marginBottom: 20,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
  },
  roleButtonActive: {
    backgroundColor: '#fff',
    elevation: 2,
  },
  roleButtonText: { color: '#6b7280', fontWeight: '600', fontSize: 14 },
  roleButtonTextActive: { color: '#ee4d2d' },

  formContainer: { flex: 1 },

  /* Input fields */
  inputContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  textInput: { flex: 1, fontSize: 16, color: '#333' },

  registerButton: {
    backgroundColor: '#ee4d2d',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  loginRedirect: { marginTop: 20, alignItems: 'center' },
  loginText: { color: '#666', fontSize: 14 },
  loginLink: { color: '#ee4d2d', fontWeight: '600' },
});

export default Register;
