export type AuthMode = 'signin' | 'signup';
export interface AuthFormState {
  readonly error: string | null;
  readonly notice: string | null;
}
export interface AuthViewModel extends AuthFormState {
  readonly mode: AuthMode;
  readonly isPending: boolean;
}
export interface AuthActions {
  readonly onSubmit: (formData: FormData) => void;
}
