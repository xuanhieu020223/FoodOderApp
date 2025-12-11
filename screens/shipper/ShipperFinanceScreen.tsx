import React, { useEffect, useState } from 'react';
import { 
  View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl, 
  ScrollView, TouchableOpacity, Modal, TextInput, Alert
} from 'react-native';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, addDoc } from 'firebase/firestore';
import { auth, db } from '../../config/Firebase';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

const ShipperFinanceScreen = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [withdrawHistory, setWithdrawHistory] = useState<any[]>([]);
  const [walletInfo, setWalletInfo] = useState({
    balance: 0,
    debt: 0,
    pendingWithdraw: 0,
    totalWithdrawn: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    week: 0,
    month: 0,
    count: 0,
  });
  const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [bankInfo, setBankInfo] = useState({ accountNumber: '', bankName: '', accountName: '' });
  const user = auth.currentUser;

  useEffect(() => {
    fetchHistory();
    fetchWalletInfo();
    fetchWithdrawHistory();
  }, []);

  const fetchWalletInfo = async () => {
    try {
      if (!user?.uid) return;
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) return;
      const data = userDoc.data();
      const wallet = data?.wallet || {};

      setWalletInfo({
        balance: wallet.balance || 0,
        debt: wallet.debt || 0,
        pendingWithdraw: wallet.pendingWithdraw || 0,
        totalWithdrawn: wallet.totalWithdrawn || 0,
      });

      if (data?.bankInfo) {
        setBankInfo({
          bankName: data.bankInfo.bankName || '',
          accountNumber: data.bankInfo.accountNumber || '',
          accountName: data.bankInfo.accountName || '',
        });
      }
    } catch (e) {
      console.error('Error fetching wallet info:', e);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập số tiền hợp lệ');
      return;
    }

    const amount = parseFloat(withdrawAmount);
    if (amount > walletInfo.balance) {
      Alert.alert('Lỗi', 'Số tiền rút không được vượt quá số dư khả dụng');
      return;
    }

    if (!bankInfo.accountNumber || !bankInfo.bankName || !bankInfo.accountName) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin ngân hàng');
      return;
    }

    try {
      // Tạo yêu cầu rút tiền
      const withdrawRequest = {
        shipperId: user?.uid,
        amount,
        bankInfo,
        status: 'pending',
        createdAt: new Date(),
      };

      await addDoc(collection(db, 'withdrawRequests'), withdrawRequest);
      
      // Cập nhật số dư (giảm số dư khả dụng)
      const userRef = doc(db, 'users', user?.uid || '');
      await updateDoc(userRef, {
        'wallet.balance': walletInfo.balance - amount,
        'wallet.pendingWithdraw': walletInfo.pendingWithdraw + amount,
        bankInfo,
      });

      Alert.alert('Thành công', 'Yêu cầu rút tiền đã được gửi. Vui lòng chờ xử lý.');
      setWithdrawModalVisible(false);
      setWithdrawAmount('');
      setWalletInfo((prev) => ({
        ...prev,
        balance: prev.balance - amount,
        pendingWithdraw: prev.pendingWithdraw + amount,
      }));
      fetchWithdrawHistory();
    } catch (e) {
      console.error('Error creating withdraw request:', e);
      Alert.alert('Lỗi', 'Không thể tạo yêu cầu rút tiền');
    }
  };

  useEffect(() => {
    calculateStats();
  }, [history]);

  const fetchHistory = async () => {
    try {
      const ordersRef = collection(db, 'orders');
      const q = query(
        ordersRef,
        where('shipperId', '==', user?.uid),
        where('status', '==', 'delivered')
      );
      const snapshot = await getDocs(q);
      const data: any[] = [];
      snapshot.forEach(docSnap => {
        data.push({ id: docSnap.id, ...docSnap.data() });
      });
      
      // Sort by deliveredAt in memory to avoid needing a composite index
      data.sort((a, b) => {
        const dateA = a.deliveredAt?.toDate 
          ? a.deliveredAt.toDate().getTime() 
          : (a.deliveredAt?.seconds ? a.deliveredAt.seconds * 1000 : 0);
        const dateB = b.deliveredAt?.toDate 
          ? b.deliveredAt.toDate().getTime() 
          : (b.deliveredAt?.seconds ? b.deliveredAt.seconds * 1000 : 0);
        return dateB - dateA; // Descending order
      });
      
      setHistory(data);
    } catch (e) {
      console.error('Error fetching history:', e);
      setHistory([]);
    }
    setLoading(false);
  };

  const fetchWithdrawHistory = async () => {
    try {
      if (!user?.uid) return;
      const withdrawRef = collection(db, 'withdrawRequests');
      const q = query(
        withdrawRef,
        where('shipperId', '==', user.uid)
      );
      const snapshot = await getDocs(q);
      const data: any[] = [];
      snapshot.forEach((docSnap) => {
        data.push({ id: docSnap.id, ...docSnap.data() });
      });
      // Sort client-side to avoid Firestore composite index requirement
      data.sort((a, b) => {
        const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
        const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
        return bTime - aTime;
      });
      setWithdrawHistory(data);
    } catch (e) {
      if (__DEV__) {
        console.warn('Error fetching withdraw history:', e);
      }
      setWithdrawHistory([]);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchHistory(), fetchWalletInfo(), fetchWithdrawHistory()]);
    setRefreshing(false);
  };

  const getOrderEarning = (order: any) => {
    if (typeof order.shipperEarning === 'number') {
      return order.shipperEarning;
    }
    if (typeof order.deliveryFee === 'number') {
      return order.deliveryFee;
    }
    const total = typeof order.totalAmount === 'number' ? order.totalAmount : 0;
    return Math.round(total * 0.15);
  };

  const getWithdrawStatusMeta = (status?: string) => {
    switch ((status || '').toLowerCase()) {
      case 'approved':
      case 'completed':
        return { label: 'Đã duyệt', color: '#4CAF50', background: '#E8F5E9' };
      case 'rejected':
        return { label: 'Từ chối', color: '#F44336', background: '#FFEBEE' };
      default:
        return { label: 'Đang xử lý', color: '#FF9800', background: '#FFF3E0' };
    }
  };

  const calculateStats = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    let total = 0;
    let todayIncome = 0;
    let weekIncome = 0;
    let monthIncome = 0;

    history.forEach(item => {
      const amount = getOrderEarning(item);
      total += amount;

      if (item.deliveredAt) {
        const deliveredDate = item.deliveredAt.toDate 
          ? item.deliveredAt.toDate() 
          : new Date(item.deliveredAt.seconds * 1000);
        
        if (deliveredDate >= today) {
          todayIncome += amount;
        }
        if (deliveredDate >= weekAgo) {
          weekIncome += amount;
        }
        if (deliveredDate >= monthAgo) {
          monthIncome += amount;
        }
      }
    });

    setStats({
      total,
      today: todayIncome,
      week: weekIncome,
      month: monthIncome,
      count: history.length,
    });
  };

  const getFilteredHistory = () => {
    if (selectedPeriod === 'all') return history;
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let filterDate = new Date(today);
    
    if (selectedPeriod === 'today') {
      filterDate = today;
    } else if (selectedPeriod === 'week') {
      filterDate.setDate(filterDate.getDate() - 7);
    } else if (selectedPeriod === 'month') {
      filterDate.setMonth(filterDate.getMonth() - 1);
    }

    return history.filter(item => {
      if (!item.deliveredAt) return false;
      const deliveredDate = item.deliveredAt.toDate 
        ? item.deliveredAt.toDate() 
        : new Date(item.deliveredAt.seconds * 1000);
      return deliveredDate >= filterDate;
    });
  };

  const getPeriodIncome = () => {
    switch (selectedPeriod) {
      case 'today': return stats.today;
      case 'week': return stats.week;
      case 'month': return stats.month;
      default: return stats.total;
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Chưa có ngày';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
      return date.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return 'Chưa có ngày';
    }
  };

  const formatShortDate = (timestamp: any) => {
    if (!timestamp) return '';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const days = Math.floor(diff / 86400000);
      
      if (days === 0) return 'Hôm nay';
      if (days === 1) return 'Hôm qua';
      if (days < 7) return `${days} ngày trước`;
      
      return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
      });
    } catch (e) {
      return '';
    }
  };

  if (loading && history.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ee4d2d" />
        <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
      </View>
    );
  }

  const filteredHistory = getFilteredHistory();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerIconContainer}>
            <MaterialIcons name="account-balance-wallet" size={28} color="#ee4d2d" />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Tài chính</Text>
            <Text style={styles.headerSubtitle}>Thống kê thu nhập</Text>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Wallet Summary */}
        <View style={styles.walletContainer}>
          <View style={styles.walletCard}>
            <View style={styles.walletHeader}>
              <MaterialIcons name="account-balance-wallet" size={24} color="#4CAF50" />
              <Text style={styles.walletTitle}>Ví tiền</Text>
            </View>
            <View style={styles.walletRow}>
              <View style={styles.walletItem}>
                <Text style={styles.walletLabel}>Số dư khả dụng</Text>
                <Text style={styles.walletValue}>
                  {walletInfo.balance.toLocaleString('vi-VN')} đ
                </Text>
              </View>
              <View style={styles.walletItem}>
                <Text style={styles.walletLabel}>Nợ</Text>
                <Text style={[styles.walletValue, styles.walletDebt]}>
                  {walletInfo.debt.toLocaleString('vi-VN')} đ
                </Text>
              </View>
            </View>
            <View style={styles.walletRow}>
              <View style={styles.walletItem}>
                <Text style={styles.walletLabel}>Đang chờ rút</Text>
                <Text style={styles.walletValuePending}>
                  {walletInfo.pendingWithdraw.toLocaleString('vi-VN')} đ
                </Text>
              </View>
              <View style={styles.walletItem}>
                <Text style={styles.walletLabel}>Đã rút</Text>
                <Text style={styles.walletValue}>
                  {walletInfo.totalWithdrawn.toLocaleString('vi-VN')} đ
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.withdrawButton}
              onPress={() => setWithdrawModalVisible(true)}
              disabled={walletInfo.balance <= 0}
            >
              <MaterialIcons name="account-balance" size={20} color="#fff" />
              <Text style={styles.withdrawButtonText}>Rút tiền</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Stats Card */}
        <View style={styles.statsContainer}>
          <View style={styles.primaryStatCard}>
            <View style={styles.primaryStatHeader}>
              <View style={styles.primaryStatIconContainer}>
                <MaterialIcons name="attach-money" size={32} color="#fff" />
              </View>
              <View style={styles.primaryStatInfo}>
                <Text style={styles.primaryStatLabel}>Tổng thu nhập</Text>
                <Text style={styles.primaryStatValue}>
                  {getPeriodIncome().toLocaleString('vi-VN')} đ
                </Text>
                <Text style={styles.primaryStatSubtext}>
                  {filteredHistory.length} chuyến giao
                </Text>
              </View>
            </View>
          </View>

          {/* Period Filter */}
          <View style={styles.periodFilter}>
            <TouchableOpacity
              style={[styles.periodTab, selectedPeriod === 'all' && styles.periodTabActive]}
              onPress={() => setSelectedPeriod('all')}
            >
              <Text style={[styles.periodTabText, selectedPeriod === 'all' && styles.periodTabTextActive]}>
                Tất cả
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.periodTab, selectedPeriod === 'today' && styles.periodTabActive]}
              onPress={() => setSelectedPeriod('today')}
            >
              <Text style={[styles.periodTabText, selectedPeriod === 'today' && styles.periodTabTextActive]}>
                Hôm nay
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.periodTab, selectedPeriod === 'week' && styles.periodTabActive]}
              onPress={() => setSelectedPeriod('week')}
            >
              <Text style={[styles.periodTabText, selectedPeriod === 'week' && styles.periodTabTextActive]}>
                7 ngày
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.periodTab, selectedPeriod === 'month' && styles.periodTabActive]}
              onPress={() => setSelectedPeriod('month')}
            >
              <Text style={[styles.periodTabText, selectedPeriod === 'month' && styles.periodTabTextActive]}>
                Tháng
              </Text>
            </TouchableOpacity>
          </View>

          {/* Secondary Stats */}
          <View style={styles.secondaryStats}>
            <View style={styles.secondaryStatCard}>
              <View style={[styles.secondaryStatIconContainer, { backgroundColor: '#E3F2FD' }]}>
                <MaterialIcons name="today" size={24} color="#2196F3" />
              </View>
              <Text style={styles.secondaryStatLabel}>Hôm nay</Text>
              <Text style={styles.secondaryStatValue}>
                {stats.today.toLocaleString('vi-VN')} đ
              </Text>
            </View>

            <View style={styles.secondaryStatCard}>
              <View style={[styles.secondaryStatIconContainer, { backgroundColor: '#E8F5E9' }]}>
                <MaterialIcons name="date-range" size={24} color="#4CAF50" />
              </View>
              <Text style={styles.secondaryStatLabel}>7 ngày qua</Text>
              <Text style={styles.secondaryStatValue}>
                {stats.week.toLocaleString('vi-VN')} đ
              </Text>
            </View>

            <View style={styles.secondaryStatCard}>
              <View style={[styles.secondaryStatIconContainer, { backgroundColor: '#FFF3E0' }]}>
                <MaterialIcons name="calendar-month" size={24} color="#FF9800" />
              </View>
              <Text style={styles.secondaryStatLabel}>Tháng này</Text>
              <Text style={styles.secondaryStatValue}>
                {stats.month.toLocaleString('vi-VN')} đ
              </Text>
            </View>
          </View>
        </View>

        {/* History Section */}
        <View style={styles.sectionHeader}>
          <MaterialIcons name="history" size={20} color="#333" />
          <Text style={styles.sectionTitle}>
            Lịch sử giao hàng ({filteredHistory.length})
          </Text>
        </View>

        {filteredHistory.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="inbox" size={80} color="#ddd" />
            <Text style={styles.emptyText}>
              {selectedPeriod === 'all' 
                ? 'Chưa có chuyến giao thành công nào' 
                : 'Không có dữ liệu trong khoảng thời gian này'}
            </Text>
            <Text style={styles.emptySubtext}>
              Hoàn thành đơn hàng để xem thu nhập
            </Text>
          </View>
        ) : (
          <View style={styles.historyContainer}>
            {filteredHistory.map((item) => {
              const earning = getOrderEarning(item);
              return (
                <View key={item.id} style={styles.historyItem}>
                  <View style={styles.historyItemLeft}>
                    <View style={styles.historyIconContainer}>
                      <MaterialIcons name="check-circle" size={28} color="#4CAF50" />
                    </View>
                    <View style={styles.historyItemInfo}>
                      <Text style={styles.historyItemText}>
                        Đơn #{item.id.slice(-8).toUpperCase()}
                      </Text>
                      <Text style={styles.historyAddress} numberOfLines={1}>
                        {item.address || item.restaurantAddress || 'Chưa có địa chỉ'}
                      </Text>
                      <Text style={styles.historyDate}>{formatDate(item.deliveredAt)}</Text>
                    </View>
                  </View>
                  <View style={styles.historyItemRight}>
                    <Text style={styles.historyAmount}>
                      +{earning.toLocaleString('vi-VN')} đ
                    </Text>
                    <Text style={styles.historyDateShort}>{formatShortDate(item.deliveredAt)}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Withdraw History */}
        <View style={styles.sectionHeader}>
          <MaterialIcons name="payments" size={20} color="#333" />
          <Text style={styles.sectionTitle}>
            Lịch sử rút tiền ({withdrawHistory.length})
          </Text>
        </View>

        {withdrawHistory.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="account-balance" size={72} color="#ddd" />
            <Text style={styles.emptyText}>Chưa có yêu cầu rút tiền nào</Text>
            <Text style={styles.emptySubtext}>
              Tạo yêu cầu rút tiền để hệ thống xử lý trong 1-2 ngày làm việc
            </Text>
          </View>
        ) : (
          <View style={styles.historyContainer}>
            {withdrawHistory.map((item) => {
              const statusMeta = getWithdrawStatusMeta(item.status);
              return (
                <View key={item.id} style={styles.withdrawItem}>
                  <View style={styles.withdrawItemHeader}>
                    <Text style={styles.historyItemText}>#{item.id.slice(-6).toUpperCase()}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusMeta.background }]}>
                      <Text style={[styles.statusBadgeText, { color: statusMeta.color }]}>
                        {statusMeta.label}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.withdrawAmount}>
                    -{(item.amount || 0).toLocaleString('vi-VN')} đ
                  </Text>
                  <Text style={styles.withdrawBank} numberOfLines={1}>
                    {item.bankInfo?.bankName || 'Ngân hàng'} • {item.bankInfo?.accountNumber || '---'}
                  </Text>
                  <Text style={styles.historyDate}>{formatDate(item.createdAt)}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Summary Card */}
        {history.length > 0 && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tổng số đơn đã giao:</Text>
              <Text style={styles.summaryValue}>{stats.count}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tổng thu nhập:</Text>
              <Text style={[styles.summaryValue, styles.summaryValueHighlight]}>
                {stats.total.toLocaleString('vi-VN')} đ
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Thu nhập trung bình/đơn:</Text>
              <Text style={styles.summaryValue}>
                {stats.count > 0 
                  ? Math.round(stats.total / stats.count).toLocaleString('vi-VN') 
                  : '0'} đ
              </Text>
            </View>
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Withdraw Modal */}
      <Modal
        visible={withdrawModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setWithdrawModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Rút tiền</Text>
              <TouchableOpacity onPress={() => setWithdrawModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.modalInfo}>
                <Text style={styles.modalInfoLabel}>Số dư khả dụng:</Text>
                <Text style={styles.modalInfoValue}>
                  {walletInfo.balance.toLocaleString('vi-VN')} đ
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Số tiền rút (đ) *</Text>
                <TextInput
                  style={styles.input}
                  value={withdrawAmount}
                  onChangeText={setWithdrawAmount}
                  placeholder="Nhập số tiền"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tên ngân hàng *</Text>
                <TextInput
                  style={styles.input}
                  value={bankInfo.bankName}
                  onChangeText={(text) => setBankInfo({ ...bankInfo, bankName: text })}
                  placeholder="Ví dụ: Vietcombank"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Số tài khoản *</Text>
                <TextInput
                  style={styles.input}
                  value={bankInfo.accountNumber}
                  onChangeText={(text) => setBankInfo({ ...bankInfo, accountNumber: text })}
                  placeholder="Nhập số tài khoản"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tên chủ tài khoản *</Text>
                <TextInput
                  style={styles.input}
                  value={bankInfo.accountName}
                  onChangeText={(text) => setBankInfo({ ...bankInfo, accountName: text })}
                  placeholder="Nhập tên chủ tài khoản"
                  placeholderTextColor="#999"
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setWithdrawModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleWithdraw}
              >
                <Text style={styles.submitButtonText}>Xác nhận</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF3F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  statsContainer: {
    padding: 16,
  },
  primaryStatCard: {
    backgroundColor: '#ee4d2d',
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  primaryStatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryStatIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  primaryStatInfo: {
    flex: 1,
  },
  primaryStatLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 8,
    fontWeight: '600',
  },
  primaryStatValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  primaryStatSubtext: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  periodFilter: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  periodTabActive: {
    backgroundColor: '#ee4d2d',
  },
  periodTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  periodTabTextActive: {
    color: '#fff',
  },
  secondaryStats: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryStatCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  secondaryStatIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryStatLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 6,
    textAlign: 'center',
    fontWeight: '600',
  },
  secondaryStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  historyContainer: {
    padding: 16,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  historyItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  historyIconContainer: {
    marginRight: 12,
  },
  historyItemInfo: {
    flex: 1,
  },
  historyItemText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  historyAddress: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  historyDate: {
    fontSize: 12,
    color: '#999',
  },
  historyItemRight: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  historyAmount: {
    fontWeight: 'bold',
    color: '#4CAF50',
    fontSize: 16,
    marginBottom: 4,
  },
  historyDateShort: {
    fontSize: 11,
    color: '#999',
  },
  withdrawItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  withdrawItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  withdrawAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F44336',
    marginBottom: 6,
  },
  withdrawBank: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
    marginTop: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    margin: 16,
    marginTop: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 15,
    color: '#333',
    fontWeight: 'bold',
  },
  summaryValueHighlight: {
    fontSize: 18,
    color: '#ee4d2d',
  },
  walletContainer: {
    padding: 16,
    paddingBottom: 0,
  },
  walletCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  walletTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  walletRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  walletItem: {
    flex: 1,
  },
  walletLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  walletValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  walletValuePending: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  walletDebt: {
    color: '#F44336',
  },
  withdrawButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ee4d2d',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  withdrawButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  modalBody: {
    padding: 20,
  },
  modalInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  modalInfoLabel: {
    fontSize: 14,
    color: '#666',
  },
  modalInfoValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    backgroundColor: '#fff',
    color: '#333',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: 'bold',
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#ee4d2d',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default ShipperFinanceScreen;

