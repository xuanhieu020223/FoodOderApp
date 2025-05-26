import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  Image,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { collection, query, getDocs, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../config/Firebase';

// Cloudinary configuration
const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dsbhlgu9c/upload';
const UPLOAD_PRESET = 'FoodOderApp';

type Food = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  isAvailable: boolean;
};

type Category = {
  id: string;
  name: string;
  priority: number;
};

interface FormData {
  name: string;
  description: string;
  price: string;
  category: string;
  selectedImage: string | null;
}

interface FoodFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: FormData) => Promise<void>;
  editingFood: Food | null;
  categories: Category[];
  loading?: boolean;
}

const FoodFormModal = memo(({ 
  visible, 
  onClose, 
  onSave, 
  editingFood,
  categories,
  loading = false
}: FoodFormModalProps) => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    price: '',
    category: '',
    selectedImage: null
  });

  useEffect(() => {
    if (editingFood) {
      setFormData({
        name: editingFood.name,
        description: editingFood.description,
        price: editingFood.price.toString(),
        category: editingFood.category,
        selectedImage: null
      });
    } else {
      setFormData({
        name: '',
        description: '',
        price: '',
        category: categories.length > 0 ? categories[0].id : '',
        selectedImage: null
      });
    }
  }, [editingFood, categories]);

  const handleChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handlePickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setFormData(prev => ({
        ...prev,
        selectedImage: result.assets[0].uri
      }));
    }
  }, []);

  const handleSave = useCallback(() => {
    onSave(formData);
  }, [formData, onSave]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalContainer}
        keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalContent}>
            <ScrollView 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scrollContent}
            >
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={onClose}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>

              <Text style={styles.modalTitle}>
                {editingFood ? 'Chỉnh sửa món ăn' : 'Thêm món ăn mới'}
              </Text>

              <TouchableOpacity style={styles.imagePicker} onPress={handlePickImage}>
                {formData.selectedImage ? (
                  <Image source={{ uri: formData.selectedImage }} style={styles.previewImage} />
                ) : editingFood?.imageUrl ? (
                  <Image source={{ uri: editingFood.imageUrl }} style={styles.previewImage} />
                ) : (
                  <View style={styles.imagePickerPlaceholder}>
                    <MaterialIcons name="add-photo-alternate" size={40} color="#666" />
                    <Text style={styles.imagePickerText}>Chọn ảnh</Text>
                  </View>
                )}
              </TouchableOpacity>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Tên món</Text>
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={(value) => handleChange('name', value)}
                  placeholder="Nhập tên món ăn"
                  returnKeyType="next"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Mô tả</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.description}
                  onChangeText={(value) => handleChange('description', value)}
                  placeholder="Nhập mô tả món ăn"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Giá (VNĐ)</Text>
                <TextInput
                  style={styles.input}
                  value={formData.price}
                  onChangeText={(value) => handleChange('price', value)}
                  placeholder="Nhập giá món ăn"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Danh mục</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoryContainer}
                >
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.categoryOption,
                        formData.category === cat.id && styles.categoryOptionActive
                      ]}
                      onPress={() => handleChange('category', cat.id)}
                    >
                      <Text style={[
                        styles.categoryOptionText,
                        formData.category === cat.id && styles.categoryOptionTextActive
                      ]}>
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <TouchableOpacity
                style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {editingFood ? 'Cập nhật' : 'Thêm món'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
});

const ManageFoodsScreen = () => {
  const [foods, setFoods] = useState<Food[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingFood, setEditingFood] = useState<Food | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');

  useEffect(() => {
    loadFoods();
    loadCategories();
  }, []);

  const loadFoods = async () => {
    try {
      const foodsRef = collection(db, 'foods');
      const q = query(foodsRef);
      const querySnapshot = await getDocs(q);
      
      const foodsData: Food[] = [];
      querySnapshot.forEach((doc) => {
        foodsData.push({ id: doc.id, ...doc.data() } as Food);
      });
      
      setFoods(foodsData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading foods:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách món ăn');
    }
  };

  const loadCategories = async () => {
    try {
      const categoriesRef = collection(db, 'categories');
      const q = query(categoriesRef);
      const querySnapshot = await getDocs(q);
      
      const categoriesData: Category[] = [];
      querySnapshot.forEach((doc) => {
        categoriesData.push({ id: doc.id, ...doc.data() } as Category);
      });
      
      setCategories(categoriesData.sort((a, b) => a.priority - b.priority));
    } catch (error) {
      console.error('Error loading categories:', error);
      Alert.alert('Lỗi', 'Không thể tải danh mục món ăn');
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string) => {
    try {
      const formData = new FormData();
      formData.append('file', {
        uri,
        type: 'image/jpeg',
        name: 'upload.jpg',
      } as any);
      formData.append('upload_preset', UPLOAD_PRESET);

      const response = await fetch(CLOUDINARY_URL, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      return data.secure_url;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  const handleTextChange = useCallback((text: string, setter: (text: string) => void) => {
    setter(text);
  }, []);

  const handleSaveFood = async (formData: FormData) => {
    try {
      // Validate required fields
      if (!formData.name.trim()) {
        Alert.alert('Lỗi', 'Vui lòng nhập tên món ăn');
        return;
      }
      if (!formData.description.trim()) {
        Alert.alert('Lỗi', 'Vui lòng nhập mô tả món ăn');
        return;
      }
      if (!formData.price.trim()) {
        Alert.alert('Lỗi', 'Vui lòng nhập giá món ăn');
        return;
      }
      if (isNaN(parseFloat(formData.price)) || parseFloat(formData.price) <= 0) {
        Alert.alert('Lỗi', 'Giá món ăn không hợp lệ');
        return;
      }
      if (!formData.category) {
        Alert.alert('Lỗi', 'Vui lòng chọn danh mục');
        return;
      }

      // Show loading indicator
      setLoading(true);

      let imageUrl = editingFood?.imageUrl || '';
      
      if (formData.selectedImage) {
        try {
          imageUrl = await uploadImage(formData.selectedImage);
        } catch (error) {
          console.error('Error uploading image:', error);
          Alert.alert('Lỗi', 'Không thể tải ảnh lên. Vui lòng thử lại');
          setLoading(false);
          return;
        }
      } else if (!editingFood) {
        Alert.alert('Lỗi', 'Vui lòng chọn ảnh cho món ăn');
        setLoading(false);
        return;
      }

      const foodData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        category: formData.category,
        imageUrl,
        isAvailable: true,
        updatedAt: new Date().toISOString(),
      };

      if (editingFood) {
        await updateDoc(doc(db, 'foods', editingFood.id), foodData);
        Alert.alert('Thành công', 'Đã cập nhật món ăn');
      } else {
        await addDoc(collection(db, 'foods'), {
          ...foodData,
          createdAt: new Date().toISOString(),
        });
        Alert.alert('Thành công', 'Đã thêm món ăn mới');
      }

      setModalVisible(false);
      setEditingFood(null);
      await loadFoods(); // Reload the foods list
    } catch (error) {
      console.error('Error saving food:', error);
      Alert.alert('Lỗi', 'Không thể lưu món ăn. Vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFood = async (foodId: string) => {
    try {
      await deleteDoc(doc(db, 'foods', foodId));
      Alert.alert('Thành công', 'Đã xóa món ăn');
      loadFoods();
    } catch (error) {
      console.error('Error deleting food:', error);
      Alert.alert('Lỗi', 'Không thể xóa món ăn');
    }
  };

  const clearForm = () => {
    setName('');
    setDescription('');
    setPrice('');
    setCategory('');
    setSelectedImage(null);
    setEditingFood(null);
  };

  const openEditModal = (food: Food) => {
    setEditingFood(food);
    setName(food.name);
    setDescription(food.description);
    setPrice(food.price.toString());
    setCategory(food.category);
    setSelectedImage(null);
    setModalVisible(true);
  };

  const handleToggleAvailability = (foodId: string) => {
    setFoods(foods.map(food =>
      food.id === foodId ? { ...food, isAvailable: !food.isAvailable } : food
    ));
  };

  const renderFoodItem = ({ item }: { item: Food }) => (
    <View style={styles.foodCard}>
      <View style={styles.foodImageContainer}>
        <Image source={{ uri: item.imageUrl }} style={styles.foodImage} />
      </View>
      
      <View style={styles.foodInfo}>
        <View style={styles.foodHeader}>
          <Text style={styles.foodName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.foodPrice}>{item.price.toLocaleString('vi-VN')}đ</Text>
        </View>
        
        <Text style={styles.foodDescription} numberOfLines={2}>
          {item.description}
        </Text>

        <View style={styles.foodFooter}>
          <View style={styles.foodMeta}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>
                {categories.find(c => c.id === item.category)?.name || 'Không có danh mục'}
              </Text>
            </View>
            <View style={[
              styles.statusBadge,
              { backgroundColor: item.isAvailable ? '#4CAF50' : '#f44336' }
            ]}>
              <MaterialIcons
                name={item.isAvailable ? 'check-circle' : 'remove-circle'}
                size={12}
                color="#fff"
              />
              <Text style={styles.statusText}>
                {item.isAvailable ? 'Còn hàng' : 'Hết hàng'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.foodActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => openEditModal(item)}
        >
          <MaterialIcons name="edit" size={20} color="#fff" />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => {
            Alert.alert(
              'Xác nhận xóa',
              'Bạn có chắc chắn muốn xóa món ăn này?',
              [
                { text: 'Hủy', style: 'cancel' },
                { text: 'Xóa', onPress: () => handleDeleteFood(item.id) },
              ]
            );
          }}
        >
          <MaterialIcons name="delete" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ee4d2d" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={foods}
        renderItem={renderFoodItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
      />

      <TouchableOpacity 
        style={styles.fab}
        onPress={() => {
          setEditingFood(null);
          setModalVisible(true);
        }}
      >
        <MaterialIcons name="add" size={24} color="#fff" />
      </TouchableOpacity>

      <FoodFormModal 
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setEditingFood(null);
        }}
        onSave={handleSaveFood}
        editingFood={editingFood}
        categories={categories}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContainer: {
    padding: 12,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ee4d2d',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  foodCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'flex-start',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  foodImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 15,
    backgroundColor: '#f5f5f5',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  foodImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  foodInfo: {
    flex: 1,
    paddingVertical: 4,
  },
  foodHeader: {
    marginBottom: 6,
  },
  foodName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  foodPrice: {
    fontSize: 15,
    color: '#ee4d2d',
    fontWeight: '600',
  },
  foodDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    lineHeight: 18,
  },
  foodFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  foodMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryBadge: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    color: '#666',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    marginLeft: 2,
    fontWeight: '500',
  },
  foodActions: {
    flexDirection: 'column',
    marginLeft: 15,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  editButton: {
    backgroundColor: '#2196F3',
  },
  deleteButton: {
    backgroundColor: '#f44336',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    maxHeight: '90%',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  closeButton: {
    position: 'absolute',
    right: 15,
    top: 15,
    zIndex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
    marginTop: 10,
  },
  imagePicker: {
    width: '100%',
    height: 200,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    marginBottom: 20,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  imagePickerPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePickerText: {
    color: '#666',
    marginTop: 10,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  categoryContainer: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  categoryOption: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    backgroundColor: '#f5f5f5',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  categoryOptionActive: {
    backgroundColor: '#ee4d2d',
    borderColor: '#ee4d2d',
  },
  categoryOptionText: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  categoryOptionTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#ee4d2d',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonDisabled: {
    backgroundColor: '#ffaa99',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ManageFoodsScreen; 