'use server';

import { requireAuth } from '@/lib/auth/session';
import { uploadFileToStorage, DriveFileMetadata } from '../services/googleDriveService';

export async function uploadProofFileAction(formData: FormData): Promise<{
  success: boolean;
  file?: DriveFileMetadata;
  error?: string;
}> {
  try {
    const user = await requireAuth();
    const file = formData.get('file') as File | null;
    const category = (formData.get('folderCategory') as string) || 'SURAT_CUTI';
    const allowedCategories = ['SURAT_CUTI', 'LAPORAN', 'SHIFT_EXCHANGE', 'PROGRAM_KERJA'];
    const folderCategory: 'SURAT_CUTI' | 'LAPORAN' | 'SHIFT_EXCHANGE' | 'PROGRAM_KERJA' = allowedCategories.includes(category)
      ? (category as 'SURAT_CUTI' | 'LAPORAN' | 'SHIFT_EXCHANGE' | 'PROGRAM_KERJA')
      : 'SURAT_CUTI';
    const departmentName = (formData.get('departmentName') as string) || user.position || 'Operations';
    const subCategory = (formData.get('subCategory') as string) || user.name || 'Staff';

    if (!file) {
      return { success: false, error: 'Berkas tidak ditemukan dalam formulir unggahan.' };
    }

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    const result = await uploadFileToStorage({
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      fileBuffer,
      folderCategory,
      departmentName,
      subCategory,
      year: new Date().getFullYear(),
    });

    return {
      success: true,
      file: result,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Gagal mengunggah berkas bukti.',
    };
  }
}
