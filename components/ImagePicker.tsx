import React, { useState, useRef, useEffect } from 'react';
import { View, Image, TouchableOpacity, StyleSheet, Text, Modal } from 'react-native';
import { Camera, CameraType, FlashMode } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

interface ImagePickerProps {
  onImageSelected: (uri: string) => void;
}

export const CustomImagePicker: React.FC<ImagePickerProps> = ({ onImageSelected }) => {
  const [image, setImage] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraType, setCameraType] = useState<CameraType>(CameraType.back);
  const [flashMode, setFlashMode] = useState<FlashMode>(FlashMode.off);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const cameraRef = useRef<Camera | null>(null);

  useEffect(() => {
    (async () => {
      console.log('Checking initial camera permissions...');
      const { status } = await Camera.requestCameraPermissionsAsync();
      console.log('Initial camera permission status:', status);
      setHasCameraPermission(status === 'granted');
    })();
  }, []);

  const requestPermissions = async () => {
    try {
      console.log('Requesting camera permissions...');
      const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
      console.log('Camera permission status:', cameraStatus);
      setHasCameraPermission(cameraStatus === 'granted');
      
      const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('Library permission status:', libraryStatus);
      
      return cameraStatus === 'granted' && libraryStatus === 'granted';
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  };

  const pickImage = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      alert('Cần cấp quyền truy cập thư viện ảnh để tiếp tục!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      onImageSelected(result.assets[0].uri);
    }
  };

  const takePicture = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 1,
        base64: false,
      });
      setImage(photo.uri);
      onImageSelected(photo.uri);
      setShowCamera(false);
    } catch (error) {
      console.error('Error taking picture:', error);
      alert('Không thể chụp ảnh. Vui lòng thử lại!');
    }
  };

  const toggleCamera = async () => {
    try {
      console.log('Attempting to toggle camera...');
      const hasPermission = await requestPermissions();
      console.log('Has permission:', hasPermission);
      
      if (!hasPermission) {
        console.log('Camera permission denied');
        alert('Cần cấp quyền truy cập camera để tiếp tục!');
        return;
      }
      
      console.log('Setting showCamera to true');
      setShowCamera(true);
      console.log('ShowCamera state:', showCamera);
    } catch (error) {
      console.error('Error in toggleCamera:', error);
      alert('Có lỗi khi mở camera. Vui lòng thử lại!');
    }
  };

  console.log('Rendering ImagePicker, showCamera:', showCamera);
  
  return (
    <View style={styles.container}>
      {image ? (
        <View style={styles.imageContainer}>
          <Image source={{ uri: image }} style={styles.image} />
          <TouchableOpacity
            style={styles.changeImageButton}
            onPress={() => setImage(null)}
          >
            <Text style={styles.changeImageText}>Đổi ảnh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={pickImage}>
            <Ionicons name="images" size={24} color="#fff" />
            <Text style={styles.buttonText}>Chọn từ thư viện</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={toggleCamera}>
            <Ionicons name="camera" size={24} color="#fff" />
            <Text style={styles.buttonText}>Chụp ảnh</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={showCamera} animationType="slide">
        {hasCameraPermission ? (
          <Camera
            ref={cameraRef}
            style={[styles.camera, { backgroundColor: 'transparent' }]}
            type={cameraType}
            flashMode={flashMode}
            onCameraReady={() => console.log('Camera is ready')}
            onMountError={(error) => {
              console.error('Camera mount error:', error);
              setShowCamera(false);
              alert('Không thể khởi tạo camera. Vui lòng thử lại!');
            }}
          >
            <View style={styles.cameraControls}>
              <TouchableOpacity
                style={styles.cameraButton}
                onPress={() => setShowCamera(false)}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cameraButton}
                onPress={takePicture}
              >
                <View style={styles.captureButton} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cameraButton}
                onPress={() => setCameraType(
                  cameraType === CameraType.back ? CameraType.front : CameraType.back
                )}
              >
                <Ionicons name="camera-reverse" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={() => setFlashMode(
                flashMode === FlashMode.off ? FlashMode.on : FlashMode.off
              )}
              style={[
                styles.flashButton,
                { backgroundColor: flashMode === FlashMode.off ? '#000' : '#fff' }
              ]}
            >
              <Text style={{ fontSize: 20 }}>⚡️</Text>
            </TouchableOpacity>
          </Camera>
        ) : (
          <View style={styles.noCameraPermission}>
            <Text style={styles.noCameraText}>Không có quyền truy cập camera</Text>
            <TouchableOpacity
              style={styles.button}
              onPress={async () => {
                const granted = await requestPermissions();
                if (!granted) {
                  setShowCamera(false);
                }
              }}
            >
              <Text style={styles.buttonText}>Cấp quyền</Text>
            </TouchableOpacity>
          </View>
        )}
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 4/3,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  changeImageButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 8,
    borderRadius: 4,
  },
  changeImageText: {
    color: '#fff',
    fontSize: 14,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    padding: 10,
  },
  button: {
    backgroundColor: '#ee4d2d',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 150,
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 16,
  },
  camera: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  cameraControls: {
    flex: 1,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    paddingBottom: 40,
    width: '100%',
  },
  cameraButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 60,
  },
  captureButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    borderWidth: 5,
    borderColor: '#ee4d2d',
  },
  flashButton: {
    position: 'absolute',
    left: '5%',
    top: '10%',
    borderRadius: 25,
    height: 25,
    width: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noCameraPermission: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  noCameraText: {
    fontSize: 16,
    marginBottom: 20,
    color: '#000',
  },
}); 