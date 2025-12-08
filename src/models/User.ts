// path: src/models/User.ts
import { Schema, model, Document } from "mongoose";

export interface UserDocument extends Document {
  name: string;
  email: string;
  phone?: string;
  job?: string;
  passwordHash: string;

  // الاسم الموحّد المعتمد الآن
  avatar?: string;

  isAdmin: boolean;

  profile?: {
    social?: Record<string, string>;
    contact?: Record<string, string>;
    payment?: Record<string, string>;
    video?: Record<string, string>;
    music?: Record<string, string>;
    design?: Record<string, string>;
    gaming?: Record<string, string>;
    other?: Record<string, string>;
  };

  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },

    phone: { type: String, default: "" },
    job: { type: String, default: "" },

    passwordHash: { type: String, required: true },

    // نعتمد الحقل avatar كسلسلة ثابتة
    avatar: { type: String, default: "" },

    isAdmin: { type: Boolean, default: false },

    /**
     * مهم: نخزن sections كـ plain objects (Schema.Types.Mixed)
     * هذا يحافظ على ترتيب الحقول كما أُدرجت في الـ frontend.
     */
    profile: {
      social: { type: Schema.Types.Mixed, default: {} },
      contact: { type: Schema.Types.Mixed, default: {} },
      payment: { type: Schema.Types.Mixed, default: {} },
      video: { type: Schema.Types.Mixed, default: {} },
      music: { type: Schema.Types.Mixed, default: {} },
      design: { type: Schema.Types.Mixed, default: {} },
      gaming: { type: Schema.Types.Mixed, default: {} },
      other: { type: Schema.Types.Mixed, default: {} },
    },
  },
  { timestamps: true }
);

/**
 * Serializer — يحوّل أي Maps الموجودة → plain objects،
 * ويحذف passwordHash من كل استجابة.
 */
UserSchema.methods.toJSON = function () {
  const user = this.toObject();

  delete user.passwordHash;

  const sections = [
    "social",
    "contact",
    "payment",
    "video",
    "music",
    "design",
    "gaming",
    "other",
  ];

  if (user.profile) {
    sections.forEach((sec) => {
      const value = user.profile[sec];
      // إذا كان Map (من بيانات قديمة) نحوله
      if (value instanceof Map) {
        user.profile[sec] = Object.fromEntries(value);
      }
      // إذا كان هناك كائن عادي -- نتركه كما هو (يحافظ على الترتيب)
      // إذا لا شيء، ضمان أنه object
      else if (!value) {
        user.profile[sec] = {};
      }
    });
  } else {
    user.profile = {};
  }

  return user;
};

export default model<UserDocument>("User", UserSchema);
