import { useEffect, useState, type FormEvent } from "react";
import type { UpdatePrivateProfileInput } from "@novamall/shared";

import { ApiClientError, getPrivateProfile, updatePrivateProfile } from "../api/client.js";
import { Button } from "../ui/button.js";
import { Field } from "../ui/field.js";
import { StatusMessage } from "../ui/status-message.js";

interface ProfilePageProps {
  csrfToken?: string;
}

export function ProfilePage({ csrfToken }: ProfilePageProps) {
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmedNewPassword, setConfirmedNewPassword] = useState("");
  const [newPasswordTouched, setNewPasswordTouched] = useState(false);
  const [confirmedNewPasswordTouched, setConfirmedNewPasswordTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("正在读取个人信息…");
  const newPasswordError = newPasswordTouched && newPassword.length > 0 && !isStrongPassword(newPassword) ? passwordRuleMessage : undefined;
  const confirmedNewPasswordError = confirmedNewPasswordTouched && confirmedNewPassword !== newPassword ? passwordMismatchMessage : undefined;

  useEffect(() => {
    let alive = true;
    void getPrivateProfile()
      .then((profile) => {
        if (alive) {
          setDisplayName(profile.displayName);
          setPhone(profile.phone);
          setMessage("个人信息已同步。");
        }
      })
      .catch((error) => {
        if (alive) {
          setMessage(profileErrorMessage(error, "暂时无法读取个人信息。"));
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const currentPassword = formValue(formData, "currentPassword");
    if ((currentPassword.length > 0 || newPassword.length > 0) && (currentPassword.length === 0 || newPassword.length === 0)) {
      setMessage("修改密码需要同时填写当前密码和新密码。");
      return;
    }
    if (newPassword.length > 0 && !isStrongPassword(newPassword)) {
      setNewPasswordTouched(true);
      setMessage(passwordRuleMessage);
      return;
    }
    if (newPassword !== confirmedNewPassword) {
      setConfirmedNewPasswordTouched(true);
      setMessage(passwordMismatchMessage);
      return;
    }
    const nextProfile: UpdatePrivateProfileInput = {
      displayName: displayName.trim()
    };
    const trimmedPhone = phone.trim();
    if (trimmedPhone.length > 0) {
      nextProfile.phone = trimmedPhone;
    }
    if (currentPassword.length > 0 && newPassword.length > 0) {
      nextProfile.currentPassword = currentPassword;
      nextProfile.newPassword = newPassword;
    }
    setLoading(true);
    try {
      const profile = await updatePrivateProfile(nextProfile, csrfToken ?? "");
      setDisplayName(profile.displayName);
      setPhone(profile.phone);
      setNewPassword("");
      setConfirmedNewPassword("");
      setNewPasswordTouched(false);
      setConfirmedNewPasswordTouched(false);
      setMessage("个人信息已更新。");
      form.reset();
    } catch (error) {
      setMessage(profileErrorMessage(error, "保存失败，请检查个人信息后再试。"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="stage-panel" aria-labelledby="profile-title">
      <div className="section-heading">
        <h2 id="profile-title">个人主页</h2>
      </div>
      <form className="form-stack stage-form" onSubmit={(event) => { void handleSubmit(event); }}>
        <Field label="展示名" name="displayName" value={displayName} onChange={(event) => { setDisplayName(event.target.value); }} />
        <Field label="手机号" name="phone" inputMode="tel" value={phone} onChange={(event) => { setPhone(event.target.value); }} />
        <Field label="当前密码" name="currentPassword" type="password" autoComplete="current-password" />
        <Field
          label="新密码"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(event) => { setNewPassword(event.target.value); }}
          onBlur={() => { setNewPasswordTouched(true); }}
          help="至少 8 位，包含英文大写、小写和数字"
          error={newPasswordError}
        />
        <Field
          label="确认新密码"
          name="confirmedNewPassword"
          type="password"
          autoComplete="new-password"
          value={confirmedNewPassword}
          onChange={(event) => { setConfirmedNewPassword(event.target.value); }}
          onBlur={() => { setConfirmedNewPasswordTouched(true); }}
          error={confirmedNewPasswordError}
        />
        <Button type="submit" loading={loading} disabled={csrfToken === undefined || csrfToken.length === 0}>保存个人信息</Button>
      </form>
      <StatusMessage>{message}</StatusMessage>
    </section>
  );
}

function profileErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiClientError) {
    if (error.code === "INVALID_CREDENTIALS") {
      return "当前密码不正确。";
    }
    if (error.code === "VALIDATION_ERROR") {
      return "请检查展示名、手机号和密码格式。";
    }
  }
  return fallback;
}

const passwordRuleMessage = "密码至少 8 位，并包含英文大写、小写和数字。";
const passwordMismatchMessage = "两次输入的密码不一致。";

function isStrongPassword(password: string): boolean {
  return password.length >= 8 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password);
}

function formValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}
