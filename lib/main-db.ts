// lib/db.ts
import Dexie, { Table } from 'dexie';
import { Patient, Session, PatientCase, DentalChart, Clinic } from '@/types';
import { XrayImageMetadata } from './db';

// ✅ 1. تعريف نوع بيانات سجل القالب
export interface TemplateRecord {
  id: string;
  clinicId: string;
  templateData: any; // يمكن استبدال 'any' بـ Interface محدد للقوالب إذا توفر
}

// ✅ 2. تعريف نوع بيانات سجل الوسائط (الصور والأشعة)
// نستخدم Blob لتخزين الملفات بكفاءة عالية بدلاً من Base64
export interface MediaRecord {
  id: string;             // معرف فريد (مثل: logo_clinicId أو xray_fileName)
  type: 'logo' | 'pfp' | 'xray';
  clinicId?: string;      // لعزل بيانات العيادات
  patientId?: string;     // لربط الأشعة بالمريض
  file: Blob;             // الملف الأصلي (Binary)
  mimeType: string;       // نوع الملف (image/jpeg, etc.)
  createdAt: Date;
}

export class ClinicDatabase extends Dexie {
  patients!: Table<Patient, string>;
  sessions!: Table<Session, string>;
  cases!: Table<PatientCase, string>;
  charts!: Table<DentalChart, string>;
  clinics!: Table<Clinic, string>;
  images!: Table<XrayImageMetadata, string>;
  
  // ✅ الجداول الجديدة
  templates!: Table<TemplateRecord, string>;
  media!: Table<MediaRecord, string>; 

  constructor() {
    super('ClinicDB');
    
    // تعريف الجداول والفهارس (Indexes)
    // [&field] تعني أن الحقل فريد (Unique)
    this.version(1).stores({
      patients: 'id, clinicId, fullName, phone, createdAt', 
      sessions: 'id, clinicId, patientId, caseId, startTime, status',
      cases: 'id, clinicId, patientId, status, startDate',
      charts: 'id, clinicId, patientId, lastUpdated',
      clinics: 'id, name',
       templates: 'id, clinicId',
      media: 'id, type, clinicId, patientId' ,
            images: 'id, patientId, img_tele_id, created_at' 

    });
  }
}

export const db = new ClinicDatabase();