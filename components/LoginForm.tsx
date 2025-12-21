"use client";

import { AlertCircle, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { type LoginState, loginAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LoginFormProps {
  redirectTo?: string;
}

export default function LoginForm({ redirectTo }: LoginFormProps) {
  const t = useTranslations("login.form");
  const [showPassword, setShowPassword] = useState(false);

  const initialLoginState: LoginState = {
    success: false,
    message: "",
  };

  const [state, formAction, isPending] = useActionState(
    loginAction,
    initialLoginState,
  );

  return (
    <Card className="w-full border-0 shadow-lg">
      <CardHeader className="space-y-1 pb-8 text-center">
        <div className="mb-4 flex items-center justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
            <span className="font-bold text-primary-foreground text-xl">V</span>
          </div>
        </div>
        <CardTitle className="font-bold text-2xl">{t("title")}</CardTitle>
        <CardDescription>{t("subtitle")}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Display error message */}
        {state.message && !state.success && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <p className="text-destructive text-sm">{state.message}</p>
          </div>
        )}

        <form action={formAction} className="space-y-4">
          {/* Hidden redirect field */}
          {redirectTo && (
            <input type="hidden" name="redirectTo" value={redirectTo} />
          )}

          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email">{t("fields.email.label")}</Label>
            <div className="relative">
              <Mail className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-muted-foreground" />
              <Input
                id="email"
                name="email"
                type="email"
                placeholder={t("fields.email.placeholder")}
                className={`h-12 pl-10 ${state.errors?.email ? "border-destructive" : ""}`}
                required
              />
            </div>
            {state.errors?.email && (
              <p className="text-destructive text-sm">
                {state.errors.email[0]}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <Label htmlFor="password">{t("fields.password.label")}</Label>
            <div className="relative">
              <Lock className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-muted-foreground" />
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder={t("fields.password.placeholder")}
                className={`h-12 pr-10 pl-10 ${state.errors?.password ? "border-destructive" : ""}`}
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowPassword(!showPassword)}
                className="-translate-y-1/2 absolute top-1/2 right-1 h-8 w-8 transform text-muted-foreground hover:text-foreground"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {state.errors?.password && (
              <p className="text-destructive text-sm">
                {state.errors.password[0]}
              </p>
            )}
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox id="remember" name="rememberMe" />
              <Label htmlFor="remember" className="cursor-pointer text-sm">
                {t("fields.rememberMe")}
              </Label>
            </div>
            <Button
              type="button"
              variant="link"
              className="h-auto p-0 font-medium text-sm"
            >
              {t("actions.forgotPassword")}
            </Button>
          </div>

          {/* Sign In Button */}
          <Button
            type="submit"
            className="h-12 w-full font-medium"
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("actions.signingIn") || "Signing in..."}
              </>
            ) : (
              t("actions.signIn")
            )}
          </Button>
        </form>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-border border-t" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-background px-2 text-muted-foreground">
              {t("divider")}
            </span>
          </div>
        </div>

        {/* Social Login Button */}
        <Button variant="outline" className="h-12 w-full">
          <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          {t("socialLogin.google")}
        </Button>

        {/* Sign Up Link */}
        <div className="text-center">
          <p className="text-muted-foreground text-sm">
            {t("noAccount")}{" "}
            <Button variant="link" className="h-auto p-0 font-medium text-sm">
              {t("actions.signUp")}
            </Button>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
