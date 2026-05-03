import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { Download, Share2, Shield, QrCode, User, Phone, Droplet, ExternalLink, Printer } from 'lucide-react';
import { HealthCardPDF } from './HealthCardPDF';
import { motion } from 'framer-motion';
import { generateQrToken } from '../services/healthPassportApi';

interface HealthIDCardProps {
  user: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    bloodGroup?: string;
    gender?: string;
    age?: number;
    emergencyContact?: {
      name?: string;
      phone?: string;
      relation?: string;
    };
    id: string;
    profilePhoto?: string;
  };
}

const HealthIDCard: React.FC<HealthIDCardProps> = ({ user }) => {
  const [localIp, setLocalIp] = useState<string>('');
  const [scanUrl, setScanUrl] = useState<string>('');
  const [patientIdShort, setPatientIdShort] = useState<string>(user.id.substring(0, 8).toUpperCase());

  useEffect(() => {
    fetch('/api/local-ip')
      .then(res => res.json())
      .then(data => {
        if (data.ip && data.ip !== 'localhost') {
          setLocalIp(data.ip);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let mounted = true;
    const baseUrl = localIp ? `http://${localIp}:${window.location.port || 5173}` : window.location.origin;
    generateQrToken({
      patientId: user.id,
      profile: {
        firstName: user.firstName,
        lastName: user.lastName,
        bloodGroup: user.bloodGroup,
        phone: user.phone
      }
    })
      .then((payload) => {
        if (!mounted) return;
        setPatientIdShort(payload.patient_id || patientIdShort);
        setScanUrl(payload.health_passport_url || `${baseUrl}/health-passport/${user.id}`);
      })
      .catch(() => {
        if (!mounted) return;
        setScanUrl(`${baseUrl}/health-passport/${user.id}`);
      });
    return () => {
      mounted = false;
    };
  }, [localIp, user.id, user.firstName, user.lastName, user.bloodGroup, user.phone]);

  const fullName = `${user.firstName} ${user.lastName}`.trim();
  const resolvedScanUrl = scanUrl || `${window.location.origin}/health-passport/${user.id}`;
  const printGeneratedAt = new Date().toLocaleString();

  const handlePrintCard = () => {
    const popup = window.open('', '_blank', 'noopener,noreferrer,width=900,height=1200');
    if (!popup) {
      window.print();
      return;
    }

    const printableHtml = `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Arogya Saathi - Health Card</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
          .header { border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 16px; }
          .title { font-size: 22px; font-weight: 700; color: #1d4ed8; margin: 0; }
          .subtitle { margin: 4px 0 0; color: #4b5563; font-size: 13px; }
          .section { margin-bottom: 18px; page-break-inside: avoid; }
          .section h2 { font-size: 15px; margin: 0 0 8px; color: #1f2937; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
          .cell { padding: 10px; border-right: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
          .cell:nth-child(2n) { border-right: none; }
          .label { font-weight: 700; color: #374151; display: inline-block; min-width: 130px; }
          .link { word-break: break-all; }
          .footer { margin-top: 20px; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 10px; }
          @media print { @page { margin: 12mm; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">Arogya Saathi - Digital Health Card</h1>
          <p class="subtitle">Printable patient profile and emergency medical details</p>
        </div>

        <div class="section">
          <h2>Identity</h2>
          <div class="grid">
            <div class="cell"><span class="label">Full Name:</span> ${fullName || 'N/A'}</div>
            <div class="cell"><span class="label">Patient ID:</span> ${patientIdShort}</div>
            <div class="cell"><span class="label">Email:</span> ${user.email || 'N/A'}</div>
            <div class="cell"><span class="label">Phone:</span> ${user.phone || 'N/A'}</div>
            <div class="cell"><span class="label">Gender:</span> ${user.gender || 'N/A'}</div>
            <div class="cell"><span class="label">Age:</span> ${user.age ?? 'N/A'}</div>
          </div>
        </div>

        <div class="section">
          <h2>Medical Essentials</h2>
          <div class="grid">
            <div class="cell"><span class="label">Blood Group:</span> ${user.bloodGroup || 'N/A'}</div>
            <div class="cell"><span class="label">Security Status:</span> Active</div>
          </div>
        </div>

        <div class="section">
          <h2>Emergency Contact</h2>
          <div class="grid">
            <div class="cell"><span class="label">Name:</span> ${user.emergencyContact?.name || 'N/A'}</div>
            <div class="cell"><span class="label">Phone:</span> ${user.emergencyContact?.phone || user.phone || 'N/A'}</div>
            <div class="cell"><span class="label">Relation:</span> ${user.emergencyContact?.relation || 'N/A'}</div>
            <div class="cell"><span class="label">Health Passport Link:</span> <span class="link">${resolvedScanUrl}</span></div>
          </div>
        </div>

        <div class="footer">
          Generated At: ${printGeneratedAt}<br/>
          Generated By: Arogya Saathi Health Identity System
        </div>
      </body>
      </html>
    `;

    popup.document.open();
    popup.document.write(printableHtml);
    popup.document.close();
    popup.focus();
    popup.print();
  };

  return (
    <div className="space-y-6">
      {/* Visual Identity Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="health-card-print-target relative overflow-hidden rounded-3xl bg-white shadow-2xl border border-gray-100"
      >
        {/* Card Header / Banner */}
        <div className="h-24 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 relative">
          <div className="absolute top-4 right-6 flex items-center gap-2 text-white/90">
            <Shield className="h-4 w-4" />
            <span className="text-xs font-bold tracking-widest uppercase">Verified Identity</span>
          </div>
        </div>

        <div className="px-8 pb-8 -mt-12 relative z-10">
          <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
            {/* Profile & QR Section */}
            <div className="flex flex-col items-center">
              <div className="relative group">
                <div className="w-32 h-32 bg-white rounded-2xl shadow-xl p-2 border-4 border-white overflow-hidden transform group-hover:rotate-1 transition-transform">
                  {user.profilePhoto ? (
                    <img 
                      src={user.profilePhoto} 
                      alt={fullName} 
                      className="w-full h-full object-cover rounded-xl"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl flex items-center justify-center">
                      <User className="h-12 w-12 text-blue-400" />
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-gray-50 rounded-2xl border border-gray-100 shadow-inner group cursor-pointer hover:bg-white transition-colors duration-300">
                <QRCodeSVG
                  value={resolvedScanUrl}
                  size={120}
                  level="H"
                  includeMargin={false}
                  className="rounded-lg"
                />
                <p className="text-[10px] text-center mt-2 font-bold text-gray-400 uppercase tracking-tighter">
                  ID: {patientIdShort}
                </p>
              </div>
            </div>

            {/* Information Section */}
            <div className="flex-1 space-y-6">
              <div>
                <h3 className="text-3xl font-black text-gray-900 group-hover:text-blue-600 transition-colors">
                  {fullName}
                </h3>
                <div className="flex items-center gap-2 mt-1 text-gray-500">
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wide">
                    Patient Registry
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="text-sm font-medium">{user.email}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <Droplet className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Blood Group</span>
                  </div>
                  <p className="text-lg font-bold text-red-600">{user.bloodGroup || '--'}</p>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <Phone className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Contact</span>
                  </div>
                  <p className="text-sm font-bold text-gray-800">{user.phone || 'Not set'}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <Shield className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Security Status</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <p className="text-sm font-bold text-green-600">Active</p>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-100 flex flex-wrap gap-4">
                <PDFDownloadLink
                  document={<HealthCardPDF user={user} qrCodeUrl={resolvedScanUrl} />}
                  fileName={`ArogyaSathi_ID_${user.lastName}.pdf`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-md hover:shadow-blue-200"
                >
                  {({ loading }) => (
                    <>
                      <Download className="h-4 w-4" />
                      {loading ? 'Preparing...' : 'Download Card'}
                    </>
                  )}
                </PDFDownloadLink>

                <button 
                  onClick={handlePrintCard}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all shadow-sm"
                >
                  <Printer className="h-4 w-4" />
                  Print Card
                </button>

                <button
                  onClick={() => navigator.clipboard.writeText(resolvedScanUrl)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-black transition-all shadow-md"
                >
                  <Share2 className="h-4 w-4" />
                  Share Securely
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Print-only details block to ensure exported PDF has full patient information */}
        <div className="hidden print:block mt-6 px-8 pb-8">
          <h4 className="text-lg font-bold text-gray-900 mb-3">Patient Details</h4>
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="grid grid-cols-2">
              <div className="p-3 border-b border-r border-gray-200 text-sm">
                <span className="font-semibold text-gray-700">Full Name:</span> {fullName || 'N/A'}
              </div>
              <div className="p-3 border-b border-gray-200 text-sm">
                <span className="font-semibold text-gray-700">Patient ID:</span> {patientIdShort}
              </div>
              <div className="p-3 border-b border-r border-gray-200 text-sm">
                <span className="font-semibold text-gray-700">Email:</span> {user.email || 'N/A'}
              </div>
              <div className="p-3 border-b border-gray-200 text-sm">
                <span className="font-semibold text-gray-700">Phone:</span> {user.phone || 'N/A'}
              </div>
              <div className="p-3 border-b border-r border-gray-200 text-sm">
                <span className="font-semibold text-gray-700">Blood Group:</span> {user.bloodGroup || 'N/A'}
              </div>
              <div className="p-3 border-b border-gray-200 text-sm">
                <span className="font-semibold text-gray-700">Gender:</span> {user.gender || 'N/A'}
              </div>
              <div className="p-3 border-r border-gray-200 text-xs break-all">
                <span className="font-semibold text-gray-700">Secure Health Passport Link:</span> {resolvedScanUrl}
              </div>
              <div className="p-3 text-sm">
                <span className="font-semibold text-gray-700">Generated At:</span> {printGeneratedAt}
              </div>
            </div>
          </div>
        </div>
        
        {/* Abstract design elements */}
        <div className="absolute bottom-0 right-0 p-8 opacity-[0.03] pointer-events-none">
          <QrCode className="w-48 h-48" />
        </div>
      </motion.div>

      {/* Instruction Card */}
      <div className="bg-blue-50/50 rounded-2xl p-6 border border-blue-100">
        <h4 className="flex items-center gap-2 font-bold text-blue-900 mb-2 text-sm uppercase tracking-wider">
          <Shield className="h-4 w-4" />
          How it works
        </h4>
        <p className="text-sm text-blue-700 leading-relaxed">
          Your Digital Health ID uses a secure QR token system. When scanned by an authorized healthcare provider at any Arogya Sathi partner hospital, it provides instant, role-based access to your vital health statistics, allergies, and recent reports, ensuring faster registration and safer treatment in emergencies.
        </p>
        <div className="mt-4 flex items-center gap-4">
          <a href="#" className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:underline">
            Manage Access Permissions <ExternalLink className="h-3 w-3" />
          </a>
          <a href="#" className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:underline">
            Security Audit Log <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
};

export default HealthIDCard;
