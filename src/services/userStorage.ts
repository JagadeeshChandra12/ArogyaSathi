// Simple user storage service for manual credential management
// This stores user data in localStorage for demonstration purposes

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string; // In a real app, this would be hashed
  dateOfBirth: string;
  gender: string;
  bloodGroup: string;
  createdAt: string;
}

export interface HealthData {
  id: string;
  userId: string;
  month: string;
  date: string;
  doctorVisits: number;
  diseases: number;
  symptoms: number;
  healthScore: number;
  medications: number;
  stressLevel: number;
  sleepHours: number;
  exerciseMinutes: number;
  waterIntake: number;
  bloodPressure: string;
  heartRate: number;
  bloodSugar: number;
  weight: number;
  notes: string;
  createdAt: string;
}

class UserStorageService {
  private readonly USERS_KEY = 'arogya_sathi_users';
  private readonly CURRENT_USER_KEY = 'arogya_sathi_current_user';
  private readonly HEALTH_DATA_KEY = 'arogya_sathi_health_data';

  // Get all users from localStorage
  private getUsers(): User[] {
    const usersJson = localStorage.getItem(this.USERS_KEY);
    return usersJson ? JSON.parse(usersJson) : [];
  }

  // Save users to localStorage
  private saveUsers(users: User[]): void {
    localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
  }

  // Get health data from localStorage
  private getHealthData(): HealthData[] {
    const healthDataJson = localStorage.getItem(this.HEALTH_DATA_KEY);
    return healthDataJson ? JSON.parse(healthDataJson) : [];
  }

  // Save health data to localStorage
  private saveHealthData(healthData: HealthData[]): void {
    localStorage.setItem(this.HEALTH_DATA_KEY, JSON.stringify(healthData));
  }

  // Register a new user
  registerUser(userData: Omit<User, 'id' | 'createdAt'>): { success: boolean; message: string; user?: User } {
    try {
      const users = this.getUsers();
      
      // Check if email already exists
      const existingUser = users.find(user => user.email.toLowerCase() === userData.email.toLowerCase());
      if (existingUser) {
        return {
          success: false,
          message: 'An account with this email already exists'
        };
      }

      // Create new user
      const newUser: User = {
        ...userData,
        id: this.generateId(),
        createdAt: new Date().toISOString()
      };

      // Add to users array
      users.push(newUser);
      this.saveUsers(users);

      return {
        success: true,
        message: 'Account created successfully!',
        user: newUser
      };
    } catch (error) {
      console.error('Error registering user:', error);
      return {
        success: false,
        message: 'Failed to create account. Please try again.'
      };
    }
  }

  // Sign in user
  signInUser(email: string, password: string): { success: boolean; message: string; user?: User } {
    try {
      const users = this.getUsers();
      
      // Find user by email
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      
      if (!user) {
        return {
          success: false,
          message: 'No account found with this email address'
        };
      }

      // Check password
      if (user.password !== password) {
        return {
          success: false,
          message: 'Incorrect password'
        };
      }

      // Store current user
      localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(user));

      return {
        success: true,
        message: 'Signed in successfully!',
        user: user
      };
    } catch (error) {
      console.error('Error signing in user:', error);
      return {
        success: false,
        message: 'Failed to sign in. Please try again.'
      };
    }
  }

  // Get current user
  getCurrentUser(): User | null {
    try {
      const userJson = localStorage.getItem(this.CURRENT_USER_KEY);
      return userJson ? JSON.parse(userJson) : null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  // Sign out user
  signOutUser(): void {
    localStorage.removeItem(this.CURRENT_USER_KEY);
  }

  // Update user profile
  updateUserProfile(userId: string, updates: Partial<User>): { success: boolean; message: string } {
    try {
      const users = this.getUsers();
      const userIndex = users.findIndex(user => user.id === userId);
      
      if (userIndex === -1) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      // Update user
      users[userIndex] = { ...users[userIndex], ...updates };
      this.saveUsers(users);

      // Update current user if it's the same user
      const currentUser = this.getCurrentUser();
      if (currentUser && currentUser.id === userId) {
        localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(users[userIndex]));
      }

      return {
        success: true,
        message: 'Profile updated successfully!'
      };
    } catch (error) {
      console.error('Error updating user profile:', error);
      return {
        success: false,
        message: 'Failed to update profile. Please try again.'
      };
    }
  }

  // Add health data
  addHealthData(healthData: Omit<HealthData, 'id' | 'userId' | 'createdAt'>): { success: boolean; message: string; data?: HealthData } {
    try {
      const currentUser = this.getCurrentUser();
      if (!currentUser) {
        return {
          success: false,
          message: 'User not signed in'
        };
      }

      const allHealthData = this.getHealthData();
      const newHealthData: HealthData = {
        ...healthData,
        id: this.generateId(),
        userId: currentUser.id,
        createdAt: new Date().toISOString()
      };

      allHealthData.push(newHealthData);
      this.saveHealthData(allHealthData);

      return {
        success: true,
        message: 'Health data added successfully!',
        data: newHealthData
      };
    } catch (error) {
      console.error('Error adding health data:', error);
      return {
        success: false,
        message: 'Failed to add health data. Please try again.'
      };
    }
  }

  // Get user's health data
  getUserHealthData(): HealthData[] {
    try {
      const currentUser = this.getCurrentUser();
      if (!currentUser) return [];

      const allHealthData = this.getHealthData();
      return allHealthData.filter(data => data.userId === currentUser.id);
    } catch (error) {
      console.error('Error getting user health data:', error);
      return [];
    }
  }

  // Get user's latest health score
  getUserHealthScore(): number {
    try {
      const userHealthData = this.getUserHealthData();
      if (userHealthData.length === 0) return 0;
      
      // Return the latest health score
      const latestData = userHealthData[userHealthData.length - 1];
      return latestData.healthScore;
    } catch (error) {
      console.error('Error getting user health score:', error);
      return 0;
    }
  }

  // Get all health data (for leaderboard purposes)
  getAllHealthData(): HealthData[] {
    return this.getHealthData();
  }

  // Check if user is signed in
  isSignedIn(): boolean {
    return this.getCurrentUser() !== null;
  }

  // Generate unique ID
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Get all users (for admin purposes)
  getAllUsers(): User[] {
    return this.getUsers();
  }

  // Clear all data (for testing)
  clearAllData(): void {
    localStorage.removeItem(this.USERS_KEY);
    localStorage.removeItem(this.CURRENT_USER_KEY);
    localStorage.removeItem(this.HEALTH_DATA_KEY);
  }
}

export const userStorageService = new UserStorageService(); 