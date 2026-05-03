// Simple user storage service for manual credential management
// This stores user data in localStorage for demonstration purposes

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  /** Empty when using Firebase Auth (password is not stored client-side). */
  password?: string;
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
  private readonly FILES_KEY = 'arogya_sathi_hospital_files';

  // Get patient files
  getPatientFiles(): any[] {
    const filesJson = localStorage.getItem(this.FILES_KEY);
    const files = filesJson ? JSON.parse(filesJson) : [];
    // Auto-seed some mock reports if completely empty
    if (files.length === 0) {
      const realS3Url = 'https://sathistore-surya-123.s3.ap-south-1.amazonaws.com/1774753629_patient-medical-record-template_x.png';
      const mockFiles = [
        {
          id: 'FILE_MOCK_1',
          staffUid: 'DEMO_STAFF_NABI',
          hospitalName: 'Apollo Hospitals',
          department: 'Cardiology',
          patientName: 'Rayan Siddiqui',
          patientEmail: 'rayan@example.com',
          patientPhone: '9876543210',
          notes: 'Routine ECG scan results - Normal rhythm detected.',
          fileName: 'ECG_Report_Rayan.png',
          fileUrl: realS3Url,
          createdAt: new Date(Date.now() - 86400000 * 5).toISOString()
        },
        {
          id: 'FILE_MOCK_2',
          staffUid: 'DEMO_STAFF_NABI',
          hospitalName: 'Apollo Hospitals',
          department: 'General',
          patientName: 'Priya Sharma',
          patientEmail: 'priya@example.com',
          patientPhone: '9456123780',
          notes: 'Blood test report indicating normal vitals.',
          fileName: 'Blood_Panel_Priya.png',
          fileUrl: realS3Url,
          createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
        },
        {
          id: 'FILE_MOCK_3',
          staffUid: 'DEMO_STAFF_NABI',
          hospitalName: 'Apollo Hospitals',
          department: 'Endocrinology',
          patientName: 'Nabi Saheb',
          patientEmail: 'nabi_patient@example.com',
          patientPhone: '9123456789',
          notes: 'Thyroid profile check - Normal ranges.',
          fileName: 'Thyroid_Scan_Nabi.png',
          fileUrl: realS3Url,
          createdAt: new Date().toISOString()
        }
      ];
      localStorage.setItem(this.FILES_KEY, JSON.stringify(mockFiles));
      return mockFiles;
    }
    return files;
  }

  savePatientFile(file: any): { success: boolean; message: string; file: any } {
     const files = this.getPatientFiles();
     const publicIp = '15.207.85.148';
     const fileUrl = file.fileUrl && file.fileUrl !== '#' ? file.fileUrl : `http://${publicIp}:5173/mock-file/new/${file.fileName || 'report.pdf'}`;
     const newFile = { ...file, fileUrl, id: this.generateId(), createdAt: new Date().toISOString() };
     files.push(newFile);
     localStorage.setItem(this.FILES_KEY, JSON.stringify(files));
     return { success: true, message: 'File saved offline.', file: newFile };
  }

  deletePatientFile(fileId: string): { success: boolean; message: string } {
    let files = this.getPatientFiles();
    files = files.filter(f => f.id !== fileId);
    localStorage.setItem(this.FILES_KEY, JSON.stringify(files));
    return { success: true, message: 'File deleted.' };
  }

  private getUsers(): User[] {
    const usersJson = localStorage.getItem(this.USERS_KEY);
    const users = usersJson ? JSON.parse(usersJson) : [];
    
    // Always inject our mock users if they don't exist yet!
    const hasMock = users.find((u: User) => u.id === 'USER_MOCK_1');
    if (!hasMock) {
       const mockUsers: User[] = [
         {
            id: 'PAT-8829-X',
            firstName: 'Rayan',
            lastName: 'Siddiqui',
            email: 'rayan@example.com',
            phone: '9876543210',
            password: 'password123',
            dateOfBirth: '1995-05-15',
            gender: 'Male',
            bloodGroup: 'O+',
            createdAt: new Date().toISOString()
         },
         {
            id: 'PAT-1102-Y',
            firstName: 'Nabi',
            lastName: 'Saheb',
            email: 'nabi_patient@example.com',
            phone: '9123456789',
            password: 'password123',
            dateOfBirth: '1988-12-20',
            gender: 'Male',
            bloodGroup: 'B+',
            createdAt: new Date().toISOString()
         },
         {
            id: 'PAT-4432-Z',
            firstName: 'Priya',
            lastName: 'Sharma',
            email: 'priya@example.com',
            phone: '9456123780',
            password: 'password123',
            dateOfBirth: '1992-08-10',
            gender: 'Female',
            bloodGroup: 'A+',
            createdAt: new Date().toISOString()
         },
         {
            id: 'USER_MOCK_1',
            firstName: 'Rahul',
            lastName: 'Verma',
            email: 'rahul@example.com',
            phone: '9812456730',
            password: 'password123',
            dateOfBirth: '1990-01-01',
            gender: 'Male',
            bloodGroup: 'O-',
            createdAt: new Date().toISOString()
         },
         {
            id: 'USER_MOCK_2',
            firstName: 'Ananya',
            lastName: 'Iyer',
            email: 'ananya@example.com',
            phone: '9567123849',
            password: 'password123',
            dateOfBirth: '1995-03-25',
            gender: 'Female',
            bloodGroup: 'AB+',
            createdAt: new Date().toISOString()
         }
       ];
       const combined = [...users, ...mockUsers];
       localStorage.setItem(this.USERS_KEY, JSON.stringify(combined));
       return combined;
    }
    return users;
  }

  // Save users to localStorage
  private saveUsers(users: User[]): void {
    localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
  }

  // Get health data from localStorage
  private getHealthData(): HealthData[] {
    const healthDataJson = localStorage.getItem(this.HEALTH_DATA_KEY);
    let healthData = healthDataJson ? JSON.parse(healthDataJson) : [];
    
    // Auto-seed missing mock users natively so the leaderboard is always populated full!
    const uList = this.getUsers();
    let madeChanges = false;
    for (const u of uList) {
       if (u.id.startsWith('USER_MOCK_') && !healthData.find((h: HealthData) => h.userId === u.id)) {
           healthData = [...healthData, ...this.generateMockHistory(u.id)];
           madeChanges = true;
       }
    }
    
    if (madeChanges) {
       localStorage.setItem(this.HEALTH_DATA_KEY, JSON.stringify(healthData));
    }

    return healthData;
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
      if ((user.password ?? '') !== password) {
        return {
          success: false,
          message: 'Incorrect password'
        };
      }

      // Store current user
      localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(user));
      
      // Clear staff caches to prevent clashing
      localStorage.removeItem('last_known_staff');

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

  // Force sign in user (bypass password)
  forceSignInUser(email: string): { success: boolean; message: string; user?: User } {
    try {
      const users = this.getUsers();
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!user) return { success: false, message: 'User not found.' };
      
      localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(user));
      localStorage.removeItem('last_known_staff');
      return { success: true, message: 'Forced sign in.', user };
    } catch { return { success: false, message: 'Error' }; }
  }

  // Force sign in staff
  forceSignInStaff(email: string): { success: boolean; message: string; staff?: any } {
     if (email === 'nabi@gmail.com') {
        const staff = {
           id: 'DEMO_STAFF_NABI',
           email: 'nabi@gmail.com',
           fullName: 'Dr. Nabi Saheb Shaik',
           hospitalName: 'Apollo Hospitals',
           department: 'General',
           specialization: 'Senior Doctor',
           createdAt: new Date().toISOString()
        };
        localStorage.setItem('last_known_staff', JSON.stringify(staff));
        localStorage.removeItem(this.CURRENT_USER_KEY);
        localStorage.removeItem('last_known_patient');
        return { success: true, message: 'Forced sign in.', staff };
     }

     const staffs = this.getStaffs();
     const existing = staffs.find(s => s.email.toLowerCase() === email.toLowerCase());
     if (!existing) return { success: false, message: 'Staff not found.' };
     
     const staffClone = { ...existing };
     delete staffClone.password;
     localStorage.setItem('last_known_staff', JSON.stringify(staffClone));
     localStorage.removeItem(this.CURRENT_USER_KEY);
     localStorage.removeItem('last_known_patient');
     return { success: true, message: 'Forced sign in.', staff: staffClone };
  }

  private readonly STAFF_KEY = 'arogya_sathi_hospital_staff';

  private getStaffs(): any[] {
    const sJson = localStorage.getItem(this.STAFF_KEY);
    return sJson ? JSON.parse(sJson) : [];
  }

  private saveStaffs(staffs: any[]): void {
    localStorage.setItem(this.STAFF_KEY, JSON.stringify(staffs));
  }

  // Register a new hospital staff locally
  registerStaff(staffData: any, password?: string): { success: boolean; message: string; staff?: any } {
    try {
      const staffs = this.getStaffs();
      const existing = staffs.find(s => s.email.toLowerCase() === staffData.email.toLowerCase());
      if (existing) {
        return { success: false, message: 'An account with this email already exists' };
      }
      
      const newStaff = {
        ...staffData,
        id: this.generateId(),
        password: password || '',
        createdAt: new Date().toISOString()
      };
      
      staffs.push(newStaff);
      this.saveStaffs(staffs);

      const staffClone = { ...newStaff };
      delete staffClone.password;
      return { success: true, message: 'Hospital staff created locally!', staff: staffClone };
    } catch {
      return { success: false, message: 'Failed to create staff account.' };
    }
  }

  // Sign in staff (Mock for testing)
  signInStaff(email: string, password: string): { success: boolean; message: string; staff?: any } {
     if (email === 'nabi@gmail.com' && password === '123456') {
        const staff = {
           id: 'DEMO_STAFF_NABI',
           email: 'nabi@gmail.com',
           fullName: 'Dr. Nabi Saheb Shaik',
           hospitalName: 'Apollo Hospitals',
           department: 'General',
           specialization: 'Senior Doctor',
           createdAt: new Date().toISOString()
        };
        localStorage.setItem('last_known_staff', JSON.stringify(staff));
        // Clear patient caches
        localStorage.removeItem(this.CURRENT_USER_KEY);
        localStorage.removeItem('last_known_patient');
        return { success: true, message: 'Signed in successfully.', staff };
     }

     const staffs = this.getStaffs();
     const existing = staffs.find(s => s.email.toLowerCase() === email.toLowerCase());
     if (!existing) {
       return { success: false, message: 'No registered hospital account found offline. Please sign up.' };
     }
     if (existing.password !== password) {
       return { success: false, message: 'Incorrect offline password.' };
     }
     
     const staffClone = { ...existing };
     delete staffClone.password;
     localStorage.setItem('last_known_staff', JSON.stringify(staffClone));
     
     // Clear patient caches to prevent clashing
     localStorage.removeItem(this.CURRENT_USER_KEY);
     localStorage.removeItem('last_known_patient');

     return { success: true, message: 'Signed in successfully offline.', staff: staffClone };
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

      let allHealthData = this.getHealthData();
      let userHealthData = allHealthData.filter(data => data.userId === currentUser.id);
      
      // Auto-simulate health data if strictly empty
      if (userHealthData.length === 0) {
         userHealthData = this.generateMockHistory(currentUser.id);
         allHealthData = [...allHealthData, ...userHealthData];
         this.saveHealthData(allHealthData);
      }
      
      return userHealthData;
    } catch (error) {
      console.error('Error getting user health data:', error);
      return [];
    }
  }

  // Get user's health score by ID (for scanning)
  getUserHealthHistory(userId: string): HealthData[] {
    try {
      let allHealthData = this.getHealthData();
      let userHealthData = allHealthData.filter(data => data.userId === userId);

      // Auto-simulate health data if strictly empty
      if (userHealthData.length === 0) {
         userHealthData = this.generateMockHistory(userId);
         allHealthData = [...allHealthData, ...userHealthData];
         this.saveHealthData(allHealthData);
      }

      return userHealthData;
    } catch (error) {
      console.error('Error getting user health history:', error);
      return [];
    }
  }

  private generateMockHistory(userId: string): HealthData[] {
     const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
     return months.map((month, idx) => ({
        id: this.generateId() + idx,
        userId: userId,
        month,
        date: `2026-0${idx + 1}-15`,
        doctorVisits: Math.floor(Math.random() * 3),
        diseases: Math.floor(Math.random() * 2),
        symptoms: Math.floor(Math.random() * 4),
        healthScore: 70 + Math.floor(Math.random() * 28),
        medications: Math.floor(Math.random() * 3),
        stressLevel: 3 + Math.floor(Math.random() * 5),
        sleepHours: 5 + Math.floor(Math.random() * 4),
        exerciseMinutes: 20 + Math.floor(Math.random() * 60),
        waterIntake: 4 + Math.floor(Math.random() * 6),
        bloodPressure: '120/80',
        heartRate: 65 + Math.floor(Math.random() * 20),
        bloodSugar: 90 + Math.floor(Math.random() * 15),
        weight: 70 + Math.floor(Math.random() * 4),
        notes: 'Simulated baseline metrics.',
        createdAt: new Date(2026, idx, 15).toISOString()
     }));
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

  // Find user by ID
  getUserById(id: string): User | undefined {
    return this.getUsers().find(u => u.id === id);
  }

  // Get reports for a patient by ID or email
  getFilesForPatient(patientIdOrEmail: string): any[] {
    const files = this.getPatientFiles();
    const user = this.getUserById(patientIdOrEmail);
    const email = user ? user.email : patientIdOrEmail;
    
    return files.filter(f => 
      f.patientEmail.toLowerCase() === email.toLowerCase() || 
      f.id === patientIdOrEmail
    );
  }
}

export const userStorageService = new UserStorageService(); 