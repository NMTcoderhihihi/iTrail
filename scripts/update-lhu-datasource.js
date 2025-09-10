// [ADD] scripts/update-lhu-datasource.js
import { Schema, mongoose } from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

const DataSourceSchema = new Schema(
  {},
  { strict: false, collection: "datasources" },
);
const DataSource =
  mongoose.models.dataSource || mongoose.model("dataSource", DataSourceSchema);

const LHU_API_DATASOURCE_ID = new mongoose.Types.ObjectId(
  "68bfd99ce2d199381ec03bf2",
);
const ADMIN_ID = new mongoose.Types.ObjectId("6865fe3ccdec836f29fabe4f");

async function fixDataSource() {
  const mongoURI = process.env.MONGODB_URI;
  if (!mongoURI) {
    console.error("❌ MONGODB_URI is not set.");
    return;
  }
  try {
    await mongoose.connect(mongoURI);
    console.log("✅ MongoDB connected!");

    const updateResult = await DataSource.updateOne(
      { _id: LHU_API_DATASOURCE_ID },
      {
        $set: {
          name: "API_Tuyensinh_LHU",
          description:
            "Lấy thông tin xét tuyển của thí sinh từ hệ thống của LHU.",
          connectorType: "api",
          connectionConfig: {
            params: [
              {
                key: "url",
                value: "https://tapi.lhu.edu.vn/TS/AUTH/XetTuyen_TraCuu",
              },
              { key: "method", value: "POST" },
            ],
          },
          inputParams: [
            {
              paramName: "id",
              paramLabel: "Số điện thoại",
              paramType: "string",
            },
          ],
          createdBy: ADMIN_ID,
        },
        $unset: { configParams: "" }, // Xóa trường cũ
      },
    );

    if (updateResult.modifiedCount > 0) {
      console.log("   -> ✅ Successfully updated the LHU API DataSource.");
    } else {
      console.log(
        "   -> ℹ️  DataSource already seems to be up-to-date or not found.",
      );
    }
  } catch (error) {
    console.error("❌ Error updating DataSource:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 MongoDB disconnected.");
  }
}

fixDataSource();
