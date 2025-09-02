// models/tag.js
import { Schema, model, models } from "mongoose";

const TagSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    detail: { type: String, trim: true },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
  },
  { timestamps: true },
);

const Tag = models.tag || model("tag", TagSchema);

export default Tag;
