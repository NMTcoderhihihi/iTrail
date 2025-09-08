// [MOD] components/(layout)/login/index.js

"use client";

// [ADD] Import các hook mới của React và Server Action
import { useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import styles from "./index.module.css";
import { loginUser } from "@/app/data/auth/auth.actions"; // [MOD] Import server action

// [ADD] Component con cho nút Submit để quản lý trạng thái pending
function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className={styles.submitButton} disabled={pending}>
      {pending ? "Đang xử lý..." : "Đăng nhập"}
    </button>
  );
}

const LoginPage = () => {
  const router = useRouter();

  // [MOD] Sử dụng useFormState để gọi action và quản lý state
  const initialState = { error: null, success: false, role: null };
  const [state, formAction] = useFormState(loginUser, initialState);

  // [DEL] Các useState cũ cho email, password, error, isPending được loại bỏ

  // [ADD] useEffect để theo dõi kết quả từ server action
  useEffect(() => {
    if (state.success) {
      router.refresh(); // Quan trọng: làm mới để session được cập nhật
      if (state.role === "Admin") {
        router.push("/admin");
      } else {
        router.push("/");
      }
    }
  }, [state, router]);

  return (
    <div className={styles.formContainer}>
      <h1 className={styles.title}>Đăng nhập</h1>
      {/* [MOD] Form giờ sẽ gọi trực tiếp `formAction` */}
      <form action={formAction}>
        <div className={styles.inputGroup}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            className={styles.inputField}
            required
          />
        </div>
        <div className={styles.inputGroup}>
          <label htmlFor="password">Mật khẩu</label>
          <input
            id="password"
            name="password"
            type="password"
            className={styles.inputField}
            required
          />
        </div>

        {/* [MOD] Hiển thị lỗi từ state của useFormState */}
        {state.error && <p className={styles.errorMessage}>{state.error}</p>}

        {/* [ADD] Sử dụng component nút Submit mới */}
        <SubmitButton />
      </form>
    </div>
  );
};

export default LoginPage;
