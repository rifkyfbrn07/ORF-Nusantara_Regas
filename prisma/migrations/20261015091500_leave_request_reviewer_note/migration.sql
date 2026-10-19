-- AlterTable
-- Kolom `reviewerNote` lama di-rename menjadi `managerNote` pada migrasi
-- 20261015073421_cuti_lembur_approval_workflow. Workflow approval 3 tahap
-- membutuhkan catatan per tahap, sehingga kolom `reviewerNote` (catatan
-- keputusan tahap Reviewer) ditambahkan kembali sesuai schema.prisma.
ALTER TABLE "LeaveRequest" ADD COLUMN "reviewerNote" TEXT;
