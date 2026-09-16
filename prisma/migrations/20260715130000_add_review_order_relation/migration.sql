-- AlterTable
ALTER TABLE "reviews" ADD COLUMN     "rental_order_id" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "reviews_rental_order_id_key" ON "reviews"("rental_order_id");

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_rental_order_id_fkey" FOREIGN KEY ("rental_order_id") REFERENCES "rental_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
