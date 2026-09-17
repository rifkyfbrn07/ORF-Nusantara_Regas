'use server';

import { requireAuth } from '@/lib/auth/session';
import { uploadFileToStorage, DriveFileMetadata, UploadFileCategory } from '../services/googleDriveService';

const ALLOWED_CATEGORIES = new Set<string>(['SURAT_CUTI', 'LAPORAN', 'SHIFT_EXCHANGE', 'PROGRAM_KERJA']);

export async function uploadProofFileAction(formData: FormData): Promise<{
  success: boolean;
  file?: DriveFileMetadata;
  error?: string;
}> {
  try {
    const user = await requireAuth();
    const file = formData.get('file') as File | null;

    // folderCategory is the ONLY input from the client untuk folder routing.
    // Target Drive folder ID resolved 100% server-side (see resolveTargetFolderId).
    const category = (formData.get('folderCategory') as string) || 'SURAT_CUTI';
    if (!ALLOWED_CATEGORIES.has(category)) {
      return { success: false, error: 'Kategori bukti tidak valid.' };
    }
    const folderCategory = category as UploadFileCategory;

    const departmentName = (formData.get('departmentName') as string) || user.position || 'Operations';
    const subCategory = (formData.get('subCategory') as string) || user.name || 'Staff';
    const descriptiveName = (formData.get('descriptiveName') as string) || undefined;

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
      descriptiveName,
      year: new Date().getFullYear(),
      uploaderUsername: user.username,
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
