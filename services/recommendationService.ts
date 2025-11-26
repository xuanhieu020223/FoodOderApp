import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../config/Firebase';

export interface RecommendedFood {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  isAvailable: boolean;
  restaurantId?: string;
  restaurantName?: string;
  rating?: number;
  sold?: number;
  reason?: string; // Why this item is recommended
}

/**
 * Get frequently bought items for a user based on their order history
 */
export const getFrequentlyBoughtItems = async (userId: string, limitCount: number = 10): Promise<RecommendedFood[]> => {
  try {
    const ordersRef = collection(db, 'orders');
    // Only query by userId to avoid composite index requirement
    const q = query(
      ordersRef,
      where('userId', '==', userId)
    );
    
    const snapshot = await getDocs(q);
    // Filter by status and sort in memory
    const deliveredOrders = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter((order: any) => order.status === 'delivered')
      .sort((a: any, b: any) => {
        const aTime = a.createdAt?.toDate?.()?.getTime() || 0;
        const bTime = b.createdAt?.toDate?.()?.getTime() || 0;
        return bTime - aTime;
      });
    const foodCount: { [foodId: string]: { count: number; foodData: any } } = {};
    
    deliveredOrders.forEach((orderData: any) => {
      const items = orderData.items || [];
      
      items.forEach((item: any) => {
        if (item.foodId) {
          if (!foodCount[item.foodId]) {
            foodCount[item.foodId] = {
              count: 0,
              foodData: {
                name: item.name,
                imageUrl: item.imageUrl,
                price: item.price,
                restaurantId: item.restaurantId,
                restaurantName: item.restaurantName,
              },
            };
          }
          foodCount[item.foodId].count += item.quantity || 1;
        }
      });
    });
    
    // Sort by count and get top items
    const sortedFoods = Object.entries(foodCount)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, limitCount);
    
    // Get full food details
    const recommendedFoods: RecommendedFood[] = [];
    for (const [foodId, data] of sortedFoods) {
      try {
        const foodDoc = await getDoc(doc(db, 'foods', foodId));
        if (foodDoc.exists()) {
          const foodData = foodDoc.data();
          recommendedFoods.push({
            id: foodId,
            name: foodData.name || data.foodData.name,
            description: foodData.description || '',
            price: foodData.price || data.foodData.price,
            category: foodData.category || '',
            imageUrl: foodData.imageUrl || data.foodData.imageUrl,
            isAvailable: foodData.isAvailable !== false,
            restaurantId: foodData.restaurantId || data.foodData.restaurantId,
            restaurantName: data.foodData.restaurantName,
            rating: foodData.rating,
            sold: foodData.sold,
            reason: `Bạn đã mua ${data.count} lần`,
          });
        }
      } catch (error) {
        console.error(`Error fetching food ${foodId}:`, error);
      }
    }
    
    return recommendedFoods;
  } catch (error) {
    console.error('Error getting frequently bought items:', error);
    return [];
  }
};

/**
 * Get user preferences based on order history
 */
export const getUserPreferences = async (userId: string): Promise<{
  favoriteCategories: string[];
  favoriteRestaurants: string[];
  priceRange: { min: number; max: number };
}> => {
  try {
    const ordersRef = collection(db, 'orders');
    // Only query by userId to avoid composite index requirement
    const q = query(
      ordersRef,
      where('userId', '==', userId)
    );
    
    const snapshot = await getDocs(q);
    // Filter by status and sort in memory, limit to 50 most recent
    const deliveredOrders = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter((order: any) => order.status === 'delivered')
      .sort((a: any, b: any) => {
        const aTime = a.createdAt?.toDate?.()?.getTime() || 0;
        const bTime = b.createdAt?.toDate?.()?.getTime() || 0;
        return bTime - aTime;
      })
      .slice(0, 50);
    const categoryCount: { [category: string]: number } = {};
    const restaurantCount: { [restaurantId: string]: number } = {};
    const prices: number[] = [];
    
    for (const orderData of deliveredOrders) {
      const items = orderData.items || [];
      
      for (const item of items) {
        if (item.foodId) {
          // Get food category
          try {
            const foodDoc = await getDoc(doc(db, 'foods', item.foodId));
            if (foodDoc.exists()) {
              const category = foodDoc.data().category;
              if (category) {
                categoryCount[category] = (categoryCount[category] || 0) + (item.quantity || 1);
              }
            }
          } catch (error) {
            // Ignore errors
          }
        }
        
        if (item.restaurantId) {
          restaurantCount[item.restaurantId] = (restaurantCount[item.restaurantId] || 0) + 1;
        }
        
        if (item.price) {
          prices.push(item.price);
        }
      }
    }
    
    // Get top categories
    const favoriteCategories = Object.entries(categoryCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([category]) => category);
    
    // Get top restaurants
    const favoriteRestaurants = Object.entries(restaurantCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([restaurantId]) => restaurantId);
    
    // Calculate price range
    const priceRange = {
      min: prices.length > 0 ? Math.min(...prices) : 0,
      max: prices.length > 0 ? Math.max(...prices) : 0,
    };
    
    return {
      favoriteCategories,
      favoriteRestaurants,
      priceRange,
    };
  } catch (error) {
    console.error('Error getting user preferences:', error);
    return {
      favoriteCategories: [],
      favoriteRestaurants: [],
      priceRange: { min: 0, max: 0 },
    };
  }
};

/**
 * Get personalized recommendations based on user preferences
 */
export const getPersonalizedRecommendations = async (
  userId: string,
  limitCount: number = 10
): Promise<RecommendedFood[]> => {
  try {
    const preferences = await getUserPreferences(userId);
    const recommendedFoods: RecommendedFood[] = [];
    
    // If user has preferences, recommend based on them
    if (preferences.favoriteCategories.length > 0) {
      const foodsRef = collection(db, 'foods');
      
      // Get foods from favorite categories
      for (const category of preferences.favoriteCategories.slice(0, 3)) {
        // Only query by category to avoid composite index requirement
        const q = query(
          foodsRef,
          where('category', '==', category),
          limit(20) // Get more and filter in memory
        );
        
        const snapshot = await getDocs(q);
        snapshot.forEach((doc) => {
          const foodData = doc.data();
          // Filter by isAvailable in memory
          if (foodData.isAvailable !== false) {
            recommendedFoods.push({
              id: doc.id,
              name: foodData.name,
              description: foodData.description || '',
              price: foodData.price,
              category: foodData.category,
              imageUrl: foodData.imageUrl,
              isAvailable: foodData.isAvailable !== false,
              restaurantId: foodData.restaurantId,
              rating: foodData.rating,
              sold: foodData.sold,
              reason: `Dựa trên sở thích của bạn`,
            });
          }
        });
      }
      
      // Limit to 5 per category
      const categoryGroups: { [category: string]: RecommendedFood[] } = {};
      recommendedFoods.forEach(food => {
        if (!categoryGroups[food.category]) {
          categoryGroups[food.category] = [];
        }
        categoryGroups[food.category].push(food);
      });
      recommendedFoods.length = 0;
      Object.values(categoryGroups).forEach(group => {
        recommendedFoods.push(...group.slice(0, 5));
      });
    }
    
    // If no preferences or not enough recommendations, get popular items
    if (recommendedFoods.length < limitCount) {
      const foodsRef = collection(db, 'foods');
      // Query all foods and filter/sort in memory to avoid composite index
      const q = query(foodsRef, limit(100)); // Get more to have enough after filtering
      
      const snapshot = await getDocs(q);
      const availableFoods: RecommendedFood[] = [];
      
      snapshot.forEach((doc) => {
        const foodData = doc.data();
        // Filter by isAvailable in memory
        if (foodData.isAvailable !== false) {
          availableFoods.push({
            id: doc.id,
            name: foodData.name,
            description: foodData.description || '',
            price: foodData.price,
            category: foodData.category,
            imageUrl: foodData.imageUrl,
            isAvailable: foodData.isAvailable !== false,
            restaurantId: foodData.restaurantId,
            rating: foodData.rating,
            sold: foodData.sold || 0,
            reason: 'Món ăn phổ biến',
          });
        }
      });
      
      // Sort by sold in memory and avoid duplicates
      availableFoods
        .sort((a, b) => (b.sold || 0) - (a.sold || 0))
        .slice(0, limitCount - recommendedFoods.length)
        .forEach(food => {
          if (!recommendedFoods.find(f => f.id === food.id)) {
            recommendedFoods.push(food);
          }
        });
    }
    
    // Remove duplicates and limit
    const uniqueFoods = recommendedFoods
      .filter((food, index, self) => index === self.findIndex(f => f.id === food.id))
      .slice(0, limitCount);
    
    return uniqueFoods;
  } catch (error) {
    console.error('Error getting personalized recommendations:', error);
    return [];
  }
};

/**
 * Get recommendations for a specific user
 */
export const getRecommendationsForUser = async (userId?: string): Promise<{
  frequentlyBought: RecommendedFood[];
  personalized: RecommendedFood[];
}> => {
  try {
    const currentUserId = userId || auth.currentUser?.uid;
    if (!currentUserId) {
      return {
        frequentlyBought: [],
        personalized: [],
      };
    }
    
    const [frequentlyBought, personalized] = await Promise.all([
      getFrequentlyBoughtItems(currentUserId, 6),
      getPersonalizedRecommendations(currentUserId, 6),
    ]);
    
    return {
      frequentlyBought,
      personalized,
    };
  } catch (error) {
    console.error('Error getting recommendations:', error);
    return {
      frequentlyBought: [],
      personalized: [],
    };
  }
};

