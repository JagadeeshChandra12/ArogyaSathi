import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image
} from '@react-pdf/renderer';

// Create styles for health card PDF
const styles = StyleSheet.create({
  page: {
    padding: 30,
    backgroundColor: '#f8fafc',
    fontFamily: 'Helvetica',
  },
  card: {
    padding: 24,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    border: '1pt solid #e2e8f0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    borderBottom: '1pt solid #f1f5f9',
    paddingBottom: 16,
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  logoSubtext: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
    textAlign: 'right',
  },
  content: {
    flexDirection: 'row',
    gap: 24,
  },
  qrSection: {
    width: 140,
    alignItems: 'center',
  },
  infoSection: {
    flex: 1,
  },
  label: {
    fontSize: 9,
    color: '#64748b',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 12,
    color: '#0f172a',
    fontWeight: 'bold',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  col: {
    flex: 1,
  },
  footer: {
    marginTop: 24,
    paddingTop: 16,
    borderTop: '1pt solid #f1f5f9',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 8,
    color: '#94a3b8',
  },
  emergencyBadge: {
    backgroundColor: '#fee2e2',
    padding: '4 8',
    borderRadius: 4,
    marginTop: 8,
  },
  emergencyText: {
    fontSize: 9,
    color: '#dc2626',
    fontWeight: 'bold',
  }
});

interface HealthCardPDFProps {
  user: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    bloodGroup?: string;
    gender?: string;
    id: string;
  };
  qrCodeUrl: string;
}

export const HealthCardPDF: React.FC<HealthCardPDFProps> = ({ user, qrCodeUrl }) => {
  const fullName = `${user.firstName} ${user.lastName}`.trim();
  
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoSection}>
              <View>
                <Text style={styles.logoText}>Arogya Sathi</Text>
                <Text style={styles.logoSubtext}>Digital Health Identity</Text>
              </View>
            </View>
            <View>
              <Text style={styles.title}>PATIENT IDENTITY CARD</Text>
              <Text style={[styles.logoSubtext, { textAlign: 'right' }]}>ID: {user.id.substring(0, 8).toUpperCase()}</Text>
            </View>
          </View>

          {/* Main Content */}
          <View style={styles.content}>
            {/* QR Code */}
            <View style={styles.qrSection}>
              <Text style={[styles.label, { marginBottom: 8 }]}>Scan for Medical History</Text>
              {qrCodeUrl && (
                <Image 
                  src={qrCodeUrl} 
                  style={{ width: 120, height: 120 }} 
                />
              )}
              <View style={styles.emergencyBadge}>
                <Text style={styles.emergencyText}>EMERGENCY ACCESS</Text>
              </View>
            </View>

            {/* Patient Info */}
            <View style={styles.infoSection}>
              <View>
                <Text style={styles.label}>Patient Name</Text>
                <Text style={styles.value}>{fullName}</Text>
              </View>

              <View style={styles.row}>
                <View style={styles.col}>
                  <Text style={styles.label}>Blood Group</Text>
                  <Text style={styles.value}>{user.bloodGroup || 'Not Specified'}</Text>
                </View>
                <View style={styles.col}>
                  <Text style={styles.label}>Gender</Text>
                  <Text style={styles.value}>{user.gender || 'Not Specified'}</Text>
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.col}>
                  <Text style={styles.label}>Phone Number</Text>
                  <Text style={styles.value}>{user.phone || 'Not Provided'}</Text>
                </View>
              </View>

              <View>
                <Text style={styles.label}>Registry Email</Text>
                <Text style={styles.value}>{user.email}</Text>
              </View>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Generated on {new Date().toLocaleDateString()} • Powered by Arogya Sathi AI
            </Text>
            <Text style={styles.footerText}>
              www.arogyasathi.in
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};
