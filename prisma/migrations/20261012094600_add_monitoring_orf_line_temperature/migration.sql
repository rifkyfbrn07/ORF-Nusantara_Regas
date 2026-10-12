ALTER TABLE "InfoOrfLine"
ADD COLUMN "temperature" DECIMAL(18,4),
ADD COLUMN "temperatureUnit" TEXT NOT NULL DEFAULT '°F';
