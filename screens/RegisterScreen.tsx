import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons, Feather, AntDesign } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../config/Firebase';
import { collection, setDoc, doc } from 'firebase/firestore';


const Register = () => {
  const navigation = useNavigation<any>(); // <-- Không cần RootStackParamList nữa

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleRegister = async () => {
    if (!username || !email || !password || !confirmPassword) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp.');
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      // Lưu thêm vào Firestore
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: email.trim().toLowerCase(),
        username: username.trim(),
        createdAt: new Date(),
      });

      Alert.alert('Thành công', 'Tài khoản đã được tạo!');
      navigation.replace('LogIn'); // Điều hướng tới màn hình LogIn
    } catch (error: any) {
      Alert.alert('Đăng ký thất bại', error.message);
    }
  };

  return (
    <Animated.View style={styles.container} entering={FadeInUp.duration(600)}>
      <StatusBar />

      <View style={styles.iconContainer}>
        <Ionicons name="person-add-outline" size={32} color="#3b82f6" />
        <Text style={styles.title}>Đăng ký</Text>
      </View>

      {/* Các ô nhập liệu */}
      <View style={styles.inputContainer}>
        <Feather name="user" size={20} color="gray" style={styles.icon} />
        <TextInput
          placeholder="Tên đăng nhập"
          style={styles.textInput}
          value={username}
          onChangeText={setUsername}
        />
      </View>

      <View style={styles.inputContainer}>
        <Feather name="mail" size={20} color="gray" style={styles.icon} />
        <TextInput
          placeholder="Email"
          keyboardType="email-address"
          style={styles.textInput}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputContainer}>
        <Feather name="lock" size={20} color="gray" style={styles.icon} />
        <TextInput
          placeholder="Mật khẩu"
          secureTextEntry={!showPassword}
          style={styles.textInput}
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
          <Feather
            name={showPassword ? 'eye-off' : 'eye'}
            size={20}
            color="gray"
            style={styles.eyeIcon}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.inputContainer}>
        <Feather name="lock" size={20} color="gray" style={styles.icon} />
        <TextInput
          placeholder="Xác nhận mật khẩu"
          secureTextEntry={!showConfirmPassword}
          style={styles.textInput}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
        <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
          <Feather
            name={showConfirmPassword ? 'eye-off' : 'eye'}
            size={20}
            color="gray"
            style={styles.eyeIcon}
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
        <Text style={styles.registerButtonText}>Tạo tài khoản</Text>
      </TouchableOpacity>

      <Text style={styles.orText}>Hoặc</Text>

      <TouchableOpacity style={styles.googleButton}>
        <AntDesign name="google" size={20} color="#EA4335" style={{ marginRight: 10 }} />
        <Text style={styles.googleText}>Đăng ký bằng Google</Text>
      </TouchableOpacity>

      {/* Phần điều hướng đến màn hình đăng nhập */}
      <View style={styles.loginRedirect}>
        <Text style={styles.loginText}>
          Đã có tài khoản?{' '}
          <Text
            style={styles.loginLink}
            onPress={() => navigation.navigate('Login' as never)} 
          >
            Đăng nhập
          </Text>
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  iconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    marginLeft: 10,
    fontWeight: '600',
    color: '#333',
  },
  inputContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 12,
    width: '100%',
  },
  textInput: {
    flex: 1,
    fontSize: 16,
  },
  icon: {
    marginRight: 8,
  },
  eyeIcon: {
    marginLeft: 8,
  },
  registerButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  orText: {
    marginVertical: 16,
    fontSize: 14,
    color: '#888',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#ccc',
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    width: '100%',
    justifyContent: 'center',
  },
  googleText: {
    fontSize: 16,
    color: '#333',
  },
  loginRedirect: {
    marginTop: 20,
  },
  loginText: {
    fontSize: 14,
    color: '#666',
  },
  loginLink: {
    color: '#3b82f6',
    fontWeight: '600',
  },
});

export default Register;
