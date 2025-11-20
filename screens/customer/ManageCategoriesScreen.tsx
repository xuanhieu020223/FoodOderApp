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
  ScrollView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { collection, query, getDocs, addDoc, updateDoc, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { db } from '../../config/Firebase';

// Danh sách icon có sẵn cho danh mục
const CATEGORY_ICONS = [
  { name: 'local-drink', label: 'Nước uống' },
  { name: 'restaurant', label: 'Món ăn' },
  { name: 'local-pizza', label: 'Pizza' },
  { name: 'fastfood', label: 'Đồ ăn nhanh' },
  { name: 'icecream', label: 'Tráng miệng' },
  { name: 'coffee', label: 'Cà phê' },
  { name: 'local-cafe', label: 'Trà' },
  { name: 'set-meal', label: 'Cơm' },
  { name: 'ramen-dining', label: 'Mì' },
  { name: 'bakery-dining', label: 'Bánh' },
  { name: 'kebab-dining', label: 'Thịt' },
  { name: 'lunch-dining', label: 'Cơm hộp' },
  { name: 'dinner-dining', label: 'Bữa tối' },
  { name: 'breakfast-dining', label: 'Bữa sáng' },
  { name: 'rice-bowl', label: 'Cơm' },
] as const;

type CategoryIcon = typeof CATEGORY_ICONS[number]['name'];

type Category = {
  id: string;
  name: string;
  priority: number;
  icon: CategoryIcon;
};

interface CategoryFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (name: string, icon: CategoryIcon) => Promise<void>;
  editingCategory: Category | null;
}

const CategoryFormModal = ({ visible, onClose, onSave, editingCategory }: CategoryFormModalProps) => {
  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<CategoryIcon>('restaurant');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingCategory) {
      setName(editingCategory.name);
      setSelectedIcon(editingCategory.icon);
    } else {
      setName('');
      setSelectedIcon('restaurant');
    }
  }, [editingCategory]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên danh mục');
      return;
    }

    setLoading(true);
    try {
      await onSave(name.trim(), selectedIcon);
      onClose();
    } catch (error) {
      console.error('Error saving category:', error);
      Alert.alert('Lỗi', 'Không thể lưu danh mục');
    } finally {
      setLoading(false);
    }
  };

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
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Tên danh mục</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Nhập tên danh mục"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Chọn icon</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.iconList}
            >
              {CATEGORY_ICONS.map((icon) => (
                <TouchableOpacity
                  key={icon.name}
                  style={[
                    styles.iconOption,
                    selectedIcon === icon.name && styles.iconOptionSelected
                  ]}
                  onPress={() => setSelectedIcon(icon.name)}
                >
                  <MaterialIcons 
                    name={icon.name} 
                    size={24} 
                    color={selectedIcon === icon.name ? '#fff' : '#666'} 
                  />
                  <Text 
                    style={[
                      styles.iconLabel,
                      selectedIcon === icon.name && styles.iconLabelSelected
                    ]}
                  >
                    {icon.label}
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
                {editingCategory ? 'Cập nhật' : 'Thêm mới'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

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
      <MaterialIcons name={item.icon} size={24} color="#ee4d2d" />
    </View>
    
    <View style={styles.categoryInfo}>
      <Text style={styles.categoryName}>{item.name}</Text>
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
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const categoriesRef = collection(db, 'categories');
      const q = query(categoriesRef, orderBy('priority'));
      const querySnapshot = await getDocs(q);
      
      const categoriesData: Category[] = [];
      querySnapshot.forEach((doc) => {
        categoriesData.push({ 
          id: doc.id, 
          ...doc.data(),
          icon: doc.data().icon || 'restaurant' 
        } as Category);
      });
      
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading categories:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách danh mục');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCategory = async (name: string, icon: CategoryIcon) => {
    try {
      if (editingCategory) {
        await updateDoc(doc(db, 'categories', editingCategory.id), {
          name,
          icon,
          updatedAt: new Date().toISOString()
        });
      } else {
        const lastCategory = categories[categories.length - 1];
        const priority = lastCategory ? lastCategory.priority + 1 : 0;
        
        await addDoc(collection(db, 'categories'), {
          name,
          icon,
          priority,
          createdAt: new Date().toISOString()
        });
      }
      
      loadCategories();
      setModalVisible(false);
      setEditingCategory(null);
    } catch (error) {
      console.error('Error saving category:', error);
      throw error;
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      await deleteDoc(doc(db, 'categories', categoryId));
      Alert.alert('Thành công', 'Đã xóa danh mục');
      loadCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      Alert.alert('Lỗi', 'Không thể xóa danh mục');
    }
  };

  const handleSearch = useCallback((text: string) => {
    setSearchQuery(text);
  }, []);

  const filteredCategories = useMemo(() => {
    return categories.filter(cat => 
      cat.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [categories, searchQuery]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ee4d2d" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {/* <Text style={styles.headerTitle}>Quản lý danh mục</Text> */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            setEditingCategory(null);
            setModalVisible(true);
          }}
        >
          <MaterialIcons name="add" size={24} color="#fff" />
          <Text style={styles.addButtonText}>Thêm danh mục</Text>
        </TouchableOpacity>
      </View>

      <SearchBox value={searchQuery} onChangeText={handleSearch} />

      <FlatList
        data={filteredCategories}
        renderItem={({ item }) => (
          <CategoryItem
            item={item}
            onEdit={(category) => {
              setEditingCategory(category);
              setModalVisible(true);
            }}
            onDelete={handleDeleteCategory}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="category" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Chưa có danh mục nào</Text>
          </View>
        )}
      />

      <CategoryFormModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setEditingCategory(null);
        }}
        onSave={handleSaveCategory}
        editingCategory={editingCategory}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ee4d2d',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff3f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  categoryActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
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
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
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
  iconList: {
    paddingVertical: 8,
  },
  iconOption: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    marginRight: 12,
    width: 80,
  },
  iconOptionSelected: {
    backgroundColor: '#ee4d2d',
  },
  iconLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  iconLabelSelected: {
    color: '#fff',
  },
  saveButton: {
    backgroundColor: '#ee4d2d',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#ffaa99',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
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
});

export default ManageCategoriesScreen; 