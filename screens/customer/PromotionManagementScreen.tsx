import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  FlatList,
  Modal,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../../config/Firebase';

type PromotionStatus = 'scheduled' | 'active' | 'paused' | 'expired';
type DiscountType = 'percentage' | 'amount';

type Promotion = {
  id: string;
  title: string;
  code: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  minOrderValue?: number;
  usageLimit?: number;
  usedCount?: number;
  startDate?: Timestamp | null;
  endDate?: Timestamp | null;
  status: PromotionStatus;
  createdAt?: Timestamp;
};

type PromotionForm = {
  title: string;
  code: string;
  description: string;
  discountType: DiscountType;
  discountValue: string;
  minOrderValue: string;
  usageLimit: string;
  startDate: string;
  endDate: string;
};

const INITIAL_FORM: PromotionForm = {
  title: '',
  code: '',
  description: '',
  discountType: 'percentage',
  discountValue: '10',
  minOrderValue: '',
  usageLimit: '',
  startDate: '',
  endDate: '',
};

const STATUS_LABELS: Record<PromotionStatus, string> = {
  scheduled: 'Sắp chạy',
  active: 'Đang chạy',
  paused: 'Tạm dừng',
  expired: 'Hết hạn',
};

const PromotionManagementScreen = () => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState<PromotionForm>(INITIAL_FORM);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | PromotionStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadPromotions();
  }, []);

  const loadPromotions = async () => {
    try {
      setLoading(true);
      const promotionsRef = collection(db, 'promotions');
      const q = query(promotionsRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const data: Promotion[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Promotion, 'id'>),
      }));
      setPromotions(data);
    } catch (error) {
      console.error('Error loading promotions:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách khuyến mãi');
    } finally {
      setLoading(false);
    }
  };

  const resolveStatusFromDates = (start?: Date | null, end?: Date | null): PromotionStatus => {
    const now = new Date();
    if (start && now < start) return 'scheduled';
    if (end && now > end) return 'expired';
    return 'active';
  };

  const openModal = (promotion?: Promotion) => {
    if (promotion) {
      setEditingPromotion(promotion);
      setForm({
        title: promotion.title || '',
        code: promotion.code || '',
        description: promotion.description || '',
        discountType: promotion.discountType || 'percentage',
        discountValue: String(promotion.discountValue ?? 0),
        minOrderValue: promotion.minOrderValue ? String(promotion.minOrderValue) : '',
        usageLimit: promotion.usageLimit ? String(promotion.usageLimit) : '',
        startDate: promotion.startDate?.toDate?.().toISOString().slice(0, 10) || '',
        endDate: promotion.endDate?.toDate?.().toISOString().slice(0, 10) || '',
      });
    } else {
      setEditingPromotion(null);
      setForm(INITIAL_FORM);
    }
    setModalVisible(true);
  };

  const handleChange = (field: keyof PromotionForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const parseDate = (value: string) => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const handleSavePromotion = async () => {
    if (!form.title.trim() || !form.code.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên chương trình và mã khuyến mãi');
      return;
    }

    const discountValue = Number(form.discountValue);
    if (Number.isNaN(discountValue) || discountValue <= 0) {
      Alert.alert('Lỗi', 'Giá trị giảm giá không hợp lệ');
      return;
    }

    const startDate = parseDate(form.startDate);
    const endDate = parseDate(form.endDate);

    if (startDate && endDate && endDate < startDate) {
      Alert.alert('Lỗi', 'Ngày kết thúc phải sau ngày bắt đầu');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        code: form.code.trim().toUpperCase(),
        description: form.description.trim(),
        discountType: form.discountType,
        discountValue,
        minOrderValue: form.minOrderValue ? Number(form.minOrderValue) : null,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
        startDate: startDate ? Timestamp.fromDate(startDate) : null,
        endDate: endDate ? Timestamp.fromDate(endDate) : null,
        status:
          editingPromotion && editingPromotion.status === 'paused'
            ? 'paused'
            : resolveStatusFromDates(startDate, endDate),
        updatedAt: serverTimestamp(),
      };

      if (editingPromotion) {
        await updateDoc(doc(db, 'promotions', editingPromotion.id), payload);
      } else {
        await addDoc(collection(db, 'promotions'), {
          ...payload,
          createdAt: serverTimestamp(),
          usedCount: 0,
        });
      }

      setModalVisible(false);
      setEditingPromotion(null);
      setForm(INITIAL_FORM);
      loadPromotions();
      Alert.alert('Thành công', 'Đã lưu chương trình khuyến mãi');
    } catch (error) {
      console.error('Error saving promotion:', error);
      Alert.alert('Lỗi', 'Không thể lưu chương trình');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePause = async (promotion: Promotion) => {
    try {
      const start = promotion.startDate?.toDate?.() ?? null;
      const end = promotion.endDate?.toDate?.() ?? null;
      const nextStatus =
        promotion.status === 'paused' ? resolveStatusFromDates(start, end) : 'paused';
      await updateDoc(doc(db, 'promotions', promotion.id), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
      loadPromotions();
    } catch (error) {
      console.error('Error toggling promotion status:', error);
      Alert.alert('Lỗi', 'Không thể cập nhật trạng thái');
    }
  };

  const handleDeletePromotion = (promotion: Promotion) => {
    Alert.alert(
      'Xóa chương trình?',
      `Bạn chắc chắn muốn xóa ${promotion.title}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'promotions', promotion.id));
              loadPromotions();
              Alert.alert('Thành công', 'Đã xóa chương trình');
            } catch (error) {
              console.error('Error deleting promotion:', error);
              Alert.alert('Lỗi', 'Không thể xóa chương trình');
            }
          },
        },
      ]
    );
  };

  const filteredPromotions = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    return promotions.filter((promotion) => {
      if (statusFilter !== 'all' && promotion.status !== statusFilter) {
        return false;
      }
      if (keyword) {
        return (
          promotion.title?.toLowerCase().includes(keyword) ||
          promotion.code?.toLowerCase().includes(keyword)
        );
      }
      return true;
    });
  }, [promotions, statusFilter, searchQuery]);

  const statusStats = useMemo(() => {
    return promotions.reduce(
      (acc, promotion) => {
        acc[promotion.status] = (acc[promotion.status] || 0) + 1;
        return acc;
      },
      { active: 0, paused: 0, scheduled: 0, expired: 0 } as Record<PromotionStatus, number>
    );
  }, [promotions]);

  const formatDate = (value?: Timestamp | null) => {
    if (!value) return 'Không thời hạn';
    try {
      return value.toDate().toLocaleDateString('vi-VN');
    } catch (error) {
      return 'Không thời hạn';
    }
  };

  const renderPromotionCard = ({ item }: { item: Promotion }) => (
    <View style={styles.promotionCard}>
      <View style={styles.promotionHeader}>
        <View>
          <Text style={styles.promotionTitle}>{item.title || 'Chưa đặt tên'}</Text>
          <Text style={styles.promotionCode}>Mã: {item.code}</Text>
        </View>
        <View style={[styles.statusChip, styles[`statusChip_${item.status}` as keyof typeof styles]]}>
          <Text style={styles.statusChipText}>{STATUS_LABELS[item.status]}</Text>
        </View>
      </View>

      <Text style={styles.promotionDescription} numberOfLines={2}>
        {item.description || 'Chưa có mô tả'}
      </Text>

      <View style={styles.promotionMetaRow}>
        <View style={styles.metaBox}>
          <MaterialIcons name="sell" size={18} color="#ee4d2d" />
          <Text style={styles.metaLabel}>
            {item.discountType === 'percentage'
              ? `${item.discountValue}%`
              : `${item.discountValue?.toLocaleString('vi-VN')}đ`}
          </Text>
        </View>
        <View style={styles.metaBox}>
          <MaterialIcons name="calendar-today" size={18} color="#2196F3" />
          <Text style={styles.metaLabel}>
            {formatDate(item.startDate)} → {formatDate(item.endDate)}
          </Text>
        </View>
      </View>

      <View style={styles.promotionMetaRow}>
        <View style={styles.metaBox}>
          <MaterialIcons name="flag" size={18} color="#607D8B" />
          <Text style={styles.metaLabel}>
            Tối thiểu: {item.minOrderValue ? `${item.minOrderValue.toLocaleString('vi-VN')}đ` : 'Không'}
          </Text>
        </View>
        <View style={styles.metaBox}>
          <MaterialIcons name="group" size={18} color="#607D8B" />
          <Text style={styles.metaLabel}>
            Đã dùng: {item.usedCount ?? 0}/{item.usageLimit ?? '∞'}
          </Text>
        </View>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.actionGhostButton} onPress={() => openModal(item)}>
          <MaterialIcons name="edit" size={18} color="#2196F3" />
          <Text style={[styles.actionGhostText, { color: '#2196F3' }]}>Chỉnh sửa</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionGhostButton}
          onPress={() => handleTogglePause(item)}
        >
          <MaterialIcons
            name={item.status === 'paused' ? 'play-arrow' : 'pause'}
            size={18}
            color="#FF9800"
          />
          <Text style={[styles.actionGhostText, { color: '#FF9800' }]}>
            {item.status === 'paused' ? 'Kích hoạt' : 'Tạm dừng'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionGhostButton}
          onPress={() => handleDeletePromotion(item)}
        >
          <MaterialIcons name="delete" size={18} color="#f44336" />
          <Text style={[styles.actionGhostText, { color: '#f44336' }]}>Xóa</Text>
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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.statsRow}
        contentContainerStyle={styles.statsRowContent}
      >
        <View style={[styles.statCard, styles.statCardPrimary]}>
          <Text style={styles.statValue}>{statusStats.active || 0}</Text>
          <Text style={styles.statLabel}>Đang chạy</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{statusStats.scheduled || 0}</Text>
          <Text style={styles.statLabel}>Sắp chạy</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{statusStats.paused || 0}</Text>
          <Text style={styles.statLabel}>Tạm dừng</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{statusStats.expired || 0}</Text>
          <Text style={styles.statLabel}>Hết hạn</Text>
        </View>
      </ScrollView>

      <View style={styles.toolbar}>
        <View style={styles.searchBox}>
          <MaterialIcons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm campaign..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity style={styles.primaryButton} onPress={() => openModal()}>
          <MaterialIcons name="add" size={20} color="#fff" />
          <Text style={styles.primaryButtonText}>Tạo campaign</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterBar}
        contentContainerStyle={styles.filterBarContent}
      >
        {(['all', 'active', 'scheduled', 'paused', 'expired'] as const).map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterChip,
              statusFilter === status && styles.filterChipActive,
            ]}
            onPress={() => setStatusFilter(status)}
          >
            <Text
              style={[
                styles.filterChipText,
                statusFilter === status && styles.filterChipTextActive,
              ]}
            >
              {status === 'all' ? 'Tất cả' : STATUS_LABELS[status]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filteredPromotions}
        renderItem={renderPromotionCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name='campaign' size={48} color="#ccc" />
            <Text style={styles.emptyTitle}>Chưa có campaign</Text>
            <Text style={styles.emptySubtitle}>Tạo chương trình mới để bắt đầu thu hút khách hàng.</Text>
          </View>
        }
      />

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingPromotion ? 'Chỉnh sửa campaign' : 'Tạo campaign mới'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Tên chiến dịch</Text>
              <TextInput
                style={styles.input}
                value={form.title}
                onChangeText={(text) => handleChange('title', text)}
                placeholder="Mega Sale 12.12"
              />

              <Text style={styles.inputLabel}>Mã khuyến mãi</Text>
              <TextInput
                style={styles.input}
                value={form.code}
                onChangeText={(text) => handleChange('code', text)}
                placeholder="MEGA1212"
                autoCapitalize="characters"
              />

              <Text style={styles.inputLabel}>Mô tả</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                value={form.description}
                onChangeText={(text) => handleChange('description', text)}
                placeholder="Nhập mô tả, điều kiện áp dụng..."
                multiline
                numberOfLines={3}
              />

              <Text style={styles.inputLabel}>Loại ưu đãi</Text>
              <View style={styles.segmentGroup}>
                {(['percentage', 'amount'] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.segmentButton,
                      form.discountType === type && styles.segmentButtonActive,
                    ]}
                    onPress={() => handleChange('discountType', type)}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        form.discountType === type && styles.segmentTextActive,
                      ]}
                    >
                      {type === 'percentage' ? 'Phần trăm' : 'Số tiền'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>
                Giá trị ưu đãi ({form.discountType === 'percentage' ? '%' : 'VND'})
              </Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={form.discountValue}
                onChangeText={(text) => handleChange('discountValue', text)}
                placeholder={form.discountType === 'percentage' ? '10' : '50000'}
              />

              <View style={styles.inlineGroup}>
                <View style={styles.inlineItem}>
                  <Text style={styles.inputLabel}>Đơn tối thiểu</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={form.minOrderValue}
                    onChangeText={(text) => handleChange('minOrderValue', text)}
                    placeholder="Ví dụ 150000"
                  />
                </View>
                <View style={styles.inlineItem}>
                  <Text style={styles.inputLabel}>Giới hạn lượt</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={form.usageLimit}
                    onChangeText={(text) => handleChange('usageLimit', text)}
                    placeholder="Ví dụ 500"
                  />
                </View>
              </View>

              <View style={styles.inlineGroup}>
                <View style={styles.inlineItem}>
                  <Text style={styles.inputLabel}>Ngày bắt đầu</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="YYYY-MM-DD"
                    value={form.startDate}
                    onChangeText={(text) => handleChange('startDate', text)}
                  />
                </View>
                <View style={styles.inlineItem}>
                  <Text style={styles.inputLabel}>Ngày kết thúc</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="YYYY-MM-DD"
                    value={form.endDate}
                    onChangeText={(text) => handleChange('endDate', text)}
                  />
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.primaryButton, styles.modalButton]}
              onPress={handleSavePromotion}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="save" size={20} color="#fff" />
                  <Text style={styles.primaryButtonText}>
                    {editingPromotion ? 'Cập nhật' : 'Lưu campaign'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    marginTop: 10,
  },
  statsRowContent: {
    paddingHorizontal: 15,
  },
  statCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
    minWidth: 120,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  statCardPrimary: {
    backgroundColor: '#ee4d2d',
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 13,
    color: '#777',
    marginTop: 4,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginTop: 15,
    gap: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ee4d2d',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    gap: 6,
    elevation: 2,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  filterBar: {
    marginTop: 10,
  },
  filterBarContent: {
    paddingHorizontal: 15,
    paddingBottom: 5,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 10,
    backgroundColor: '#fff',
  },
  filterChipActive: {
    backgroundColor: '#ee4d2d',
    borderColor: '#ee4d2d',
  },
  filterChipText: {
    color: '#555',
    fontSize: 14,
  },
  filterChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  listContent: {
    padding: 15,
    paddingBottom: 30,
  },
  promotionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  promotionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  promotionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  promotionCode: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  promotionDescription: {
    fontSize: 14,
    color: '#555',
    marginTop: 10,
    lineHeight: 20,
  },
  promotionMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  metaBox: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  metaLabel: {
    fontSize: 13,
    color: '#555',
  },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusChipText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  statusChip_active: {
    backgroundColor: '#4CAF50',
  },
  statusChip_paused: {
    backgroundColor: '#FF9800',
  },
  statusChip_scheduled: {
    backgroundColor: '#2196F3',
  },
  statusChip_expired: {
    backgroundColor: '#9E9E9E',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  actionGhostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionGhostText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
    color: '#333',
  },
  emptySubtitle: {
    color: '#777',
    textAlign: 'center',
    marginTop: 6,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#f7f7f7',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
  },
  multilineInput: {
    height: 90,
    textAlignVertical: 'top',
  },
  segmentGroup: {
    flexDirection: 'row',
    backgroundColor: '#f1f1f1',
    borderRadius: 12,
    padding: 4,
    marginTop: 4,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
  },
  segmentButtonActive: {
    backgroundColor: '#fff',
    elevation: 1,
  },
  segmentText: {
    textAlign: 'center',
    color: '#777',
    fontWeight: '500',
  },
  segmentTextActive: {
    color: '#ee4d2d',
    fontWeight: '700',
  },
  inlineGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  inlineItem: {
    flex: 1,
  },
  modalButton: {
    marginHorizontal: 20,
    marginTop: 10,
    height: 52,
    justifyContent: 'center',
  },
});

export default PromotionManagementScreen;

