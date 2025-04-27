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
import { auth, db } from '../config/Firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';

const LogIn = () => {
  const navigation = useNavigation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [secureText, setSecureText] = useState(true);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập tên đăng nhập và mật khẩu.');
      return;
    }

    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', username));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        Alert.alert('Lỗi', 'Tên đăng nhập không tồn tại.');
        return;
      }

      const userDoc = querySnapshot.docs[0].data();
      const email = userDoc.email;

      await signInWithEmailAndPassword(auth, email, password);

      navigation.navigate('Home' as never); // thêm as never để TypeScript không báo lỗi
    } catch (error: any) {
      console.error('Login error:', error);
      Alert.alert('Đăng nhập thất bại', error.message || 'Đã có lỗi xảy ra.');
    }
  };

  const handleGoogleLogin = () => {
    Alert.alert('Thông báo', 'Tính năng đăng nhập bằng Google sẽ sớm có!');
  };

  return (
    <Animated.View style={styles.container} entering={FadeInUp.duration(600)}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={styles.iconContainer}>
        <Ionicons name="log-in-outline" size={32} color="#3b82f6" />
        <Text style={styles.title}>Đăng nhập</Text>
      </View>

      <View style={styles.inputContainer}>
        <Feather name="user" size={20} color="gray" style={styles.icon} />
        <TextInput
          placeholder="Tên đăng nhập"
          style={styles.textInput}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputContainer}>
        <Feather name="lock" size={20} color="gray" style={styles.icon} />
        <TextInput
          placeholder="Mật khẩu"
          style={styles.textInput}
          secureTextEntry={secureText}
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity onPress={() => setSecureText(!secureText)} style={styles.eyeIcon}>
          <Feather name={secureText ? 'eye-off' : 'eye'} size={20} color="gray" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.forgot}>
        <Text style={styles.forgotText}>Quên mật khẩu?</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
        <Text style={styles.loginButtonText}>Đăng nhập</Text>
      </TouchableOpacity>

      <Text style={styles.orText}>Hoặc</Text>

      <TouchableOpacity style={styles.googleButton} onPress={handleGoogleLogin}>
        <AntDesign name="google" size={20} color="#EA4335" style={{ marginRight: 10 }} />
        <Text style={styles.googleText}>Đăng nhập bằng Google</Text>
      </TouchableOpacity>

      <View style={styles.registerContainer}>
        <Text style={styles.registerText}>
          Chưa có tài khoản?{' '}
          <Text
            style={styles.registerLink}
            onPress={() => navigation.navigate('Register' as never)}
          >
            Đăng ký
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
    marginLeft: 10,
  },
  forgot: {
    alignSelf: 'flex-end',
    marginBottom: 16,
  },
  forgotText: {
    color: '#3b82f6',
    fontSize: 14,
  },
  loginButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  loginButtonText: {
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
  registerContainer: {
    marginTop: 20,
  },
  registerText: {
    fontSize: 14,
    color: '#666',
  },
  registerLink: {
    color: '#3b82f6',
    fontWeight: '600',
  },
});

export default LogIn;
