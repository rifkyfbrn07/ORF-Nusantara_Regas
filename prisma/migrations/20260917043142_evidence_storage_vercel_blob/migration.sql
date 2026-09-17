-- AlterTable
ALTER TABLE "LeaveRequest" ADD COLUMN     "storagePath" TEXT,
ADD COLUMN     "storageProvider" TEXT;

-- AlterTable
ALTER TABLE "OperationalReport" ADD COLUMN     "storagePath" TEXT,
ADD COLUMN     "storageProvider" TEXT;

-- AlterTable
ALTER TABLE "ProgramKerja" ADD COLUMN     "storagePath" TEXT,
ADD COLUMN     "storageProvider" TEXT;

-- AlterTable
ALTER TABLE "ProgramKerjaProgressLog" ADD COLUMN     "storagePath" TEXT,
ADD COLUMN     "storageProvider" TEXT;

-- AlterTable
ALTER TABLE "ShiftExchange" ADD COLUMN     "storagePath" TEXT,
ADD COLUMN     "storageProvider" TEXT;
