import React, { useState, useEffect, useCallback, memo, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { collection, query, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../config/Firebase';

interface Category {
  id: string;
  name: string;
  description: string;
  priority: number;
}

const CategoryFormModal = memo(({ 
  visible, 
  onClose, 
  onSave, 
  editingCategory, 
  loading 
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (data: { name: string; description: string }) => Promise<void>;
  editingCategory: Category | null;
  loading: boolean;
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    if (editingCategory) {
      setFormData({
        name: editingCategory.name,
        description: editingCategory.description,
      });
    } else {
      setFormData({ name: '', description: '' });
    }
  }, [editingCategory]);

  const handleChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = useCallback(async () => {
    await onSave(formData);
  }, [formData, onSave]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingCategory ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'}
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
            >
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.formSection}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Tên danh mục</Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập tên danh mục"
                value={formData.name}
                onChangeText={(value) => handleChange('name', value)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Mô tả</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Nhập mô tả danh mục"
                multiline
                numberOfLines={4}
                value={formData.description}
                onChangeText={(value) => handleChange('description', value)}
              />
            </View>

            <TouchableOpacity 
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {editingCategory ? 'Cập nhật' : 'Thêm danh mục'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
});

const SearchBox = memo(({ 
  value, 
  onChangeText 
}: { 
  value: string; 
  onChangeText: (text: string) => void;
}) => (
  <View style={styles.searchContainer}>
    <View style={styles.searchBox}>
      <MaterialIcons name="search" size={24} color="#666" />
      <TextInput
        style={styles.searchInput}
        placeholder="Tìm kiếm danh mục..."
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  </View>
));

const CategoryItem = memo(({ 
  item, 
  onEdit, 
  onDelete 
}: { 
  item: Category;
  onEdit: (category: Category) => void;
  onDelete: (id: string) => void;
}) => (
  <View style={styles.categoryCard}>
    <View style={styles.categoryIcon}>
      <MaterialIcons name="restaurant" size={24} color="#ee4d2d" />
    </View>
    
    <View style={styles.categoryInfo}>
      <Text style={styles.categoryName}>{item.name}</Text>
      <Text style={styles.categoryDescription} numberOfLines={2}>
        {item.description}
      </Text>
    </View>

    <View style={styles.categoryActions}>
      <TouchableOpacity
        style={[styles.actionButton, styles.editButton]}
        onPress={() => onEdit(item)}
      >
        <MaterialIcons name="edit" size={20} color="#fff" />
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.actionButton, styles.deleteButton]}
        onPress={() => onDelete(item.id)}
      >
        <MaterialIcons name="delete" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  </View>
));

const ManageCategoriesScreen = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
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
      Alert.alert('Lỗi', 'Không thể tải danh mục');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = useCallback(() => {
    setEditingCategory(null);
    setModalVisible(true);
  }, []);

  const handleEditCategory = useCallback((category: Category) => {
    setEditingCategory(category);
    setModalVisible(true);
  }, []);

  const handleSaveCategory = useCallback(async (formData: { name: string; description: string }) => {
    try {
      if (!formData.name.trim()) {
        Alert.alert('Lỗi', 'Vui lòng nhập tên danh mục');
        return;
      }

      setLoading(true);

      const categoryData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        priority: editingCategory?.priority || categories.length,
        updatedAt: new Date().toISOString(),
      };

      if (editingCategory) {
        await updateDoc(doc(db, 'categories', editingCategory.id), categoryData);
        Alert.alert('Thành công', 'Đã cập nhật danh mục');
      } else {
        await addDoc(collection(db, 'categories'), {
          ...categoryData,
          createdAt: new Date().toISOString(),
        });
        Alert.alert('Thành công', 'Đã thêm danh mục mới');
      }

      setModalVisible(false);
      loadCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      Alert.alert('Lỗi', 'Không thể lưu danh mục');
    } finally {
      setLoading(false);
    }
  }, [editingCategory, categories.length]);

  const handleDeleteCategory = async (categoryId: string) => {
    Alert.alert(
      'Xác nhận xóa',
      'Bạn có chắc chắn muốn xóa danh mục này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await deleteDoc(doc(db, 'categories', categoryId));
              Alert.alert('Thành công', 'Đã xóa danh mục');
              loadCategories();
            } catch (error) {
              console.error('Error deleting category:', error);
              Alert.alert('Lỗi', 'Không thể xóa danh mục');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleSearch = useCallback((text: string) => {
    setSearchQuery(text);
  }, []);

  const filteredCategories = useMemo(() => {
    return categories.filter(cat => 
      cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cat.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [categories, searchQuery]);

  if (loading && !modalVisible) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ee4d2d" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SearchBox value={searchQuery} onChangeText={handleSearch} />

      <FlatList
        data={filteredCategories}
        renderItem={({ item }) => (
          <CategoryItem
            item={item}
            onEdit={handleEditCategory}
            onDelete={handleDeleteCategory}
          />
        )}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
      />

      <TouchableOpacity style={styles.fab} onPress={handleAddCategory}>
        <MaterialIcons name="add" size={24} color="#fff" />
      </TouchableOpacity>

      <CategoryFormModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={handleSaveCategory}
        editingCategory={editingCategory}
        loading={loading}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchContainer: {
    backgroundColor: '#fff',
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    marginLeft: 8,
    fontSize: 16,
  },
  listContainer: {
    padding: 15,
  },
  categoryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  categoryIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff3f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  categoryActions: {
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
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  formSection: {
    padding: 15,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#ee4d2d',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#ffaa99',
  },
});

export default ManageCategoriesScreen; 