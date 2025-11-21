import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../../config/Firebase';

type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

type SupportTicket = {
  id: string;
  subject: string;
  message: string;
  category?: string;
  status: TicketStatus;
  priority?: TicketPriority;
  userId?: string;
  orderId?: string;
  channel?: string;
  attachments?: string[];
  adminNote?: string;
  createdAt?: { toDate: () => Date };
  updatedAt?: { toDate: () => Date };
  contact?: {
    name?: string;
    phone?: string;
    email?: string;
  };
};

const STATUS_META: Record<TicketStatus, { label: string; color: string; icon: keyof typeof MaterialIcons.glyphMap }> = {
  open: { label: 'Mới', color: '#FF9800', icon: 'mark-email-unread' },
  in_progress: { label: 'Đang xử lý', color: '#2196F3', icon: 'build-circle' },
  resolved: { label: 'Đã xử lý', color: '#4CAF50', icon: 'check-circle' },
  closed: { label: 'Đã đóng', color: '#9E9E9E', icon: 'lock' },
};

const PRIORITY_META: Record<TicketPriority, { label: string; color: string }> = {
  low: { label: 'Thấp', color: '#8BC34A' },
  medium: { label: 'Trung bình', color: '#FFC107' },
  high: { label: 'Cao', color: '#FF7043' },
  urgent: { label: 'Khẩn cấp', color: '#f44336' },
};

const SupportCenterScreen = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | TicketStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const supportRef = collection(db, 'supportTickets');
      const q = query(supportRef, orderBy('updatedAt', 'desc'));
      const snapshot = await getDocs(q);
      const data: SupportTicket[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<SupportTicket, 'id'>),
      }));
      setTickets(data);
    } catch (error) {
      console.error('Error loading support tickets:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách hỗ trợ');
    } finally {
      setLoading(false);
    }
  };

  const openTicketModal = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setResolutionNote(ticket.adminNote || '');
    setModalVisible(true);
  };

  const formatDate = (value?: { toDate: () => Date }) => {
    if (!value) return 'Không xác định';
    try {
      return value.toDate().toLocaleString('vi-VN');
    } catch (error) {
      return 'Không xác định';
    }
  };

  const filteredTickets = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    return tickets.filter((ticket) => {
      if (statusFilter !== 'all' && ticket.status !== statusFilter) {
        return false;
      }
      if (keyword) {
        return (
          ticket.subject?.toLowerCase().includes(keyword) ||
          ticket.message?.toLowerCase().includes(keyword) ||
          ticket.userId?.toLowerCase().includes(keyword)
        );
      }
      return true;
    });
  }, [tickets, statusFilter, searchQuery]);

  const statusStats = useMemo(() => {
    return tickets.reduce(
      (acc, ticket) => {
        acc[ticket.status] = (acc[ticket.status] || 0) + 1;
        return acc;
      },
      { open: 0, in_progress: 0, resolved: 0, closed: 0 } as Record<TicketStatus, number>
    );
  }, [tickets]);

  const handleUpdateStatus = async (status: TicketStatus) => {
    if (!selectedTicket) return;
    setUpdating(true);
    try {
      await updateDoc(doc(db, 'supportTickets', selectedTicket.id), {
        status,
        adminNote: resolutionNote,
        updatedAt: serverTimestamp(),
      });
      setModalVisible(false);
      setSelectedTicket(null);
      loadTickets();
      Alert.alert('Thành công', 'Đã cập nhật trạng thái khiếu nại');
    } catch (error) {
      console.error('Error updating ticket:', error);
      Alert.alert('Lỗi', 'Không thể cập nhật trạng thái');
    } finally {
      setUpdating(false);
    }
  };

  const renderTicketCard = ({ item }: { item: SupportTicket }) => {
    const statusMeta = STATUS_META[item.status];
    const priorityMeta = item.priority ? PRIORITY_META[item.priority] : undefined;
    return (
      <TouchableOpacity style={styles.ticketCard} onPress={() => openTicketModal(item)}>
        <View style={styles.ticketHeader}>
          <View style={styles.ticketHeaderText}>
            <Text style={styles.ticketSubject}>{item.subject || 'Không có tiêu đề'}</Text>
            <Text style={styles.ticketMeta}>
              {item.category || 'Khác'} • {formatDate(item.updatedAt)}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusMeta.color }]}>
            <MaterialIcons name={statusMeta.icon} size={16} color="#fff" />
            <Text style={styles.statusText}>{statusMeta.label}</Text>
          </View>
        </View>

        <Text style={styles.ticketMessage} numberOfLines={2}>
          {item.message || 'Không có nội dung'}
        </Text>

        <View style={styles.ticketFooter}>
          <View style={styles.footerItem}>
            <MaterialIcons name="person" size={16} color="#888" />
            <Text style={styles.footerText}>{item.contact?.name || item.userId || 'Ẩn danh'}</Text>
          </View>
          {priorityMeta && (
            <View style={[styles.priorityBadge, { backgroundColor: priorityMeta.color }]}>
              <Text style={styles.priorityText}>{priorityMeta.label}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

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
        {(['open', 'in_progress', 'resolved', 'closed'] as const).map((status) => (
          <View key={status} style={styles.statCard}>
            <Text style={styles.statValue}>{statusStats[status] || 0}</Text>
            <Text style={styles.statLabel}>{STATUS_META[status].label}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.toolbar}>
        <View style={styles.searchBox}>
          <MaterialIcons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm khiếu nại..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={loadTickets}>
          <MaterialIcons name="refresh" size={22} color="#ee4d2d" />
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterBar}
        contentContainerStyle={styles.filterBarContent}
      >
        {(['all', 'open', 'in_progress', 'resolved', 'closed'] as const).map((status) => (
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
              {status === 'all' ? 'Tất cả' : STATUS_META[status].label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filteredTickets}
        renderItem={renderTicketCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="support-agent" size={48} color="#ccc" />
            <Text style={styles.emptyTitle}>Không có khiếu nại</Text>
            <Text style={styles.emptySubtitle}>Tất cả người dùng đang hài lòng 🎉</Text>
          </View>
        }
      />

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chi tiết khiếu nại</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {selectedTicket && (
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <Text style={styles.detailLabel}>Tiêu đề</Text>
                <Text style={styles.detailValue}>{selectedTicket.subject}</Text>

                <Text style={styles.detailLabel}>Nội dung</Text>
                <Text style={styles.detailValue}>{selectedTicket.message}</Text>

                <Text style={styles.detailLabel}>Thông tin liên hệ</Text>
                <Text style={styles.detailValue}>
                  {selectedTicket.contact?.name || 'Không xác định'}
                </Text>
                <Text style={styles.detailValue}>
                  {selectedTicket.contact?.phone || selectedTicket.contact?.email || 'Không có'}
                </Text>

                {selectedTicket.orderId && (
                  <>
                    <Text style={styles.detailLabel}>Đơn hàng liên quan</Text>
                    <Text style={styles.detailValue}>{selectedTicket.orderId}</Text>
                  </>
                )}

                <Text style={styles.detailLabel}>Ghi chú xử lý</Text>
                <TextInput
                  style={[styles.input, styles.multilineInput]}
                  value={resolutionNote}
                  onChangeText={setResolutionNote}
                  placeholder="Cập nhật kết quả xử lý..."
                  multiline
                  numberOfLines={4}
                />

                <View style={styles.actionRow}>
                  {(['open', 'in_progress', 'resolved', 'closed'] as const).map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.statusAction,
                        selectedTicket.status === status && styles.statusActionActive,
                      ]}
                      onPress={() => handleUpdateStatus(status)}
                      disabled={updating}
                    >
                      <Text
                        style={[
                          styles.statusActionText,
                          selectedTicket.status === status && styles.statusActionTextActive,
                        ]}
                      >
                        {STATUS_META[status].label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            )}
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
    minWidth: 110,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
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
    gap: 10,
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
  refreshButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
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
  ticketCard: {
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
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketHeaderText: {
    flex: 1,
    marginRight: 10,
  },
  ticketSubject: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333',
  },
  ticketMeta: {
    fontSize: 13,
    color: '#777',
    marginTop: 2,
  },
  ticketMessage: {
    fontSize: 14,
    color: '#555',
    marginTop: 10,
    lineHeight: 20,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 13,
    color: '#666',
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    color: '#fff',
    fontSize: 12,
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
  modalOverlay: {
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
  detailLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#777',
    marginTop: 16,
  },
  detailValue: {
    fontSize: 15,
    color: '#333',
    marginTop: 4,
  },
  input: {
    backgroundColor: '#f7f7f7',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    marginTop: 8,
  },
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 20,
  },
  statusAction: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingVertical: 10,
    alignItems: 'center',
  },
  statusActionActive: {
    backgroundColor: '#ee4d2d',
    borderColor: '#ee4d2d',
  },
  statusActionText: {
    color: '#555',
    fontWeight: '600',
  },
  statusActionTextActive: {
    color: '#fff',
  },
});

export default SupportCenterScreen;

